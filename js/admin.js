/* admin.js — vai trò user/admin: bộ thẻ mẫu (mọi người dùng) + màn Quản trị (chỉ admin).
   Giao diện chỉ ẩn/hiện nút; MỌI quyền được máy chủ kiểm tra lại bằng RLS + hàm security definer (xem schema.sql, bản 6). */
'use strict';

const isAdmin = () => S.me && S.me.role === 'admin' && S.me.status === 'active';
async function rpcOrThrow(name, args = {}) { const { data, error } = await sb.rpc(name, args); if (error) throw new Error(error.message); return data; }
async function fetchMe() {
  try { const d = await rpcOrThrow('jp_me'); const r = Array.isArray(d) ? d[0] : d; if (r) return { role: r.role === 'admin' ? 'admin' : 'user', status: r.status === 'blocked' ? 'blocked' : 'active' }; }
  catch (e) { console.warn('jp_me', e); }
  return { role: 'user', status: 'active' };
}
const ROLE_LABEL = { user: 'Người dùng', admin: 'Quản trị viên' };
const fmtDate = s => s ? new Date(s).toLocaleDateString('vi-VN') : '—';

// ── Bộ thẻ mẫu (cho mọi người dùng) ────────────────────────────────────────
const ST = { list: null, loading: false, err: '' };
async function loadStarters(force = false) {
  if (ST.loading || (ST.list && !force)) return;
  ST.loading = true; ST.err = '';
  try {
    const { data: decks, error } = await sb.from('starter_decks').select('*').order('created_at');
    if (error) throw new Error(error.message);
    const { data: cnt } = await sb.from('starter_cards').select('deck_id');
    const n = {}; (cnt || []).forEach(r => { n[r.deck_id] = (n[r.deck_id] || 0) + 1; });
    ST.list = (decks || []).map(d => ({ ...d, n: n[d.id] || 0 }));
  } catch (e) { ST.err = e.message; ST.list = ST.list || []; }
  ST.loading = false;
  if (NAV.sub && (NAV.sub.name === 'starters' || NAV.sub.name === 'admin')) softRender();
}
function viewStarters() {
  loadStarters();
  const list = (ST.list || []).filter(d => d.published);
  return `<div class="page">${pageTop('Bộ thẻ mẫu', true)}
  <p class="mute small" style="margin:0 2px 12px">Bộ thẻ có sẵn do quản trị viên biên soạn. Thêm vào là bạn có bản sao riêng để sửa và ôn tập; thẻ trùng với thẻ bạn đã có sẽ được dùng lại, không bị nhân đôi.</p>
  <div class="list">${ST.list === null ? '<div class="empty mute">Đang tải…</div>' : list.map(d => `<div class="item"><span class="big jp" style="font-size:26px">${esc(d.icon || '📘')}</span>
    <span class="grow"><span class="t">${esc(d.name)}</span><br><span class="s">${d.n} thẻ${d.level ? ' · ' + esc(d.level) : ''}${d.description ? ' · ' + esc(d.description) : ''}</span></span>
    <button class="btn primary" data-act="addStarter" data-id="${d.id}">Thêm</button></div>`).join('')
    || emptyBox('組', ST.err ? 'Không tải được bộ thẻ mẫu' : 'Chưa có bộ thẻ mẫu nào', esc(ST.err) || 'Quản trị viên sẽ sớm bổ sung.')}</div></div>`;
}
ACT.addStarter = async el => {
  const id = el.dataset.id; el.disabled = true;
  const r = await guard(() => rpcOrThrow('import_starter_deck', { p_starter: id }));
  el.disabled = false; if (!r) return;
  await guard(() => loadAll()); SYNC.last = Date.now();
  toast(`Đã thêm "${r.name}": ${r.added} thẻ mới${r.linked ? `, ${r.linked} thẻ đã có nên dùng lại` : ''}`);
  render();
};

