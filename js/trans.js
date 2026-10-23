/* trans.js — trang "Bản dịch": dán văn bản tiếng Nhật (1 câu … cả bài dài cỡ 1 trang A4), ghi nghĩa tiếng Việt; xem đối chiếu từng đoạn. Phím tắt: d */
'use strict';
const TFILT = { search: '', jlpt: '' };
let TMODE = 'pair';   // pair = đối chiếu từng đoạn · jp = chỉ tiếng Nhật · hide = che bản dịch để tự kiểm tra
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
  const para = node && node.closest && node.closest('p.tjp, .tjp p'), pair = node && node.closest && node.closest('.tpair');
  if (!text || [...text].length > 300 || !para || !pair || !$('.tbody')) return null;
  const sub = NAV.sub && NAV.sub.name === 'transitem' ? S.translations.find(t => t.id === NAV.sub.id) : null; if (!sub) return null;
  const paired = $('.tbody').dataset.paired === '1', vi = paired ? (pair.querySelector('.tvi')?.textContent || '').trim() : '';
  return { text, sentence: sentenceOf(para.textContent, text), paragraph: para.textContent.trim(), vi, title: sub.title || clip(sub.jp, 20) };
}
function updateSelBar() {
  TSEL = readSelection(); let bar = $('#selnote');
  if (!TSEL) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'selnote'; bar.className = 'selnote'; document.body.appendChild(bar); bar.addEventListener('pointerdown', e => e.preventDefault()); }
  bar.innerHTML = `<span class="jp selnote-t">${esc(clip(TSEL.text, 14))}</span><button class="btn primary" data-act="noteVocab">＋ Thẻ từ vựng</button><button class="btn" data-act="noteGrammar">＋ Ví dụ ngữ pháp</button>`;
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
ACT.noteGrammar = () => {
  const t = TSEL; if (!t) return; closeSelBar();
  if (!S.grammarOk) return toast('Cần chạy lại schema.sql (bản 7) để dùng Ngữ pháp', true);
  const line = t.text.length >= 8 || /[。！？]/.test(t.text) ? t.text : t.sentence;
  const ex = `${line}${t.vi && t.paragraph === line ? ' | ' + t.vi : ''}`;
  const draw = q => filterGrammar({ search: q }).slice(0, 30).map(g => `<button class="item" data-act="gramAddEx" data-id="${g.id}"><span class="grow"><span class="t jp">${esc(g.title)}</span><br><span class="s">${esc(g.meaning_vi || '')}</span></span><span class="mute">＋</span></button>`).join('') || '<p class="mute small" style="padding:8px">Chưa có mẫu nào khớp.</p>';
  const s = openSheet(`<h2>Thêm làm ví dụ ngữ pháp</h2><div class="card jp" style="margin-bottom:10px;white-space:pre-wrap">${esc(ex)}</div>
    <input class="input" id="gx-q" type="search" placeholder="Tìm mẫu ngữ pháp…" autocomplete="off" aria-label="Tìm mẫu ngữ pháp"><div class="sp"></div>
    <div class="list" id="gx-list" style="max-height:40vh;overflow:auto">${draw('')}</div><div class="sp"></div>
    <button class="btn block" data-act="gramNewFromEx">+ Tạo mẫu ngữ pháp mới với ví dụ này</button>`);
  window._gx = { s, ex };
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
function viewTransItem(sub) {
  const t = S.translations.find(x => x.id === sub.id); if (!t) return viewTrans();
  const jp = splitParas(t.jp), vi = splitParas(t.vi), paired = vi.length === jp.length && vi.length > 0, jl = safeJlpt(t.jlpt_level);
  const mode = (m, l) => `<button class="chip ${TMODE === m ? 'on' : ''}" data-act="transMode" data-v="${m}">${l}</button>`;
  const viP = (x, i) => TMODE === 'hide' ? `<p class="tvi cover" data-act="transReveal" role="button" tabindex="0" aria-label="Bấm để hiện bản dịch">${esc(x)}</p>` : `<p class="tvi">${esc(x)}</p>`;
  let body;
  if (TMODE === 'jp' || !vi.length) body = jp.map(x => `<div class="tpair"><p class="tjp jp">${esc(x)}</p></div>`).join('');
  else if (paired) body = jp.map((x, i) => `<div class="tpair"><p class="tjp jp">${esc(x)}</p>${viP(vi[i], i)}</div>`).join('');
  else body = `<div class="tpair"><div class="tjp jp">${jp.map(x => `<p>${esc(x)}</p>`).join('')}</div></div><div class="tpair"><div class="tvi" ${TMODE === 'hide' ? 'data-act="transReveal" role="button" tabindex="0"' : ''}>${vi.map(x => `<p>${esc(x)}</p>`).join('')}</div><p class="small mute" style="margin:6px 0 0">Số đoạn tiếng Nhật (${jp.length}) và tiếng Việt (${vi.length}) khác nhau nên không ghép cặp. Muốn đối chiếu từng đoạn, để mỗi dòng tiếng Nhật ứng với một dòng tiếng Việt.</p></div>`;
  return `<div class="page">${pageTop(t.title || clip(t.jp, 24), true, `<button class="iconbtn" data-act="transEdit" data-id="${t.id}" aria-label="Sửa">✏️</button>`)}
  <div class="row wrap small mute" style="margin:0 0 8px;gap:10px"><span>${[...t.jp].length.toLocaleString('vi-VN')} chữ</span><span>${jp.length} đoạn</span>${jl ? `<span class="tag ${jl.toLowerCase()}">${jl}</span>` : ''}${t.note ? `<span>${esc(t.note)}</span>` : ''}</div>
  ${vi.length ? `<div class="chips" style="margin-bottom:10px">${mode('pair', 'Đối chiếu')}${mode('jp', 'Chỉ tiếng Nhật')}${mode('hide', 'Che bản dịch')}</div>` : '<p class="small mute">Chưa có bản dịch — bấm ✏️ để ghi nghĩa tiếng Việt.</p>'}
  <div class="tbody" data-paired="${paired && TMODE !== 'jp' ? 1 : 0}">${body}</div></div>`;
}
ACT.transMode = el => { TMODE = el.dataset.v; const v = $('#view'), top = v.scrollTop; render(); v.scrollTop = top; };
ACT.transReveal = el => el.classList.toggle('shown');
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.act === 'transReveal') { e.preventDefault(); e.target.classList.toggle('shown'); } });

