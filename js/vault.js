/* vault.js — Kho thẻ: cất thẻ tạm thời (ẩn khỏi mọi nơi, giữ nguyên bộ thẻ + tiến độ), xem / tìm / đưa ra, tạo-đổi tên-xóa kho */
'use strict';

const VT = { id: null, sel: new Set(), q: '' };   // trạng thái màn xem một kho

// Hộp chọn kho (dùng khi cất thẻ): trả về id kho, hoặc null nếu hủy. Có sẵn ô tạo kho mới.
function chooseVault(title = 'Cất vào kho nào?', { except = null } = {}) {
  return new Promise(res => {
    if (!S.vaultOk) { toast(VAULT_NEED, true); return res(null); }
    let done = false;
    const list = () => liveVaults().filter(v => v.id !== except);
    const html = () => `<h2>${esc(title)}</h2>
      <div class="list" id="vp-list">${list().map(v => `<button class="item" data-vid="${v.id}"><span class="big" style="font-size:24px">${esc(v.icon || '📦')}</span><span class="grow"><span class="t">${esc(v.name)}</span><br><span class="s">${vaultCount(v.id)} thẻ</span></span></button>`).join('') || '<p class="mute small" style="margin:4px 2px 10px">Chưa có kho nào — tạo kho đầu tiên ở bên dưới.</p>'}</div>
      <form id="vp-new" class="row" style="margin-top:10px" autocomplete="off"><input name="name" class="grow" maxlength="60" placeholder="＋ Tên kho mới (vd. Đã thuộc)" aria-label="Tên kho mới"><button class="btn primary" type="submit">Tạo và cất</button></form>
      <div class="row" style="margin-top:10px"><button class="btn grow" data-close>Hủy</button></div>`;
    const s = openSheet(html(), { onClose: () => { if (!done) res(null); } });
    const pick = id => { done = true; res(id); s.close(); };
    s.el.addEventListener('click', e => { const b = e.target.closest('[data-vid]'); if (b) pick(b.dataset.vid); });
    s.$('#vp-new').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (f._busy) return; f._busy = true;
      try { const v = await addVault(f.elements.name.value); pick(v.id); } catch (err) { toast(err.message || String(err), true); f._busy = false; }
    });
  });
}
const vaultLabel = id => { const v = vaultOf(id); return v ? `${v.icon || '📦'} ${v.name}` : 'kho'; };

// Cất / đưa ra — dùng chung cho chi tiết thẻ, chọn nhiều, màn ôn
async function stashCards(ids, vid, okMsg) {
  const ok = await guard(() => moveToVault(ids, vid), okMsg);
  return ok !== undefined;
}
ACT.vaultOne = async el => {
  const id = el.dataset.id, vid = await chooseVault(); if (!vid) return;
  if (await stashCards([id], vid, `Đã cất vào kho "${vaultOf(vid)?.name}"`)) { _cd?.close(); render(); }
};
ACT.vaultOutOne = async el => { if (await stashCards([el.dataset.id], null, 'Đã đưa ra khỏi kho')) { _cd?.close(); render(); } };
ACT.bulkVault = async () => {
  const ids = [...FILT.sel]; if (!ids.length) return;
  const vid = await chooseVault(`Cất ${ids.length} thẻ vào kho nào?`); if (!vid) return;
  if (await stashCards(ids, vid, `Đã cất ${ids.length} thẻ vào kho "${vaultOf(vid)?.name}"`)) { FILT.sel.clear(); render(); }
};

