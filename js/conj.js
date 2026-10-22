/* conj.js — trang "Chia động từ": bảng động từ (cột đầu: thể ます) × các thể khác.
   Sửa nội dung từng ô ngay trên bảng; thêm / sửa / xóa / ẩn / đổi thứ tự cột; tự điền theo quy tắc chia (nhóm 1 / 2 / 3). Phím tắt: v */
'use strict';
const CFILT = { search: '', grp: '' };
const GRP_LABEL = { 1: 'Nhóm 1', 2: 'Nhóm 2', 3: 'Nhóm 3' };
const GRP_HINT = { 1: '五段 · のみます, かきます', 2: '一段 · たべます, みます', 3: 'します · きます' };
const kindInfo = k => CONJ_KINDS.find(x => x[0] === k);

function conjFiltered() {
  let vs = conjVerbs();
  if (CFILT.grp) vs = vs.filter(v => String(v.grp) === CFILT.grp);
  const q = CFILT.search.trim().toLowerCase();
  if (q) vs = vs.filter(v => (v.masu + ' ' + (v.meaning_vi || '') + ' ' + conjForms(true).map(f => conjCell(v.id, f.id)).join(' ')).toLowerCase().includes(q));
  return vs;
}
function conjTable() {
  if (!S.conjOk) return emptyBox('活', 'Chưa bật tính năng Chia động từ', 'Cơ sở dữ liệu cần chạy lại <b>schema.sql</b> (bản 10) trong Supabase → SQL Editor. Xem README.');
  const forms = conjForms(), all = conjVerbs(), vs = conjFiltered(), hidden = S.conj_forms.length - forms.length;
  if (!S.conj_forms.length) return `<div class="empty"><div class="g jp">活</div><p><b>Chưa có cột nào</b></p><p class="small">Bấm để tạo sẵn các thể thông dụng (辞書形, ない形, て形, た形, 可能形…) — sau đó bạn vẫn thêm / sửa / xóa / ẩn cột tùy ý.</p>
    <p><button class="btn primary" data-act="conjDefaults">Thêm các thể thông dụng</button> <button class="btn" data-act="newConjForm">+ Tự thêm cột</button></p></div>`;
  const head = `<tr><th class="c-first" scope="col">ます形</th>${forms.map(f => { const k = kindInfo(f.kind); return `<th scope="col"><button class="c-head jp" data-act="editConjForm" data-id="${f.id}" title="${esc(k ? k[2] : 'Cột tự đặt')} — bấm để sửa">${esc(f.name)}</button></th>`; }).join('')}<th class="c-add"><button class="iconbtn" data-act="newConjForm" aria-label="Thêm cột" title="Thêm cột">+</button></th></tr>`;
  const rows = vs.map((v, r) => `<tr><th class="c-first" scope="row"><button class="c-verb" data-act="editConjVerb" data-id="${v.id}"><span class="jp masu">${esc(v.masu)}</span>${v.grp ? `<span class="gtag g${v.grp}">${v.grp}</span>` : '<span class="gtag g0" title="Chưa chọn nhóm">?</span>'}${v.meaning_vi ? `<span class="s">${esc(v.meaning_vi)}</span>` : ''}</button></th>
    ${forms.map(f => `<td><input class="jp cell" data-v="${v.id}" data-f="${f.id}" value="${esc(conjCell(v.id, f.id))}" maxlength="200" autocomplete="off" aria-label="${esc(v.masu)} — ${esc(f.name)}"></td>`).join('')}<td></td></tr>`).join('');
  const none = !vs.length ? `<p class="mute small" style="padding:14px">${all.length ? 'Không có động từ khớp bộ lọc.' : 'Chưa có động từ nào. Bấm “+ Động từ” (hoặc “Lấy từ thẻ”) để bắt đầu.'}</p>` : '';
  return `<div class="mute small countrow"><span>${vs.length}${vs.length !== all.length ? ' / ' + all.length : ''} động từ · ${forms.length} cột${hidden ? ` · <button class="linkbtn" data-act="conjCols">${hidden} cột đang ẩn</button>` : ''}</span></div>
  <div class="conjwrap"><table class="conj"><thead>${head}</thead><tbody>${rows}</tbody></table>${none}</div>`;
}
function viewConj() {
  const chip = (v, t) => `<button class="chip ${CFILT.grp === v ? 'on' : ''}" data-act="conjGrp" data-v="${v}">${t}</button>`;
  return `<div class="page wide">${pageTop('Chia động từ', !isTopTab(), S.conjOk ? '<button class="btn primary" data-act="newConjVerb">+ Động từ</button>' : '')}
  ${S.conjOk ? `<div class="search"><input class="input" id="cq" type="search" placeholder="Tìm động từ, nghĩa hoặc thể đã chia…" value="${esc(CFILT.search)}" autocomplete="off" aria-label="Tìm động từ"></div>
  <div class="chips" style="margin-top:8px;flex-wrap:wrap">${chip('', 'Tất cả')}${chip('1', 'Nhóm 1')}${chip('2', 'Nhóm 2')}${chip('3', 'Nhóm 3')}
    <span class="grow" style="min-width:8px"></span><button class="chip" data-act="conjCols">Cột…</button><button class="chip" data-act="conjImport">Lấy từ thẻ</button><button class="chip" data-act="conjFillAll">Tự điền ô trống</button></div>` : ''}
  <div id="conjbody">${conjTable()}</div></div>`;
}
const redrawConj = () => { const b = $('#conjbody'); if (b) { const w = $('.conjwrap', b); const t = w ? w.scrollTop : 0, l = w ? w.scrollLeft : 0; b.innerHTML = conjTable(); const n = $('.conjwrap', b); if (n) { n.scrollTop = t; n.scrollLeft = l; } } };
let cqTimer;
document.addEventListener('input', e => { if (e.target.id !== 'cq') return; clearTimeout(cqTimer); cqTimer = setTimeout(() => { CFILT.search = e.target.value; redrawConj(); }, 200); });
ACT.conjGrp = el => { CFILT.grp = el.dataset.v; render(); };