// ── Thêm / sửa ──
function openTransForm(id) {
  const t = id ? S.translations.find(x => x.id === id) : { title: '', jp: '', vi: '', note: '', jlpt_level: TFILT.jlpt || '' }; if (!t) return;
  const base = id ? { ...t } : null, v = k => esc(t[k] ?? '');
  const s = openSheet(`<h2>${id ? 'Sửa bản dịch' : 'Thêm bản dịch'}</h2><form id="tf" autocomplete="off">
    <label class="field"><span>Tiêu đề (không bắt buộc)</span><input name="title" value="${v('title')}" maxlength="200" placeholder="vd. Bài đọc Minna bài 12"></label>
    <label class="field" id="tw-jp"><span>Tiếng Nhật * <small class="mute" id="tc-jp"></small></span><textarea name="jp" class="jp tarea" rows="8" maxlength="30000" placeholder="Dán câu hoặc đoạn văn tiếng Nhật vào đây…" ${id ? '' : 'autofocus'}>${v('jp')}</textarea></label>
    <label class="field"><span>Nghĩa tiếng Việt <small class="mute" id="tc-vi"></small></span><textarea name="vi" class="tarea" rows="8" maxlength="40000" placeholder="Ghi bản dịch tiếng Việt…">${v('vi')}</textarea></label>
    <p class="small mute" id="tpair" style="margin:-4px 0 12px"></p>
    <label class="field"><span>JLPT</span><select name="jlpt_level"><option value="">—</option>${JLPT.map(j => `<option ${t.jlpt_level === j ? 'selected' : ''}>${j}</option>`).join('')}</select></label>
    <label class="field"><span>Ghi chú</span><input name="note" value="${v('note')}" maxlength="500" placeholder="Nguồn, từ khó, ngữ pháp cần nhớ…"></label>
    <div class="row sheet-actions">${id ? '<button type="button" class="btn danger" data-act="transDel">Xóa</button>' : ''}<button type="button" class="btn grow" data-close>Hủy</button><button type="submit" class="btn primary grow">Lưu</button></div></form>`, { sticky: true });
  const f = s.$('#tf'); f._id = id; f._s = s;
  const info = () => {
    const j = f.elements.jp.value, vv = f.elements.vi.value, a = splitParas(j).length, b = splitParas(vv).length;
    s.$('#tc-jp').textContent = j ? `· ${[...j].length.toLocaleString('vi-VN')} chữ` : ''; s.$('#tc-vi').textContent = vv ? `· ${[...vv].length.toLocaleString('vi-VN')} chữ` : '';
    s.$('#tpair').textContent = !vv.trim() ? 'Mỗi dòng / đoạn tiếng Nhật ứng với một dòng / đoạn tiếng Việt thì trang đọc sẽ ghép cặp để đối chiếu.' : a === b ? `✓ ${a} đoạn tiếng Nhật khớp ${b} đoạn tiếng Việt — sẽ hiện đối chiếu từng đoạn.` : `Tiếng Nhật ${a} đoạn, tiếng Việt ${b} đoạn — chưa ghép cặp được (vẫn lưu bình thường).`;
  };
  f.addEventListener('input', info); info();
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (f._busy) return;
    const jp = f.elements.jp.value.trim(); $('#tw-jp', f).classList.toggle('err', !jp); if (!jp) return toast('Cần nhập văn bản tiếng Nhật', true);
    const data = { title: f.elements.title.value.trim() || null, jp, vi: f.elements.vi.value.trim() || null, note: f.elements.note.value.trim() || null, jlpt_level: safeJlpt(f.elements.jlpt_level.value) };
    f._busy = true; let note = id ? 'Đã lưu' : 'Đã thêm bản dịch';
    const ok = await guard(async () => {
      const r = await saveTranslation(id, data, base, askConflict);
      if (r.cancelled) note = 'Đã giữ bản từ thiết bị khác, thay đổi của bạn không được lưu'; else if (r.merged) note = 'Đã lưu — đã gộp với thay đổi từ thiết bị khác';
    });
    f._busy = false; if (ok !== undefined) { toast(note); s.close(); render(); }
  });
}
ACT.transDel = async el => {
  const f = el.closest('form'), t = S.translations.find(x => x.id === f._id); if (!t) return;
  if (!await confirmBox(`Xóa bản dịch "${t.title || clip(t.jp, 20)}"? Không thể hoàn tác.`, 'Xóa', true)) return;
  if (await guard(() => deleteTranslation(t.id), 'Đã xóa') !== undefined) { f._s.close(); if (NAV.sub) leaveSub(); else render(); }
};