// ── Danh sách kho ──
function viewVaults() {
  const vs = liveVaults();
  const body = !S.vaultOk ? `<p class="card small">${esc(VAULT_NEED)}</p>`
    : `<div class="list">${vs.map(v => `<button class="item" data-act="vaultOpen" data-id="${v.id}"><span class="big" style="font-size:26px">${esc(v.icon || '📦')}</span><span class="grow"><span class="t">${esc(v.name)}</span><br><span class="s">${vaultCount(v.id)} thẻ</span></span><span class="mute">›</span></button>`).join('')
      || emptyBox('蔵', 'Chưa có kho nào. Cất thẻ vào kho để tạm ẩn khỏi ôn tập; đưa ra là về lại như cũ.')}</div>`;
  return `<div class="page">${pageTop('Kho thẻ', !isTopTab(), S.vaultOk ? '<button class="btn primary" data-act="vaultNew">+ Kho mới</button>' : '')}
    <p class="mute small" style="margin:0 2px 10px">Thẻ trong kho bị ẩn khỏi danh sách, bộ thẻ, ôn tập và thống kê; giữ nguyên bộ thẻ và tiến độ.</p>${body}</div>`;
}
ACT.vaultNew = async () => {
  const s = openSheet(`<h2>Kho mới</h2><form id="vn" autocomplete="off"><label class="field"><span>Tên kho</span><input name="name" maxlength="60" autofocus placeholder="vd. Đã thuộc, Tạm gác, Khó"></label>
    <label class="field"><span>Biểu tượng (không bắt buộc)</span><input name="icon" maxlength="4" placeholder="📦"></label>
    <div class="row"><button type="button" class="btn grow" data-close>Hủy</button><button class="btn primary grow" type="submit">Tạo kho</button></div></form>`);
  s.$('#vn').onsubmit = async e => { e.preventDefault(); const f = e.target; if (f._busy) return; f._busy = true;
    const ok = await guard(() => addVault(f.elements.name.value, f.elements.icon.value.trim()), 'Đã tạo kho'); f._busy = false; if (ok !== undefined) { s.close(); render(); } };
};
ACT.vaultOpen = el => { VT.id = el.dataset.id; VT.sel = new Set(); VT.q = ''; ACT.sub({ dataset: { name: 'vaultitem', id: VT.id } }); };