// ── Quản trị (chỉ admin) ──────────────────────────────────────────────────────
const AD = { users: null, stats: null, loading: false, err: '' };
async function loadAdmin(force = false) {
  if (AD.loading || (AD.users && !force)) return;
  AD.loading = true; AD.err = '';
  try { [AD.users, AD.stats] = await Promise.all([rpcOrThrow('admin_list_users'), rpcOrThrow('admin_stats')]); await loadStarters(true); }
  catch (e) { AD.err = e.message; AD.users = AD.users || []; }
  AD.loading = false;
  if (NAV.sub && NAV.sub.name === 'admin') softRender();
}
function viewAdmin() {
  if (!isAdmin()) return `<div class="page">${pageTop('Quản trị', true)}${emptyBox('禁', 'Bạn không có quyền xem trang này')}</div>`;
  loadAdmin();
  const s = AD.stats || {};
  const stat = (l, v) => `<div class="card"><div class="mute small">${l}</div><b class="jp" style="font-size:26px">${v ?? '—'}</b></div>`;
  return `<div class="page">${pageTop('Quản trị', true, '<button class="btn tool" data-act="adminReload">Tải lại</button>')}
  ${AD.err ? `<div class="card" style="border-color:var(--bad);color:var(--bad);margin-bottom:12px">${esc(AD.err)}</div>` : ''}
  <div class="grid2">${stat('Tài khoản', s.users)}${stat('Hoạt động 7 ngày', s.active_7d)}${stat('Tổng số thẻ', s.cards)}${stat('Lượt ôn', s.sessions)}</div>
  <h3 class="fsec">Bộ thẻ mẫu</h3>
  <div class="list">${(ST.list || []).map(d => `<div class="item"><span class="big jp" style="font-size:24px">${esc(d.icon || '📘')}</span>
    <span class="grow"><span class="t">${esc(d.name)}</span><br><span class="s">${d.n} thẻ · ${d.published ? 'đang hiển thị với mọi người' : 'đang ẩn'}</span></span>
    <button class="btn" data-act="starterToggle" data-id="${d.id}" data-pub="${d.published ? 0 : 1}">${d.published ? 'Ẩn' : 'Hiện'}</button>
    <button class="btn danger" data-act="starterDelete" data-id="${d.id}" aria-label="Xóa bộ mẫu">✕</button></div>`).join('') || '<div class="mute small" style="padding:6px 2px">Chưa có bộ mẫu nào.</div>'}</div>
  <div style="margin-top:10px"><button class="btn block" data-act="starterPublish">+ Đăng một bộ thẻ của tôi làm bộ mẫu</button></div>
  <h3 class="fsec">Tài khoản (${(AD.users || []).length})</h3>
  <p class="mute small" style="margin:-4px 2px 10px">Quản trị viên chỉ thấy thông tin tài khoản và số liệu tổng, không xem được nội dung thẻ riêng của người dùng.</p>
  <div class="list">${AD.users === null ? '<div class="empty mute">Đang tải…</div>' : AD.users.map(u => `<button class="item" data-act="adminUser" data-id="${u.user_id}">
    <span class="grow"><span class="t">${esc(u.email || '(không có email)')}</span><br><span class="s">${u.cards} thẻ · ${u.decks} bộ · vào lần cuối ${fmtDate(u.last_sign_in_at)}</span></span>
    <span style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${u.role === 'admin' ? '<span class="tag n3">Admin</span>' : ''}${u.status === 'blocked' ? '<span class="tag n1">Đã khóa</span>' : ''}</span></button>`).join('')}</div></div>`;
}
ACT.adminReload = () => { AD.users = null; loadAdmin(true); render(); };
ACT.adminUser = el => {
  const u = (AD.users || []).find(x => x.user_id === el.dataset.id); if (!u) return;
  const self = u.user_id === S.user.id;
  const s = openSheet(`<h2>${esc(u.email || '(không có email)')}</h2>
    <dl class="kv"><dt>Vai trò</dt><dd>${ROLE_LABEL[u.role]}</dd><dt>Trạng thái</dt><dd>${u.status === 'blocked' ? 'Đã khóa' : 'Đang hoạt động'}</dd>
    <dt>Tham gia</dt><dd>${fmtDate(u.created_at)}</dd><dt>Vào lần cuối</dt><dd>${fmtDate(u.last_sign_in_at)}</dd><dt>Dữ liệu</dt><dd>${u.cards} thẻ · ${u.decks} bộ</dd><dt>Ôn lần cuối</dt><dd>${fmtDate(u.last_study)}</dd></dl>
    <div class="sp"></div>${self ? '<p class="mute small">Đây là tài khoản của bạn — không thể tự khóa, hạ quyền hay xóa ở đây.</p>' : `<div class="grid2">
      <button class="btn" data-act="adminRole" data-id="${u.user_id}" data-role="${u.role === 'admin' ? 'user' : 'admin'}">${u.role === 'admin' ? 'Hạ xuống người dùng' : 'Cấp quyền admin'}</button>
      <button class="btn" data-act="adminStatus" data-id="${u.user_id}" data-status="${u.status === 'blocked' ? 'active' : 'blocked'}">${u.status === 'blocked' ? 'Mở khóa' : 'Khóa tài khoản'}</button>
      <button class="btn danger" data-act="adminDelete" data-id="${u.user_id}" style="grid-column:1/-1">Xóa tài khoản và toàn bộ dữ liệu</button></div>`}
    <div class="sp"></div><button class="btn block" data-close>Đóng</button>`);
  window._au = s;
};
const adminDo = async (fn, okMsg) => { const r = await guard(fn, okMsg); window._au?.close(); await loadAdmin(true); return r; };
ACT.adminRole = async el => { const u = AD.users.find(x => x.user_id === el.dataset.id); const r = el.dataset.role;
  if (!await confirmBox(r === 'admin' ? `Cấp quyền quản trị cho ${u.email}? Họ sẽ thấy danh sách tài khoản và quản lý được bộ thẻ mẫu.` : `Hạ ${u.email} xuống người dùng thường?`, 'Đồng ý')) return;
  adminDo(() => rpcOrThrow('admin_set_role', { p_user: u.user_id, p_role: r }), 'Đã đổi vai trò'); };
