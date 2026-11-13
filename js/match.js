/* match.js — Ghép thẻ: mỗi lượt 5 cặp, nối đúng thì biến mất; tính vào tiến độ như ôn bình thường */
'use strict';

// Kiểu cặp: [khóa, nhãn, nhãn bên trái, nhãn bên phải, hàm lấy giá trị trái, hàm lấy giá trị phải]
const MP_TEXT = (c, k) => { const v = k === 'jp' ? c.character : k === 'meaning' ? c.meaning_vi : k === 'hanviet' ? c.reading_hanviet : k === 'kun' ? c.reading_kun : k === 'on' ? c.reading_on : c.romaji; return (v || '').trim(); };
const MATCH_PAIRS = [
  ['meaning', 'Chữ ↔ Nghĩa', 'jp', 'meaning'], ['hanviet', 'Chữ ↔ Hán Việt', 'jp', 'hanviet'], ['kun', 'Chữ ↔ Âm Kun', 'jp', 'kun'],
  ['on', 'Chữ ↔ Âm On', 'jp', 'on'], ['romaji', 'Chữ ↔ Romaji', 'jp', 'romaji'],
  ['hv_kun', 'Hán Việt ↔ Âm Kun', 'hanviet', 'kun'], ['hv_on', 'Hán Việt ↔ Âm On', 'hanviet', 'on'], ['hv_romaji', 'Hán Việt ↔ Romaji', 'hanviet', 'romaji'],
];
const MATCH_COUNTS = [5, 10, 15, 20, 25], MATCH_ROUND = 5;
const matchDef = key => MATCH_PAIRS.find(p => p[0] === key) || MATCH_PAIRS[0];
// Thẻ đủ dữ liệu cho kiểu cặp này (cả hai vế đều có)
const matchEligible = (cards, key) => { const [, , l, r] = matchDef(key); return cards.filter(c => MP_TEXT(c, l) && MP_TEXT(c, r)); };

// Chia thành các lượt ≤5 cặp; trong 1 lượt không có hai thẻ trùng vế trái hoặc vế phải (tránh đáp án mơ hồ)
function buildMatchRounds(cards, key, wantPairs) {
  const [, , l, r] = matchDef(key);
  let left = shuffle(matchEligible(cards, key).slice()).slice(0, wantPairs * 2);   // dư để thay thẻ trùng
  const rounds = []; let taken = 0;
  while (left.length && taken < wantPairs) {
    const round = [], usedL = new Set(), usedR = new Set(), rest = [];
    for (const c of left) {
      const a = MP_TEXT(c, l), b = MP_TEXT(c, r);
      if (round.length < MATCH_ROUND && taken + round.length < wantPairs && !usedL.has(a) && !usedR.has(b)) { round.push(c); usedL.add(a); usedR.add(b); } else rest.push(c);
    }
    if (!round.length) break;
    rounds.push(round); taken += round.length; left = rest;
  }
  if (rounds.length > 1 && rounds[rounds.length - 1].length === 1) { rounds.pop(); }   // lượt cuối chỉ 1 cặp thì bỏ (không có gì để ghép)
  if (rounds.length === 1 && rounds[0].length < 2) return [];
  return rounds;
}

function startMatch(cfg) {
  const cards = studyPool(cfg), key = cfg.pair || 'meaning';
  const elig = matchEligible(cards, key);
  if (elig.length < 2) return toast('Không đủ thẻ có dữ liệu cho kiểu ghép này (cần ít nhất 2 thẻ có cả hai vế)', true);
  const rounds = buildMatchRounds(cards, key, cfg.pairs || 10);
  if (!rounds.length) return toast('Không xếp được lượt ghép nào — thử bỏ bớt bộ lọc', true);
  runMatch({ ...cfg, pair: key }, rounds);
}

