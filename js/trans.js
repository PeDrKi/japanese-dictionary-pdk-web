/* trans.js — trang "Bản dịch": dán văn bản tiếng Nhật (1 câu … cả bài dài cỡ 1 trang A4), ghi nghĩa tiếng Việt; xem đối chiếu từng đoạn. Phím tắt: d */
'use strict';
const TFILT = { search: '', jlpt: '' };
let TMODE = 'two';    // two = hai bên (bài đọc | từ vựng + bản dịch) · pair = đối chiếu từng đoạn · jp = chỉ tiếng Nhật · hide = che bản dịch để tự kiểm tra
let TSIDE = 'gloss';  // tab của cột bên phải: gloss = từ vựng · vi = bản dịch
const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };

function transRow(t) {
  const jl = safeJlpt(t.jlpt_level), n = [...t.jp].length;
  return `<button class="item" data-act="openTrans" data-id="${t.id}"><span class="grow"><span class="t jp" style="font-size:17px">${esc(t.title || clip(t.jp, 40))}</span><br><span class="s">${esc(clip(t.vi || (t.title ? t.jp : ''), 70)) || '<i>Chưa có bản dịch</i>'}</span></span>
    <span class="mute small">${n.toLocaleString('vi-VN')} chữ</span>${jl ? `<span class="tag ${jl.toLowerCase()}">${jl}</span>` : ''}<span class="mute">›</span></button>`;
}
function transBody() {
  if (!S.transOk) return emptyBox('訳', 'Chưa bật tính năng Bản dịch', 'Cơ sở dữ liệu cần chạy lại <b>schema.sql</b> (bản 11) trong Supabase → SQL Editor. Xem README.');
  const list = filterTranslations(TFILT);
  return `<div class="mute small countrow"><span>${list.length}${list.length !== S.translations.length ? ' / ' + S.translations.length : ''} bài</span></div>
  <div class="list" id="translist">${list.map(transRow).join('') || (TFILT.search || TFILT.jlpt
    ? emptyBox('訳', 'Không có bài khớp', 'Thử bỏ bộ lọc hoặc đổi từ khóa.')
    : emptyBox('訳', 'Chưa có bản dịch nào', 'Bấm nút + để dán một câu hoặc cả đoạn văn tiếng Nhật rồi ghi nghĩa tiếng Việt.'))}</div>`;
}
function viewTrans() {
  return `<div class="page">${pageTop('Bản dịch', !isTopTab(), S.transOk ? '<button class="btn primary" data-act="newTrans">+ Thêm</button>' : '')}
  <div class="search"><input class="input" id="tq" type="search" placeholder="Tìm trong tiếng Nhật, nghĩa, tiêu đề…" value="${esc(TFILT.search)}" autocomplete="off" aria-label="Tìm bản dịch"></div>
  <div class="chips" style="margin-top:8px"><button class="chip ${TFILT.jlpt ? '' : 'on'}" data-act="transLevel" data-v="">Tất cả</button>${JLPT.map(j => `<button class="chip ${TFILT.jlpt === j ? 'on' : ''}" data-act="transLevel" data-v="${j}">${j}</button>`).join('')}</div>
  <div id="transbody">${transBody()}</div>
  ${S.transOk ? '<button class="fab" data-act="newTrans" aria-label="Thêm bản dịch">+</button>' : ''}</div>`;
}
// ── Ghi lại từ mới ngay khi đang đọc: bôi đen chữ tiếng Nhật → lưu thành thẻ từ vựng hoặc thêm làm ví dụ cho mẫu ngữ pháp ──
let TSEL = null;
const sentenceOf = (para, sel) => { const parts = para.match(/[^。！？!?]*[。！？!?]?/g).filter(x => x.trim()); return (parts.find(x => x.includes(sel)) || para).trim(); };
function readSelection() {
  const sel = window.getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const text = sel.toString().replace(/\s+/g, ' ').trim(), node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  const para = node && node.closest && node.closest('p.tjp, .tjp p');
  if (!text || [...text].length > 300 || !para || !$('.tbody')) return null;
  const sub = NAV.sub && NAV.sub.name === 'transitem' ? S.translations.find(t => t.id === NAV.sub.id) : null; if (!sub) return null;
  const paras = [...document.querySelectorAll('.tbody p.tjp, .tbody .tjp p')], idx = paras.indexOf(para), vis = splitParas(sub.vi);
  const vi = vis.length === paras.length && idx >= 0 ? vis[idx] : '';
  return { text, sentence: sentenceOf(para.textContent, text), paragraph: para.textContent.trim(), vi, title: sub.title || clip(sub.jp, 20), id: sub.id };
}
function updateSelBar() {
  TSEL = readSelection(); let bar = $('#selnote');
  if (!TSEL) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'selnote'; bar.className = 'selnote'; document.body.appendChild(bar); bar.addEventListener('pointerdown', e => e.preventDefault()); }
  bar.innerHTML = `<span class="jp selnote-t">${esc(clip(TSEL.text, 14))}</span><button class="btn primary" data-act="noteGloss">＋ Ghi vào từ vựng</button><button class="btn" data-act="noteVocab">＋ Thẻ từ vựng</button><button class="btn" data-act="noteGrammar">＋ Ví dụ ngữ pháp</button>`;
}
let selTimer; document.addEventListener('selectionchange', () => { clearTimeout(selTimer); selTimer = setTimeout(updateSelBar, 120); });
const closeSelBar = () => { $('#selnote')?.remove(); try { window.getSelection().removeAllRanges(); } catch { /* bỏ qua */ } };
ACT.noteVocab = () => {
  const t = TSEL; if (!t) return; closeSelBar();
  const dup = S.cards.find(c => alive(c) && c.character === t.text);
  if (dup) { toast(`"${t.text}" đã có trong thư viện`); return ACT.openCard ? ACT.openCard({ dataset: { id: dup.id } }) : undefined; }
  openCardForm(null, { type: guessType(t.text), character: t.text, example_jp: t.sentence === t.text ? '' : t.sentence, example_vi: t.vi && t.paragraph === t.sentence ? t.vi : '', source: t.title });
  const f = $('#cf'); if (f) { f.elements.character.dispatchEvent(new Event('input', { bubbles: true })); focusNextField(f); }   // tự tra Jisho, con trỏ nhảy tới ô nghĩa
};
// ── Cột từ vựng của bài (mỗi dòng "từ = nghĩa") ──
async function saveGloss(tid, list) {
  const t = S.translations.find(x => x.id === tid); if (!t) throw new Error('Không thấy bài');
  if (!glossaryOk(t)) throw new Error('Cần chạy lại schema.sql (bản 12) để dùng cột từ vựng');
  const data = Object.fromEntries(EDIT_FIELDS.translations.map(k => [k, t[k] ?? null])); data.glossary = fmtGlossary(list) || null;
  return saveTranslation(tid, data, { ...t }, askConflict);
}
const curTrans = () => NAV.sub && NAV.sub.name === 'transitem' ? S.translations.find(t => t.id === NAV.sub.id) : null;
function openGlossForm(idx, preset = '') {
  const t = curTrans(); if (!t) return; const list = parseGlossary(t.glossary), g = idx !== null ? list[idx] : { term: preset, meaning: '' }; if (!g) return;
  const s = openSheet(`<h2>${idx !== null ? 'Sửa từ vựng' : 'Thêm từ vào cột từ vựng'}</h2><form id="glf" autocomplete="off">
    <label class="field" id="gl-term"><span>Từ / cụm từ *</span><input name="term" class="jp" style="font-size:20px" value="${esc(g.term)}" maxlength="100" ${g.term ? '' : 'autofocus'}></label>
    <label class="field"><span>Nghĩa</span><input name="meaning" value="${esc(g.meaning)}" maxlength="300" ${g.term ? 'autofocus' : ''} placeholder="nghĩa tiếng Việt…"></label>
    ${idx !== null ? '<p class="small" style="margin:0 0 10px"><button type="button" class="linkbtn" data-act="glossToCard">Lưu thành thẻ từ vựng</button></p>' : ''}
    <div class="row sheet-actions">${idx !== null ? '<button type="button" class="btn danger" data-act="glossDel">Xóa</button>' : ''}<button type="button" class="btn grow" data-close>Hủy</button><button type="submit" class="btn primary grow">Lưu</button></div></form>`, { sticky: true });
  const f = s.$('#glf'); f._s = s; f._i = idx; f._tid = t.id;
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (f._busy) return;
    const term = f.elements.term.value.trim(), meaning = f.elements.meaning.value.trim(); $('#gl-term', f).classList.toggle('err', !term); if (!term) return toast('Cần nhập từ', true);
    f._busy = true;
    const ok = await guard(async () => {
      const cur = S.translations.find(x => x.id === f._tid), l = parseGlossary(cur.glossary);
      if (f._i !== null) l[f._i] = { term, meaning };
      else { const k = l.findIndex(x => x.term === term); if (k >= 0) l[k] = { term, meaning: meaning || l[k].meaning }; else l.push({ term, meaning }); }
      await saveGloss(f._tid, l);
    }, 'Đã lưu từ vựng');
    f._busy = false; if (ok !== undefined) { s.close(); TSIDE = 'gloss'; render(); }
  });
}
ACT.glossAdd = () => openGlossForm(null);
// Thêm hàng loạt từ trong cột từ vựng thành thẻ + xếp vào bộ thẻ
ACT.glossBulk = () => {
  const t = curTrans(); if (!t) return; const gl = parseGlossary(t.glossary), jp = splitParas(t.jp), vis = splitParas(t.vi), src = t.title || clip(t.jp, 20);
  const have = new Set(S.cards.filter(alive).map(c => c.character));
  const rows = gl.map(g => { const para = jp.find(x => x.includes(g.term)) || '', sen = para ? sentenceOf(para, g.term) : '', i = jp.indexOf(para);
    return { ...g, dup: have.has(g.term), noMeaning: !g.meaning, sen: sen === g.term ? '' : sen, vi: vis.length === jp.length && i >= 0 && sen === para ? vis[i] : '' }; });
  const sel = new Set(rows.map((r, i) => r.dup || r.noMeaning ? -1 : i)); sel.delete(-1);
  const decks = new Set(recentDecks().slice(0, 1));
  const s = openSheet(`<h2>Thêm từ vào bộ thẻ</h2><p class="small mute" style="margin-top:-6px">Chọn từ cần thêm. Câu chứa từ trong bài được dùng làm câu ví dụ, nguồn = tên bài.</p>
    <div id="gb-list" class="list"></div><div class="sp"></div><div class="field"><span>Bộ thẻ</span><div class="row wrap" id="gb-decks"></div></div><button class="btn primary block" id="gb-go" data-act="glossBulkGo"></button>`);
  const draw = () => {
    s.$('#gb-list').innerHTML = rows.map((r, i) => `<label class="item" style="${r.dup || r.noMeaning ? 'opacity:.55' : ''}"><input type="checkbox" data-gb="${i}" ${sel.has(i) ? 'checked' : ''} ${r.dup || r.noMeaning ? 'disabled' : ''}><span class="grow"><b class="jp">${esc(r.term)}</b> = ${esc(r.meaning || '—')}${r.dup ? ' <span class="mute small">(đã có thẻ)</span>' : r.noMeaning ? ' <span class="mute small">(chưa có nghĩa)</span>' : ''}</span></label>`).join('');
    s.$('#gb-decks').innerHTML = liveDecks().map(d => `<button type="button" class="chip ${decks.has(d.id) ? 'on' : ''}" data-act="gbDeck" data-id="${d.id}">${esc(d.icon || '')} ${esc(d.name)}</button>`).join('') || '<span class="mute small">Chưa có bộ thẻ — thẻ sẽ vào Thư viện.</span>';
    const b = s.$('#gb-go'); b.textContent = sel.size ? `Thêm ${sel.size} thẻ` : 'Chọn ít nhất 1 từ'; b.disabled = !sel.size;
  };
  s.$('#gb-list').addEventListener('change', e => { const i = +e.target.dataset.gb; e.target.checked ? sel.add(i) : sel.delete(i); draw(); });
  ACT.gbDeck = el => { decks.has(el.dataset.id) ? decks.delete(el.dataset.id) : decks.add(el.dataset.id); draw(); };
  ACT.glossBulkGo = async () => {
    const list = [...sel].sort((a, b) => a - b).map(i => rows[i]); if (!list.length) return;
    const n = await guard(async () => {
      const cards = await addCardsBulk(list.map(r => buildCardData({ type: guessType(r.term), character: r.term, meaning_vi: r.meaning, example_jp: r.sen, example_vi: r.vi, source: src })));
      for (const d of decks) await linkCardsToDeck(cards.map(c => c.id), d);
      rememberDecks([...decks]); return cards.length;
    });
    if (n !== undefined) { s.close(); toast(`Đã thêm ${n} thẻ${decks.size ? ' vào bộ thẻ' : ''}`); render(); }
  };
  draw();
};
ACT.glossEdit = el => openGlossForm(+el.dataset.i);
ACT.noteGloss = () => { const t = TSEL; if (!t) return; closeSelBar(); TSIDE = 'gloss'; openGlossForm(null, t.text); };
ACT.glossDel = async el => {
  const f = el.closest('form'), cur = S.translations.find(x => x.id === f._tid); if (!cur) return;
  const l = parseGlossary(cur.glossary), g = l[f._i]; if (!g || !await confirmBox(`Xóa "${g.term}" khỏi từ vựng?`, 'Xóa', true)) return;
  l.splice(f._i, 1); if (await guard(() => saveGloss(f._tid, l), 'Đã xóa') !== undefined) { f._s.close(); render(); }
};
ACT.glossToCard = el => {
  const f = el.closest('form'), cur = S.translations.find(x => x.id === f._tid); if (!cur) return;
  const term = f.elements.term.value.trim(), meaning = f.elements.meaning.value.trim(); if (!term) return;
  if (S.cards.find(c => alive(c) && c.character === term)) return toast(`"${term}" đã có trong thư viện`);
  const para = splitParas(cur.jp).find(x => x.includes(term)) || '', jp = splitParas(cur.jp), vis = splitParas(cur.vi), i = jp.indexOf(para);
  const sentence = para ? sentenceOf(para, term) : '';
  f._s.close();
  openCardForm(null, { type: guessType(term), character: term, meaning_vi: meaning, example_jp: sentence === term ? '' : sentence, example_vi: vis.length === jp.length && i >= 0 && sentence === para ? vis[i] : '', source: cur.title || clip(cur.jp, 20) });
};
ACT.noteGrammar = () => {
  const t = TSEL; if (!t) return; closeSelBar();
  if (!S.grammarOk) return toast('Cần chạy lại schema.sql (bản 7) để dùng Ngữ pháp', true);
  const picked = t.text.length >= 8 || /[。！？]/.test(t.text) ? t.text : t.sentence;
  const scopes = { sel: ['Phần đã chọn', picked], sen: ['Cả câu', t.sentence], par: ['Cả đoạn', t.paragraph] };
  const exOf = k => { const line = scopes[k][1]; return `${line}${t.vi && t.paragraph === line ? ' | ' + t.vi : ''}`; };
  let scope = picked === t.sentence ? 'sen' : 'sel';
  const draw = q => filterGrammar({ search: q }).slice(0, 30).map(g => `<button class="item" data-act="gramAddEx" data-id="${g.id}"><span class="grow"><span class="t jp">${esc(g.title)}</span><br><span class="s">${esc(g.meaning_vi || '')}</span></span><span class="mute">＋</span></button>`).join('') || '<p class="mute small" style="padding:8px">Chưa có mẫu nào khớp.</p>';
  const chips = () => Object.entries(scopes).filter(([k, v], i, a) => k === 'sel' ? picked !== t.sentence && picked !== t.paragraph : k === 'sen' ? t.sentence !== t.paragraph : true).map(([k, v]) => `<button type="button" class="chip ${scope === k ? 'on' : ''}" data-act="gxScope" data-v="${k}">${v[0]}</button>`).join('');
  const s = openSheet(`<h2>Thêm làm ví dụ ngữ pháp</h2><div class="chips" id="gx-scope" style="margin-bottom:8px">${chips()}</div><div class="card jp" id="gx-ex" style="margin-bottom:10px;white-space:pre-wrap">${esc(exOf(scope))}</div>
    <input class="input" id="gx-q" type="search" placeholder="Tìm mẫu ngữ pháp…" autocomplete="off" aria-label="Tìm mẫu ngữ pháp"><div class="sp"></div>
    <div class="list" id="gx-list" style="max-height:40vh;overflow:auto">${draw('')}</div><div class="sp"></div>
    <button class="btn block" data-act="gramNewFromEx">+ Tạo mẫu ngữ pháp mới với ví dụ này</button>`);
  window._gx = { s, ex: exOf(scope) };
  ACT.gxScope = el => { scope = el.dataset.v; window._gx.ex = exOf(scope); s.$('#gx-ex').textContent = window._gx.ex; s.$('#gx-scope').innerHTML = chips(); };
  s.$('#gx-q').addEventListener('input', e => { s.$('#gx-list').innerHTML = draw(e.target.value); });
};
ACT.gramAddEx = async el => {
  const { s, ex } = window._gx, g = S.grammar_points.find(x => x.id === el.dataset.id); if (!g) return;
  const jp = ex.split(' | ')[0].trim();
  if ((g.examples || '').split('\n').some(l => l.split('|')[0].trim() === jp)) { s.close(); return toast('Ví dụ này đã có trong mẫu'); }
  const next = (g.examples ? g.examples.replace(/\s+$/, '') + '\n' : '') + ex;
  if (next.length > 7900) return toast('Mẫu này đã có quá nhiều ví dụ', true);
  const data = Object.fromEntries(EDIT_FIELDS.grammar_points.map(k => [k, g[k]])); data.examples = next;
  const ok = await guard(() => saveGrammar(g.id, data, { ...g }, askConflict), `Đã thêm ví dụ vào ${g.title}`);
  if (ok !== undefined) s.close();
};
ACT.gramNewFromEx = () => { const { s, ex } = window._gx; s.close(); openGrammarForm(null, { examples: ex }); };
let tqTimer;
document.addEventListener('input', e => { if (e.target.id !== 'tq') return; clearTimeout(tqTimer); tqTimer = setTimeout(() => { TFILT.search = e.target.value; const b = $('#transbody'); if (b) b.innerHTML = transBody(); }, 200); });
ACT.transLevel = el => { TFILT.jlpt = el.dataset.v; render(); };
ACT.newTrans = () => openTransForm(null);
ACT.openTrans = el => ACT.sub({ dataset: { name: 'transitem', id: el.dataset.id } });
ACT.transEdit = el => openTransForm(el.dataset.id);