ACT.adminStatus = async el => { const u = AD.users.find(x => x.user_id === el.dataset.id); const b = el.dataset.status === 'blocked';
  if (!await confirmBox(b ? `Khóa ${u.email}? Họ vẫn đăng nhập được nhưng không truy cập được dữ liệu cho tới khi bạn mở khóa.` : `Mở khóa cho ${u.email}?`, b ? 'Khóa' : 'Mở khóa', b)) return;
  adminDo(() => rpcOrThrow('admin_set_status', { p_user: u.user_id, p_status: el.dataset.status }), b ? 'Đã khóa tài khoản' : 'Đã mở khóa'); };
ACT.adminDelete = async el => { const u = AD.users.find(x => x.user_id === el.dataset.id);
  if (!await confirmBox(`Xóa vĩnh viễn ${u.email} cùng ${u.cards} thẻ và toàn bộ dữ liệu của họ? Không thể hoàn tác.`, 'Xóa vĩnh viễn', true)) return;
  adminDo(() => rpcOrThrow('admin_delete_user', { p_user: u.user_id }), 'Đã xóa tài khoản'); };
ACT.starterToggle = async el => { await guard(() => rpcOrThrow('admin_set_starter', { p_id: el.dataset.id, p_published: el.dataset.pub === '1' }), 'Đã cập nhật'); await loadStarters(true); render(); };
ACT.starterDelete = async el => { if (!await confirmBox('Xóa bộ mẫu này? Bộ thẻ người dùng đã thêm trước đó không bị ảnh hưởng.', 'Xóa', true)) return;
  await guard(() => rpcOrThrow('admin_delete_starter', { p_id: el.dataset.id }), 'Đã xóa bộ mẫu'); await loadStarters(true); render(); };
ACT.starterPublish = () => {
  const decks = liveDecks(); if (!decks.length) return toast('Bạn chưa có bộ thẻ nào để đăng', true);
  const s = openSheet(`<h2>Đăng bộ thẻ làm bộ mẫu</h2><p class="mute small">Chụp lại nội dung bộ thẻ của bạn tại thời điểm này. Sửa bộ thẻ sau đó sẽ không tự cập nhật bộ mẫu — hãy đăng lại và chọn thay thế.</p>
    <form id="pubf"><label class="field"><span>Bộ thẻ của bạn</span><select name="deck">${decks.map(d => `<option value="${d.id}">${esc(d.icon || '')} ${esc(d.name)} (${(S.cardsOfDeck.get(d.id) || []).length} thẻ)</option>`).join('')}</select></label>
    <label class="field"><span>Tên hiển thị (để trống = giữ tên bộ)</span><input name="name" maxlength="80"></label>
    <label class="field"><span>Trình độ</span><select name="level"><option value="">—</option>${JLPT.map(j => `<option>${j}</option>`).join('')}</select></label>
    ${(ST.list || []).length ? `<label class="field"><span>Thay thế bộ mẫu đã có (tùy chọn)</span><select name="replace"><option value="">Tạo bộ mẫu mới</option>${ST.list.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></label>` : ''}
    <div class="row"><button type="button" class="btn grow" data-close>Hủy</button><button class="btn primary grow">Đăng</button></div></form>`);
  s.$('#pubf').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const ok = await guard(() => rpcOrThrow('admin_publish_deck', { p_deck: f.deck, p_name: f.name || null, p_level: f.level || null, p_replace: f.replace || null }), 'Đã đăng bộ mẫu');
    if (ok) { s.close(); await loadStarters(true); render(); } };
};

// ── Tài khoản của tôi ─────────────────────────────────────────────────────────
ACT.deleteMyAccount = async () => {
  if (!await confirmBox('Xóa vĩnh viễn tài khoản và TOÀN BỘ thẻ, bộ thẻ, lịch sử ôn của bạn trên máy chủ? Không thể hoàn tác. (Nên xuất CSV trước.)', 'Tiếp tục', true)) return;
  const s = openSheet(`<h2>Xác nhận xóa tài khoản</h2><p class="small">Gõ <b>XOA</b> để xác nhận.</p><form id="delf"><label class="field"><input name="c" autocomplete="off" autocapitalize="characters"></label>
    <div class="row"><button type="button" class="btn grow" data-close>Hủy</button><button class="btn bad grow">Xóa tài khoản</button></div></form>`);
  s.$('#delf').onsubmit = async e => { e.preventDefault();
    if ((new FormData(e.target).get('c') || '').trim().toUpperCase() !== 'XOA') return toast('Chưa gõ đúng XOA', true);
    const ok = await guard(() => rpcOrThrow('delete_my_account'));
    if (ok) { s.close(); try { await sb.auth.signOut(); } catch {} LS.set('jp_pending', []); location.reload(); } };
};
