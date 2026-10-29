// Hiệu ứng cho trang Đăng nhập / Đăng ký (GSAP). Thiếu GSAP hoặc máy bật "giảm chuyển động" → giao diện tĩnh, vẫn dùng bình thường.
const AuthFX = (() => {
  const live = () => FX.live();   // cùng một công tắc với phần còn lại của app (Khác → Hiệu ứng chuyển động)
  const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノ日月火水木金土人本語学';
  const QUOTES = [['継続は力なり', 'Kiên trì là sức mạnh'], ['七転び八起き', 'Ngã bảy lần, đứng dậy tám lần'], ['千里の道も一歩から', 'Đường nghìn dặm bắt đầu từ một bước chân']];
  const LAYERS = [{ n: 13, size: [22, 34], op: .08, depth: 10, dur: [11, 18], blur: 1.5 }, { n: 9, size: [38, 56], op: .12, depth: 22, dur: [9, 14], blur: 0 }, { n: 5, size: [70, 104], op: .16, depth: 40, dur: [8, 12], blur: 0 }];
  let ctx = null, off = null;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function shell(cardHtml, page = 'login') {
    return `<div class="authx" data-page="${page}"><svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><filter id="ax-rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/></filter></svg>
    <section class="ax-stage"><div class="ax-kana" aria-hidden="true"></div>
      <div class="ax-hero"><div class="ax-titlewrap"><div class="ax-title" aria-hidden="true"><span class="ch">日</span><span class="ch">本</span><span class="ch">語</span></div>
        <svg class="ax-brush" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14 C 60 4, 120 22, 190 12 S 330 6, 396 13"/></svg>
        <div class="ax-stamp" aria-hidden="true"><span>学</span><i class="ax-ring"></i></div></div>
        <p class="ax-tag">Mỗi ngày một chút,<br>nhớ lâu hơn.</p>
        <p class="ax-quote" aria-hidden="true"><span class="q-jp"></span><span class="q-vi"></span></p></div></section>
    <main class="ax-side"><div class="ax-cardwrap"><div class="ax-card">${cardHtml}</div></div></main></div>`;
  }

  // Chữ kana trôi chậm theo 3 lớp sâu; di chuột làm các lớp lệch nhẹ (parallax)
  function buildKana(x, animate) {
    const host = $('.ax-kana', x), layers = [];
    LAYERS.forEach(L => {
      const el = document.createElement('div'); el.className = 'ax-layer'; host.appendChild(el); layers.push(el);
      for (let i = 0; i < L.n; i++) {
        const g = document.createElement('span'); g.className = 'ax-g' + (Math.random() < .22 ? ' amb' : ''); g.textContent = KANA[Math.floor(Math.random() * KANA.length)];
        Object.assign(g.style, { left: rnd(0, 96) + '%', top: rnd(0, 92) + '%', fontSize: rnd(...L.size) + 'px', opacity: L.op * rnd(.7, 1.25), filter: L.blur ? `blur(${L.blur}px)` : '' });
        el.appendChild(g);
        if (animate) gsap.to(g, { y: rnd(-70, 70), x: rnd(-30, 30), rotation: rnd(-14, 14), duration: rnd(...L.dur), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -rnd(0, 8) });
      }
    });
    if (!animate) return;
    const to = layers.map(l => ({ x: gsap.quickTo(l, 'x', { duration: 1.1, ease: 'power3' }), y: gsap.quickTo(l, 'y', { duration: 1.1, ease: 'power3' }) }));
    const move = e => {
      if (!x.isConnected) return destroy();
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      to.forEach((t, i) => { t.x(-nx * LAYERS[i].depth * 2); t.y(-ny * LAYERS[i].depth * 2); });
    };
    addEventListener('pointermove', move, { passive: true }); off = () => removeEventListener('pointermove', move);
  }

  function reveal(card, first) {
    const items = $$('.auth-h, .ax-sub, .ax-check, .field, .ax-act, .ax-alt, .ax-note', card);
    gsap.fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .55, stagger: .06, ease: 'power2.out', delay: first ? .75 : .22, clearProps: 'transform,opacity' });
    $$('.ax-check', card).forEach(svg => {
      const parts = $$('circle,path', svg); parts.forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
      gsap.to(parts, { strokeDashoffset: 0, duration: .7, stagger: .35, ease: 'power2.inOut', delay: first ? 1.1 : .5 });
    });
    $$('.ax-act', card).forEach(btn => {      // nút "hút" nhẹ về phía con trỏ
      if (!matchMedia('(hover: hover)').matches) return;
      const qx = gsap.quickTo(btn, 'x', { duration: .4, ease: 'power3' }), qy = gsap.quickTo(btn, 'y', { duration: .4, ease: 'power3' });
      btn.addEventListener('pointermove', e => { const r = btn.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .08); qy((e.clientY - r.top - r.height / 2) * .22); });
      btn.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  function intro() {
    destroy(); const x = $('.authx'); if (!x) return;
    const card = $('.ax-card', x), jp = $('.q-jp', x), vi = $('.q-vi', x);
    jp.textContent = QUOTES[0][0]; vi.textContent = QUOTES[0][1];
    if (!live()) { buildKana(x, false); return; }
    ctx = gsap.context(() => {
      buildKana(x, true);
      const ch = $$('.ax-title .ch', x), path = $('.ax-brush path', x), stamp = $('.ax-stamp', x), ring = $('.ax-ring', x), hero = $('.ax-hero', x);
      const len = path.getTotalLength(); gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set([jp, vi], { opacity: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(ch, { opacity: 0, yPercent: 35, scale: 1.18, filter: 'blur(16px)', duration: 1.15, stagger: .16, clearProps: 'filter,transform' }, .1)
        .to(path, { strokeDashoffset: 0, duration: .9, ease: 'power2.inOut' }, .95)
        .fromTo(stamp, { opacity: 0, scale: 2.6, rotation: -24 }, { opacity: 1, scale: 1, rotation: -7, duration: .26, ease: 'power4.in' }, 1.4)
        .fromTo(ring, { scale: 1, opacity: .6 }, { scale: 2.8, opacity: 0, duration: .8, ease: 'power2.out' }, 1.66)
        .fromTo(hero, { y: 0 }, { keyframes: { y: [4, -3, 2, 0] }, duration: .32, ease: 'none' }, 1.66)
        .from('.ax-tag', { opacity: 0, y: 14, duration: .7 }, 1.75)
        .fromTo(card, { opacity: 0, y: 40, rotationY: -16, transformPerspective: 900 }, { opacity: 1, y: 0, rotationY: 0, duration: .95, clearProps: 'transform,opacity' }, .45);
      reveal(card, true);
      const q = gsap.timeline({ repeat: -1, delay: 2.8 });      // câu tục ngữ đổi dần
      QUOTES.forEach(([a, b], i) => q.call(() => { jp.textContent = a; vi.textContent = b; })
        .fromTo([jp, vi], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .8, stagger: .12, ease: 'power2.out' })
        .to([jp, vi], { opacity: 0, y: -8, duration: .6, delay: 3.4, ease: 'power1.in' }));
    }, x);
  }

  // Đổi trang (đăng nhập ⇄ đăng ký): thẻ lật như mặt sau của flashcard, dấu ấn bên trái nhấn lại
  function swap(cardHtml, dir, page) {
    const x = $('.authx'), card = $('.ax-card', x), stage = $('.ax-stage', x), side = $('.ax-side', x);
    card.innerHTML = cardHtml; card.classList.remove('ax-err');
    const was = x.dataset.page, a = [stage.getBoundingClientRect().left, side.getBoundingClientRect().left];
    if (page) x.dataset.page = page;
    if (!live() || !ctx) return;
    ctx.add(() => {
      if (page && page !== was) {          // hai nửa trượt qua nhau để đổi chỗ (FLIP); điện thoại xếp dọc nên dx = 0 → bỏ qua
        const b = [stage.getBoundingClientRect().left, side.getBoundingClientRect().left];
        if (Math.abs(a[0] - b[0]) > 1) {
          gsap.fromTo(stage, { x: a[0] - b[0] }, { x: 0, duration: .9, ease: 'power3.inOut', clearProps: 'transform' });
          gsap.fromTo(side, { x: a[1] - b[1] }, { x: 0, duration: .9, ease: 'power3.inOut', clearProps: 'transform' });
        }
      }
      gsap.fromTo(card, { opacity: 0, rotationY: (dir || 1) * 60, transformPerspective: 1100 }, { opacity: 1, rotationY: 0, duration: .8, ease: 'back.out(1.2)', clearProps: 'transform,opacity' });
      gsap.fromTo($('.ax-stamp', x), { scale: 1.22 }, { scale: 1, rotation: dir > 0 ? 5 : -7, duration: .6, ease: 'elastic.out(1,.45)' });
      reveal(card, false);
    });
  }
  function shake() {
    const card = $('.ax-card'); if (!card) return;
    card.classList.add('ax-err'); setTimeout(() => card.classList.remove('ax-err'), 900);
    if (live()) gsap.fromTo(card, { x: 0 }, { keyframes: { x: [-12, 10, -7, 4, 0] }, duration: .5, ease: 'power1.inOut' });
  }
  // Đăng nhập thành công: thẻ bay lên, chữ sáng lên một nhịp rồi vào app
  function leave() {
    const x = $('.authx'); if (!x || !live()) return Promise.resolve();
    return new Promise(res => gsap.timeline({ onComplete: res })
      .to($('.ax-card', x), { y: -24, opacity: 0, scale: .97, duration: .38, ease: 'power2.in' }, 0)
      .to($$('.ax-title .ch', x), { scale: 1.06, duration: .2, stagger: .05, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0)
      .to($('.ax-stamp', x), { scale: 1.2, duration: .18, yoyo: true, repeat: 1 }, 0));
  }
  function destroy() { if (ctx) { ctx.revert(); ctx = null; } if (off) { off(); off = null; } }
  return { shell, intro, swap, shake, leave, destroy };
})();
