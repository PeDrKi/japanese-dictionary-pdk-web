/* tools.js — Jisho, gợi ý dịch, tách bộ kanji, nhập nhanh, CSV, nhập từ japanese.db */
'use strict';

// ── Jisho (qua /api/jisho trên Vercel vì Jisho không cho gọi trực tiếp từ trình duyệt) ──
const HIRA_SET = new Set('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょっー');
const KATA_SET = new Set('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポャュョッー');
function guessType(word) {
  if (word && [...word].every(c => HIRA_SET.has(c))) return 'hiragana';
  if (word && [...word].every(c => KATA_SET.has(c))) return 'katakana';
  if ([...word].length === 1 && word >= '一' && word <= '鿿') return 'kanji';
  return 'vocab';
}
// Từ loại của Jisho (tiếng Anh) → mã từ loại của app
function posFromJisho(list) {
  const t = list.join(' | ').toLowerCase();
  if (/suru verb|kuru verb/.test(t)) return 'verb3';
  if (/ichidan verb/.test(t)) return 'verb2';
  if (/godan verb/.test(t)) return 'verb1';
  if (/i-adjective/.test(t)) return 'adj_i';
  if (/na-adjective|adjectival nouns?/.test(t)) return 'adj_na';
  if (/\bverb\b/.test(t)) return 'verb';
  if (/pronoun/.test(t)) return 'pronoun';
  if (/particle/.test(t)) return 'particle';
  if (/adverb/.test(t)) return 'adverb';
  if (/conjunction/.test(t)) return 'conjunction';
  if (/interjection/.test(t)) return 'interjection';
  if (/\bnoun\b/.test(t)) return 'noun';
  return '';
}
async function jishoSearch(keyword) {
  const r = await fetch('api/jisho?keyword=' + encodeURIComponent(keyword));
  if (!r.ok) throw new Error('Máy chủ tra cứu không phản hồi (' + r.status + ')');
  const data = await r.json();
  return (data.data || []).slice(0, 8).map(e => {
    const jp = (e.japanese || [])[0] || {}; const senses = e.senses || [];
    const en = senses.flatMap(s => s.english_definitions || []).slice(0, 4).join(', ');
    const jl = (e.jlpt || [])[0]; const word = jp.word || jp.reading || '';
    return { word, reading: jp.reading || '', en, jlpt: jl ? (safeJlpt(jl.replace('jlpt-', '')) || '') : '', pos: posFromJisho(senses.flatMap(s => s.parts_of_speech || [])), common: !!e.is_common };
  });
}
async function suggestVi(en) {
  const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(en) + '&langpair=en|vi');
  const d = await r.json();
  if (!r.ok || Number(d.responseStatus) !== 200) return '';   // hết hạn mức / lỗi: MyMemory trả câu cảnh báo trong translatedText → không gợi ý
  return (d.responseData?.translatedText || '').trim();
}
ACT.cfJisho = async el => {
  const form = el.closest('form'); const kw = (form.elements.character.value || form.elements.romaji.value || '').trim();
  if (!kw) return toast('Nhập chữ hoặc romaji cần tra', true);
  el.disabled = true; el.textContent = '… đang tra';
  try {
    const res = await jishoSearch(kw);
    if (!res.length) return toast('Jisho không có kết quả', true);
    const s = openSheet(`<h2>Kết quả Jisho</h2><div class="list">${res.map((r, i) => `<button class="item" data-act="jishoPick" data-i="${i}"><span class="big jp ${[...r.word].length > 3 ? 'long' : ''}">${esc(r.word)}</span>
      <span class="grow"><span class="t jp">${esc(r.reading)}</span><br><span class="s">${esc(r.en)}</span></span>${r.jlpt ? `<span class="tag ${r.jlpt.toLowerCase()}">${r.jlpt}</span>` : ''}</button>`).join('')}</div>`);
    window._jr = { res, form, s };
  } catch (e) { toast('Không tra được Jisho: ' + e.message + ' (tính năng này cần chạy trên Vercel)', true); }
  finally { el.disabled = false; el.textContent = '🔍 Tra Jisho'; }
};
ACT.jishoPick = async el => {
  const { res, form, s } = _jr, r = res[+el.dataset.i], type = guessType(r.word);
  form.dataset.type = type; syncFormType(form); const set = (n, v) => { if (form.elements[n] && v) form.elements[n].value = v; };
  set('character', r.word); set('meaning_en', r.en); set('jlpt_level', r.jlpt); set('pos', r.pos);
  if (type === 'kanji') set('reading_kun', r.reading); else set('reading_kana', r.reading);
  set('romaji', kanaToRomaji(r.reading)); s.close();
  const box = $('#cf-suggest', form); if (r.en && !form.elements.meaning_vi.value) {
    box.textContent = 'Đang gợi ý nghĩa tiếng Việt…';
    try {
      const vi = await suggestVi(r.en.split(',')[0]);
      if (vi) { box.innerHTML = `Gợi ý nghĩa VN: <b>${esc(vi)}</b> <button type="button" class="btn small" data-act="useSuggest" data-v="${esc(vi)}">Dùng</button> <span class="mute">(dịch máy, hãy kiểm tra lại)</span>`; } else box.textContent = '';
    } catch { box.textContent = ''; }
  }
};
ACT.useSuggest = el => { const f = el.closest('form'); f.elements.meaning_vi.value = el.dataset.v; el.parentElement.textContent = ''; };

