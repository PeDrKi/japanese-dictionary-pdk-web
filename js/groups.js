/* groups.js — Nhóm "từ riêng": tạo nhóm, chọn màu, đặt các trường riêng; xem thẻ trong nhóm và thêm thẻ ngay vào nhóm */
'use strict';

const groupBar = g => `<span class="gdot" style="background:${g.color}"></span>`;

function openGroups() {
  const s = openSheet(`<h2>Nhóm từ riêng</h2>
    <p class="small mute" style="margin-top:-6px">Mỗi nhóm có màu và các trường riêng (vd. Họ: kanji, nguồn gốc). Thẻ gắn nhóm được tô màu trong tab Thẻ.</p>
    <div class="list" id="grp-list"></div>
    <div class="row sheet-actions"><button class="btn grow" data-close>Đóng</button><button class="btn primary grow" data-act="groupNew">＋ Nhóm mới</button></div>`);
  window._gs = s; paintGroups(s);
}
function paintGroups(s = window._gs) {
  const box = s && s.$('#grp-list'); if (!box) return;
  box.innerHTML = allNameGroups().map(g => `<div class="item grp" style="--nk:${g.color}">
    <span class="grow"><span class="t">${groupBar(g)} ${esc(g.name)}</span><span class="small mute">${groupCards(g.key).length} thẻ${g.fields.length ? ' · ' + g.fields.map(f => esc(f.label)).join(', ') : ''}</span></span>
    <span class="row" style="gap:6px"><button class="btn small" data-act="groupView" data-key="${esc(g.key)}">Xem</button><button class="btn small" data-act="groupAddCard" data-key="${esc(g.key)}">＋ Thẻ</button><button class="btn small ghost" data-act="groupEdit" data-key="${esc(g.key)}">Sửa</button></span></div>`).join('');
}
ACT.groups = () => openGroups();
ACT.groupNew = () => groupForm(null);
ACT.groupEdit = el => groupForm(el.dataset.key);
ACT.groupView = el => { FILT.nk = el.dataset.key; FILT.type = ''; window._gs?.close?.(); ACT.tab({ dataset: { tab: 'cards' } }); };
ACT.groupAddCard = el => { const k = el.dataset.key; window._gs?.close?.(); openCardForm(null, { type: 'vocab', name_kind: k }); };

function groupForm(key) {
  if (!S.groupOk) return toast(GROUP_NEED, true);
  const g = key ? nameGroup(key) : { name: '', color: '#8E7CC3', fields: [], builtin: false };
  const fieldRow = f => `<div class="row gf-row" data-k="${esc(f.k || '')}"><input class="grow" data-gf maxlength="30" placeholder="Tên trường (vd. Hán tự)" value="${esc(f.label || '')}"><button type="button" class="btn small ghost" data-act="gfDel" aria-label="Xóa trường">✕</button></div>`;
  const s = openSheet(`<h2>${key ? 'Sửa nhóm' : 'Nhóm mới'}</h2>
    <form id="gf" autocomplete="off">
      <label class="field"><span>Tên nhóm *</span><input name="name" maxlength="40" value="${esc(g.name)}" ${key ? '' : 'autofocus'}></label>
      <label class="field"><span>Màu</span><div class="row"><input type="color" name="color" value="${g.color}" style="width:56px;height:40px;padding:2px"><span class="small mute">Màu viền / nhãn của thẻ thuộc nhóm</span></div></label>
      <div class="field"><span>Trường riêng (tối đa 6)</span><div id="gf-fields">${g.fields.map(fieldRow).join('')}</div>
        <button type="button" class="btn ghost small" data-act="gfAdd">＋ Thêm trường</button></div>
      <div class="row sheet-actions"><button type="button" class="btn grow" data-close>Hủy</button>${key && !g.builtin ? '<button type="button" class="btn grow danger" data-act="gfRemove">Xóa nhóm</button>' : key && g.id ? '<button type="button" class="btn grow" data-act="gfRemove">Về mặc định</button>' : ''}<button type="submit" class="btn primary grow">Lưu</button></div>
    </form>`);
  const f = s.$('#gf'); f._key = key; f._sheet = s; f._row = fieldRow; window._gf = f;
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (f._busy) return; f._busy = true;
    const fields = [...f.querySelectorAll('.gf-row')].map(r => ({ k: r.dataset.k, label: r.querySelector('[data-gf]').value }));
    const ok = await guard(() => saveNameGroup(f._key, { name: f.elements.name.value, color: f.elements.color.value, fields }), 'Đã lưu nhóm');
    f._busy = false; if (ok === undefined) return;
    s.close(); render(); if (window._gs && window._gs.el.isConnected) paintGroups();
  });
}
ACT.gfAdd = () => { const f = window._gf; if (!f) return; const box = f.querySelector('#gf-fields'); if (box.children.length >= 6) return toast('Tối đa 6 trường', true); box.insertAdjacentHTML('beforeend', f._row({})); box.lastElementChild.querySelector('input').focus(); };
ACT.gfDel = el => el.closest('.gf-row')?.remove();
ACT.gfRemove = async () => {
  const f = window._gf; if (!f) return; const g = nameGroup(f._key); if (!g) return;
  const n = groupCards(g.key).length;
  if (!confirm(g.builtin ? `Đặt nhóm "${g.name}" về tên, màu mặc định và bỏ các trường riêng?` : `Xóa nhóm "${g.name}"? ${n} thẻ trong nhóm sẽ thành thẻ thường (không mất thẻ).`)) return;
  const ok = await guard(() => deleteNameGroup(g.key), g.builtin ? 'Đã đặt lại nhóm' : 'Đã xóa nhóm');
  if (ok === undefined) return; f._sheet.close(); render(); if (window._gs && window._gs.el.isConnected) paintGroups();
};

// ── Trường riêng trong form thẻ ──
function renderExtraFields(form, extra) {
  const box = form.querySelector('#cf-extra'); if (!box) return;
  const g = nameGroup(form.elements.name_kind?.value);
  const cur = extra || parseExtra(form._extra || null);
  if (extra) form._extra = extra;
  box.innerHTML = g && g.fields.length ? g.fields.map(f => `<label class="field"><span>${esc(f.label)}</span><input data-ex="${esc(f.k)}" maxlength="200" value="${esc(cur[f.k] || '')}"></label>`).join('') : '';
}
function readExtra(form) {
  const o = {}; form.querySelectorAll('[data-ex]').forEach(i => { if (i.value.trim()) o[i.dataset.ex] = i.value.trim(); });
  return o;
}