// ── Trong một kho ──
function vaultListHtml(id) {
  const q = VT.q.trim().toLowerCase();
  const list = vaultCards(id).filter(c => !q || [c.character, c.meaning_vi, c.reading_on, c.reading_kun, c.reading_kana, c.reading_hanviet, c.romaji].some(x => x && String(x).toLowerCase().includes(q)));
  return list.map(c => `<button class="item${VT.sel.has(c.id) ? ' sel' : ''}" data-act="vaultPick" data-id="${c.id}"><span class="big jp${[...c.character].length > 3 ? ' long' : ''}">${esc(c.character)}</span>
    <span class="grow"><span class="t">${esc(c.meaning_vi)}</span><br><span class="s jp">${esc(cardMainText(c)) || '&nbsp;'}</span></span><span class="mute">${VT.sel.has(c.id) ? '✓' : ''}</span></button>`).join('')
    || emptyBox('蔵', q ? 'Không có thẻ phù hợp' : 'Kho này đang trống');
}
function vaultBar(id) {
  const n = VT.sel.size, all = vaultCards(id).length;
  return `<div class="selbar"><button class="btn ghost" data-act="vaultSelAll">${n ? `Đã chọn ${n}` : all ? 'Chọn tất cả' : '—'}</button>
    <button class="btn primary" data-act="vaultOut" ${n ? '' : 'disabled'}>Đưa ra khỏi kho</button><button class="btn" data-act="vaultMove" ${n ? '' : 'disabled'}>Chuyển kho</button></div>`;
}
function viewVaultItem(sub) {
  const v = vaultOf(sub?.id || VT.id); if (!v) return viewVaults();
  VT.id = v.id;
  const menu = '<button class="btn" data-act="vaultEdit">Sửa / Xóa kho</button>';
  return `<div class="page">${pageTop(`${v.icon || '📦'} ${v.name}`, true, menu)}
    <p class="mute small" style="margin:0 2px 8px">${vaultCount(v.id)} thẻ · chạm để chọn, rồi đưa ra hoặc chuyển kho.</p>
    <input type="search" id="vq" placeholder="Tìm trong kho…" value="${esc(VT.q)}" aria-label="Tìm trong kho" style="margin-bottom:10px">
    <div class="list" id="vlist">${vaultListHtml(v.id)}</div><div id="vbar">${vaultBar(v.id)}</div></div>`;
}
const vaultRefresh = () => { const l = $('#vlist'); if (l) { l.innerHTML = vaultListHtml(VT.id); $('#vbar').innerHTML = vaultBar(VT.id); } };
document.addEventListener('input', e => { if (e.target.id === 'vq') { VT.q = e.target.value; vaultRefresh(); } });
ACT.vaultPick = el => { const id = el.dataset.id; VT.sel.has(id) ? VT.sel.delete(id) : VT.sel.add(id); vaultRefresh(); };
ACT.vaultSelAll = () => {
  const all = vaultCards(VT.id).map(c => c.id); const every = all.length && all.every(i => VT.sel.has(i));
  VT.sel = every ? new Set() : new Set(all); vaultRefresh();
};
ACT.vaultOut = async () => {
  const ids = [...VT.sel]; if (!ids.length) return;
  if (await stashCards(ids, null, `Đã đưa ${ids.length} thẻ ra khỏi kho`)) { VT.sel = new Set(); render(); }
};
ACT.vaultMove = async () => {
  const ids = [...VT.sel]; if (!ids.length) return;
  const vid = await chooseVault(`Chuyển ${ids.length} thẻ sang kho nào?`, { except: VT.id }); if (!vid) return;
  if (await stashCards(ids, vid, `Đã chuyển ${ids.length} thẻ sang "${vaultOf(vid)?.name}"`)) { VT.sel = new Set(); render(); }
};
ACT.vaultEdit = () => {
  const v = vaultOf(VT.id); if (!v) return;
  const s = openSheet(`<h2>Sửa kho</h2><form id="ve" autocomplete="off"><label class="field"><span>Tên kho</span><input name="name" maxlength="60" value="${esc(v.name)}"></label>
    <label class="field"><span>Biểu tượng</span><input name="icon" maxlength="4" value="${esc(v.icon || '')}" placeholder="📦"></label>
    <div class="row"><button type="button" class="btn danger" data-act="vaultDel">Xóa kho</button><button class="btn primary grow" type="submit">Lưu</button></div></form>`);
  window._ve = s;
  s.$('#ve').onsubmit = async e => { e.preventDefault(); const f = e.target; if (f._busy) return; f._busy = true;
    const ok = await guard(() => renameVault(v.id, f.elements.name.value, f.elements.icon.value.trim()), 'Đã lưu kho'); f._busy = false; if (ok !== undefined) { s.close(); render(); } };
};
ACT.vaultDel = async () => {
  const v = vaultOf(VT.id); if (!v) return; const n = vaultCount(v.id);
  if (!await confirmBox(n ? `Xóa kho "${v.name}"? ${n} thẻ trong kho sẽ được đưa ra, quay lại danh sách và ôn tập với tiến độ cũ.` : `Xóa kho "${v.name}"?`, 'Xóa kho', true)) return;
  if (await guard(() => deleteVault(v.id), 'Đã xóa kho') !== undefined) { _ve?.close(); VT.id = null; leaveSub(); }
};

// ── Cất ngay trong màn ôn tập (không cần biết đã thuộc hay chưa) ──
function stashFromStudy(st, win, { setTotal, next }) {
  const c = st.cur; if (!c) return;
  chooseVault('Cất thẻ này vào kho nào?').then(async vid => {
    if (!vid || st.cur !== c) return;
    if (!await stashCards([c.id], vid, `Đã cất "${c.character}" vào kho "${vaultOf(vid)?.name}"`)) return;
    const before = st.queue.length; st.queue = st.queue.filter(x => x.id !== c.id);
    setTotal(before - st.queue.length + 1); next();
  });
}