// ── Sửa ô ngay trên bảng: rời ô / Enter là lưu; Esc hoàn tác; Enter nhảy xuống ô dưới ──
document.addEventListener('change', async e => {
  const el = e.target; if (!el.classList || !el.classList.contains('cell')) return;
  const old = conjCell(el.dataset.v, el.dataset.f);
  const ok = await guard(() => setConjCell(el.dataset.v, el.dataset.f, el.value));
  if (ok === undefined) el.value = old; else el.value = conjCell(el.dataset.v, el.dataset.f);
});
document.addEventListener('keydown', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('cell') || e.isComposing) return;
  if (e.key === 'Escape') { el.value = conjCell(el.dataset.v, el.dataset.f); el.blur(); e.preventDefault(); return; }
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); const col = [...document.querySelectorAll(`.cell[data-f="${el.dataset.f}"]`)], i = col.indexOf(el);
    el.dispatchEvent(new Event('change', { bubbles: true })); const nx = col[i + 1]; if (nx) { nx.focus(); nx.select(); } else el.blur();
  }
});

// ── Thêm động từ / sửa động từ ──
ACT.newConjVerb = () => openConjVerbForm(null);
ACT.editConjVerb = el => openConjVerbForm(el.dataset.id);
function guessGroup(masu) { const m = (masu || '').trim(); return /^(します|きます|来ます)$|[\u4e00-\u9fff]します$/.test(m) ? 3 : 0; }   // gợi ý nhóm 3 (する / くる)
function openConjVerbForm(id) {
  const v = id ? S.conj_verbs.find(x => x.id === id) : { masu: '', meaning_vi: '', grp: CFILT.grp ? +CFILT.grp : 0 };
  if (!v) return;
  const s = openSheet(`<h2>${id ? 'Sửa động từ' : 'Thêm động từ'}</h2><form id="cvf" autocomplete="off">
    <label class="field" id="cv-masu"><span>Thể ます *</span><input name="masu" class="jp" style="font-size:20px" value="${esc(v.masu)}" maxlength="100" placeholder="たべます / 食べます" ${id ? '' : 'autofocus'}></label>
    <label class="field"><span>Nghĩa</span><input name="meaning_vi" value="${esc(v.meaning_vi || '')}" maxlength="300" placeholder="ăn"></label>
    <div class="field" id="cv-grp"><span>Nhóm *</span><div class="chips" style="flex-wrap:wrap">${[1, 2, 3].map(g => `<button type="button" class="chip ${v.grp === g ? 'on' : ''}" data-act="cvGrp" data-v="${g}">${GRP_LABEL[g]} <small class="mute">${GRP_HINT[g]}</small></button>`).join('')}</div></div>
    ${S.conj_forms.some(f => f.kind) ? `<label class="row" style="margin-bottom:10px"><input type="checkbox" name="fill" checked style="width:20px;height:20px"> <span>${id ? 'Điền các ô trống theo quy tắc chia' : 'Tự điền các thể theo quy tắc chia'}</span></label>` : ''}
    ${id ? '<p class="small" style="margin:0 0 10px"><button type="button" class="linkbtn" data-act="cvRefill">Điền lại TOÀN BỘ các thể của động từ này (ghi đè)</button></p>' : ''}
    <div class="row sheet-actions">${id ? '<button type="button" class="btn danger" data-act="cvDelete">Xóa</button>' : ''}<button type="button" class="btn grow" data-close>Hủy</button><button type="submit" class="btn primary grow">Lưu</button></div></form>`, { sticky: true });
  const f = s.$('#cvf'); f._v = { grp: v.grp || 0 }; f._id = id; f._s = s;
  f.elements.masu.addEventListener('input', () => { if (!f._v.grp) { const g = guessGroup(f.elements.masu.value); if (g) setCvGrp(f, g); } });
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (f._busy) return;
    const masu = f.elements.masu.value.trim(), grp = f._v.grp;
    $('#cv-masu', f).classList.toggle('err', !masu); $('#cv-grp', f).classList.toggle('err', !grp);
    if (!masu || !grp) return toast('Cần nhập thể ます và chọn nhóm', true);
    if (S.conj_verbs.some(x => x.id !== id && x.masu === masu) && !await confirmBox(`"${masu}" đã có trong bảng. Vẫn lưu thêm?`, 'Vẫn lưu')) return;
    f._busy = true; let filled = 0, note = '';
    const ok = await guard(async () => {
      const data = { masu, meaning_vi: f.elements.meaning_vi.value.trim() || null, grp };
      const r = id ? await updateConjVerb(id, data) : await addConjVerb(data);
      if (f.elements.fill?.checked) { filled = await fillConj({ verbIds: [r.id] }); if (!filled && !conjugate(masu, grp, 'dict')) note = ' — không tự điền được: kiểm tra thể ます và nhóm'; }
    });
    f._busy = false;
    if (ok !== undefined) { toast((id ? 'Đã lưu' : 'Đã thêm động từ') + (filled ? ` · điền ${filled} ô` : '') + note, !!note); s.close(); render(); }
  });
}
function setCvGrp(f, g) { f._v.grp = g; $$('[data-act=cvGrp]', f).forEach(b => b.classList.toggle('on', +b.dataset.v === g)); }
ACT.cvGrp = el => setCvGrp(el.closest('form'), +el.dataset.v);
ACT.cvDelete = async el => {
  const f = el.closest('form'), v = S.conj_verbs.find(x => x.id === f._id); if (!v) return;
  if (!await confirmBox(`Xóa động từ "${v.masu}" và các thể đã chia? Không thể hoàn tác.`, 'Xóa', true)) return;
  if (await guard(() => deleteConjVerb(v.id), 'Đã xóa') !== undefined) { f._s.close(); render(); }
};
ACT.cvRefill = async el => {
  const f = el.closest('form'), v = S.conj_verbs.find(x => x.id === f._id); if (!v) return;
  if (!await confirmBox(`Điền lại các thể của "${v.masu}"? Các ô đã sửa tay của cột có quy tắc chia sẽ bị ghi đè.`, 'Điền lại')) return;
  const n = await guard(() => fillConj({ verbIds: [v.id], overwrite: true })); if (n !== undefined) { toast(`Đã điền ${n} ô`); f._s.close(); render(); }
};

