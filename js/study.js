/* study.js — màn chọn bài ôn + 3 chế độ: Flashcard, Quiz trắc nghiệm, Luyện gõ + bàn phím kana */
'use strict';

const SC = { mode: 'flash', ask: 'meaning_vi', typing: 'meaning', source: 'due', deck: '', type: '', jlpt: '', pos: '', status: '', fav: false, limit: 20, split: true, adv: false };
const QUIZ_ASK = [['meaning_vi', 'Nghĩa tiếng Việt'], ['meaning_en', 'Nghĩa tiếng Anh'], ['romaji', 'Romaji'], ['reading_hanviet', 'Âm Hán Việt'], ['on', 'Âm On-yomi'], ['kun', 'Âm Kun-yomi']];
const TYPING_ASK = [['meaning', 'Nghĩa VN'], ['romaji', 'Romaji'], ['kana', 'Kana'], ['on', 'Âm On'], ['kun', 'Âm Kun'], ['hanviet', 'Hán Việt']];
const MODE_LABEL = { flash: 'Flashcard', quiz: 'Quiz', typing: 'Luyện gõ' };
// Nhớ lần ôn trước: mở app lên là Bắt đầu ôn luôn, không phải chọn lại
const SC_KEYS = Object.keys(SC).concat('adv');
try { const sv = LS.get('jp_sc', {}); for (const k of SC_KEYS) if (k in sv && typeof sv[k] === typeof SC[k]) SC[k] = sv[k]; if (!MODE_LABEL[SC.mode]) SC.mode = 'flash'; } catch { /* bỏ qua */ }
const saveSC = () => LS.set('jp_sc', Object.fromEntries(SC_KEYS.filter(k => k in SC).map(k => [k, SC[k]])));