// ── Trang đọc 1 bài ──
const glossaryOk = t => !!t && 'glossary' in t;
function viewTransItem(sub) {
  const t = S.translations.find(x => x.id === sub.id); if (!t) return viewTrans();
  const pi = pairInfo(t.jp, t.vi), jp = pi.P, vi = pi.V, paired = pi.level !== 'none', jl = safeJlpt(t.jlpt_level);
  const gl = parseGlossary(t.glossary), hi = x => hiPassage(x, gl.map(g => g.term));
  const mode = (m, l) => `<button class="chip ${TMODE === m ? 'on' : ''}" data-act="transMode" data-v="${m}">${l}</button>`;
  const viP = x => x === SENT_TODO ? '<p class="tvi todo">chưa dịch</p>' : TMODE === 'hide' ? `<p class="tvi cover" data-act="transReveal" role="button" tabindex="0" aria-label="Bấm để hiện bản dịch">${esc(x)}</p>` : `<p class="tvi">${esc(x)}</p>`;
  let body;
  if (TMODE === 'two') {
    const side = TSIDE === 'vi'
      ? (vi.length ? vi.map(x => `<p class="tvi2">${esc(x)}</p>`).join('') : '<p class="small mute">Chưa có bản dịch — bấm ✏️ để ghi nghĩa tiếng Việt.</p>')
      : `${gl.length ? gl.map((g, i) => `<button class="gl-item" data-act="glossEdit" data-i="${i}"><b class="jp">${esc(g.term)}</b>${g.meaning ? ` = ${esc(g.meaning)}` : ''}</button>`).join('') : '<p class="small mute" style="margin:2px 0 8px">Chưa có từ vựng. Bôi đen từ trong bài rồi bấm “＋ Ghi vào từ vựng”, hoặc bấm nút bên dưới.</p>'}<div class="row wrap" style="margin-top:8px"><button class="btn small" data-act="glossAdd">+ Thêm từ</button>${gl.length ? '<button class="btn small primary" data-act="glossBulk">＋ Thêm vào bộ thẻ…</button>' : ''}</div>`;
    body = `<div class="t2"><div class="tpassage"><div class="colh orig"><span class="lb orig">原文</span> Văn bản gốc · Tiếng Nhật</div>${jp.map(x => `<p class="tjp jp">${hi(x)}</p>`).join('')}</div>
      <aside class="tside trn"><div class="chips" style="margin-bottom:8px"><button class="chip ${TSIDE === 'gloss' ? 'on' : ''}" data-act="transSide" data-v="gloss">Từ vựng${gl.length ? ' · ' + gl.length : ''}</button><button class="chip ${TSIDE === 'vi' ? 'on' : ''}" data-act="transSide" data-v="vi">Bản dịch</button></div>${side}</aside></div>`;
  } else if (TMODE === 'jp' || !vi.length) body = jp.map(x => `<div class="tpair"><p class="tjp jp">${hi(x)}</p></div>`).join('');
  else if (pi.level === 'para') body = jp.map((x, i) => `<div class="tpair"><p class="tjp jp">${hi(x)}</p>${viP(vi[i])}</div>`).join('');
  else if (pi.level === 'sent') { let k = 0; body = pi.S.map(ss => `<div class="tpair sent">${ss.map(s => `<div class="srow"><p class="tjp jp">${hi(s)}</p>${viP(vi[k++])}</div>`).join('')}</div>`).join(''); }
  else body = `<div class="tpair"><div class="tjp jp">${jp.map(x => `<p>${hi(x)}</p>`).join('')}</div></div><div class="tpair"><div class="tvi" ${TMODE === 'hide' ? 'data-act="transReveal" role="button" tabindex="0"' : ''}>${vi.map(x => `<p>${esc(x)}</p>`).join('')}</div><p class="small mute" style="margin:6px 0 0">Số dòng bản dịch (${vi.length}) không khớp số đoạn (${jp.length}) hay số câu (${pi.S.reduce((a, x) => a + x.length, 0)}) tiếng Nhật nên chưa ghép cặp. Muốn đối chiếu, để mỗi dòng dịch ứng với một đoạn hoặc một câu — hoặc dùng “Dịch từng câu” khi sửa.</p></div>`;
  return `<div class="page${TMODE === 'two' ? ' wide' : ''}">${pageTop(t.title || clip(t.jp, 24), true, `<button class="iconbtn" data-act="transEdit" data-id="${t.id}" aria-label="Sửa">✏️</button>`)}
  <div class="row wrap small mute" style="margin:0 0 8px;gap:10px"><span>${[...t.jp].length.toLocaleString('vi-VN')} chữ</span><span>${jp.length} đoạn</span>${jl ? `<span class="tag ${jl.toLowerCase()}">${jl}</span>` : ''}${t.note ? `<span>${esc(t.note)}</span>` : ''}</div>
  <div class="chips" style="margin-bottom:10px">${mode('two', 'Hai bên')}${mode('pair', 'Đối chiếu')}${mode('hide', 'Che bản dịch')}${mode('jp', 'Chỉ tiếng Nhật')}</div>
  <div class="tbody" data-paired="${paired && TMODE !== 'jp' ? 1 : 0}">${body}</div></div>`;
}
ACT.transSide = el => { TSIDE = el.dataset.v; const v = $('#view'), top = v.scrollTop; render(); v.scrollTop = top; };
ACT.transMode = el => { TMODE = el.dataset.v; const v = $('#view'), top = v.scrollTop; render(); v.scrollTop = top; };
ACT.transReveal = el => el.classList.toggle('shown');
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.act === 'transReveal') { e.preventDefault(); e.target.classList.toggle('shown'); } });