function runMatch(cfg, rounds) {
  const [, label, lk, rk] = matchDef(cfg.pair), total = rounds.reduce((n, r) => n + r.length, 0);
  const st = { ri: 0, left: null, right: null, bad: new Set(), logged: new Set(), ok: 0, wrong: 0, left_n: 0, lock: false };
  const win = openFull('', { onClose: () => render() });
  const logOnce = (id, res) => { if (st.logged.has(id)) return; st.logged.add(id); logStudy(id, res); };
  const paintRound = () => {
    const round = rounds[st.ri]; st.left = st.right = null; st.left_n = round.length; st.lock = false;
    const L = shuffle(round.slice()), R = shuffle(round.slice());
    const done = rounds.slice(0, st.ri).reduce((n, r) => n + r.length, 0);
    const side = (arr, k, s) => arr.map(c => `<button class="mt-item ${k === 'jp' ? 'jp mt-jp' : ''}" data-side="${s}" data-id="${c.id}">${esc(MP_TEXT(c, k))}</button>`).join('') + '<span class="mt-empty"></span>'.repeat(MATCH_ROUND - arr.length);   // luôn đủ 5 hàng
    win.set(`<div class="page"><div class="studybar"><button class="iconbtn" data-close aria-label="Kết thúc">✕</button><div class="grow small mute">Lượt ${st.ri + 1}/${rounds.length} · ${label}</div><span class="small mute">✓ ${st.ok} · ✗ ${st.bad.size}</span></div>
      <div class="prog"><i style="width:${done / total * 100}%"></i></div>
      <p class="mute small" style="text-align:center;margin:10px 0 6px">Chạm một mục bên trái rồi chạm mục tương ứng bên phải</p>
      <div class="mt-grid"><div class="mt-col" data-col="L">${side(L, lk, 'L')}</div><div class="mt-col" data-col="R">${side(R, rk, 'R')}</div></div></div>`);
  };
  const finish = () => {
    const acc = total ? Math.round(st.ok / total * 100) : 0;
    win.set(`<div class="result page"><div class="jp" style="font-size:40px">${acc >= 80 ? '素晴らしい' : acc >= 50 ? 'よくできました' : 'がんばって'}</div><div class="score" style="margin:18px 0">${acc}%</div>
      <p class="mute">Ghép đúng ngay lần đầu ${st.ok} · Có nhầm ${st.bad.size} · ${total} cặp</p><div class="sp"></div>
      <div class="row"><button class="btn grow" data-close>Đóng</button><button class="btn primary grow" id="again">Chơi lại</button></div></div>`);
    win.$('#again').onclick = () => { win.close(); setTimeout(() => startMatch(cfg), 120); }; FX.result(win.el);
  };
  win.el.addEventListener('click', e => {
    const b = e.target.closest('.mt-item'); if (!b || st.lock || b.classList.contains('gone')) return;
    const side = b.dataset.side;
    win.el.querySelectorAll(`.mt-item[data-side="${side}"]`).forEach(x => x.classList.remove('sel'));
    b.classList.add('sel'); st[side === 'L' ? 'left' : 'right'] = b;
    if (!st.left || !st.right) return;
    const A = st.left, B = st.right, ok = A.dataset.id === B.dataset.id; st.lock = true;
    if (ok) {
      const id = A.dataset.id; if (!st.bad.has(id)) { st.ok++; logOnce(id, 'correct'); }
      A.classList.add('gone'); B.classList.add('gone'); A.classList.remove('sel'); B.classList.remove('sel'); st.left = st.right = null; st.left_n--;
      setTimeout(() => { st.lock = false; if (!st.left_n) { if (++st.ri < rounds.length) paintRound(); else finish(); } }, 320);
    } else {
      for (const id of [A.dataset.id, B.dataset.id]) { if (!st.logged.has(id)) { st.bad.add(id); logOnce(id, 'incorrect'); } }
      st.wrong++; A.classList.add('bad'); B.classList.add('bad');
      setTimeout(() => { A.classList.remove('bad', 'sel'); B.classList.remove('bad', 'sel'); st.left = st.right = null; st.lock = false; }, 450);
    }
  });
  paintRound();
}
