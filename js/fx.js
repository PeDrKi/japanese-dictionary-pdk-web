/* fx.js — hiệu ứng chuyển động (GSAP) cho các màn hình trong app. Nguyên tắc: ngắn (≤ 0.5 giây), chỉ dùng transform/opacity, không bao giờ chặn thao tác.
   Không có GSAP hoặc máy bật "Giảm chuyển động" → mọi hàm không làm gì và app chạy y như cũ. Lỗi hiệu ứng không làm hỏng app (bọc try/catch). */
'use strict';
const FX = (() => {
  // Tuỳ chọn của người dùng (lưu trên máy): 'auto' = theo hệ điều hành · 'off' = tĩnh hoàn toàn · 'on' = luôn bật dù hệ điều hành xin giảm chuyển động
  const pref = () => { const p = LS.get('jp_motion', 'auto'); return p === 'on' || p === 'off' ? p : 'auto'; };
  const osReduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const live = () => !!window.gsap && (pref() === 'on' || (pref() === 'auto' && !osReduced()));
  const LABEL = { auto: 'Theo hệ thống', off: 'Tắt (tĩnh)', on: 'Bật' };
  const label = () => LABEL[pref()];
  const apply = () => { const r = document.documentElement; if (pref() === 'auto') delete r.dataset.motion; else r.dataset.motion = pref(); };   // CSS dùng để tắt/bật cả hoạt ảnh thuần CSS
  const set = p => { LS.set('jp_motion', p); apply(); };
  const cycle = () => { set({ auto: 'off', off: 'on', on: 'auto' }[pref()]); return pref(); };
  const safe = fn => (...a) => { try { return live() ? fn(...a) : false; } catch (e) { console.warn('FX', e); return false; } };
  let lastKey = null, lastDepth = 0, hadSelbar = false, lastBadge = null;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Chuyển màn hình chính / màn phụ: các khối trong trang hiện lần lượt (chỉ khi đổi màn hình, không phải khi vẽ lại dữ liệu)
  const view = safe((v, key, depth) => {
    const changed = key !== lastKey, dir = depth > lastDepth ? 1 : depth < lastDepth ? -1 : 0; lastKey = key; lastDepth = depth;
    if (!changed) return;
    gsap.killTweensOf($$('#view .page > *, #view .page .list > .item'));
    const page = v.querySelector('.page'); if (!page) return;
    const targets = [...page.children].flatMap(ch => ch.matches('.list') ? [...ch.children].slice(0, 14) : [ch]).slice(0, 16);
    gsap.fromTo(targets, dir ? { opacity: 0, x: dir * 30 } : { opacity: 0, y: 16 }, { opacity: 1, x: 0, y: 0, duration: .4, stagger: .035, ease: 'power3.out', clearProps: 'transform,opacity' });
    $$('.bars', v).forEach(b => gsap.from($$('i', b), { scaleY: 0, transformOrigin: '50% 100%', duration: .6, stagger: .02, ease: 'power3.out', delay: .15, clearProps: 'transform' }));
    $$('.meter > i', v).forEach(m => gsap.from(m, { width: 0, duration: .8, ease: 'power3.out', delay: .2 }));
    $$('.prog > i', v).forEach(m => gsap.from(m, { width: 0, duration: .6, ease: 'power3.out' }));
    $$('.count', v).forEach(el => {
      const m = /^(\d+)(.*)$/.exec(el.textContent.trim()); if (!m || +m[1] === 0) return;
      const o = { n: 0 }, end = +m[1], suf = m[2]; el.textContent = '0' + suf;
      gsap.to(o, { n: end, duration: .9, ease: 'power2.out', delay: .2, onUpdate: () => { el.textContent = Math.round(o.n) + suf; }, onComplete: () => { el.textContent = end + suf; } });
    });
    const stamp = v.querySelector('.stamp');       // con dấu "cần ôn" đóng xuống như ở trang đăng nhập
    if (stamp) {
      const base = stamp.classList.contains('zero') ? -4 : -4;
      gsap.fromTo(stamp, { scale: 1.9, rotation: base - 14, opacity: 0 }, { scale: 1, rotation: base, opacity: 1, duration: .3, delay: .15, ease: 'power4.in', clearProps: 'transform,opacity' });
    }
    const fab = v.parentElement.querySelector('.fab');
    if (fab) gsap.fromTo(fab, { scale: 0 }, { scale: 1, duration: .55, delay: .3, ease: 'back.out(2.4)', clearProps: 'transform' });
  });
  // Gọi sau MỌI lần vẽ: thanh chọn nhiều thẻ trượt lên, huy hiệu "đến hạn" nảy khi đổi số
  const after = safe(v => {
    const sb = v.parentElement.querySelector('.selbar');
    if (sb && !hadSelbar) gsap.from(sb, { y: 70, opacity: 0, duration: .35, ease: 'power3.out', clearProps: 'transform,opacity' });
    hadSelbar = !!sb;
    const bd = document.getElementById('duebadge');
    if (bd && !bd.classList.contains('hidden')) { if (lastBadge !== null && lastBadge !== bd.textContent) gsap.fromTo(bd, { scale: 1.8 }, { scale: 1, duration: .5, ease: 'elastic.out(1,.5)', clearProps: 'transform' }); lastBadge = bd.textContent; } else lastBadge = null;
  });
  const tabPop = safe(() => { const g = document.querySelector('#tabs [aria-current="page"] .g'); if (g) gsap.fromTo(g, { scale: .65, y: 5 }, { scale: 1, y: 0, duration: .55, ease: 'back.out(2.4)', clearProps: 'transform' }); });

  // Hộp thoại: nền mờ dần, hộp trượt lên (điện thoại) / phóng nhẹ ra (máy tính). Đóng: bản sao (đã bỏ id) mờ đi để không trùng id với hộp thoại mới
  const layerIn = safe(el => {
    const sheet = el.querySelector('.sheet'); el.style.animation = 'none';
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: .22, ease: 'power1.out', clearProps: 'opacity' });
    if (sheet) { sheet.style.animation = 'none'; const wide = matchMedia('(min-width: 900px)').matches;
      gsap.fromTo(sheet, wide ? { y: 18, scale: .96, opacity: 0 } : { y: 80 }, { y: 0, scale: 1, opacity: 1, duration: wide ? .3 : .42, ease: 'power3.out', clearProps: 'transform,opacity' }); }
    else gsap.fromTo(el, { scale: .985 }, { scale: 1, duration: .3, ease: 'power3.out', clearProps: 'transform' });
  });
  const layerOut = safe(el => {
    const g = el.cloneNode(true); g.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); g.querySelectorAll('[autofocus],[name]').forEach(n => { n.removeAttribute('autofocus'); n.removeAttribute('name'); });
    g.setAttribute('aria-hidden', 'true'); g.inert = true; Object.assign(g.style, { pointerEvents: 'none', animation: 'none' }); document.body.appendChild(g);
    const sheet = g.querySelector('.sheet'); if (sheet) sheet.style.animation = 'none';
    const done = () => g.remove();
    gsap.to(g, { opacity: 0, duration: .2, ease: 'power1.in', onComplete: done });
    if (sheet) gsap.to(sheet, { y: matchMedia('(min-width: 900px)').matches ? 10 : 60, duration: .2, ease: 'power1.in' });
    setTimeout(done, 600);
  });
  const toastIn = safe(t => { t.style.animation = 'none'; gsap.fromTo(t, { y: 18, opacity: 0, xPercent: -50 }, { y: 0, opacity: 1, xPercent: -50, duration: .35, ease: 'back.out(1.6)' }); });
  const toastOut = fn => { const t = document.querySelector('.toast'); if (!t || !live()) return fn(); try { gsap.to(t, { y: 10, opacity: 0, duration: .22, ease: 'power1.in', onComplete: fn }); } catch { fn(); } };

  // Ôn tập
  const flip = safe(p => { if (!p) return false; gsap.fromTo(p, { rotationY: -88, transformPerspective: 900, opacity: .3 }, { rotationY: 0, opacity: 1, duration: .5, ease: 'back.out(1.5)', clearProps: 'transform,opacity' });
    const back = p.parentElement && p.parentElement.querySelector('.back > *'); if (back) gsap.from($$('.back > *', p.parentElement), { opacity: 0, y: 12, duration: .35, stagger: .06, delay: .22, ease: 'power2.out', clearProps: 'transform,opacity' }); return true; });
  const cardIn = safe((p, ok) => { if (!p) return; gsap.fromTo(p, ok === false ? { x: -46, opacity: 0, rotation: -3 } : ok === true ? { x: 46, opacity: 0, rotation: 3 } : { y: 24, opacity: 0, scale: .96 }, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: .38, ease: 'power3.out', clearProps: 'transform,opacity' }); });
  const verdict = safe((root, ok) => {
    const p = root.querySelector('.paper'); if (!p) return;
    if (ok) gsap.fromTo(p, { scale: 1 }, { keyframes: { scale: [1.05, 1] }, duration: .35, ease: 'power2.out', clearProps: 'transform' });
    else gsap.fromTo(p, { x: 0 }, { keyframes: { x: [-12, 10, -7, 4, 0] }, duration: .45, ease: 'power1.inOut', clearProps: 'transform' });
    const fb = root.querySelector('#fb'); if (fb) gsap.fromTo(fb, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: 'power2.out', clearProps: 'transform,opacity' });
  });
  const result = safe(root => {
    const sc = root.querySelector('.score'), jp = root.querySelector('.result .jp');
    if (jp) gsap.from(jp, { opacity: 0, scale: 1.4, duration: .5, ease: 'power3.out', clearProps: 'transform,opacity' });
    if (sc) { const m = /^(\d+)(.*)$/.exec(sc.textContent.trim()); if (m) { const o = { n: 0 }, end = +m[1], suf = m[2]; sc.textContent = '0' + suf;
      gsap.to(o, { n: end, duration: .9, delay: .2, ease: 'power2.out', onUpdate: () => { sc.textContent = Math.round(o.n) + suf; }, onComplete: () => { sc.textContent = end + suf; } }); } }
    gsap.from(root.querySelectorAll('.result > :not(.jp):not(.score)'), { opacity: 0, y: 14, duration: .4, stagger: .08, delay: .3, ease: 'power2.out', clearProps: 'transform,opacity' });
  });
  apply();
  return { live, pref, label, set, cycle, apply, view, after, tabPop, layerIn, layerOut, toastIn, toastOut, flip, cardIn, verdict, result };
})();