// ── Cột ──
ACT.newConjForm = () => openConjFormEdit(null);
ACT.editConjForm = el => openConjFormEdit(el.dataset.id);
ACT.conjDefaults = async () => { const r = await guard(() => addDefaultConjForms()); if (r !== undefined) { toast(r.length ? `Đã thêm ${r.length} cột` : 'Đã có đủ các thể thông dụng'); if (r.length && S.conj_verbs.length) await guard(() => fillConj({ formIds: r.map(x => x.id) })); render(); } };
function openConjFormEdit(id) {
  const f0 = id ? S.conj_forms.find(x => x.id === id) : { name: '', kind: '', hidden: false }; if (!f0) return;
  const s = openSheet(`<h2>${id ? 'Sửa cột' : 'Thêm cột'}</h2><form id="cff" autocomplete="off">
    <label class="field"><span>Loại thể (để tự điền)</span><select name="kind"><option value="">— Cột tự đặt (tự nhập nội dung) —</option>${CONJ_KINDS.map(k => `<option value="${k[0]}" ${f0.kind === k[0] ? 'selected' : ''}>${k[1]} — ${k[2]}</option>`).join('')}</select></label>
    <label class="field" id="cf-name"><span>Tên cột *</span><input name="name" class="jp" value="${esc(f0.name)}" maxlength="60" placeholder="て形" ${id ? '' : 'autofocus'}></label>
    <label class="row" style="margin-bottom:10px"><input type="checkbox" name="hidden" ${f0.hidden ? 'checked' : ''} style="width:20px;height:20px"> <span>Ẩn cột này khỏi bảng</span></label>
    ${S.conj_verbs.length ? `<label class="row" data-kindonly style="margin-bottom:10px"><input type="checkbox" name="fill" ${id ? '' : 'checked'} style="width:20px;height:20px"> <span>Tự điền các ô trống của cột theo quy tắc chia</span></label>` : ''}
    <div class="row sheet-actions">${id ? '<button type="button" class="btn danger" data-act="cfDelete">Xóa</button>' : ''}<button type="button" class="btn grow" data-close>Hủy</button><button type="submit" class="btn primary grow">Lưu</button></div></form>`, { sticky: true });
  const f = s.$('#cff'); f._id = id; f._s = s;
  const sync = () => { const k = f.elements.kind.value; $$('[data-kindonly]', f).forEach(x => x.classList.toggle('hidden', !k)); if (k && !f.elements.name.value.trim()) f.elements.name.value = kindInfo(k)[1]; };
  f.elements.kind.addEventListener('change', sync); sync();
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (f._busy) return;
    const name = f.elements.name.value.trim(); $('#cf-name', f).classList.toggle('err', !name); if (!name) return toast('Cần nhập tên cột', true);
    f._busy = true; let filled = 0;
    const ok = await guard(async () => {
      const data = { name, kind: f.elements.kind.value || null, hidden: f.elements.hidden.checked };
      const r = id ? await updateConjForm(id, data) : await addConjForm(data);
      if (f.elements.fill?.checked && data.kind) filled = await fillConj({ formIds: [r.id] });
    });
    f._busy = false;
    if (ok !== undefined) { toast((id ? 'Đã lưu cột' : 'Đã thêm cột') + (filled ? ` · điền ${filled} ô` : '')); s.close(); if (window._cc) ccRedraw(); render(); }
  });
}
ACT.cfDelete = async el => {
  const f = el.closest('form'), x = S.conj_forms.find(v => v.id === f._id); if (!x) return;
  const n = S.conj_cells.filter(c => c.form_id === x.id).length;
  if (!await confirmBox(`Xóa cột "${x.name}"${n ? ` và ${n} ô nội dung của cột` : ''}? Không thể hoàn tác. (Muốn giữ lại thì chọn “Ẩn cột”.)`, 'Xóa', true)) return;
  if (await guard(() => deleteConjForm(x.id), 'Đã xóa cột') !== undefined) { f._s.close(); if (window._cc) ccRedraw(); render(); }
};
// Danh sách cột: ẩn/hiện, đổi thứ tự, sửa
ACT.conjCols = () => {
  const draw = () => { const fs = conjForms(true); return `<h2>Các cột của bảng</h2><p class="small mute" style="margin:-4px 0 10px">Cột đầu tiên (thể ます) luôn hiện. Bấm 👁 để ẩn / hiện, ↑ ↓ để đổi thứ tự.</p>
    <div class="list">${fs.map((f, i) => { const k = kindInfo(f.kind); return `<div class="item ${f.hidden ? 'dim' : ''}"><button class="iconbtn" style="border:0" data-act="ccToggle" data-id="${f.id}" aria-label="${f.hidden ? 'Hiện cột' : 'Ẩn cột'}" title="${f.hidden ? 'Đang ẩn — bấm để hiện' : 'Bấm để ẩn'}">${f.hidden ? '🚫' : '👁'}</button>
      <span class="grow"><span class="t jp">${esc(f.name)}</span><br><span class="s">${esc(k ? k[2] : 'Cột tự đặt')}${f.hidden ? ' · đang ẩn' : ''}</span></span>
      <button class="iconbtn" style="border:0;background:none" data-act="ccMove" data-id="${f.id}" data-dir="-1" aria-label="Lên" ${i ? '' : 'disabled'}>↑</button><button class="iconbtn" style="border:0;background:none" data-act="ccMove" data-id="${f.id}" data-dir="1" aria-label="Xuống" ${i < fs.length - 1 ? '' : 'disabled'}>↓</button>
      <button class="iconbtn" style="border:0;background:none" data-act="editConjForm" data-id="${f.id}" aria-label="Sửa cột">✏️</button></div>`; }).join('') || '<p class="mute">Chưa có cột nào.</p>'}</div>
    <div class="sp"></div><div class="row"><button class="btn grow" data-act="conjDefaults">Thêm thể thông dụng</button><button class="btn primary grow" data-act="newConjForm">+ Cột mới</button></div>`; };
  const s = openSheet(draw(), { onClose: render }); window._cc = { s, draw };
};
const ccRedraw = () => { if (window._cc && window._cc.s.sheet.isConnected) window._cc.s.sheet.innerHTML = '<div class="grab"></div>' + window._cc.draw(); };
ACT.ccToggle = async el => { const f = S.conj_forms.find(x => x.id === el.dataset.id); if (f && await guard(() => updateConjForm(f.id, { hidden: !f.hidden })) !== undefined) ccRedraw(); };
ACT.ccMove = async el => { if (await guard(() => moveConjForm(el.dataset.id, +el.dataset.dir)) !== undefined) ccRedraw(); };

