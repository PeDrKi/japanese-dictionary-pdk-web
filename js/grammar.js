/* grammar.js — trang "Ngữ pháp": lưu mẫu câu, cấu tạo, giải thích, ví dụ (Khác → Ngữ pháp, hoặc phím g) */
'use strict';
const GFILT = { search: '', jlpt: '' };

function grammarRow(g) {
  const jl = safeJlpt(g.jlpt_level);
  return `<button class="item" data-act="openGrammar" data-id="${g.id}"><span class="grow"><span class="t jp" style="font-size:17px">${esc(g.title)}</span><br><span class="s">${esc(g.meaning_vi || '')}</span></span>${jl ? `<span class="tag ${jl.toLowerCase()}">${jl}</span>` : ''}</button>`;
}
function grammarBody() {
  const list = filterGrammar(GFILT);
  if (!S.grammarOk) return emptyBox('文', 'Chưa bật tính năng Ngữ pháp', 'Cơ sở dữ liệu cần chạy lại <b>schema.sql</b> (bản 7) trong Supabase → SQL Editor. Xem README.');
  return `<div class="mute small countrow"><span>${list.length}${list.length !== S.grammar_points.length ? ' / ' + S.grammar_points.length : ''} mẫu câu</span></div>
  <div class="list" id="gramlist">${list.map(grammarRow).join('') || (GFILT.search || GFILT.jlpt
    ? emptyBox('文', 'Không có mẫu câu khớp', 'Thử bỏ bộ lọc hoặc đổi từ khóa.')
    : emptyBox('文', 'Chưa có mẫu ngữ pháp nào', 'Bấm nút + để lưu mẫu câu đầu tiên, vd 〜てから (sau khi…).')) }</div>`;
}
function viewGrammar() {
  return `<div class="page">${pageTop('Ngữ pháp', !isTopTab(), S.grammarOk ? '<button class="btn primary" data-act="newGrammar">+ Thêm</button>' : '')}
  <div class="search"><input class="input" id="gq" type="search" placeholder="Tìm mẫu câu, nghĩa, ví dụ…" value="${esc(GFILT.search)}" autocomplete="off" aria-label="Tìm ngữ pháp"></div>
  <div class="chips" style="margin-top:8px"><button class="chip ${GFILT.jlpt ? '' : 'on'}" data-act="gramLevel" data-v="">Tất cả</button>${JLPT.map(j => `<button class="chip ${GFILT.jlpt === j ? 'on' : ''}" data-act="gramLevel" data-v="${j}">${j}</button>`).join('')}</div>
  <div id="grambody">${grammarBody()}</div>
  ${S.grammarOk ? '<button class="fab" data-act="newGrammar" aria-label="Thêm mẫu ngữ pháp">+</button>' : ''}</div>`;
}
let gqTimer;
document.addEventListener('input', e => {   // chỉ cập nhật danh sách, không dựng lại ô nhập (để bộ gõ tiếng Nhật không bị ngắt)
  if (e.target.id !== 'gq') return; clearTimeout(gqTimer);
  gqTimer = setTimeout(() => { GFILT.search = e.target.value; const b = $('#grambody'); if (b) b.innerHTML = grammarBody(); }, 200);
});
ACT.gramLevel = el => { GFILT.jlpt = el.dataset.v; render(); };
ACT.newGrammar = () => openGrammarForm(null);
ACT.openGrammar = el => openGrammarSheet(el.dataset.id);

function openGrammarSheet(id) {
  const g = S.grammar_points.find(x => x.id === id); if (!g) return;
  const jl = safeJlpt(g.jlpt_level), ex = parseExamples(g.examples);
  const s = openSheet(`<div class="row" style="align-items:flex-start;gap:10px"><h2 class="jp grow" style="margin:0 0 6px">${esc(g.title)}</h2>${jl ? `<span class="tag ${jl.toLowerCase()}">${jl}</span>` : ''}</div>
    ${g.meaning_vi ? `<p style="font-size:17px;margin:4px 0 12px">${esc(g.meaning_vi)}</p>` : ''}
    ${g.structure ? `<div class="card" style="margin-bottom:12px"><div class="small mute">Cấu tạo</div><div class="jp" style="font-size:18px;white-space:pre-wrap">${esc(g.structure)}</div></div>` : ''}
    ${g.explanation ? `<div style="margin-bottom:12px"><div class="small mute">Giải thích · cách dùng</div><div style="white-space:pre-wrap">${esc(g.explanation)}</div></div>` : ''}
    ${ex.length ? `<div class="small mute">Ví dụ</div><div class="list" style="margin-bottom:12px">${ex.map(e => `<div class="item" style="display:block"><div class="jp" style="font-size:17px">${esc(e.jp)}</div>${e.vi ? `<div class="s">${esc(e.vi)}</div>` : ''}</div>`).join('')}</div>` : ''}
    <div class="row sheet-actions"><button class="btn danger" data-act="delGrammar" data-id="${id}">Xóa</button><button class="btn grow" data-close>Đóng</button><button class="btn primary grow" data-act="editGrammar" data-id="${id}">Sửa</button></div>`);
  window._gs = s;
}
ACT.editGrammar = el => { window._gs?.close(); openGrammarForm(el.dataset.id); };
ACT.delGrammar = async el => {
  const g = S.grammar_points.find(x => x.id === el.dataset.id); if (!g) return;
  if (!await confirmBox(`Xóa mẫu "${g.title}"? Không thể hoàn tác.`, 'Xóa', true)) return;
  if (await guard(() => deleteGrammar(g.id), 'Đã xóa') !== undefined) { window._gs?.close(); render(); }
};