function studyPool(cfg = SC) {
  return filterCards({ due: cfg.source === 'due', deck: cfg.deck, type: cfg.type, jlpt: cfg.jlpt, pos: cfg.pos, status: cfg.status, fav: cfg.fav });
}
function viewStudyLauncher() {
  if (SC.deck && !liveDecks().some(d => d.id === SC.deck)) SC.deck = '';   // bộ thẻ đã bị xóa
  saveSC();
  const n = studyPool().length;
  const chip = (k, v, l) => `<button class="chip ${SC[k] === v ? 'on' : ''}" data-act="scSet" data-k="${k}" data-v="${v}">${l}</button>`;
  const asks = SC.mode === 'quiz' ? QUIZ_ASK : SC.mode === 'typing' ? TYPING_ASK : null;
  const askKey = SC.mode === 'quiz' ? 'ask' : 'typing';
  const nAdv = [SC.type, SC.jlpt, SC.pos, SC.status, SC.deck, SC.fav].filter(Boolean).length;
  const MODE_HINT = { flash: 'Lật thẻ, tự chấm đúng/sai', quiz: 'Chọn 1 trong 4 đáp án', typing: 'Tự gõ đáp án' };
  return `<div class="page">${pageTop('Ôn tập')}
  <div class="field"><span>Bạn muốn ôn kiểu nào?</span><div class="modes">${Object.entries(MODE_LABEL).map(([k, l]) => `<button class="modeopt${SC.mode === k ? ' on' : ''}" data-act="scSet" data-k="mode" data-v="${k}" aria-pressed="${SC.mode === k}"><b>${l}</b><small>${MODE_HINT[k]}</small></button>`).join('')}</div></div>
  <div class="card sumcard"><span class="mute small">Lần này sẽ ôn</span><div><b>${MODE_LABEL[SC.mode]}</b> · ${SC.source === 'due' ? 'thẻ đến hạn' : 'tất cả thẻ'} · ${SC.limit || 'không giới hạn'} thẻ${nAdv ? ` · đã lọc (${nAdv})` : ''}</div></div>
  <details class="adv" id="sc-adv" ${SC.adv ? 'open' : ''}><summary>Tùy chỉnh bài ôn <span class="mute small" style="font-weight:400;margin-left:8px">câu hỏi, số thẻ, bộ lọc</span></summary>
  ${asks ? `<div class="field"><span>${SC.mode === 'quiz' ? 'Câu hỏi hỏi về' : 'Bạn sẽ nhập'}</span><div class="chips" style="flex-wrap:wrap">${asks.map(([k, l]) => chip(askKey, k, l)).join('')}</div></div>` : ''}
  ${SC.mode === 'typing' && SC.typing === 'kana' ? `<label class="row" style="margin-bottom:12px"><input type="checkbox" data-act="scSplit" ${SC.split ? 'checked' : ''} style="width:20px;height:20px"><span>Tách từng âm đọc của Kanji thành câu hỏi riêng</span></label>` : ''}
  <div class="field"><span>Ôn những thẻ nào?</span><div class="chips">${chip('source', 'due', 'Đến hạn hôm nay')}${chip('source', 'all', 'Tất cả thẻ')}</div></div>
  <div class="field"><span>Số thẻ mỗi lượt</span><div class="chips">${[10, 20, 50, 0].map(v => `<button class="chip ${SC.limit === v ? 'on' : ''}" data-act="scLimit" data-v="${v}">${v || 'Tất cả'}</button>`).join('')}</div></div>
  <div class="mute small" style="margin:2px 0 8px"><b>Lọc thêm</b></div>
  <div class="field"><span>Loại thẻ</span><div class="chips"><button class="chip ${SC.type ? '' : 'on'}" data-act="scSet" data-k="type" data-v="">Tất cả</button>${TYPES.map(t => chip('type', t, TYPE_LABEL[t])).join('')}</div></div>
  <div class="field"><span>JLPT</span><div class="chips"><button class="chip ${SC.jlpt ? '' : 'on'}" data-act="scSet" data-k="jlpt" data-v="">Tất cả</button>${JLPT.map(t => chip('jlpt', t, t)).join('')}</div></div>
  <div class="field"><span>Từ loại</span><div class="chips" style="flex-wrap:wrap"><button class="chip ${SC.pos ? '' : 'on'}" data-act="scSet" data-k="pos" data-v="">Tất cả</button>${POS.map(t => chip('pos', t, POS_LABEL[t])).join('')}</div></div>
  <div class="field"><span>Trạng thái</span><div class="chips"><button class="chip ${SC.status ? '' : 'on'}" data-act="scSet" data-k="status" data-v="">Tất cả</button>${STATUSES.map(t => chip('status', t, STATUS_LABEL[t])).join('')}</div></div>
  ${liveDecks().length ? `<label class="field"><span>Bộ thẻ</span><select id="sc-deck"><option value="">Tất cả</option>${liveDecks().map(d => `<option value="${d.id}" ${SC.deck === d.id ? 'selected' : ''}>${esc(d.icon || '')} ${esc(d.name)}</option>`).join('')}</select></label>` : ''}
  <div class="row wrap" style="margin-bottom:6px"><button class="chip ${SC.fav ? 'on' : ''}" data-act="scFav">★ Chỉ yêu thích</button></div></details>
  <div class="startbar"><div class="grow"><b class="jp" style="font-size:20px">${SC.limit && n > SC.limit ? SC.limit : n}</b> <span class="mute small">thẻ${SC.limit && n > SC.limit ? ` (trong ${n} thẻ phù hợp)` : ' phù hợp'}</span>${n ? '' : '<div class="small mute">Không có thẻ khớp — thử bỏ bớt bộ lọc.</div>'}</div>
  <button class="btn primary" data-act="scStart" ${n ? '' : 'disabled'} style="min-height:48px;padding:0 26px;font-size:16px">Bắt đầu ôn</button></div></div>`;
}
ACT.scSet = el => { SC[el.dataset.k] = el.dataset.v; render(); };
ACT.scFav = () => { SC.fav = !SC.fav; render(); };
ACT.scLimit = el => { SC.limit = +el.dataset.v; render(); };
ACT.scSplit = el => { SC.split = el.checked; };
document.addEventListener('toggle', e => { if (e.target.id === 'sc-adv') { SC.adv = e.target.open; saveSC(); } }, true);
document.addEventListener('change', e => { if (e.target.id === 'sc-deck') { SC.deck = e.target.value; render(); } });
ACT.scStart = () => startStudy({ ...SC, mode: SC.mode });

