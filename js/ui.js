/* ui.js — toast, sheet, lớp (layer) + nút Back của điện thoại, ủy quyền sự kiện */
'use strict';

const ACT = {};      // data-act → handler(el, event)
const NAV = { tab: 'today', sub: null, stack: [], depth: 0 };   // depth = số mục history do màn phụ đã đẩy vào
const FILT = { search: '', type: '', jlpt: '', pos: '', status: '', fav: false, due: false, deck: '', cat: '', shown: 50, page: 0, select: false, sel: new Set() };
const PAGE_SIZE = 50;
const pageMode = () => (LS.get('jp_pagemode', 'more') === 'pages' ? 'pages' : 'more');   // 'more' = nút Xem thêm · 'pages' = phân trang
function resetPaging() { FILT.shown = PAGE_SIZE; FILT.page = 0; }

// ── Toast ───────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, err = false) {
  $('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); FX.toastIn(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => FX.toastOut(() => t.remove()), err ? 4200 : 2200);
}
async function guard(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); return r ?? true; }
  catch (e) {
    console.error(e);
    if (e && e.code === '23505') {   // vi phạm tên/ký tự trùng (vd 2 thiết bị cùng tạo bộ thẻ cùng tên)
      toast('Tên hoặc ký tự này đã tồn tại (có thể vừa được thêm từ thiết bị khác) — đang tải lại dữ liệu', true);
      refreshData({ force: true }).then(r => { if (r === 'changed') softRender(); });
    } else toast('Lỗi: ' + (e.message || e), true);
    return undefined;
  }
}

// ── Lớp phủ: mỗi sheet/màn hình phụ đẩy 1 state vào history để nút Back đóng được ──
const layers = []; let ignorePops = 0; // số lần history.back() do chính app gọi, popstate tương ứng phải bỏ qua
// Giữ phím Tab quay vòng trong hộp thoại đang mở (không "chui" ra trang phía sau)
function trapFocus(el) {
  el.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')]
      .filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === first || !el.contains(a))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || !el.contains(a))) { e.preventDefault(); first.focus(); }
  });
}
function pushLayer(el, onClose) {
  const layer = { el, onClose, closed: false };
  const opener = document.activeElement;   // trả focus về chỗ cũ khi đóng (bàn phím / trình đọc màn hình)
  trapFocus(el);
  layers.push(layer); history.pushState({ layer: layers.length }, '');
  layer.close = () => {
    if (layer.closed) return; layer.closed = true;
    const i = layers.indexOf(layer); if (i >= 0) layers.splice(i, 1);
    FX.layerOut(el); el.remove(); onClose?.();
    if (opener && opener.isConnected && typeof opener.focus === 'function') { try { opener.focus({ preventScroll: true }); } catch {} }
    // Chỉ lùi lịch sử khi đang đứng trên một mục do app đẩy vào — không bao giờ lùi ra khỏi trang
    if (!layer.byPop && history.state && history.state.layer) { ignorePops++; history.back(); }
  };
  return layer;
}
window.addEventListener('popstate', () => {
  if (ignorePops > 0) { ignorePops--; return; }
  const top = layers[layers.length - 1];
  if (top) { top.byPop = true; top.close(); }
  else if (NAV.sub) { NAV.depth = Math.max(0, NAV.depth - 1); NAV.sub = NAV.stack.pop() || null; render(); }
});

function openSheet(html, opts = {}) {
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(scrim);
  const layer = pushLayer(scrim, opts.onClose); FX.layerIn(scrim);
  if (!opts.sticky) scrim.addEventListener('mousedown', e => { if (e.target === scrim) layer.close(); });   // form dài: chạm ra ngoài không làm mất nội dung đang nhập
  scrim.addEventListener('click', e => { if (e.target.closest('[data-close]')) layer.close(); });
  const first = $('[autofocus]', scrim); if (first) setTimeout(() => first.focus(), 60);
  else { const sh = $('.sheet', scrim); sh.tabIndex = -1; setTimeout(() => sh.focus({ preventScroll: true }), 30); }
  return { el: scrim, sheet: $('.sheet', scrim), close: layer.close, $: s => $(s, scrim) };
}
function openFull(html, opts = {}) {
  const el = document.createElement('div'); el.className = 'full'; el.innerHTML = html; document.body.appendChild(el);
  const layer = pushLayer(el, opts.onClose); FX.layerIn(el);
  el.addEventListener('click', e => { if (e.target.closest('[data-close]')) layer.close(); });
  return { el, close: layer.close, $: s => $(s, el), set(h) { el.innerHTML = h; } };
}
function confirmBox(msg, okLabel = 'Đồng ý', danger = false) {
  return new Promise(res => {
    let done = false;
    const s = openSheet(`<h2>${esc(msg)}</h2><div class="row"><button class="btn grow" data-close>Hủy</button>
      <button class="btn grow ${danger ? 'bad' : 'primary'}" id="cf-ok">${esc(okLabel)}</button></div>`, { onClose: () => { if (!done) res(false); } });
    s.$('#cf-ok').onclick = () => { done = true; res(true); s.close(); };
  });
}

