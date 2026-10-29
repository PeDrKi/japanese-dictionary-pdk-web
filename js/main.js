/* main.js — khởi động: cấu hình Supabase → đăng nhập → tải dữ liệu → vỏ ứng dụng */
'use strict';

const root = () => $('#root');
const TABS = [['today', '今', 'Hôm nay'], ['cards', '札', 'Thư viện'], ['study', '習', 'Ôn tập'], ['decks', '組', 'Bộ thẻ'], ['grammar', '文', 'Ngữ pháp', 'desk'], ['radicals', '部', 'Bộ thủ', 'desk'], ['trans', '訳', 'Bản dịch', 'desk'], ['more', '他', 'Khác']];
// Mục 'desk' chỉ hiện ở thanh bên của màn hình rộng (≥900px); trên điện thoại thanh dưới vẫn 5 mục, các mục này nằm trong Khác

// ── Cấu hình máy chủ: hỏi 1 lần khi dùng lần đầu, sửa được trong Khác → Máy chủ ──
function normUrl(u) { u = (u || '').trim().replace(/\/+$/, ''); return /^https?:\/\//i.test(u) || !u ? u : 'https://' + u; }
function looksLikeServiceRole(k) {
  if (/^sb_secret_/.test(k)) return true;
  try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'; } catch { return false; }
}
// Kiểm tra URL + key có dùng được không. Trả '' nếu ổn, ngược lại là thông báo lỗi tiếng Việt.
async function testServer(url, key) {
  if (!/^https?:\/\/([^/\s]+\.[^/\s]+|localhost)/i.test(url)) return 'Project URL chưa đúng — dạng https://xxxx.supabase.co';
  if (!key) return 'Chưa nhập khóa anon / publishable.';
  if (looksLikeServiceRole(key)) return 'Đây là khóa service_role (bí mật). Hãy dùng khóa anon / publishable.';
  try {
    const r = await fetch(url + '/auth/v1/settings', { headers: { apikey: key }, signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined });
    if (r.status === 401 || r.status === 403) return 'Khóa không đúng với dự án này — kiểm tra lại khóa anon / publishable.';
    if (!r.ok) return 'Máy chủ trả lỗi ' + r.status + ' — kiểm tra lại Project URL.';
    return '';
  } catch { return 'Không kết nối được tới ' + url + ' — kiểm tra URL và mạng.'; }
}
function cfgFormHtml(c) {
  return `<label class="field"><span>Project URL</span><input name="url" type="text" inputmode="url" required placeholder="https://xxxx.supabase.co" value="${esc(c.url)}" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
  <label class="field"><span>Anon / Publishable key</span><input name="key" required placeholder="eyJ… hoặc sb_publishable_…" value="${esc(c.key)}" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
  <div id="cfgmsg" class="small" style="min-height:22px;color:var(--bad)" role="alert"></div>`;
}
// Gắn xử lý kiểm tra + lưu; done(cfg) được gọi khi hợp lệ.
function wireCfgForm(form, btn, done) {
  form.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form)), cfg = { url: normUrl(f.url), key: (f.key || '').trim() };
    const msg = form.querySelector('#cfgmsg'); msg.textContent = ''; btn.disabled = true; const label = btn.textContent; btn.textContent = 'Đang kiểm tra…';
    const err = await testServer(cfg.url, cfg.key);
    btn.disabled = false; btn.textContent = label;
    if (err) { msg.textContent = err; return; }
    done(cfg);
  };
}
function screenConfig() {
  const c = getConfig();
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><h1 class="auth-h">Kết nối máy chủ</h1><p class="mute" style="margin-top:0">Nhập thông tin dự án Supabase của bạn. Chỉ cần làm một lần trên mỗi thiết bị — sau này đổi được ở mục Khác → Máy chủ.</p>
  <form id="cfgf">${cfgFormHtml(c)}<button class="btn primary block" style="min-height:48px">Kết nối</button></form>
  <p class="small mute" style="margin-top:16px">Lấy ở Supabase → Project Settings → API. Chạy file <code>schema.sql</code> trong SQL Editor trước khi đăng nhập. Không dùng khóa service_role ở đây.</p>${c.url && c.key ? '<p class="small" style="margin-top:12px"><a href="#" id="cfgback" class="mute">Quay lại đăng nhập</a></p>' : ''}</div>`;
  if ($('#cfgback')) $('#cfgback').onclick = e => { e.preventDefault(); location.reload(); };
  wireCfgForm($('#cfgf'), $('#cfgf .btn'), cfg => { LS.set('jp_cfg', cfg); location.reload(); });
}
// Dịch lỗi Supabase Auth sang tiếng Việt dễ hiểu
function authMsg(e) {
  const m = (e && (e.message || e.error_description || e)) + '', c = (e && (e.code || e.error_code)) || '';
  if (/Invalid login/i.test(m)) return 'Sai email hoặc mật khẩu';
  if (/not confirmed/i.test(m) || c === 'email_not_confirmed') return 'Email chưa được xác nhận — hãy mở email và bấm liên kết xác nhận.';
  if (/already registered|already been registered/i.test(m) || c === 'user_already_exists') return 'Email này đã được đăng ký — hãy đăng nhập, hoặc bấm "Quên mật khẩu".';
  if (/rate limit|only request this after|too many/i.test(m) || c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit') return 'Bạn thao tác quá nhanh — vui lòng đợi khoảng 1 phút rồi thử lại.';
  if (/at least \d+ char|weak/i.test(m) || c === 'weak_password') return 'Mật khẩu quá yếu — hãy dùng ít nhất 8 ký tự, có chữ và số.';
  if (/same as the old/i.test(m) || c === 'same_password') return 'Mật khẩu mới phải khác mật khẩu cũ.';
  if (/expired|invalid/i.test(m) && /link|otp|token/i.test(m) || c === 'otp_expired') return 'Liên kết đã hết hạn hoặc đã dùng rồi — hãy yêu cầu liên kết mới.';
  if (/signups? not allowed|disabled/i.test(m)) return 'Hiện chưa cho phép đăng ký tài khoản mới.';
  if (/fetch|network/i.test(m)) return 'Không kết nối được máy chủ — kiểm tra mạng rồi thử lại.';
  return m;
}
// Liên kết trong email (đặt lại mật khẩu / xác nhận đăng ký) quay về app kèm token ở phần #hash
async function takeAuthHash() {
  const h = location.hash.replace(/^#/, ''); if (!h || !/(access_token|error)=/.test(h)) return null;
  const q = new URLSearchParams(h); history.replaceState(null, '', location.pathname + location.search);
  if (q.get('error') || q.get('error_code')) return { error: authMsg({ error_code: q.get('error_code'), message: q.get('error_description') || q.get('error') || '' }) };
  const at = q.get('access_token'), rt = q.get('refresh_token'); if (!at || !rt) return null;
  const { error } = await sb.auth.setSession({ access_token: at, refresh_token: rt });
  if (error) return { error: authMsg(error) };
  return { type: q.get('type') || '' };
}
function screenForgot(prefill = '') {
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><h1 class="auth-h">Quên mật khẩu</h1><p class="mute" style="margin-top:0">Nhập email đã đăng ký, chúng tôi gửi liên kết để bạn đặt mật khẩu mới.</p>
  <form id="fgf"><label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email" autocapitalize="none" value="${esc(prefill)}" autofocus></label>
  <div id="fgmsg" class="small" style="min-height:22px;color:var(--bad)"></div>
  <button class="btn primary block" style="min-height:48px">Gửi liên kết đặt lại mật khẩu</button></form>
  <p class="small" style="text-align:center;margin-top:14px"><button type="button" class="linkbtn" id="fgback">← Quay lại đăng nhập</button></p></div>`;
  $('#fgback').onclick = () => screenAuth('', prefill);
  $('#fgf').onsubmit = async e => {
    e.preventDefault(); const em = new FormData(e.target).get('email').trim(); const m = $('#fgmsg'), b = $('#fgf button.primary');
    m.style.color = 'var(--mute)'; m.textContent = 'Đang gửi…'; b.disabled = true;
    const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
    b.disabled = false;
    if (error) { m.style.color = 'var(--bad)'; m.textContent = authMsg(error); return; }
    m.style.color = 'var(--ok)'; m.textContent = 'Nếu email này đã đăng ký, bạn sẽ nhận được liên kết trong vài phút. Hãy kiểm tra cả thư rác.';
  };
}
// Màn đặt mật khẩu mới: dùng cho cả "đến từ email quên mật khẩu" (recovery) lẫn khi đang đăng nhập muốn đổi mật khẩu
function newPasswordForm(onDone, sheetMode = false) {
  return `<form id="npf"><label class="field"><span>Mật khẩu mới (từ 8 ký tự)</span><span class="pw"><input name="p1" id="np1" type="password" required minlength="8" maxlength="72" autocomplete="new-password" ${sheetMode ? '' : 'autofocus'}><button type="button" class="pwtog" data-pwfor="np1">Hiện</button></span></label>
  <label class="field"><span>Nhập lại mật khẩu mới</span><input name="p2" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label>
  <div id="npmsg" class="small" style="min-height:22px;color:var(--bad)"></div>`;
}
function wireNewPassword(form, done) {
  const m = $('#npmsg'); const tog = $('[data-pwfor]', form);
  if (tog) tog.onclick = () => { const i = $('#np1'), h = i.type === 'password'; i.type = h ? 'text' : 'password'; tog.textContent = h ? 'Ẩn' : 'Hiện'; };
  form.onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(form));
    if (f.p1.length < 8) return m.textContent = 'Mật khẩu cần ít nhất 8 ký tự';
    if (f.p1 !== f.p2) return m.textContent = 'Hai mật khẩu chưa giống nhau';
    m.style.color = 'var(--mute)'; m.textContent = 'Đang lưu…'; const b = $('button.primary', form); if (b) b.disabled = true;
    const { error } = await sb.auth.updateUser({ password: f.p1 });
    if (b) b.disabled = false;
    if (error) { m.style.color = 'var(--bad)'; m.textContent = authMsg(error); return; }
    done();
  };
}
function screenNewPassword() {
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><h1 class="auth-h">Đặt mật khẩu mới</h1><p class="mute" style="margin-top:0">Chọn mật khẩu mới cho tài khoản của bạn.</p>
  ${newPasswordForm().replace('</form>', '')}<button class="btn primary block" style="min-height:48px">Lưu mật khẩu mới</button></form></div>`;
  wireNewPassword($('#npf'), () => { toast('Đã đổi mật khẩu'); boot(); });
}
ACT.changePassword = () => {
  const s = openSheet(`<h2>Đổi mật khẩu</h2>${newPasswordForm(null, true)}<div class="row"><button type="button" class="btn grow" data-close>Hủy</button><button class="btn primary grow">Lưu mật khẩu mới</button></div></form>`, { sticky: true });
  wireNewPassword(s.$('#npf'), () => { s.close(); toast('Đã đổi mật khẩu'); });
};
// ── Hai trang riêng: Đăng nhập (#/) và Đăng ký (#/dang-ky) — có địa chỉ riêng nên nút Quay lại của trình duyệt dùng được ──
const BASE_TITLE = document.title;
let GUEST = false;
const SIGNUP_HASH = '#/dang-ky';
function goGuest(page, prefill = '') {
  history.pushState(null, '', location.pathname + location.search + (page === 'signup' ? SIGNUP_HASH : ''));
  page === 'signup' ? screenSignup(prefill) : screenAuth('', prefill);
}
window.addEventListener('popstate', () => { if (GUEST) location.hash === SIGNUP_HASH ? screenSignup() : screenAuth(); });
const serverLink = () => BAKED_CONFIG ? '' : '<p class="small" style="margin-top:20px"><a href="#" id="chg" class="mute">Máy chủ Supabase</a></p>';
const wireServerLink = () => { if ($('#chg')) $('#chg').onclick = e => { e.preventDefault(); screenConfig(); }; };
function wirePwToggle(inputId, btnId) {
  const b = $('#' + btnId); b.onclick = () => { const i = $('#' + inputId), h = i.type === 'password'; i.type = h ? 'text' : 'password'; b.textContent = h ? 'Ẩn' : 'Hiện'; b.setAttribute('aria-label', h ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'); };
}
function screenAuth(msg = '', prefill = '') {
  GUEST = true; document.title = 'Đăng nhập — 日本語';
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><h1 class="auth-h">Đăng nhập</h1><p class="mute" style="margin-top:0">Học tiếng Nhật mọi lúc, đồng bộ giữa máy tính và điện thoại.</p>
  <form id="authf"><label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email" autocapitalize="none" value="${esc(prefill)}"></label>
  <label class="field"><span>Mật khẩu</span><span class="pw"><input name="password" id="pw" type="password" required minlength="6" autocomplete="current-password"><button type="button" class="pwtog" id="pwtog" aria-label="Hiện mật khẩu">Hiện</button></span></label>
  <p class="small" style="margin:-4px 0 6px;text-align:right"><button type="button" class="linkbtn" id="forgot" style="min-height:32px">Quên mật khẩu?</button></p>
  <div id="authmsg" class="small" style="min-height:22px;color:var(--bad)" role="alert">${esc(msg)}</div>
  <button class="btn primary block" data-mode="in" style="min-height:48px">Đăng nhập</button></form>
  <p class="small mute" style="text-align:center;margin:18px 0 0">Chưa có tài khoản? <a href="${SIGNUP_HASH}" class="linkbtn" id="tosignup">Đăng ký</a></p>
  ${serverLink()}</div>`;
  const say = (t, ok) => { const m = $('#authmsg'); m.textContent = t; m.style.color = ok ? 'var(--ok)' : 'var(--bad)'; };
  const email = () => new FormData($('#authf')).get('email') || '';
  $('#authf').onsubmit = async e => {
    e.preventDefault(); say('Đang đăng nhập…', true);
    const { error } = await sb.auth.signInWithPassword(Object.fromEntries(new FormData($('#authf'))));
    if (error) return say(authMsg(error));
    GUEST = false; boot();
  };
  wirePwToggle('pw', 'pwtog');
  $('#tosignup').onclick = e => { e.preventDefault(); goGuest('signup', email()); };
  $('#forgot').onclick = () => screenForgot(email());
  wireServerLink();
}
function screenSignup(prefill = '') {
  GUEST = true; document.title = 'Đăng ký — 日本語';
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><h1 class="auth-h">Tạo tài khoản</h1><p class="mute" style="margin-top:0">Dữ liệu học của bạn được lưu theo tài khoản và đồng bộ giữa các thiết bị.</p>
  <form id="signf"><label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email" autocapitalize="none" value="${esc(prefill)}" autofocus></label>
  <label class="field"><span>Mật khẩu (từ 8 ký tự)</span><span class="pw"><input name="password" id="spw" type="password" required minlength="8" maxlength="72" autocomplete="new-password"><button type="button" class="pwtog" id="spwtog" aria-label="Hiện mật khẩu">Hiện</button></span></label>
  <label class="field"><span>Nhập lại mật khẩu</span><input name="password2" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label>
  <div id="signmsg" class="small" style="min-height:22px;color:var(--bad)" role="alert"></div>
  <button class="btn primary block" style="min-height:48px">Tạo tài khoản</button></form>
  <p class="small mute" style="text-align:center;margin:18px 0 0">Đã có tài khoản? <a href="#" class="linkbtn" id="tologin">Đăng nhập</a></p>
  ${serverLink()}</div>`;
  const say = (t, ok) => { const m = $('#signmsg'); m.textContent = t; m.style.color = ok ? 'var(--ok)' : 'var(--bad)'; };
  wirePwToggle('spw', 'spwtog');
  $('#tologin').onclick = e => { e.preventDefault(); goGuest('login', new FormData($('#signf')).get('email') || ''); };
  $('#signf').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData($('#signf'))), em = f.email.trim();
    if (f.password.length < 8) return say('Mật khẩu cần ít nhất 8 ký tự');
    if (f.password !== f.password2) return say('Hai mật khẩu chưa giống nhau');
    say('Đang tạo tài khoản…', true); const b = $('#signf button.primary'); b.disabled = true;
    const { data, error } = await sb.auth.signUp({ email: em, password: f.password });
    b.disabled = false;
    if (error) return say(authMsg(error));
    if (data.session) { GUEST = false; return boot(); }
    screenSignupDone(em);
  };
  wireServerLink();
}
function screenSignupDone(email) {
  GUEST = true;
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><h1 class="auth-h">Kiểm tra email của bạn</h1><p class="mute" style="margin-top:0">Chúng tôi đã gửi một email xác nhận tới <b>${esc(email)}</b>. Mở email, bấm liên kết xác nhận, rồi quay lại đăng nhập. Nhớ xem cả thư rác.</p>
  <button class="btn primary block" id="donelogin" style="min-height:48px">Đến trang đăng nhập</button></div>`;
  $('#donelogin').onclick = () => goGuest('login', email);
}
function shell() {
  root().innerHTML = `<div id="app"><main id="view"></main><nav id="tabs" aria-label="Điều hướng chính">${TABS.map(([k, g, l, x]) =>
    `<button data-act="tab" data-tab="${k}" aria-label="${l}"${x ? ' class="desk"' : ''}><span class="g jp">${g}</span><span class="l">${l}</span>${k === 'today' ? '<span class="badge hidden" id="duebadge"></span>' : ''}</button>`).join('')}<button type="button" id="imeside" class="imeside" data-act="imeCycle" data-on="0" aria-label="Gõ tiếng Nhật">${IME.side()}</button></nav></div>`;
  IME.syncSide();
}
function screenBlocked() {
  root().innerHTML = `<div class="auth"><div class="logo jp">日本語</div><h1 class="auth-h">Tài khoản đang bị khóa</h1><p class="mute">Quản trị viên đã tạm khóa tài khoản này nên bạn chưa truy cập được dữ liệu. Dữ liệu của bạn vẫn được giữ nguyên. Hãy liên hệ quản trị viên để được mở khóa.</p>
  <div class="row"><button class="btn primary grow" onclick="boot()">Thử lại</button><button class="btn grow" data-act="logout">Đăng xuất</button></div></div>`;
}
// ── Hết hạn phiên đăng nhập ─────────────────────────────────────────────────
// Supabase tự gia hạn token vô thời hạn nên app tự đặt thêm 2 giới hạn (đổi trong js/config.js: idleDays, maxDays):
//  • không dùng quá idleDays ngày (mặc định 30) → phải đăng nhập lại
//  • đăng nhập quá maxDays ngày (mặc định 90) → phải đăng nhập lại dù vẫn đang dùng
const SESSION_IDLE_MS = (Number(window.JP_CONFIG && window.JP_CONFIG.idleDays) || 30) * 864e5;
const SESSION_MAX_MS = (Number(window.JP_CONFIG && window.JP_CONFIG.maxDays) || 90) * 864e5;
function sessionExpiredReason(uid, now = Date.now()) {
  let rec = LS.get('jp_session', null);
  if (!rec || rec.uid !== uid || !rec.login || !rec.last) { rec = { uid, login: now, last: now }; LS.set('jp_session', rec); return ''; }   // lần đầu / đổi tài khoản: bắt đầu tính từ bây giờ
  if (now - rec.last > SESSION_IDLE_MS) return `Bạn không dùng app hơn ${Math.round(SESSION_IDLE_MS / 864e5)} ngày — hãy đăng nhập lại.`;
  if (now - rec.login > SESSION_MAX_MS) return `Phiên đăng nhập đã quá ${Math.round(SESSION_MAX_MS / 864e5)} ngày — hãy đăng nhập lại.`;
  return '';
}
async function expireSession(msg) {
  try { await sb.auth.signOut(); } catch { /* bỏ qua */ }
  LS.set('jp_pending', []); LS.set('jp_session', null); LS.set('jp_notice', msg); location.reload();
}
let lastTouch = 0;
function touchActivity() {   // ghi nhận có dùng app (tối đa 1 lần/phút). Quá hạn thì KHÔNG gia hạn mà đăng xuất ngay
  if (document.visibilityState !== 'visible' || !S.user) return;
  const now = Date.now(); if (now - lastTouch < 60000) return; lastTouch = now;
  const why = sessionExpiredReason(S.user.id, now); if (why) return expireSession(why);
  const rec = LS.get('jp_session', null); if (rec && rec.uid === S.user.id) { rec.last = now; LS.set('jp_session', rec); }
}
['pointerdown', 'keydown', 'visibilitychange'].forEach(ev => document.addEventListener(ev, touchActivity, { passive: true }));