// ── Tự điền ô trống cho tất cả; lấy động từ từ thẻ ──
ACT.conjFillAll = async () => {
  if (!S.conj_verbs.length || !S.conj_forms.some(f => f.kind)) return toast('Cần có động từ và cột có loại thể để tự điền', true);
  const n = await guard(() => fillConj()); if (n !== undefined) { toast(n ? `Đã điền ${n} ô trống` : 'Không còn ô nào cần điền'); render(); }
};
ACT.conjImport = () => {
  const cand = conjCandidates();
  if (!cand.length) return toast('Không có thẻ động từ mới. (Thẻ cần có từ loại Động từ nhóm 1 / 2 / 3.)');
  const s = openSheet(`<h2>Lấy từ thẻ động từ</h2><p class="small mute" style="margin:-4px 0 10px">${cand.length} thẻ động từ chưa có trong bảng. Bỏ tích những từ không muốn thêm.</p>
    <div class="list" id="cimp" style="max-height:50vh;overflow:auto">${cand.map((c, i) => `<label class="item"><input type="checkbox" data-i="${i}" checked style="width:20px;height:20px"><span class="grow"><span class="t jp">${esc(c.masu)}</span> <span class="gtag g${c.grp}">${c.grp}</span><br><span class="s">${esc(c.card.meaning_vi || '')}</span></span></label>`).join('')}</div>
    <div class="sp"></div><div class="row"><button class="btn grow" data-close>Hủy</button><button class="btn primary grow" id="cimp-ok">Thêm vào bảng</button></div>`);
  s.$('#cimp-ok').onclick = async () => {
    const pick = [...s.el.querySelectorAll('#cimp input:checked')].map(x => cand[+x.dataset.i]); if (!pick.length) return;
    const ok = await guard(async () => { const vs = await addConjVerbs(pick.map(c => ({ masu: c.masu, meaning_vi: c.card.meaning_vi, grp: c.grp }))); if (S.conj_forms.some(f => f.kind)) await fillConj({ verbIds: vs.map(v => v.id) }); return vs.length; });
    if (ok !== undefined) { toast(`Đã thêm ${pick.length} động từ`); s.close(); render(); }
  };
};