// ── Ủy quyền sự kiện ────────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const fn = ACT[t.dataset.act]; if (fn) { e.preventDefault(); fn(t, e); }
});

// ── Mảnh HTML dùng chung ────────────────────────────────────────────────────
function cardMainText(c) {
  if (c.type === 'kanji') return [c.reading_on, c.reading_kun].filter(Boolean).join(' / ');
  return c.reading_kana || '';
}
function cardRow(c, extra = '') {
  const long = [...c.character].length > 3 ? ' long' : '';
  const sel = FILT.select && FILT.sel.has(c.id) ? ' sel' : '';
  return `<button class="item${sel}" data-act="openCard" data-id="${c.id}">
    <span class="big jp${long}">${esc(c.character)}</span>
    <span class="grow"><span class="t">${esc(c.meaning_vi)}</span><br><span class="s jp">${esc(cardMainText(c)) || '&nbsp;'}</span></span>
    <span style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end">
      <span class="row" style="gap:6px">${c.is_favorite ? '<span style="color:var(--accent)">★</span>' : ''}<span class="st ${c.status}" title="${STATUS_LABEL[c.status]}"></span></span>
      <span class="row" style="gap:4px">${POS_SHORT[c.pos] ? `<span class="tag">${POS_SHORT[c.pos]}</span>` : ''}${safeJlpt(c.jlpt_level) ? `<span class="tag ${safeJlpt(c.jlpt_level).toLowerCase()}">${safeJlpt(c.jlpt_level)}</span>` : ''}</span>${extra}
    </span></button>`;
}
const emptyBox = (g, msg, sub = '') => `<div class="empty"><div class="g jp">${g}</div><p><b>${esc(msg)}</b></p>${sub ? `<p class="small">${sub}</p>` : ''}</div>`;
const pageTop = (title, back = false, right = '') => `<div class="topbar">${back ? '<button class="iconbtn" data-act="back" aria-label="Quay lại">←</button>' : ''}<h1>${esc(title)}</h1>${right}</div>`;
function updateSyncBadge() {
  const n = pending().length; const b = $('#syncbadge'); if (!b) return;
  const t = SYNC.last ? new Date(SYNC.last).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  b.textContent = SYNC.needsSchema ? '⚠️ Cần chạy schema.sql bản mới trên Supabase'
    : n ? `⏳ ${n} thay đổi chờ đồng bộ` : `☁️ Đã đồng bộ${t ? ' · ' + t : ''}`;
}
function themeInit() { const t = LS.get('jp_theme', 'auto'); if (t !== 'auto') document.documentElement.dataset.theme = t; }
function themeCycle() {
  const order = ['auto', 'dark', 'light']; const nx = order[(order.indexOf(LS.get('jp_theme', 'auto')) + 1) % 3]; LS.set('jp_theme', nx);
  if (nx === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = nx;
  toast({ auto: 'Giao diện: theo hệ thống', dark: 'Giao diện: tối', light: 'Giao diện: sáng' }[nx]);
}
// Rời màn phụ: lùi đúng 1 mục history (popstate sẽ vẽ lại); nếu không còn mục nào (vd vừa tải lại trang) thì tự lùi trong NAV
function leaveSub() {
  if (NAV.depth > 0) history.back();
  else { NAV.sub = NAV.stack.pop() || null; render(); }
}
// Chuyển tab khi đang ở màn phụ: gỡ hết các mục history của màn phụ để nút Back không "kẹt" ở những màn đã rời
function dropSubHistory() {
  if (NAV.depth > 0) { ignorePops++; history.go(-NAV.depth); NAV.depth = 0; }
}
ACT.back = () => { if (layers.length) layers[layers.length - 1].close(); else if (NAV.sub) leaveSub(); else history.back(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length) layers[layers.length - 1].close(); });