async function boot() {
  GUEST = false; document.title = BASE_TITLE;
  if (!initSupabase()) return screenConfig();
  root().innerHTML = '<div class="auth"><div class="logo jp">日本語</div><p class="mute">Đang tải…</p></div>';
  const hashRes = await takeAuthHash();
  if (hashRes && hashRes.type === 'recovery') return screenNewPassword();
  const { data } = await sb.auth.getSession();
  if (!data.session) { const n = LS.get('jp_notice', ''); if (n) LS.set('jp_notice', ''); return location.hash === SIGNUP_HASH ? screenSignup() : screenAuth(hashRes && hashRes.error || n || ''); }
  const why = sessionExpiredReason(data.session.user.id); if (why) return expireSession(why);
  S.user = data.session.user;
  try { migratePending(); await checkSchema(); S.me = await fetchMe(); if (S.me.status === 'blocked') return screenBlocked(); await loadAll(); SYNC.last = Date.now(); }
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
  const why = sessionExpiredReason(S.user.id); if (why) return expireSession(why);   // tab mở rất lâu vẫn bị kiểm tra
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
ACT.cfgEdit = () => {
  if (BAKED_CONFIG) return;
  const cur = getConfig();
  const s = openSheet(`<h2>Máy chủ Supabase</h2><p class="small mute" style="margin-top:0">Đổi sang dự án khác sẽ đăng xuất bạn và xóa các thay đổi chưa kịp đồng bộ trên thiết bị này.</p><form id="cfge">${cfgFormHtml(cur)}<div class="row"><button type="button" class="btn grow" data-close>Hủy</button><button class="btn primary grow" id="cfgsave">Kiểm tra &amp; lưu</button></div></form>`, { sticky: true });
  wireCfgForm(s.$('#cfge'), s.$('#cfgsave'), async cfg => {
    if (cfg.url === cur.url && cfg.key === cur.key) { s.close(); toast('Không có thay đổi'); return; }
    const changedProject = cfg.url !== cur.url;
    if (changedProject && S.user && !await confirmBox('Đổi sang máy chủ khác? Bạn sẽ được đăng xuất.', 'Đổi')) return;
    if (changedProject) { try { await sb.auth.signOut(); } catch { /* bỏ qua */ } LS.set('jp_pending', []); }   // cùng dự án mà chỉ đổi khóa → giữ đăng nhập
    LS.set('jp_cfg', cfg); location.reload();
  });
};

themeInit();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoRefresh(false); });
window.addEventListener('online', () => autoRefresh(true));
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
boot();