// ── Chuẩn bị bộ câu hỏi ─────────────────────────────────────────────────────
const fieldValue = (c, f) => (f === 'on' || f === 'kun') ? (c['reading_' + f] || null) : (c[f] || null);
function expandKanaItems(cards, split) {
  if (!split) return cards.map(c => ({ ...c }));
  const items = [];
  for (const c of cards) {
    if (c.type === 'kanji') {
      const on = (c.reading_on || '').split('、').map(x => x.trim()).filter(Boolean), kun = (c.reading_kun || '').split('、').map(x => x.trim()).filter(Boolean);
      const rs = [...on.map(v => ['on', v]), ...kun.map(v => ['kun', v])];
      rs.forEach(([t, v], i) => items.push({ ...c, _rt: t, _rv: v, _pos: rs.length > 1 ? `${i + 1}/${rs.length}` : '' }));
    } else { const k = c.reading_kana || c.reading_kun || ''; if (k) items.push({ ...c, _rt: 'kana', _rv: k, _pos: '' }); }
  }
  return items;
}
function expandReadingItems(cards, kind) {
  const items = [];
  for (const c of cards) {
    if (c.type !== 'kanji') continue;
    const vals = (c['reading_' + kind] || '').split('、').map(x => x.trim()).filter(Boolean);
    vals.forEach((v, i) => items.push({ ...c, _rt: kind, _rv: v, _pos: vals.length > 1 ? `${i + 1}/${vals.length}` : '' }));
  }
  return items;
}
function startStudy(cfg) {
  let cards = studyPool(cfg.due ? { source: 'due', deck: '', type: '', jlpt: '', pos: '', status: '', fav: false } : cfg);
  shuffle(cards); if (cfg.limit) cards = cards.slice(0, cfg.limit);
  let items;
  if (cfg.mode === 'flash') items = cards.map(c => ({ ...c }));
  else if (cfg.mode === 'quiz') { const f = cfg.ask || 'meaning_vi'; items = cards.filter(c => fieldValue(c, f)).map(c => ({ ...c })); }
  else {
    const m = cfg.typing || 'meaning';
    if (m === 'kana') items = expandKanaItems(cards, cfg.split !== false);
    else if (m === 'on' || m === 'kun') items = expandReadingItems(cards, m);
    else if (m === 'romaji') items = cards.filter(c => c.romaji || c.reading_kana).map(c => ({ ...c }));
    else if (m === 'hanviet') items = cards.filter(c => c.reading_hanviet).map(c => ({ ...c }));
    else items = cards.map(c => ({ ...c }));
  }
  if (!items.length) return toast('Không có thẻ nào phù hợp với kiểu ôn này (thiếu dữ liệu cần hỏi)', true);
  runSession({ ...cfg, items });
}