// Dòng tóm tắt của mục "Tùy chọn thêm": cho thấy từ loại / JLPT đã được điền để khỏi phải mở ra xem
function updateAdvSummary(form) {
  const el = form.querySelector('#cf-advs'); if (!el) return;
  const parts = [POS_LABEL[form.elements.pos?.value], form.elements.jlpt_level?.value].filter(Boolean);
  el.textContent = parts.length ? 'Tùy chọn thêm · ' + parts.join(' · ') : 'Tùy chọn thêm (từ loại, JLPT, ví dụ, ghi chú…)';
}
// Gõ chữ Nhật xong → tự tra Jisho rồi điền cách đọc, nghĩa, từ loại, JLPT (chỉ điền ô còn trống; ô bạn đã sửa tay thì giữ nguyên)
function wireAutofill(form) {
  let timer = 0, token = 0; form._auto = new Set(); form._typeTouched = false;
  const box = $('#cf-suggest', form), mv = $('#w-meaning_vi', form);
  const set = (n, v) => { const el = form.elements[n]; if (!el || !v) return false; if (el.value && !form._auto.has(n)) return false; el.value = v; form._auto.add(n); return true; };
  form.addEventListener('input', e => { const n = e.target.name; if (n && n !== 'character') { form._auto.delete(n); if (n === 'meaning_vi') mv.classList.remove('auto'); } });
  form.elements.character.addEventListener('input', () => {
    clearTimeout(timer); const kw = form.elements.character.value.trim(), my = ++token;
    if (!kw || /[A-Za-z]/.test(kw)) { box.textContent = ''; return; }   // đang gõ romaji dở dang → chờ
    timer = setTimeout(async () => {
      box.textContent = 'Đang tra Jisho…';
      try {
        const res = await jishoSearch(kw); if (my !== token) return;
        const r = res.find(x => x.word === kw) || res.find(x => x.reading === kw);
        if (!r) { box.textContent = res.length ? 'Không thấy khớp hoàn toàn — bấm "Chọn kết quả khác" để xem gợi ý.' : ''; return; }
        const type = guessType(r.word);
        if (!form._typeTouched && form.dataset.type !== type) { form.dataset.type = type; syncFormType(form); }
        if (type === 'kanji') set('reading_kun', r.reading); else set('reading_kana', r.reading);
        set('meaning_en', r.en); set('jlpt_level', r.jlpt); set('pos', r.pos); set('romaji', kanaToRomaji(r.reading));
        updateAdvSummary(form);
        box.innerHTML = 'Đã điền tự động từ Jisho — kiểm tra lại rồi bấm Lưu.';
        if (r.en && (!form.elements.meaning_vi.value || form._auto.has('meaning_vi'))) {
          let vi = ''; try { vi = await suggestVi(r.en.split(',')[0]); } catch { /* bỏ qua */ }
          if (my !== token) return;
          if (vi && set('meaning_vi', vi)) { mv.classList.add('auto'); box.innerHTML = 'Đã điền tự động từ Jisho. <b>Nghĩa tiếng Việt là dịch máy</b> — hãy kiểm tra lại rồi bấm Lưu.'; }
          else if (!form.elements.meaning_vi.value) box.textContent = 'Đã điền cách đọc từ Jisho. Chưa gợi ý được nghĩa tiếng Việt — hãy tự nhập.';
        }
      } catch { if (my === token) box.textContent = ''; }   // không có mạng / chạy ngoài Vercel: im lặng, vẫn nhập tay được
    }, 650);
  });
}

