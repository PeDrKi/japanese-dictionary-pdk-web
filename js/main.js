/* main.js — khởi động: cấu hình Supabase → đăng nhập → tải dữ liệu → vỏ ứng dụng */
'use strict';

const root = () => $('#root');
const TABS = [['today', '今', 'Hôm nay'], ['cards', '札', 'Thẻ'], ['study', '習', 'Ôn tập'], ['decks', '組', 'Bộ thẻ'], ['more', '他', 'Khác']];

function screenConfig() {
  const c = getConfig();
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><p class="mute">Kết nối dự án Supabase của bạn. Chỉ cần làm một lần trên mỗi thiết bị.</p>
  <form id="cfgf"><label class="field"><span>Project URL</span><input name="url" type="url" required placeholder="https://xxxx.supabase.co" value="${esc(c.url)}" autocapitalize="none"></label>
  <label class="field"><span>Anon / Publishable key</span><input name="key" required placeholder="eyJ… hoặc sb_publishable_…" value="${esc(c.key)}" autocapitalize="none" autocorrect="off"></label>
  <button class="btn primary block">Tiếp tục</button></form>
  <p class="small mute" style="margin-top:16px">Lấy ở Supabase → Project Settings → API. Chạy file <code>schema.sql</code> trong SQL Editor trước khi đăng nhập. Không dùng khóa service_role ở đây.</p></div>`;
  $('#cfgf').onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); LS.set('jp_cfg', { url: f.url.trim().replace(/\/+$/, ''), key: f.key.trim() }); location.reload(); };
}
function screenAuth(msg = '') {
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><p class="mute" style="margin-top:0">Học tiếng Nhật mọi lúc, đồng bộ giữa máy tính và điện thoại.</p>
  <form id="authf"><label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email" autocapitalize="none"></label>
  <label class="field"><span>Mật khẩu</span><input name="password" type="password" required minlength="6" autocomplete="current-password"></label>
  <div id="authmsg" class="small" style="min-height:22px;color:var(--bad)">${esc(msg)}</div>
  <div class="row"><button class="btn primary grow" data-mode="in">Đăng nhập</button><button type="button" class="btn grow" id="signup">Tạo tài khoản</button></div></form>
  <p class="small" style="margin-top:20px"><a href="#" id="chg" class="mute">Đổi máy chủ Supabase</a></p></div>`;
  const say = (t, ok) => { const m = $('#authmsg'); m.textContent = t; m.style.color = ok ? 'var(--ok)' : 'var(--bad)'; };
  const creds = () => Object.fromEntries(new FormData($('#authf')));
  $('#authf').onsubmit = async e => {
    e.preventDefault(); say('Đang đăng nhập…', true);
    const { error } = await sb.auth.signInWithPassword(creds());
    if (error) return say(error.message.includes('Invalid') ? 'Sai email hoặc mật khẩu' : error.message);
    boot();
  };
  $('#signup').onclick = async () => {
    const c = creds(); if (!c.email || (c.password || '').length < 6) return say('Nhập email và mật khẩu từ 6 ký tự');
    say('Đang tạo tài khoản…', true);
    const { data, error } = await sb.auth.signUp(c);
    if (error) return say(error.message);
    if (data.session) boot(); else say('Đã gửi email xác nhận — mở email rồi quay lại đăng nhập.', true);
  };
  $('#chg').onclick = e => { e.preventDefault(); screenConfig(); };
}
function shell() {
  root().innerHTML = `<div id="app"><main id="view"></main><nav id="tabs" aria-label="Điều hướng chính">${TABS.map(([k, g, l]) =>
    `<button data-act="tab" data-tab="${k}" aria-label="${l}"><span class="g jp">${g}</span><span class="l">${l}</span>${k === 'today' ? '<span class="badge hidden" id="duebadge"></span>' : ''}</button>`).join('')}</nav></div>`;
}
async function boot() {
  if (!initSupabase()) return screenConfig();
  root().innerHTML = '<div class="auth"><div class="logo jp">日本語</div><p class="mute">Đang tải…</p></div>';
  const { data } = await sb.auth.getSession();
  if (!data.session) return screenAuth();
  S.user = data.session.user;
  try { migratePending(); await checkSchema(); await loadAll(); SYNC.last = Date.now(); }
  catch (e) {
    const upgrade = /chưa được nâng cấp/.test(e.message);
    const missing = /relation|schema cache|does not exist/i.test(e.message);
    root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><p style="color:var(--bad)"><b>Không tải được dữ liệu</b></p><p class="small mute">${esc(e.message)}${upgrade ? '<br><br>Hãy mở Supabase → SQL Editor, dán và chạy lại TOÀN BỘ file <code>schema.sql</code> mới (an toàn, không mất dữ liệu), rồi bấm Thử lại.' : missing ? '<br><br>Có vẻ bảng chưa được tạo — hãy chạy <code>schema.sql</code> trong Supabase SQL Editor.' : ''}</p>
      <div class="row"><button class="btn primary grow" onclick="boot()">Thử lại</button><button class="btn grow" data-act="logout">Đăng xuất</button></div></div>`;
    return;
  }
  shell(); render(); flushQueue(); startAutoRefresh();
}
// Tự làm mới khi quay lại ứng dụng / có mạng lại / mỗi ~60 giây (không phải thời gian thực)
let autoTimer, stale = false;
async function autoRefresh(force) {
  if (!S.user || !$('#view')) return;
  const r = await refreshData({ force });
  if (r === 'changed') stale = !softRender();          // đang mở form/ô nhập → để lần sau vẽ lại, không bỏ sót
  else if (r === 'same' && stale) stale = !softRender();
}
function startAutoRefresh() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => { if (document.visibilityState === 'visible') autoRefresh(false); }, 60000);
}
ACT.logout = async () => {
  if (pending().length && !await confirmBox(`Còn ${pending().length} lượt ôn chưa gửi lên máy chủ. Đăng xuất sẽ MẤT chúng. Vẫn đăng xuất?`, 'Đăng xuất', true)) return;
  await sb.auth.signOut(); LS.set('jp_pending', []); location.reload();
};
ACT.cfgReset = async () => { if (!await confirmBox('Đổi sang máy chủ Supabase khác? Bạn sẽ được đăng xuất.', 'Đổi')) return; await sb.auth.signOut(); localStorage.removeItem('jp_cfg'); LS.set('jp_pending', []); location.reload(); };

themeInit();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoRefresh(false); });
window.addEventListener('online', () => autoRefresh(true));
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
boot();