function openGrammarForm(id) {
  const g = id ? S.grammar_points.find(x => x.id === id) : { title: '', meaning_vi: '', structure: '', explanation: '', examples: '', jlpt_level: GFILT.jlpt || '' };
  if (!g) return;
  const base = id ? { ...g } : null, v = k => esc(g[k] ?? '');
  const s = openSheet(`<h2>${id ? 'Sửa' : 'Thêm'} ngữ pháp</h2>
  <form id="gf" autocomplete="off">
    <label class="field" id="gw-title"><span>Mẫu câu *</span><input name="title" class="jp" style="font-size:20px" value="${v('title')}" maxlength="200" placeholder="〜てから" ${id ? '' : 'autofocus'}></label>
    <label class="field" id="gw-meaning"><span>Nghĩa / ý nghĩa *</span><input name="meaning_vi" value="${v('meaning_vi')}" maxlength="300" placeholder="Sau khi làm A thì làm B"></label>
    <label class="field"><span>Cấu tạo</span><input name="structure" class="jp" value="${v('structure')}" maxlength="300" placeholder="V-て + から"></label>
    <label class="field"><span>JLPT</span><select name="jlpt_level"><option value="">—</option>${JLPT.map(j => `<option ${g.jlpt_level === j ? 'selected' : ''}>${j}</option>`).join('')}</select></label>
    <label class="field"><span>Giải thích · cách dùng · lưu ý</span><textarea name="explanation" rows="4" maxlength="3000">${v('explanation')}</textarea></label>
    <label class="field"><span>Ví dụ — mỗi dòng: câu tiếng Nhật | nghĩa tiếng Việt</span><textarea name="examples" class="jp" rows="5" maxlength="4000" placeholder="ご飯を食べてから、薬を飲みます。 | Sau khi ăn cơm thì uống thuốc.">${v('examples')}</textarea></label>
    <div class="row sheet-actions"><button type="button" class="btn grow" data-close>Hủy</button><button type="submit" class="btn primary grow">Lưu</button></div>
  </form>`, { sticky: true });
  const form = s.$('#gf');
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (form._busy) return;
    const f = Object.fromEntries(new FormData(form)), t = f.title.trim(), m = f.meaning_vi.trim();
    $('#gw-title', form).classList.toggle('err', !t); $('#gw-meaning', form).classList.toggle('err', !m);
    if (!t || !m) return toast('Cần nhập mẫu câu và nghĩa', true);
    const dup = S.grammar_points.some(x => x.id !== id && x.title.trim() === t);
    if (dup && !await confirmBox(`Mẫu "${t}" đã có. Vẫn lưu thêm?`, 'Vẫn lưu')) return;
    const data = { title: t, meaning_vi: m, structure: f.structure.trim() || null, explanation: f.explanation.trim() || null, examples: f.examples.trim() || null, jlpt_level: safeJlpt(f.jlpt_level) || null };
    form._busy = true; let note = id ? 'Đã lưu' : 'Đã thêm mẫu ngữ pháp';
    const ok = await guard(async () => {
      const r = await saveGrammar(id, data, base, askConflict);
      if (r.cancelled) note = 'Đã giữ bản từ thiết bị khác, thay đổi của bạn không được lưu'; else if (r.merged) note = 'Đã lưu — đã gộp với thay đổi từ thiết bị khác';
    });
    form._busy = false;
    if (ok !== undefined) { toast(note); s.close(); render(); }
  });
}