// ── Tách bộ kanji ───────────────────────────────────────────────────────────
let IDS = null;
async function loadIds() {
  if (IDS) return IDS;
  const t = await (await fetch('data/kanji_ids.tsv')).text(); IDS = new Map();
  for (const line of t.split('\n')) { const i = line.indexOf('\t'); if (i > 0) IDS.set(line.slice(0, i), line.slice(i + 1).trim()); }
  return IDS;
}
function decomposeChar(ch, depth = 0, visited = new Set(), max = 6) {
  if (depth >= max || visited.has(ch)) return { character: ch, children: [] };
  const ov = S.decomps.get(ch); let tree;
  if (ov != null) {
    const kids = [...ov].filter(p => p !== ch).map(p => ({ character: p, children: [] }));
    if (!kids.length) return { character: ch, children: [] }; tree = { character: ch, operator: null, children: kids };
  } else {
    const ids = IDS.get(ch); if (!ids || ids === ch) return { character: ch, children: [] };
    try { tree = parseIds(ids); } catch { return { character: ch, children: [] }; } tree.character = ch;
  }
  const v2 = new Set(visited).add(ch);
  const expand = n => n.children.length ? (n.children = n.children.map(expand), n) : decomposeChar(n.character, depth + 1, v2, max);
  tree.children = tree.children.map(expand); return tree;
}
function treeHtml(n, root = false) {
  const card = liveCards().find(c => c.character === n.character);
  const label = n.character ? `<span class="node"><b class="jp">${esc(n.character)}</b>${card ? `<span class="small mute">${esc(card.meaning_vi)}</span>` : ''}${n.children.length && n.operator ? `<span class="small mute">${IDC_LABEL[n.operator] || ''}</span>` : ''}${!root && n.character && !n.children.length ? `<button class="chip" data-act="decompose" data-ch="${esc(n.character)}" style="padding:1px 8px">🧩</button>` : ''}</span>`
    : `<span class="small mute">(${IDC_LABEL[n.operator] || 'nhóm'})</span>`;
  return `<li>${label}${n.children.length ? `<ul>${n.children.map(c => treeHtml(c)).join('')}</ul>` : ''}</li>`;
}
ACT.decompose = async el => {
  const ch = [...el.dataset.ch][0] && el.dataset.ch; const chars = [...ch];
  await guard(loadIds); if (!IDS) return;
  const target = chars.find(c => c >= '㐀') || chars[0];
  const tree = decomposeChar(target); const ov = S.decomps.get(target);
  const s = openSheet(`<h2>Tách bộ: <span class="jp" style="font-size:28px">${esc(target)}</span></h2>
    ${chars.length > 1 ? `<div class="row wrap" style="margin-bottom:10px">${chars.filter(c => c >= '㐀').map(c => `<button class="chip jp ${c === target ? 'on' : ''}" data-act="decompose" data-ch="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${tree.children.length ? `<div class="tree"><ul>${treeHtml(tree, true)}</ul></div>` : emptyBox('?', 'Chưa có dữ liệu tách bộ cho chữ này', 'Bạn có thể tự nhập các thành phần bên dưới.')}
    ${ov != null ? '<p class="small mute">✏️ Đang dùng cách tách do bạn tự nhập.</p>' : ''}
    <div class="sp"></div><div class="row"><button class="btn grow" data-act="decompEdit" data-ch="${esc(target)}">✏️ Tự nhập</button>${ov != null ? `<button class="btn grow" data-act="decompClear" data-ch="${esc(target)}">Về mặc định</button>` : ''}</div>`);
  window._dc = s;
};
ACT.decompEdit = el => {
  const ch = el.dataset.ch; const s = openSheet(`<h2>Các thành phần của ${esc(ch)}</h2><p class="small mute">Gõ các ký tự thành phần viết liền, vd <span class="jp">日音</span> nghĩa là 2 phần: 日 và 音.</p>
    <input class="input jp" id="dp" style="font-size:22px" value="${esc(S.decomps.get(ch) || '')}" autofocus><div class="sp"></div><div class="row"><button class="btn grow" data-close>Hủy</button><button class="btn primary grow" id="dps">Lưu</button></div>`);
  s.$('#dps').onclick = async () => { const v = s.$('#dp').value.replace(/\s/g, ''); if (!v) return toast('Nhập ít nhất 1 thành phần', true); await guard(() => setDecomp(ch, v), 'Đã lưu'); s.close(); _dc?.close(); ACT.decompose({ dataset: { ch } }); };
};
ACT.decompClear = async el => { await guard(() => clearDecomp(el.dataset.ch), 'Đã về mặc định'); _dc?.close(); ACT.decompose(el); };

// ── Nhập nhanh ──────────────────────────────────────────────────────────────
ACT.quickAdd = () => {
  const s = openSheet(`<h2>Nhập nhanh</h2><p class="small mute">Mỗi dòng một thẻ: <span class="jp">猫 - con mèo</span> (phân cách bằng <b>-</b>, <b>:</b> hoặc Tab).</p>
    <textarea class="input jp" id="qa" rows="7" placeholder="猫 - con mèo&#10;犬 - con chó" autofocus></textarea>
    <div class="grid2" style="margin-top:10px"><label class="field"><span>Loại thẻ</span><select id="qt">${TYPES.map(t => `<option value="${t}">${TYPE_LABEL[t]}</option>`).join('')}</select></label>
    <label class="field"><span>Thêm vào bộ</span><select id="qd"><option value="">— không —</option>${liveDecks().map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></label></div>
    <div id="qp" class="small mute" style="margin-bottom:10px"></div><div class="row"><button class="btn grow" data-close>Hủy</button><button class="btn primary grow" id="qg" disabled>Thêm</button></div>`);
  const upd = () => {
    const rows = parseQuickText(s.$('#qa').value), ok = rows.filter(r => r.valid), bad = rows.filter(r => !r.valid);
    s.$('#qp').innerHTML = rows.length ? `✓ ${ok.length} dòng hợp lệ${bad.length ? ` · <span style="color:var(--bad)">${bad.length} lỗi: ${bad.slice(0, 3).map(b => esc(b.raw.trim().slice(0, 14)) + ' (' + b.error + ')').join('; ')}</span>` : ''}` : '';
    s.$('#qg').disabled = !ok.length; s._ok = ok;
  };
  s.$('#qa').addEventListener('input', upd);
  s.$('#qg').onclick = async () => {
    const t = s.$('#qt').value, d = s.$('#qd').value; if (s._busy) return; s._busy = true; s.$('#qg').disabled = true;
    const ok = await guard(async () => { const cards = await addCardsBulk(s._ok.map(r => buildCardData({ type: t, character: r.character, meaning_vi: r.meaning_vi }))); if (d) await linkCardsToDeck(cards.map(c => c.id), d); return cards.length; });
    s._busy = false; s.$('#qg').disabled = false;
    if (ok) { toast(`Đã thêm ${ok} thẻ`); s.close(); render(); }
  };
};

// ── CSV ─────────────────────────────────────────────────────────────────────
function download(name, text, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
ACT.csvTools = () => {
  const s = openSheet(`<h2>Nhập / xuất CSV</h2><div class="list">
    <button class="item" data-act="csvExport" data-scope="all"><span class="grow"><span class="t">Xuất tất cả thẻ</span><br><span class="s">${liveCards().length} thẻ → file .csv (UTF-8, mở được bằng Excel)</span></span></button>
    <button class="item" data-act="csvExport" data-scope="filter"><span class="grow"><span class="t">Xuất danh sách đang lọc</span><br><span class="s">${currentList().length} thẻ theo bộ lọc ở tab Thẻ</span></span></button>
    <button class="item" data-act="csvTemplate"><span class="grow"><span class="t">Tải file mẫu</span><br><span class="s">Mẫu cột để điền rồi nhập lại</span></span></button>
    <label class="item" style="cursor:pointer"><span class="grow"><span class="t">Nhập từ file CSV…</span><br><span class="s">Bỏ qua thẻ trùng (cùng chữ và loại)</span></span><input type="file" accept=".csv,text/csv" id="csvin" hidden></label></div>`);
  s.$('#csvin').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || s.busy) return;
    s.busy = true;
    const { valid, errors } = csvRowsToCards(parseCsv(await f.text()));
    const exist = new Set(liveCards().map(c => c.type + '|' + c.character)); const fresh = valid.filter(c => { const k = c.type + '|' + c.character; if (exist.has(k)) return false; exist.add(k); return true; });   // bỏ cả dòng trùng ngay trong file
    s.close();
    if (!await confirmBox(`Nhập ${fresh.length} thẻ mới? (${valid.length - fresh.length} trùng bị bỏ qua${errors.length ? `, ${errors.length} dòng lỗi: ${errors.slice(0, 3).map(x => 'dòng ' + x[0] + ' ' + x[1]).join('; ')}` : ''})`, 'Nhập')) return;
    await guard(() => addCardsBulk(fresh), `Đã nhập ${fresh.length} thẻ`); render();
  };
};
ACT.csvExport = el => { const l = el.dataset.scope === 'all' ? liveCards() : currentList(); download(`japanese_${localDate()}.csv`, toCsv(l)); };
ACT.csvTemplate = () => download('template_import.csv', toCsv([{ type: 'kanji', character: '雨', reading_on: 'ウ', reading_kun: 'あめ、あま', reading_hanviet: 'vũ', romaji: 'ame', meaning_vi: 'mưa', meaning_en: 'rain', example_jp: '雨が降る', example_vi: 'Trời mưa', stroke_count: 8, jlpt_level: 'N5', status: 'new', is_favorite: 0, source: 'Minna no Nihongo' }]));

// ── Nhập từ japanese.db của bản desktop ─────────────────────────────────────
const SQLJS = 'vendor/';
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Không tải được thư viện đọc SQLite ')); document.head.appendChild(s); }); }
const isoLocal = s => { if (!s) return null; const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? null : d.toISOString(); };
async function importDesktopDb(file, say, overwrite = false) {
  if (!window.initSqlJs) await loadScript(SQLJS + 'sql-wasm.js');
  const SQL = await window.initSqlJs({ locateFile: f => SQLJS + f });
  const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  const has = t => db.exec(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='${t}'`).length > 0;
  const rows = t => { if (!has(t)) return []; const r = db.exec(`SELECT * FROM ${t}`)[0]; return r ? r.values.map(v => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))) : []; };
  if (!has('cards')) throw new Error('File không có bảng "cards" — đây có đúng là japanese.db không?');
  const cards = rows('cards');
  if (cards.some(c => !UUID_RE.test(String(c.id)))) throw new Error('Database này vẫn dùng ID số cũ. Hãy mở bằng app desktop bản mới một lần để tự chuyển sang UUID, rồi nhập lại.');
  // Mặc định KHÔNG ghi đè: hàng đã có trên web (cùng id) được giữ nguyên; chỉ thêm hàng mới.
  // Chọn "ghi đè" mới thay bằng nội dung trong file .db (mất các chỉnh sửa trên web của những hàng đó).
  const up = async (table, list, onConflict = 'id') => {
    for (let i = 0; i < list.length; i += 400) {
      say(`${table}: ${Math.min(i + 400, list.length)}/${list.length}`);
      const { error } = await sb.from(table).upsert(list.slice(i, i + 400), { onConflict, ignoreDuplicates: !overwrite });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  };
  const dedupe = (list, key) => [...new Map(list.map(r => [key(r), r])).values()];
  const del = r => r.deleted_at ? isoLocal(r.deleted_at) : null;
  // Danh mục trùng TÊN với danh mục đã có trên web (khác id) → gộp vào bản trên web (bảng có unique(user_id, tên))
  const catMap = new Map(), liveC = new Map(S.cats.map(c => [c.name, c.id])), seenC = new Map();
  const deskCats = rows('deck_categories').filter(r => {
    const ex = liveC.get(r.name) || seenC.get(r.name);
    if (ex && ex !== r.id) { catMap.set(r.id, ex); return false; }
    seenC.set(r.name, r.id); return true;
  });
  const cm = id => (id && catMap.get(id)) || id;
  await up('deck_categories', deskCats.map(r => ({ id: r.id, name: r.name, icon: r.icon, sort_order: r.sort_order ?? 0, created_at: isoLocal(r.created_at) })));
  // Bộ thẻ / bộ thủ trùng tên (ký tự) với bản đã có trên web nhưng khác id → gộp vào bản trên web (tránh lỗi trùng + tránh nhân đôi)
  const deckMap = new Map(), radMap = new Map();
  const liveD = new Map(S.decks.filter(alive).map(d => [d.name, d.id])), liveR = new Map(S.radicals.filter(alive).map(r => [r.character, r.id]));
  const deskDecks = rows('decks'), deskRads = rows('radicals');
  for (const r of deskDecks) if (!r.deleted_at && liveD.has(r.name) && liveD.get(r.name) !== r.id) deckMap.set(r.id, liveD.get(r.name));
  for (const r of deskRads) if (!r.deleted_at && liveR.has(r.character) && liveR.get(r.character) !== r.id) radMap.set(r.id, liveR.get(r.character));
  const dm = id => deckMap.get(id) || id, rm = id => radMap.get(id) || id;
  await up('decks', deskDecks.filter(r => !deckMap.has(r.id)).map(r => ({ id: r.id, name: r.name, description: r.description, color: r.color, icon: r.icon, category_id: cm(r.category_id), created_at: isoLocal(r.created_at), updated_at: isoLocal(r.updated_at), deleted_at: del(r) })));
  await up('cards', cards.map(r => ({
    id: r.id, type: TYPES.includes(r.type) ? r.type : 'vocab', character: r.character, reading_on: r.reading_on, reading_kun: r.reading_kun, reading_kana: r.reading_kana, reading_hanviet: r.reading_hanviet,
    romaji: r.romaji, meaning_vi: r.meaning_vi, meaning_en: r.meaning_en, example_jp: r.example_jp, example_vi: r.example_vi, stroke_count: r.stroke_count, jlpt_level: safeJlpt(r.jlpt_level), pos: safePos(r.pos),
    status: STATUSES.includes(r.status) ? r.status : 'new', is_favorite: !!r.is_favorite, source: r.source, notes: r.notes, srs_interval: r.srs_interval || 1, srs_ease: r.srs_ease || 2.5,
    srs_due_date: r.srs_due_date ? String(r.srs_due_date).slice(0, 10) : null, created_at: isoLocal(r.created_at), updated_at: isoLocal(r.updated_at), deleted_at: del(r),
  })));
  await up('deck_cards', dedupe(rows('deck_cards').map(r => ({ id: r.id || uuid7(), deck_id: dm(r.deck_id), card_id: r.card_id, added_at: isoLocal(r.added_at), updated_at: isoLocal(r.updated_at), deleted_at: del(r) })), r => r.deck_id + r.card_id), 'deck_id,card_id');
  await up('radicals', deskRads.filter(r => !radMap.has(r.id)).map(r => ({ id: r.id, character: r.character, name: r.name, color: r.color, sort_order: r.sort_order ?? 0, created_at: isoLocal(r.created_at), updated_at: isoLocal(r.updated_at), deleted_at: del(r) })));
  await up('radical_cards', dedupe(rows('radical_cards').map(r => ({ id: r.id || uuid7(), radical_id: rm(r.radical_id), card_id: r.card_id, added_at: isoLocal(r.added_at), updated_at: isoLocal(r.updated_at), deleted_at: del(r) })), r => r.radical_id + r.card_id), 'radical_id,card_id');
  await up('user_decompositions', rows('user_decompositions').map(r => ({ character: r.character, parts: r.parts, updated_at: isoLocal(r.updated_at), deleted_at: del(r) })), 'user_id,character');
  await up('study_sessions', rows('study_sessions').map(r => ({ id: r.id || uuid7(), card_id: r.card_id, result: r.result, studied_at: isoLocal(r.studied_at) })));
  const out = { cards: cards.length, decks: rows('decks').length, sessions: rows('study_sessions').length }; db.close(); return out;
}
ACT.importDb = () => {
  const s = openSheet(`<h2>Nhập từ bản desktop</h2><p class="small mute">Chọn file <b>japanese.db</b> trong thư mục <code>database/</code> của app desktop. Toàn bộ thẻ, bộ thẻ, bộ thủ và lịch sử ôn sẽ được chuyển lên tài khoản này (giữ nguyên ID nên nhập lại nhiều lần không bị nhân đôi; mặc định <b>không ghi đè</b> dữ liệu đã có trên web). File chỉ được đọc trên máy bạn rồi gửi thẳng lên Supabase của bạn.</p>
    <label class="btn primary block" style="text-align:center;display:block;line-height:26px">Chọn file japanese.db…<input type="file" id="dbin" accept=".db,.sqlite,.sqlite3,application/octet-stream" hidden></label>
    <label class="row" style="margin-top:12px"><input type="checkbox" id="dbow" style="width:20px;height:20px"> <span class="small">Ghi đè mục đã có (⚠️ mất chỉnh sửa & lịch ôn trên web của các thẻ trùng ID)</span></label><div id="dbmsg" class="small" style="margin-top:12px"></div>`);
  s.$('#dbin').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || s.busy) return;
    const ow = s.$('#dbow').checked;
    if (ow && !await confirmBox('Ghi đè sẽ thay các thẻ trùng ID bằng bản trong file .db, MẤT chỉnh sửa và tiến độ ôn trên web của chúng. Tiếp tục?', 'Ghi đè', true)) return;
    s.busy = true; const m = s.$('#dbmsg'); m.className = 'small mute';
    try {
      const r = await importDesktopDb(f, t => { m.textContent = 'Đang nhập — ' + t; }, ow); m.textContent = 'Đang tải lại dữ liệu…'; await loadAll(); render();
      m.className = 'small'; m.style.color = 'var(--ok)'; m.textContent = `Xong: ${r.cards} thẻ, ${r.decks} bộ thẻ, ${r.sessions} lượt ôn.`;
    } catch (err) { m.className = 'small'; m.style.color = 'var(--bad)'; m.textContent = err.message; }
    finally { s.busy = false; }
  };
};