// ── Thêm / sửa: một trang chia đôi (trái = văn bản gốc, phải = bản dịch); chế độ "Từng câu" ghép mỗi câu với một ô dịch ──
let TED = null, TEDMODE = 'text';
const tedFresh = id => { const t = id ? S.translations.find(x => x.id === id) : null; return { id: id || '', title: t?.title || '', jp: t?.jp || '', vi: t?.vi || '', glossary: t?.glossary || '', note: t?.note || '', jlpt: t ? (t.jlpt_level || '') : (TFILT.jlpt || ''), base: t ? { ...t } : null }; };
function openTransForm(id) { if (id && !S.translations.find(x => x.id === id)) return; TED = tedFresh(id); TEDMODE = 'text'; ACT.sub({ dataset: { name: 'transedit', id: id || '' } }); }
function viewTransEdit() {
  if (!TED) return viewTrans();
  const D = TED, v = x => esc(x ?? ''), id = D.id;
  const head = `<div class="trow3"><label class="field"><span>Tiêu đề (không bắt buộc)</span><input name="title" value="${v(D.title)}" maxlength="200" placeholder="vd. Bài đọc Minna bài 12"></label>
    <label class="field"><span>JLPT</span><select name="jlpt_level"><option value="">—</option>${JLPT.map(j => `<option ${D.jlpt === j ? 'selected' : ''}>${j}</option>`).join('')}</select></label></div>`;
  const modes = `<div class="chips" style="margin:2px 0 10px"><button type="button" class="chip ${TEDMODE === 'text' ? 'on' : ''}" data-act="tedMode" data-v="text">Hai khung</button><button type="button" class="chip ${TEDMODE === 'sent' ? 'on' : ''}" data-act="tedMode" data-v="sent">Dịch từng câu</button></div>`;
  let main;
  if (TEDMODE === 'text') {
    main = `<div class="ted2"><section class="tcol orig" id="tw-jp"><h3 class="colh orig"><span class="lb orig">原文</span> Văn bản gốc · Tiếng Nhật * <small class="mute" id="tc-jp"></small></h3>
      <textarea name="jp" class="jp tarea" maxlength="30000" placeholder="Dán câu hoặc đoạn văn tiếng Nhật vào đây…" ${id ? '' : 'autofocus'}>${v(D.jp)}</textarea></section>
      <section class="tcol trn"><h3 class="colh trn"><span class="lb trn">VI</span> Bản dịch · Tiếng Việt <small class="mute" id="tc-vi"></small></h3>
      <textarea name="vi" class="tarea" maxlength="40000" placeholder="Ghi bản dịch tiếng Việt… (mỗi dòng ứng với một đoạn hoặc một câu tiếng Nhật)">${v(D.vi)}</textarea>
      <p class="small mute" id="tpair" style="margin:6px 0 0"></p></section></div>`;
  } else {
    const pi = pairInfo(D.jp, D.vi);
    if (!pi.P.length) main = '<p class="mute">Hãy nhập văn bản tiếng Nhật ở chế độ “Hai khung” trước.</p><input type="hidden" name="jp" value="">';
    else {
      let k = 0;
      main = `<input type="hidden" name="jp" value="${v(D.jp)}"><p class="small mute" style="margin:0 0 8px">Mỗi câu tiếng Nhật có một ô để ghi nghĩa. Câu bỏ trống sẽ lưu là “${SENT_TODO}” (chưa dịch). Muốn sửa văn bản gốc: quay về “Hai khung”.</p>
      ${pi.level === 'para' && pi.V.length && pi.S.some(s => s.length > 1) ? `<details class="small mute" style="margin-bottom:8px"><summary>Bản dịch hiện có (theo đoạn) — sẽ được thay khi bạn dịch từng câu</summary>${pi.V.map(x => `<p style="margin:4px 0">${esc(x)}</p>`).join('')}</details>` : ''}
      <div class="sedit">${pi.S.map((ss, pidx) => `<div class="sgrp">${ss.map(s => { const cur = pi.level === 'sent' ? pi.V[k] : ''; const i = k++; return `<div class="srow2"><div class="sjp jp"><span class="lb orig">原</span>${esc(s)}</div><label class="svi"><span class="lb trn">VI</span><textarea data-sv="${i}" rows="2" maxlength="2000" placeholder="Dịch câu này…">${v(cur === SENT_TODO ? '' : cur)}</textarea></label></div>`; }).join('')}</div>`).join('')}</div><p class="small mute" id="tpair" style="margin:8px 0 0">${k} câu</p>`;
    }
  }
  return `<div class="page wide">${pageTop(id ? 'Sửa bản dịch' : 'Thêm bản dịch', true, '')}
  <form id="tf" autocomplete="off" data-id="${id}">${head}${modes}${main}
    <details class="tedx" ${D.glossary || D.note ? 'open' : ''}><summary>Từ vựng và ghi chú</summary>
      <label class="field"><span>Từ vựng — mỗi dòng: từ = nghĩa <small class="mute">(hiện ở cột bên phải khi đọc)</small></span><textarea name="glossary" class="tarea" rows="5" maxlength="20000" placeholder="友達 = bạn bè&#10;映画 = phim">${v(D.glossary)}</textarea></label>
      <label class="field"><span>Ghi chú</span><input name="note" value="${v(D.note)}" maxlength="500" placeholder="Nguồn, từ khó, ngữ pháp cần nhớ…"></label></details>
    <div class="row sheet-actions tedbar">${id ? '<button type="button" class="btn danger" data-act="transDel">Xóa</button>' : ''}<button type="button" class="btn grow" data-act="back">Hủy</button><button type="submit" class="btn primary grow">Lưu</button></div></form></div>`;
}
// Gom dữ liệu đang gõ trong form về TED (cả hai chế độ)
function tedCapture(f) {
  const D = TED, e = f.elements; D.title = e.title.value; D.jlpt = e.jlpt_level.value; D.glossary = e.glossary.value; D.note = e.note.value; D.jp = e.jp.value;
  const sv = [...f.querySelectorAll('[data-sv]')];
  if (sv.length) { const lines = sv.map(x => x.value.replace(/\s+/g, ' ').trim()); D.vi = lines.some(Boolean) ? lines.map(x => x || SENT_TODO).join('\n') : ''; }
  else if (e.vi) D.vi = e.vi.value;
  return D;
}
function tedInfo(f) {
  if (!f.elements.vi) return; const j = f.elements.jp.value, vv = f.elements.vi.value, pi = pairInfo(j, vv), n = pi.S.reduce((a, x) => a + x.length, 0);
  $('#tc-jp').textContent = j ? `· ${[...j].length.toLocaleString('vi-VN')} chữ` : ''; $('#tc-vi').textContent = vv ? `· ${[...vv].length.toLocaleString('vi-VN')} chữ` : '';
  $('#tpair').textContent = !vv.trim() ? 'Mỗi dòng tiếng Việt ứng với một đoạn hoặc một câu tiếng Nhật thì trang đọc sẽ ghép cặp để đối chiếu. Hoặc bấm “Dịch từng câu”.'
    : pi.level === 'para' ? `✓ ${pi.P.length} đoạn tiếng Nhật khớp ${pi.V.length} dòng dịch — đối chiếu từng đoạn.`
    : pi.level === 'sent' ? `✓ ${n} câu tiếng Nhật khớp ${pi.V.length} dòng dịch — đối chiếu từng câu.`
    : `Tiếng Nhật ${pi.P.length} đoạn (${n} câu), bản dịch ${pi.V.length} dòng — chưa ghép cặp được (vẫn lưu bình thường).`;
}
document.addEventListener('input', e => { const f = e.target.closest && e.target.closest('#tf'); if (f) tedInfo(f); });
ACT.tedMode = el => { const f = $('#tf'); if (!f || TEDMODE === el.dataset.v) return; tedCapture(f); TEDMODE = el.dataset.v; const v = $('#view'), top = v.scrollTop; render(); v.scrollTop = top; };
document.addEventListener('submit', async e => {
  const f = e.target; if (!f || f.id !== 'tf') return; e.preventDefault(); if (f._busy) return;
  const D = tedCapture(f), id = D.id || null, jp = D.jp.trim(), wrap = $('#tw-jp'); wrap && wrap.classList.toggle('err', !jp);
  if (!jp) { if (TEDMODE !== 'text') { TEDMODE = 'text'; render(); } return toast('Cần nhập văn bản tiếng Nhật', true); }
  const base = D.base, data = { title: D.title.trim() || null, jp, vi: (D.vi || '').trim() || null, note: D.note.trim() || null, jlpt_level: safeJlpt(D.jlpt) };
  { const gtxt = fmtGlossary(parseGlossary(D.glossary)); if (gtxt || (id && base && base.glossary)) data.glossary = gtxt || null; }   // không gửi cột glossary khi trống (máy chủ chưa nâng schema vẫn lưu được)
  f._busy = true; let note = id ? 'Đã lưu' : 'Đã thêm bản dịch';
  const ok = await guard(async () => {
    const r = await saveTranslation(id, data, base, askConflict);
    if (r.cancelled) note = 'Đã giữ bản từ thiết bị khác, thay đổi của bạn không được lưu'; else if (r.merged) note = 'Đã lưu — đã gộp với thay đổi từ thiết bị khác';
  });
  f._busy = false; if (ok !== undefined) { toast(note); TED = null; leaveSub(); }
});
ACT.transDel = async el => {
  const f = el.closest('form'), t = S.translations.find(x => x.id === f.dataset.id); if (!t) return;
  if (!await confirmBox(`Xóa bản dịch "${t.title || clip(t.jp, 20)}"? Không thể hoàn tác.`, 'Xóa', true)) return;
  if (await guard(() => deleteTranslation(t.id), 'Đã xóa') !== undefined) { TED = null; leaveSub(); }
};
