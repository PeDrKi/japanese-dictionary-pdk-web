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
// Bộ chọn từ loại 2 cấp dạng chip: hàng trên = loại; chọn Động từ / Tính từ thì hàng dưới hiện các loại con
function posChips(val, act, k) {
  const par = posParent(val), kids = posKids(par);
  const chip = (v, l, on, cls = '') => `<button type="button" class="chip ${cls} ${on ? 'on' : ''}" data-act="${act}" data-k="${k}" data-v="${v}">${l}</button>`;
  const top = chip('', 'Tất cả', !val) + POS_TREE.map(n => chip(n.kids ? n.id + '*' : n.id, posParentLabel(n.id) + (n.kids ? ' ▾' : ''), par === n.id)).join('');
  const sub = kids ? `<div class="chips pos-kids" style="flex-wrap:wrap">${chip(par + '*', 'Tất cả ' + posParentLabel(par).toLowerCase(), val === par + '*')}${kids.map(x => chip(x, POS_KID_LABEL[x], val === x)).join('')}</div>` : '';
  return `<div class="chips" style="flex-wrap:wrap">${top}</div>${sub}`;
}
// Ô chọn từ loại trong form thẻ: hai ô chọn nối nhau (loại → loại con); giá trị thật nằm ở <input type=hidden name=pos> nên phần lưu thẻ không đổi
function posField(val) {
  const par = posParent(val), kids = posKids(par);
  return `<div class="field" id="posf"><span>Từ loại</span><div class="grid2">
    <select id="pos-par" aria-label="Từ loại"><option value="">— chưa chọn —</option>${POS_TREE.map(n => `<option value="${n.id}" ${par === n.id ? 'selected' : ''}>${posParentLabel(n.id)}</option>`).join('')}</select>
    <select id="pos-kid" aria-label="Loại con" ${kids ? '' : 'hidden'}>${kids ? posKidOptions(par, val) : ''}</select></div>
    <input type="hidden" name="pos" value="${esc(val || '')}"><span class="small mute" id="pos-hint" ${par === 'adj' && !val ? '' : 'hidden'}>Chọn đuôi い hoặc な để lưu từ loại</span></div>`;
}
const posKidOptions = (par, val) => (par === 'adj' ? '<option value="">— chọn đuôi —</option>' : '') + posKids(par).map(x => `<option value="${x}" ${val === x ? 'selected' : ''}>${POS_KID_LABEL[x]}</option>`).join('');
function posSync(form, forcePar) {      // đọc giá trị trong input ẩn → cập nhật hai ô chọn (dùng khi Jisho / tự điền đặt từ loại); forcePar = cha vừa chọn (khi giá trị còn rỗng, vd Tính từ chưa chọn đuôi)
  const h = form.elements.pos, par = forcePar !== undefined ? forcePar : posParent(h.value), kids = posKids(par), $p = form.querySelector('#pos-par'), $k = form.querySelector('#pos-kid');
  $p.value = par; $k.hidden = !kids; $k.innerHTML = kids ? posKidOptions(par, h.value) : ''; form.querySelector('#pos-hint').hidden = !(par === 'adj' && !h.value);
}
function posWire(form) {
  const h = form.elements.pos, $p = form.querySelector('#pos-par'), $k = form.querySelector('#pos-kid'), hint = form.querySelector('#pos-hint');
  $p.onchange = () => { const kids = posKids($p.value); h.value = kids ? (posParent(h.value) === $p.value ? h.value : $p.value === 'verb' ? 'verb' : '') : $p.value; posSync(form, $p.value); h.dispatchEvent(new Event('change', { bubbles: true })); };
  $k.onchange = () => { h.value = $k.value; hint.hidden = !($p.value === 'adj' && !h.value); h.dispatchEvent(new Event('change', { bubbles: true })); };
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

/* Chữ trên thẻ: 1 chữ → ô vuông lớn; nhiều chữ → mỗi chữ một ô, trải ngang, tự xuống dòng */
function charBox(str) {
  const a = [...String(str || '')];
  if (a.length < 2) return { multi: false, html: `<div class="ch">${esc(str)}</div>` };
  return { multi: true, html: `<div class="cells" style="--n:${a.length}">${a.map(x => `<span class="cell"><span class="ch">${esc(x)}</span></span>`).join('')}</div>` };
}