// ── Phiên ôn ────────────────────────────────────────────────────────────────
function runSession(cfg) {
  const total = cfg.items.length; const st = { queue: shuffle(cfg.items.slice()), cur: null, ok: 0, bad: 0, answered: false, revealed: false, timer: null };
  const win = openFull('', { onClose: () => { document.removeEventListener('keydown', onKey); clearTimeout(st.timer); $('.kpad')?.remove(); render(); } });
  const requeue = () => st.queue.splice(Math.min(3, st.queue.length), 0, st.cur);
  const bar = () => {
    const done = Math.max(0, total - st.queue.length - (st.cur ? 1 : 0)), acc = st.ok + st.bad ? Math.round(st.ok / (st.ok + st.bad) * 100) : null;
    return `<div class="studybar"><button class="iconbtn" data-close aria-label="Kết thúc">✕</button><div class="grow small mute">Thẻ ${Math.min(done + 1, total)}/${total} · ✓ ${st.ok} · ✗ ${st.bad}${acc !== null ? ` · ${acc}%` : ''}</div>
      <span class="small mute">${MODE_LABEL[cfg.mode]}</span></div><div class="prog"><i style="width:${done / total * 100}%"></i></div>`;
  };
  const paper = (c, extra = '') => {
    const ch = [...c.character].length > 3 ? ' long' : '';
    return `<div class="paper" id="paper"><span class="corner">${TYPE_LABEL[c.type]}${safeJlpt(c.jlpt_level) ? ' · ' + safeJlpt(c.jlpt_level) : ''}</span><div class="ch${ch}">${esc(c.character)}</div>${extra}</div>`;
  };
  const finish = () => {
    const n = st.ok + st.bad, acc = n ? Math.round(st.ok / n * 100) : 0;
    win.set(`<div class="result page"><div class="jp" style="font-size:40px">${acc >= 80 ? '素晴らしい' : acc >= 50 ? 'よくできました' : 'がんばって'}</div><div class="score" style="margin:18px 0">${acc}%</div>
      <p class="mute">Đúng ${st.ok} · Sai ${st.bad} · ${total} thẻ</p><div class="sp"></div>
      <div class="row"><button class="btn grow" data-close>Đóng</button><button class="btn primary grow" id="again">Ôn lại</button></div></div>`);
    win.$('#again').onclick = () => { win.close(); setTimeout(() => runSession(cfg), 120); };
  };
  const next = () => {
    clearTimeout(st.timer);
    if (!st.queue.length) { st.cur = null; return finish(); }
    st.cur = st.queue.shift(); st.answered = false; st.revealed = false; paint();
  };
  const answer = (correct) => { correct ? st.ok++ : (st.bad++, requeue()); logStudy(st.cur.id, correct ? 'correct' : 'incorrect'); };

  // ── Flashcard ──
  const paintFlash = () => {
    const c = st.cur; const rd = c.type === 'kanji' ? [c.reading_on, c.reading_kun].filter(Boolean).join(' / ') : c.reading_kana || '';
    win.set(`<div class="page">${bar()}<div class="sp"></div><div class="sp"></div>${paper(c)}
      <div class="back" id="back">${st.revealed ? `<div class="rd">${esc(rd)}</div><div class="mn">${esc(c.meaning_vi)}</div>${c.meaning_en ? `<div class="mute small">${esc(c.meaning_en)}</div>` : ''}${c.example_jp ? `<div class="ex">${esc(c.example_jp)}${c.example_vi ? `<br><span class="small">${esc(c.example_vi)}</span>` : ''}</div>` : ''}`
        : '<div class="mute small" style="padding-top:26px">Chạm vào thẻ để lật · Space</div>'}</div>
      ${st.revealed ? '<div class="row"><button class="btn bad grow" id="no" style="min-height:56px">✗ Không nhớ</button><button class="btn ok grow" id="yes" style="min-height:56px">✓ Đã nhớ</button></div>' : ''}</div>`);
    win.$('#paper').onclick = () => { if (!st.revealed) { st.revealed = true; paint(); win.$('#paper')?.classList.add('flip'); } };
    if (st.revealed) { win.$('#no').onclick = () => { answer(false); next(); }; win.$('#yes').onclick = () => { answer(true); next(); }; }
  };

  // ── Quiz ──
  const paintQuiz = () => {
    const c = st.cur, f = cfg.ask || 'meaning_vi'; let hint = '';
    if (!['romaji', 'on', 'kun'].includes(f)) hint = c.type === 'kanji' ? ([c.reading_on, c.reading_kun].filter(Boolean)[0] || '') : (c.reading_kana || '');
    const correct = fieldValue(c, f) || c.meaning_vi || c.meaning_en || '?';
    if (!st.opts) {
      const pool = [...new Set(liveCards().filter(x => x.id !== c.id).map(x => fieldValue(x, f)).filter(v => v && v !== correct))];
      const wr = shuffle(pool).slice(0, 3); while (wr.length < 3) wr.push('—');
      st.opts = shuffle([correct, ...wr]); st.correct = correct;
    }
    win.set(`<div class="page">${bar()}<div class="sp"></div>${paper(c)}<div class="mute small jp" style="text-align:center;margin-top:8px;min-height:22px">${esc(hint)}</div>
      <div class="small mute" style="text-align:center;margin-top:4px">${esc(QUIZ_ASK.find(a => a[0] === f)[1])}?</div>
      <div class="answers">${st.opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o.length > 70 ? o.slice(0, 68) + '…' : o)}</button>`).join('')}</div>
      <div class="feedback" id="fb"></div><div class="row" id="nx" style="margin-top:8px"></div></div>`);
    $$('.opt', win.el).forEach(b => b.onclick = () => {
      if (st.answered) return; st.answered = true; const ok = st.opts[+b.dataset.i] === st.correct;
      $$('.opt', win.el).forEach((x, i) => { x.disabled = true; if (st.opts[i] === st.correct) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      const fb = win.$('#fb'); fb.className = 'feedback ' + (ok ? 'ok' : 'bad'); fb.textContent = ok ? '✓ Chính xác!' : `✗ Sai. Đáp án: ${st.correct}`;
      answer(ok); win.$('#nx').innerHTML = '<button class="btn primary block" id="go">Tiếp ›</button>';
      win.$('#go').onclick = () => { st.opts = null; next(); };
      st.timer = setTimeout(() => { if (win.$('#go')) { st.opts = null; next(); } }, ok ? 900 : 2200);
    });
  };

  // ── Luyện gõ ──
  const typingAnswers = (c) => {
    const m = cfg.typing || 'meaning'; let a = [];
    if (m === 'meaning') {
      a = [c.meaning_vi, c.meaning_en].filter(Boolean);
      for (const v of [c.meaning_vi, c.meaning_en]) if (v) for (const p of v.split(',')) { const t = p.trim(); if (t && !a.includes(t)) a.push(t); }
    } else if (m === 'romaji') {
      a = c.romaji ? [c.romaji] : []; const kana = c.reading_kana || (c.reading_kun || '').split('、')[0];
      if (kana && !c.romaji) a.push(kanaToRomaji(kana));
    } else if (m === 'kana') {
      if (c._rv) a = [c._rv]; else for (const k of [c.reading_kana, ...(c.reading_kun || '').split('、'), ...(c.reading_on || '').split('、')]) { const t = (k || '').trim(); if (t && !a.includes(t)) a.push(t); }
    } else if (m === 'hanviet') a = c.reading_hanviet ? [c.reading_hanviet] : [];
    else a = c._rv ? [c._rv] : [];
    return a;
  };
  const normR = s => s.replace(/oo/g, 'o').replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/tt/g, 't').replace(/mb/g, 'nb').replace(/mp/g, 'np');
  const isCorrect = (ans, list) => {
    const norm = s => (s || '').trim().toLowerCase(), a = norm(ans), ns = list.map(norm);
    if (ns.includes(a)) return true;
    if (['romaji', 'meaning'].includes(cfg.typing || 'meaning')) return ns.map(normR).includes(normR(a));
    return false;
  };
  const paintTyping = () => {
    const c = st.cur, m = cfg.typing || 'meaning'; let hint = '', prompt = '';
    const lab = { on: 'âm ON-yomi', kun: 'âm KUN-yomi', kana: 'cách đọc' }[c._rt] || 'cách đọc'; const pos = c._pos ? `  (${c._pos})` : '';
    if (m === 'meaning') { hint = c.romaji || ''; prompt = 'Nhập nghĩa tiếng Việt:'; }
    else if (m === 'romaji') { const mv = c.meaning_vi || ''; hint = mv.length > 2 ? mv.slice(0, 2) + '...' : mv; prompt = 'Nhập romaji (phiên âm Latin):'; }
    else if (m === 'kana') { hint = c.romaji || ''; prompt = `Nhập ${lab}${pos}:`; }
    else if (m === 'hanviet') { hint = c.reading_kana || (c.reading_on || '').split('、')[0]; prompt = 'Nhập âm Hán Việt:'; }
    else { hint = c.romaji || ''; prompt = `Nhập ${m === 'on' ? 'âm ON-yomi' : 'âm KUN-yomi'}${pos}:`; }
    win.set(`<div class="page">${bar()}<div class="sp"></div><div style="max-width:240px;margin:0 auto">${paper(c)}</div>
      <div class="mute small" style="text-align:center;margin-top:8px;min-height:20px">${hint ? 'Gợi ý: ' + esc(hint) : ''}</div>
      <p style="text-align:center;margin:6px 0 8px;font-weight:600">${esc(prompt)}</p>
      <form id="tf"><input id="ti" class="input typein jp" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <div class="row" style="margin-top:10px"><button type="button" class="btn" id="kp" aria-label="Bàn phím kana">あ</button><button type="button" class="btn grow" id="skip">Bỏ qua</button><button class="btn primary grow" id="chk">Kiểm tra</button></div></form>
      <div class="feedback" id="fb"></div><div id="nx" style="margin-top:8px"></div></div>`);
    const ti = win.$('#ti'); setTimeout(() => ti.focus(), 60);
    win.$('#kp').onclick = () => openKanaPad(ti);
    win.$('#skip').onclick = () => {
      if (st.answered) return; st.answered = true; st.bad++; requeue();
      const fb = win.$('#fb'); fb.className = 'feedback'; fb.style.color = 'var(--accent)'; fb.textContent = `⏭ Đã bỏ qua. Đáp án: ${typingAnswers(c).slice(0, 3).join(' / ')}`;
      win.$('#nx').innerHTML = '<button class="btn primary block" id="go">Tiếp ›</button>'; win.$('#go').onclick = next;
    };
    win.$('#tf').onsubmit = e => {
      e.preventDefault(); if (st.answered) { win.$('#go')?.click(); return; }
      const v = ti.value.trim(); if (!v) return; st.answered = true;
      const list = typingAnswers(c), ok = isCorrect(v, list); answer(ok);
      ti.classList.add(ok ? 'ok' : 'bad'); const fb = win.$('#fb'); fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.textContent = ok ? '✓ Chính xác!' : `✗ Sai. Đáp án đúng: ${list.slice(0, 3).join(' / ')}`;
      win.$('#nx').innerHTML = '<button type="button" class="btn primary block" id="go">Tiếp ›</button>'; win.$('#go').onclick = next;
      if (ok) st.timer = setTimeout(next, 900);
    };
  };

  const paint = () => ({ flash: paintFlash, quiz: paintQuiz, typing: paintTyping }[cfg.mode])();
  function onKey(e) {
    if (!win.el.isConnected || e.target.tagName === 'INPUT') return;
    if (cfg.mode === 'flash' && st.cur) {
      if (!st.revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); win.$('#paper')?.click(); }
      else if (st.revealed && (e.key === 'ArrowLeft' || e.key === '1')) win.$('#no')?.click();
      else if (st.revealed && (e.key === 'ArrowRight' || e.key === '2')) win.$('#yes')?.click();
    } else if (cfg.mode === 'quiz' && st.cur) {
      if (/^[1-4]$/.test(e.key)) $$('.opt', win.el)[+e.key - 1]?.click(); else if (e.key === 'Enter') win.$('#go')?.click();
    }
  }
  document.addEventListener('keydown', onKey);
  next();
}

// ── Bàn phím kana nổi ───────────────────────────────────────────────────────
let LASTINPUT = null;
document.addEventListener('focusin', e => { if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && !e.target.closest('.kpad') && e.target.type !== 'checkbox') LASTINPUT = e.target; });
function openKanaPad(target) {
  if (target && target.tagName === 'FORM') target = LASTINPUT && target.contains(LASTINPUT) ? LASTINPUT : target.elements.character;
  if (target) LASTINPUT = target;
  $('.kpad')?.remove();
  const pad = document.createElement('div'); pad.className = 'kpad';
  Object.assign(pad.style, { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45, background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: '8px 10px calc(8px + env(safe-area-inset-bottom))', maxHeight: '55dvh', overflowY: 'auto', boxShadow: 'var(--shadow)' });
  let sect = '五十音', kata = false;
  const draw = () => {
    const rows = KANA_ROWS[sect], cols = sect === '拗音' ? 'y3' : '';
    pad.innerHTML = `<div class="row" style="margin-bottom:8px">${Object.keys(KANA_ROWS).map(k => `<button class="chip ${k === sect ? 'on' : ''}" data-s="${k}">${k}</button>`).join('')}
      <span class="grow"></span><button class="chip ${kata ? 'on' : ''}" data-k="1">${kata ? 'カタカナ' : 'ひらがな'}</button><button class="chip" data-x="bs">⌫</button><button class="chip" data-x="x">✕</button></div>
      <div class="kana-grid ${cols}">${rows.flat().map(p => p ? `<button type="button" data-ch="${kata ? [...p].slice(Math.ceil([...p].length / 2)).join('') : [...p].slice(0, Math.ceil([...p].length / 2)).join('')}">${kata ? [...p].slice(Math.ceil([...p].length / 2)).join('') : [...p].slice(0, Math.ceil([...p].length / 2)).join('')}</button>` : '<span></span>').join('')}</div>`;
  };
  pad.addEventListener('mousedown', e => e.preventDefault());
  pad.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.s) { sect = b.dataset.s; draw(); } else if (b.dataset.k) { kata = !kata; draw(); } else if (b.dataset.x === 'x') pad.remove();
    else if (b.dataset.x === 'bs' && LASTINPUT) { const i = LASTINPUT, p = i.selectionStart; if (p > 0) { i.setRangeText('', p - 1, p, 'end'); i.dispatchEvent(new Event('input', { bubbles: true })); } }
    else if (b.dataset.ch && LASTINPUT) { const i = LASTINPUT; i.focus(); i.setRangeText(b.dataset.ch, i.selectionStart, i.selectionEnd, 'end'); i.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  draw(); document.body.appendChild(pad);
}
