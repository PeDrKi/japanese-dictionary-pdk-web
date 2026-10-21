/* views.js — các màn hình chính: Hôm nay, Thẻ, Bộ thẻ, Khác (+ thống kê, thùng rác, bộ thủ) */
'use strict';

// Ngữ pháp / Bộ thủ / Thống kê: là mục của thanh bên trên màn hình rộng (không có nút ← khi đứng ở mục chính)
const isTopTab = () => !NAV.sub && ['grammar', 'radicals', 'stats'].includes(NAV.tab);
function render() {
  const v = $('#view'); if (!v) return;
  const sub = NAV.sub;
  if (sub) {
    v.innerHTML = { stats: viewStats, trash: viewTrash, radicals: viewRadicals, radical: viewRadical, grammar: viewGrammar, starters: viewStarters, admin: viewAdmin }[sub.name]?.(sub) || '';
  } else {
    v.innerHTML = { today: viewToday, cards: viewCards, study: viewStudyLauncher, decks: viewDecks, grammar: viewGrammar, radicals: viewRadicals, stats: viewStats, more: viewMore }[NAV.tab]();
  }
  $$('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === NAV.tab ? 'page' : 'false'));
  const d = dueCount(), bd = $('#duebadge'); if (bd) { bd.textContent = d > 99 ? '99+' : d; bd.classList.toggle('hidden', !d); }
  updateSyncBadge();
}
// Vẽ lại sau khi dữ liệu tự làm mới — chỉ khi không làm gián đoạn người dùng (đang nhập, đang mở form/ôn tập)
function softRender() {
  if (layers.length) return false;
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
  const v = $('#view'); const top = v ? v.scrollTop : 0; render(); if (v) v.scrollTop = top; return true;
}
ACT.tab = el => { dropSubHistory(); NAV.tab = el.dataset.tab; NAV.sub = null; NAV.stack = []; FILT.select = false; FILT.sel.clear(); render(); $('#view').scrollTop = 0; };
ACT.sub = el => { NAV.stack.push(NAV.sub); NAV.sub = { name: el.dataset.name, id: el.dataset.id }; history.pushState({ sub: 1 }, ''); NAV.depth++; render(); $('#view').scrollTop = 0; };

// ═══ HÔM NAY ═══════════════════════════════════════════════════════════════
function streakDays() {
  const days = new Set(S.daily.map(s => s.day)); let n = 0; const d = new Date();
  if (!days.has(localDate(d))) d.setDate(d.getDate() - 1);
  while (days.has(localDate(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function dailyCounts(n) {
  const m = new Map(); for (const s of S.daily) m.set(s.day, (m.get(s.day) || 0) + 1);
  const out = []; for (let i = n - 1; i >= 0; i--) { const k = addDays(-i); out.push([k, m.get(k) || 0]); } return out;
}
function viewToday() {
  const due = dueCount(), live = liveCards(), t = localDate();
  const today = S.daily.filter(s => s.day === t); const ok = today.filter(s => s.result === 'correct').length;
  const by = Object.fromEntries(STATUSES.map(s => [s, live.filter(c => c.status === s).length]));
  const days = dailyCounts(14), mx = Math.max(1, ...days.map(d => d[1]));
  const streak = streakDays();
  return `<div class="page">
  <div class="hero">
    <div class="due"><div class="stamp ${due ? '' : 'zero'}" aria-hidden="true"><b class="jp">${due ? due : '済'}</b></div>
    <div><h2>${due ? `${due} thẻ cần ôn hôm nay` : 'Hôm nay đã ôn xong'}</h2>
    <div class="mute small">${live.length ? `Trong tổng ${live.length} thẻ` : 'Chưa có thẻ nào — hãy thêm thẻ đầu tiên'}</div></div></div>
  </div>
  ${backupStale(live.length) ? `<div class="card small" style="margin-bottom:12px"><b>Nên sao lưu dữ liệu</b><p class="mute" style="margin:4px 0 10px">${esc(backupLabel())}. Tải về 1 file để phòng khi mất tài khoản hoặc xóa nhầm.</p><div class="row"><button class="btn primary grow" data-act="backupExport">Sao lưu ngay</button><button class="btn grow" data-act="backupSnooze">Để sau 7 ngày</button></div></div>` : ''}
  ${live.length ? (due ? `<button class="btn primary block cta" data-act="startDue" data-mode="flash">Ôn ${Math.min(due, SC.limit || due)} thẻ ngay</button>
    <p class="small mute" style="margin:14px 2px 6px">Hoặc ôn theo cách khác:</p>` : `<p class="small mute" style="margin:6px 2px 10px">Chưa có thẻ nào đến hạn. Bạn vẫn có thể luyện thêm ở tab Ôn tập.</p>`) + `<div class="mode3${due ? '' : ' dim'}">
    <button data-act="startDue" data-mode="flash" ${due ? '' : 'disabled'}><span class="g">札</span>Flashcard<small>Lật thẻ, tự chấm</small></button>
    <button data-act="startDue" data-mode="quiz" ${due ? '' : 'disabled'}><span class="g">択</span>Quiz<small>Chọn đáp án</small></button>
    <button data-act="startDue" data-mode="typing" ${due ? '' : 'disabled'}><span class="g">打</span>Luyện gõ<small>Tự gõ đáp án</small></button></div>`
      : `<div style="margin:16px 0;display:flex;flex-direction:column;gap:10px"><button class="btn primary block cta" data-act="sub" data-name="starters">Thêm bộ thẻ mẫu có sẵn</button>
      <div class="row"><button class="btn grow" data-act="newCard">+ Tự thêm thẻ</button><button class="btn grow" data-act="importDb">Nhập từ desktop</button></div></div>`}
  ${days.some(d => d[1]) ? `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>14 ngày qua</b>
    <span class="mute small">${streak ? `🔥 chuỗi ${streak} ngày` : ''}</span></div>
    <div class="bars" role="img" aria-label="Số lượt ôn mỗi ngày trong 14 ngày qua">${days.map(([d, n]) => `<i class="${n ? '' : 'z'}" title="${d}: ${n}" style="height:${n ? Math.max(6, n / mx * 100) : 3}%"></i>`).join('')}</div>
    <div class="row mute small" style="justify-content:space-between;margin-top:8px"><span>Hôm nay: ${today.length} lượt${today.length ? ` · đúng ${Math.round(ok / today.length * 100)}%` : ''}</span>
    <span>${S.sessTotal ? `Tổng chính xác ${Math.round(S.sessCorrect / S.sessTotal * 100)}%` : ''}</span></div></div>`
  : `<div class="card"><b>Chuỗi ngày học</b><p class="small mute" style="margin:6px 0 0">Ôn một lượt hôm nay để bắt đầu chuỗi — biểu đồ sẽ hiện ở đây.</p></div>`}
  <div class="sp"></div>
  <div class="card"><b>Tiến độ ghi nhớ</b><div class="sp"></div>
    <div class="meter">${STATUSES.map(s => `<i style="width:${live.length ? by[s] / live.length * 100 : 0}%;background:${{ new: '#6b8cff', learning: '#f0b429', known: '#4ecb85' }[s]}"></i>`).join('')}</div>
    <div class="row wrap small mute" style="margin-top:8px;gap:14px">${STATUSES.map(s => `<span class="row" style="gap:5px"><span class="st ${s}"></span>${STATUS_LABEL[s]} ${by[s]}</span>`).join('')}</div></div>
  </div>`;
}
ACT.startDue = el => startStudy({ mode: el.dataset.mode, due: true, limit: SC.limit, ask: SC.ask, typing: SC.typing, split: SC.split });

// ═══ THẺ ═══════════════════════════════════════════════════════════════════
function currentList() { return filterCards({ search: FILT.search, type: FILT.type, jlpt: FILT.jlpt, pos: FILT.pos, status: FILT.status, fav: FILT.fav, due: FILT.due, deck: FILT.deck, cat: FILT.cat }); }
function viewCards() {
  const active = [FILT.jlpt, FILT.pos, FILT.status, FILT.fav, FILT.due, FILT.deck, FILT.cat].filter(Boolean).length;
  const deck = FILT.deck && S.decks.find(d => d.id === FILT.deck), cat = FILT.cat && catName(FILT.cat);
  return `<div class="page">${pageTop(deck ? `${deck.icon || ''} ${deck.name}` : cat || 'Thư viện', false,
    `<button class="btn tool${FILT.select ? ' on' : ''}" data-act="toggleSelect" aria-pressed="${FILT.select}">${FILT.select ? '✕ Xong' : '☑ Chọn'}</button>
     <button class="btn tool${active ? ' on' : ''}" data-act="openFilter">⚙ Lọc${active ? ` <b class="cnt">${active}</b>` : ''}</button>`)}
  <div class="search"><input class="input" id="q" type="search" placeholder="Tìm chữ, nghĩa, romaji, cách đọc…" value="${esc(FILT.search)}" autocomplete="off" aria-label="Tìm thẻ"></div>
  <div class="chips" style="margin-top:8px"><button class="chip ${FILT.type ? '' : 'on'}" data-act="setType" data-v="">Tất cả</button>
    ${TYPES.map(t => `<button class="chip ${FILT.type === t ? 'on' : ''}" data-act="setType" data-v="${t}">${TYPE_LABEL[t]}</button>`).join('')}</div>
  <div id="cardsbody">${cardsBody()}</div>
  </div>
  ${FILT.select ? selectBar() : '<button class="fab" data-act="newCard" aria-label="Thêm thẻ">+</button>'}`;
}
function selectBar() {
  const n = FILT.sel.size;
  return `<div class="selbar"><button class="btn ghost" data-act="selAll">${n ? `Đã chọn ${n}` : 'Chọn tất cả'}</button>
    <button class="btn" data-act="bulkFav" ${n ? '' : 'disabled'}>★</button>
    <button class="btn" data-act="bulkDeck" ${n ? '' : 'disabled'}>Vào bộ thẻ</button><button class="btn danger" data-act="bulkDel" ${n ? '' : 'disabled'}>Xóa</button></div>`;
}
function cardsBody() {
  const list = currentList(), pages = pageMode() === 'pages';
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (FILT.page > totalPages - 1) FILT.page = totalPages - 1;
  const shown = pages ? list.slice(FILT.page * PAGE_SIZE, (FILT.page + 1) * PAGE_SIZE) : list.slice(0, FILT.shown);
  const active = [FILT.jlpt, FILT.pos, FILT.status, FILT.fav, FILT.due, FILT.deck, FILT.cat].filter(Boolean).length;
  const deck = FILT.deck && S.decks.find(d => d.id === FILT.deck);
  const pager = () => { const p = FILT.page, b = (n, label, dis, aria) => `<button class="btn tool" data-act="cardsPage" data-p="${n}" aria-label="${aria}" ${dis ? 'disabled' : ''}>${label}</button>`;
    return `<nav class="pager" aria-label="Phân trang">${b(0, '«', p === 0, 'Trang đầu')}${b(p - 1, '‹', p === 0, 'Trang trước')}<span class="pg" aria-live="polite">Trang ${p + 1} / ${totalPages}</span>${b(p + 1, '›', p >= totalPages - 1, 'Trang sau')}${b(totalPages - 1, '»', p >= totalPages - 1, 'Trang cuối')}</nav>`; };
  const more = list.length > shown.length;
  return `<div class="mute small countrow"><span>${list.length} thẻ${deck ? ` · <a href="#" data-act="clearDeck" style="color:var(--accent)">bỏ lọc bộ thẻ</a>` : ''}${FILT.cat ? ` · danh mục ${esc(catName(FILT.cat) || '')} · <a href="#" data-act="clearCat" style="color:var(--accent)">bỏ lọc</a>` : ''}</span>
  <span class="legend" aria-label="Ý nghĩa chấm màu">${STATUSES.map(k => `<span class="row" style="gap:4px"><span class="st ${k}"></span>${STATUS_LABEL[k]}</span>`).join('')}</span></div>
  <div class="list" id="cardlist">${shown.map(c => cardRow(c)).join('') || emptyBox('空', FILT.search || active ? 'Không có thẻ khớp bộ lọc' : 'Chưa có thẻ nào', 'Bấm nút + để thêm thẻ đầu tiên.')}</div>
  ${pages ? (totalPages > 1 ? pager() : '') : (more ? `<button class="btn block" style="margin-top:12px" data-act="moreCards">Xem thêm (${list.length - shown.length})</button>` : '')}
  ${list.length > PAGE_SIZE ? `<p class="small mute" style="text-align:center;margin:10px 0 0"><button type="button" class="linkbtn" data-act="pageMode">${pages ? 'Chuyển sang kiểu "Xem thêm"' : 'Chuyển sang phân trang'}</button></p>` : ''}`;
}
// Gõ tìm kiếm chỉ cập nhật phần danh sách — KHÔNG dựng lại ô nhập, để bộ gõ tiếng Nhật (IME) không bị ngắt giữa chừng
let qTimer;
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return; clearTimeout(qTimer);
  qTimer = setTimeout(() => { FILT.search = e.target.value; resetPaging(); const b = $('#cardsbody'); if (b) b.innerHTML = cardsBody(); }, 200);
});
ACT.setType = el => { FILT.type = el.dataset.v; resetPaging(); render(); };
ACT.cardsPage = el => { FILT.page = Math.max(0, +el.dataset.p || 0); const b = $('#cardsbody'); if (b) b.innerHTML = cardsBody(); const l = $('#cardlist'); if (l) l.scrollIntoView({ block: 'start' }); };
ACT.pageMode = () => { LS.set('jp_pagemode', pageMode() === 'pages' ? 'more' : 'pages'); resetPaging(); const b = $('#cardsbody'); if (b) b.innerHTML = cardsBody(); };
ACT.moreCards = () => { FILT.shown += 100; const y = $('#view').scrollTop; render(); $('#view').scrollTop = y; };
ACT.clearDeck = () => { FILT.deck = ''; render(); };
ACT.clearCat = () => { FILT.cat = ''; resetPaging(); render(); };
function catName(id) { if (id === '_none') return 'Chưa phân loại'; const c = S.cats.find(x => x.id === id); return c ? `${c.icon || ''} ${c.name}`.trim() : ''; }
ACT.toggleSelect = () => { FILT.select = !FILT.select; FILT.sel.clear(); render(); };
ACT.selAll = () => { const l = currentList(); if (FILT.sel.size === l.length) FILT.sel.clear(); else l.forEach(c => FILT.sel.add(c.id)); render(); };
ACT.openCard = el => {
  const id = el.dataset.id;
  if (FILT.select) { FILT.sel.has(id) ? FILT.sel.delete(id) : FILT.sel.add(id); const y = $('#view').scrollTop; render(); $('#view').scrollTop = y; return; }
  openCardDetail(id);
};
ACT.openFilter = () => {
  const chip = (k, v, l) => `<button class="chip ${FILT[k] === v ? 'on' : ''}" data-act="fset" data-k="${k}" data-v="${v}">${l}</button>`;
  const s = openSheet(`<h2>Bộ lọc</h2>
    <div class="field"><span>Cấp độ JLPT</span><div class="chips wrap" style="flex-wrap:wrap">${chip('jlpt', '', 'Tất cả')}${JLPT.map(j => chip('jlpt', j, j)).join('')}</div></div>
    <div class="field"><span>Từ loại</span><div class="chips" style="flex-wrap:wrap">${chip('pos', '', 'Tất cả')}${POS.map(j => chip('pos', j, POS_LABEL[j])).join('')}</div></div>
    <div class="field"><span>Trạng thái</span><div class="chips" style="flex-wrap:wrap">${chip('status', '', 'Tất cả')}${STATUSES.map(j => chip('status', j, STATUS_LABEL[j])).join('')}</div></div>
    <label class="field"><span>Bộ thẻ</span><select id="f-deck"><option value="">Tất cả</option>${liveDecks().map(d => `<option value="${d.id}" ${FILT.deck === d.id ? 'selected' : ''}>${esc(d.icon || '')} ${esc(d.name)}</option>`).join('')}</select></label>
    ${S.cats.length ? `<label class="field"><span>Danh mục</span><select id="f-cat"><option value="">Tất cả</option>${S.cats.map(c => `<option value="${c.id}" ${FILT.cat === c.id ? 'selected' : ''}>${esc(c.icon || '')} ${esc(c.name)}</option>`).join('')}<option value="_none" ${FILT.cat === '_none' ? 'selected' : ''}>Chưa phân loại</option></select></label>` : ''}
    <div class="row wrap" style="margin-bottom:14px"><button class="chip ${FILT.fav ? 'on' : ''}" data-act="ftoggle" data-k="fav">★ Yêu thích</button><button class="chip ${FILT.due ? 'on' : ''}" data-act="ftoggle" data-k="due">Đến hạn ôn</button></div>
    <div class="row"><button class="btn grow" data-act="fclear">Xóa lọc</button><button class="btn primary grow" data-act="fapply">Áp dụng</button></div>`);
  window._fs = s;
};
ACT.fset = el => { FILT[el.dataset.k] = el.dataset.v; $$('[data-act=fset]', _fs.el).filter(b => b.dataset.k === el.dataset.k).forEach(b => b.classList.toggle('on', b === el)); };
ACT.ftoggle = el => { FILT[el.dataset.k] = !FILT[el.dataset.k]; el.classList.toggle('on', FILT[el.dataset.k]); };
ACT.fclear = () => { Object.assign(FILT, { jlpt: '', pos: '', status: '', fav: false, due: false, deck: '', cat: '', shown: PAGE_SIZE, page: 0 }); _fs.close(); render(); };
ACT.fapply = () => { FILT.deck = $('#f-deck', _fs.el).value; FILT.cat = $('#f-cat', _fs.el)?.value || ''; resetPaging(); _fs.close(); NAV.tab = 'cards'; render(); };

// ── Thao tác hàng loạt ──
ACT.bulkFav = async () => { await guard(() => toggleFavorite([...FILT.sel]), 'Đã đổi yêu thích'); FILT.sel.clear(); render(); };
ACT.bulkDel = async () => { if (!await confirmBox(`Chuyển ${FILT.sel.size} thẻ vào thùng rác?`, 'Xóa', true)) return; await guard(() => softDeleteCards([...FILT.sel]), 'Đã chuyển vào thùng rác'); FILT.sel.clear(); FILT.select = false; render(); };
ACT.bulkDeck = () => {
  const ds = liveDecks(); if (!ds.length) return toast('Chưa có bộ thẻ nào — tạo ở tab Bộ thẻ', true);
  const s = openSheet(`<h2>Thêm ${FILT.sel.size} thẻ vào bộ</h2><div class="list">${ds.map(d => `<button class="item" data-act="bulkDeckSet" data-id="${d.id}"><span style="font-size:22px">${esc(d.icon || '📁')}</span><b>${esc(d.name)}</b></button>`).join('')}</div>`); window._bd = s;
};
ACT.bulkDeckSet = async el => { await guard(() => linkCardsToDeck([...FILT.sel], el.dataset.id), 'Đã thêm vào bộ thẻ'); _bd.close(); FILT.sel.clear(); FILT.select = false; render(); };

// ── Chi tiết thẻ ──
function openCardDetail(id) {
  const c = S.byId.get(id); if (!c) return;
  const kv = [['Từ loại', POS_LABEL[c.pos]], ['Âm On', c.reading_on], ['Âm Kun', c.reading_kun], ['Cách đọc', c.reading_kana], ['Hán Việt', c.reading_hanviet], ['Romaji', c.romaji],
    ['Nghĩa (EN)', c.meaning_en], ['Số nét', c.stroke_count], ['Ví dụ', c.example_jp], ['Dịch ví dụ', c.example_vi], ['Nguồn', c.source], ['Ghi chú', c.notes]].filter(x => x[1]);
  const decks = (S.deckOfCard.get(id) || []).map(i => S.decks.find(d => d.id === i)).filter(Boolean);
  const rads = (S.radOfCard.get(id) || []).map(i => S.radicals.find(d => d.id === i)).filter(Boolean);
  const long = [...c.character].length > 2 ? ' long' : '';
  const s = openSheet(`
    <div class="paper" style="max-width:200px"><span class="corner">${TYPE_LABEL[c.type]}</span><span class="corner2">${safeJlpt(c.jlpt_level) ? `<span class="tag ${safeJlpt(c.jlpt_level).toLowerCase()}">${safeJlpt(c.jlpt_level)}</span>` : ''}</span><div class="ch${long}">${esc(c.character)}</div></div>
    <div style="text-align:center;margin:10px 0 14px"><div style="font-size:21px;font-weight:700">${esc(c.meaning_vi)}</div>
      <div class="row" style="justify-content:center;margin-top:4px"><span class="st ${c.status}"></span><span class="mute small">${STATUS_LABEL[c.status]} · ${c.study_count || 0} lần học</span></div></div>
    <dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd class="${/On|Kun|đọc|Ví dụ$/.test(k) ? 'jp' : ''}">${esc(v)}</dd>`).join('')}
      <dt>Lịch ôn</dt><dd>${dueInfo(c)}<br><span class="mute small">${easeLabel(c.srs_ease)} · giãn cách ${c.srs_interval} ngày</span></dd></dl>
    ${decks.length || rads.length ? `<div class="row wrap" style="margin-top:10px">${decks.map(d => `<span class="tag">${esc(d.icon || '')} ${esc(d.name)}</span>`).join('')}${rads.map(r => `<span class="tag jp">部 ${esc(r.character)}</span>`).join('')}</div>` : ''}
    <div class="sp"></div>
    <div class="grid2"><button class="btn" data-act="editCard" data-id="${id}">✏️ Sửa</button><button class="btn" data-act="favCard" data-id="${id}">${c.is_favorite ? '★ Bỏ yêu thích' : '☆ Yêu thích'}</button>
    ${c.type === 'kanji' || [...c.character].some(ch => ch >= '一' && ch <= '鿿') ? `<button class="btn" data-act="decompose" data-ch="${esc(c.character)}">🧩 Tách bộ</button>` : ''}
    <button class="btn" data-act="cardRadicals" data-id="${id}">部 Bộ thủ</button>
    <button class="btn danger" data-act="delCard" data-id="${id}">🗑 Xóa</button></div>`);
  window._cd = s;
}
ACT.editCard = el => { _cd?.close(); openCardForm(el.dataset.id); };
ACT.favCard = async el => { await guard(() => toggleFavorite([el.dataset.id])); _cd?.close(); render(); };
ACT.delCard = async el => { if (!await confirmBox('Chuyển thẻ này vào thùng rác?', 'Xóa', true)) return; await guard(() => softDeleteCards([el.dataset.id]), 'Đã chuyển vào thùng rác'); _cd?.close(); render(); };
ACT.cardRadicals = el => {
  const id = el.dataset.id, rs = liveRadicals(); if (!rs.length) return toast('Chưa có bộ thủ — tạo ở Khác → Bộ thủ', true);
  const cur = new Set(S.radOfCard.get(id) || []);
  const s = openSheet(`<h2>Bộ thủ của thẻ</h2><div class="row wrap">${rs.map(r => `<button class="chip jp ${cur.has(r.id) ? 'on' : ''}" data-act="togRad" data-card="${id}" data-id="${r.id}">${esc(r.character)} ${esc(r.name || '')}</button>`).join('')}</div>`);
  window._cr = s;
};
ACT.togRad = async el => {
  const on = el.classList.contains('on');
  await guard(() => on ? unlinkCardFromRadical(el.dataset.card, el.dataset.id) : linkCardsToRadical([el.dataset.card], el.dataset.id));
  el.classList.toggle('on', !on);
};

// ── Form thêm/sửa thẻ ──
ACT.newCard = () => openCardForm(null);
function openCardForm(id, preset = {}) {
  const c = id ? S.byId.get(id) : { type: FILT.type || 'vocab', status: 'new', ...preset };
  const base = id ? { ...c } : null;   // bản lúc mở form — mốc để phát hiện xung đột
  const decks = new Set(id ? S.deckOfCard.get(id) || [] : (FILT.deck ? [FILT.deck] : []));
  const v = k => esc(c[k] ?? '');
  const s = openSheet(`<h2>${id ? 'Sửa thẻ' : 'Thêm thẻ'}</h2>
  ${id ? '' : '<p class="small" style="margin:-6px 0 10px"><button type="button" class="linkbtn" data-act="cfQuick">⚡ Thêm nhiều thẻ một lúc (dán danh sách)</button></p>'}
  <form id="cf" autocomplete="off">
    <div class="chips" style="flex-wrap:wrap" id="cf-types">${TYPES.map(t => `<button type="button" class="chip ${c.type === t ? 'on' : ''}" data-act="cfType" data-v="${t}">${TYPE_LABEL[t]}</button>`).join('')}</div>
    <label class="field" id="w-character"><span>Chữ / từ *</span><input name="character" class="jp" style="font-size:20px" value="${v('character')}" maxlength="50" ${id ? '' : 'autofocus'}></label>
    <div class="row" style="margin:-4px 0 12px"><button type="button" class="btn ghost small" data-act="cfJisho">🔍 Chọn kết quả khác</button><button type="button" class="btn ghost small" data-act="cfKana">あ Bàn phím kana</button></div>
    <div class="grid2 mrgrid" data-for="kanji">
      <div class="field" data-mr="reading_on"><span>Âm On (ON-yomi)</span><input type="hidden" name="reading_on" value="${v('reading_on')}"><div class="mr-rows"></div><button type="button" class="btn ghost small" data-act="mrAdd" data-name="reading_on">+ Thêm âm On</button></div>
      <div class="field" data-mr="reading_kun"><span>Âm Kun (KUN-yomi)</span><input type="hidden" name="reading_kun" value="${v('reading_kun')}"><div class="mr-rows"></div><button type="button" class="btn ghost small" data-act="mrAdd" data-name="reading_kun">+ Thêm âm Kun</button></div></div>
    <label class="field" data-for="vocab hiragana katakana"><span>Cách đọc (kana)</span><input name="reading_kana" class="jp" value="${v('reading_kana')}"></label>
    <label class="field" id="w-meaning_vi"><span>Nghĩa tiếng Việt *</span><input name="meaning_vi" value="${v('meaning_vi')}" maxlength="200"></label>
    <div id="cf-suggest" class="small" style="margin:-6px 0 10px"></div>
    ${liveDecks().length ? `<div class="field"><span>Bộ thẻ</span><div class="row wrap" id="cf-decks"></div></div>` : ''}
    <details class="adv" id="cf-adv" ${id ? 'open' : ''}><summary id="cf-advs">Tùy chọn thêm</summary>
    <label class="field"><span>Từ loại</span><select name="pos"><option value="">— chưa chọn —</option>${POS.map(j => `<option value="${j}" ${c.pos === j ? 'selected' : ''}>${POS_LABEL[j]}</option>`).join('')}</select></label>
    <div class="grid2"><label class="field"><span>JLPT</span><select name="jlpt_level"><option value="">—</option>${JLPT.map(j => `<option ${c.jlpt_level === j ? 'selected' : ''}>${j}</option>`).join('')}</select></label></div>
    <div class="grid2 fit" data-for="kanji vocab"><label class="field"><span>Âm Hán Việt</span><input name="reading_hanviet" value="${v('reading_hanviet')}"></label>
      <label class="field" data-for="kanji"><span>Số nét</span><input name="stroke_count" type="number" inputmode="numeric" min="1" max="60" value="${v('stroke_count')}"></label></div>
    <div class="row" style="align-items:flex-end"><label class="field grow"><span>Romaji</span><input name="romaji" value="${v('romaji')}"></label><button type="button" class="btn" style="margin-bottom:12px" data-act="cfRomaji">⚡ Tự tạo</button></div>
    <label class="field"><span>Nghĩa tiếng Anh</span><input name="meaning_en" value="${v('meaning_en')}" maxlength="200"></label>
    <label class="field"><span>Câu ví dụ (JP)</span><textarea name="example_jp" class="jp" maxlength="500">${v('example_jp')}</textarea></label>
    <label class="field"><span>Dịch câu ví dụ</span><textarea name="example_vi" maxlength="500">${v('example_vi')}</textarea></label>
    <label class="field"><span>Nguồn</span><input name="source" value="${v('source')}" maxlength="100" placeholder="Minna no Nihongo…"></label>
    <label class="field"><span>Ghi chú</span><textarea name="notes" maxlength="1000">${v('notes')}</textarea></label>
    <label class="row" style="margin-bottom:8px"><input type="checkbox" name="is_favorite" ${c.is_favorite ? 'checked' : ''} style="width:20px;height:20px"> <span>★ Yêu thích</span></label>
    </details>
    <div class="row sheet-actions"><button type="button" class="btn grow" data-close>Hủy</button><button type="submit" class="btn primary grow">Lưu thẻ</button></div>
  </form>`, { sticky: true });
  const form = s.$('#cf'); form.dataset.type = c.type; form._deckSel = decks; form._isNew = !id; form._id = id; form._sheet = s;
  initMultiRead(form); syncFormType(form); updateAdvSummary(form); renderDeckField(form);
  form.addEventListener('change', () => updateAdvSummary(form));
  if (!id) wireAutofill(form);
  form.addEventListener('submit', async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(form)); const t = form.dataset.type;
    const chk = { character: !!(f.character || '').trim(), meaning_vi: !!(f.meaning_vi || '').trim() };
    $('#w-character', form).classList.toggle('err', !chk.character); $('#w-meaning_vi', form).classList.toggle('err', !chk.meaning_vi);
    if (!chk.character || !chk.meaning_vi) return toast('Cần nhập chữ và nghĩa tiếng Việt', true);
    const data = buildCardData({
      type: t, character: f.character, meaning_vi: f.meaning_vi,
      reading_on: t === 'kanji' ? f.reading_on : null, reading_kun: t === 'kanji' ? f.reading_kun : null,
      reading_kana: t !== 'kanji' ? f.reading_kana : null, reading_hanviet: (t === 'kanji' || t === 'vocab') ? f.reading_hanviet : null,
      romaji: f.romaji, meaning_en: f.meaning_en, example_jp: f.example_jp, example_vi: f.example_vi, stroke_count: t === 'kanji' ? f.stroke_count : null,
      jlpt_level: f.jlpt_level, pos: f.pos, status: (id && base ? base.status : 'new'), is_favorite: !!f.is_favorite, source: f.source, notes: f.notes,
    });
    // Trường bạn không đụng tới giữ NGUYÊN giá trị gốc (không bị cắt độ dài / chuẩn hoá lại → không sinh xung đột giả, không mất chữ)
    if (id && base) for (const k of Object.keys(data)) if (typeof data[k] === 'string' && k in f && base[k] != null && String(f[k]).trim() === String(base[k]).trim()) data[k] = base[k];
    const dups = findDuplicates(data.character, t, id);
    if (dups.length && !await confirmBox(`Thẻ "${data.character}" (${TYPE_LABEL[t]}) đã tồn tại. Vẫn lưu?`, 'Vẫn lưu')) return;
    let note = id ? 'Đã lưu thẻ' : 'Đã thêm thẻ';
    if (form._busy) return; form._busy = true; const sb_ = $('button[type=submit]', form); if (sb_) sb_.disabled = true;
    const ok = await guard(async () => {
      let saved;
      if (id) {
        const r = await saveMerged('cards', id, base, data, askConflict);
        if (r.cancelled) { note = 'Đã giữ bản từ thiết bị khác, thay đổi của bạn không được lưu'; return true; }
        if (r.merged) note = 'Đã lưu — có thay đổi từ thiết bị khác, hai bên đã được gộp';
        saved = r.row;
      } else saved = await addCard(data, form._newId || (form._newId = uuid7()));   // id cố định cho form: bấm Lưu lại sau lỗi giữa chừng không tạo thẻ thứ 2
      await setCardDecks(saved.id, [...form._deckSel]); rememberDecks([...form._deckSel]);
      return true;
    });
    form._busy = false; if (sb_) sb_.disabled = false;
    if (ok) { toast(note); s.close(); render(); }
  });
}
function syncFormType(form) {
  const t = form.dataset.type;
  $$('[data-for]', form).forEach(el => el.classList.toggle('hidden', !el.dataset.for.split(' ').includes(t)));
  $$('#cf-types .chip', form).forEach(b => b.classList.toggle('on', b.dataset.v === t));
}
ACT.cfType = el => { const f = el.closest('form'); f.dataset.type = el.dataset.v; f._typeTouched = true; syncFormType(f); };
ACT.cfQuick = () => { $('#cf')?._sheet?.close(); setTimeout(() => ACT.quickAdd(), 0); };
// ── Chọn bộ thẻ cho thẻ: hiện gọn các bộ đã chọn + vài bộ dùng gần đây; danh sách đầy đủ (có tìm kiếm) nằm trong hộp chọn ──
const recentDecks = () => (LS.get('jp_recent_decks', []) || []).filter(id => liveDecks().some(d => d.id === id));
function rememberDecks(ids) { if (!ids.length) return; LS.set('jp_recent_decks', [...ids, ...recentDecks().filter(i => !ids.includes(i))].slice(0, 6)); }
function renderDeckField(form) {
  const box = $('#cf-decks', form); if (!box) return;
  const sel = [...form._deckSel].map(id => S.decks.find(d => d.id === id)).filter(d => d && alive(d));
  const rec = form._isNew ? recentDecks().filter(id => !form._deckSel.has(id)).slice(0, 4).map(id => S.decks.find(d => d.id === id)) : [];
  const n = liveDecks().length;
  box.innerHTML = sel.map(d => `<button type="button" class="chip on" data-act="cfDeck" data-id="${d.id}" aria-label="Bỏ khỏi bộ ${esc(d.name)}">${esc(d.icon || '')} ${esc(d.name)} ✕</button>`).join('')
    + rec.map(d => `<button type="button" class="chip dashed" data-act="cfDeck" data-id="${d.id}" title="Dùng gần đây">+ ${esc(d.icon || '')} ${esc(d.name)}</button>`).join('')
    + `<button type="button" class="btn ghost small" data-act="cfDeckPick">${sel.length ? 'Đổi…' : `＋ Chọn bộ thẻ (${n})`}</button>`;
}
ACT.cfDeck = el => { const f = el.closest('form'); const id = el.dataset.id; f._deckSel.has(id) ? f._deckSel.delete(id) : f._deckSel.add(id); renderDeckField(f); };
ACT.cfDeckPick = el => {
  const form = el.closest('form'); let q = '';
  const catOf = d => S.cats.find(c => c.id === d.category_id);
  const draw = () => {
    const toks = q.trim().toLowerCase().split(/\s+/).filter(Boolean), all = liveDecks();
    const list = all.filter(d => !toks.length || toks.every(t => (d.name || '').toLowerCase().includes(t)));
    const groups = [...S.cats.map(c => ({ t: `${c.icon || ''} ${c.name}`, l: list.filter(d => d.category_id === c.id) })), { t: S.cats.length ? 'Chưa phân loại' : '', l: list.filter(d => !catOf(d)) }].filter(g => g.l.length);
    return groups.map(g => `${g.t ? `<div class="mute small" style="margin:12px 2px 4px">${esc(g.t)}</div>` : ''}<div class="deckpick">${g.l.map(d => `<label class="dp ${form._deckSel.has(d.id) ? 'on' : ''}"><input type="checkbox" data-id="${d.id}" ${form._deckSel.has(d.id) ? 'checked' : ''}><span>${esc(d.icon || '')} ${esc(d.name)}</span></label>`).join('')}</div>`).join('') || '<p class="mute">Không có bộ thẻ khớp.</p>';
  };
  const s = openSheet(`<h2>Chọn bộ thẻ <span class="mute small" id="dp-n"></span></h2>
    <div class="search"><input class="input" id="dp-q" type="search" placeholder="Tìm bộ thẻ… (Enter để chọn bộ đầu tiên)" autocomplete="off" autofocus></div>
    <div id="dp-list">${draw()}</div><div class="sp"></div><button class="btn primary block" data-close>Xong</button>`);
  const upd = () => { s.$('#dp-n').textContent = form._deckSel.size ? `· đã chọn ${form._deckSel.size}` : ''; renderDeckField(form); };
  const redraw = () => { s.$('#dp-list').innerHTML = draw(); upd(); };
  upd();
  s.$('#dp-q').addEventListener('input', e => { q = e.target.value; s.$('#dp-list').innerHTML = draw(); });
  s.$('#dp-q').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const first = s.$('#dp-list input[type=checkbox]'); if (first) { const id = first.dataset.id; form._deckSel.has(id) ? form._deckSel.delete(id) : form._deckSel.add(id); redraw(); }
  });
  s.el.addEventListener('change', e => { const id = e.target.dataset?.id; if (!id) return; e.target.checked ? form._deckSel.add(id) : form._deckSel.delete(id); e.target.closest('.dp')?.classList.toggle('on', e.target.checked); upd(); });
};
// ── Nhiều âm đọc (On / Kun): mỗi âm một ô riêng. Dữ liệu vẫn lưu 1 chuỗi cách nhau bởi "、" nên mọi chỗ khác không đổi. ──
const MR_SPLIT = /[、,，;；\/／]/;
const MR_SET = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set, MR_GET = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get;
function initMultiRead(form) {
  $$('[data-mr]', form).forEach(box => {
    const name = box.dataset.mr, hid = box.querySelector('input[type=hidden]'), rows = box.querySelector('.mr-rows');
    const draw = (list, focusLast) => {
      if (!list.length) list = [''];
      rows.innerHTML = list.map(x => `<div class="mr-row"><input class="jp" data-mrin="${name}" value="${esc(x)}" autocomplete="off"><button type="button" class="mr-x" tabindex="-1" aria-label="Xóa ô này" data-act="mrDel">×</button></div>`).join('');
      if (focusLast) rows.querySelector('.mr-row:last-child input').focus();
    };
    const collect = () => [...rows.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean).join('、');
    box._draw = draw; box._collect = collect;
    // form.elements.reading_on.value = '…' (autofill, Jisho) tự cập nhật các ô
    Object.defineProperty(hid, 'value', { get() { return MR_GET.call(this); }, set(v) { MR_SET.call(this, v); draw(String(v || '').split(MR_SPLIT).map(x => x.trim()).filter(Boolean)); }, configurable: true });
    draw(String(MR_GET.call(hid) || '').split(MR_SPLIT).map(x => x.trim()).filter(Boolean));
    box.addEventListener('input', e => { if (!e.target.dataset.mrin) return; MR_SET.call(hid, collect()); if (form._auto) form._auto.delete(name); });
    box.addEventListener('keydown', e => {   // Enter: sang ô kế (tạo mới nếu đang ở ô cuối và ô có chữ); Ctrl+Enter vẫn là Lưu
      if (!e.target.dataset.mrin || e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.isComposing) return;
      e.preventDefault(); const row = e.target.closest('.mr-row'), next = row.nextElementSibling;
      if (next) next.querySelector('input').focus(); else if (e.target.value.trim()) draw([...rows.querySelectorAll('input')].map(i => i.value).concat(['']), true);
    });
  });
}
ACT.mrAdd = el => { const box = el.closest('[data-mr]'); const list = [...box.querySelectorAll('.mr-rows input')].map(i => i.value); if (list.length && !list[list.length - 1].trim()) { box.querySelector('.mr-row:last-child input').focus(); return; } box._draw(list.concat(['']), true); };
ACT.mrDel = el => {
  const box = el.closest('[data-mr]'), hid = box.querySelector('input[type=hidden]'); el.closest('.mr-row').remove();
  const list = [...box.querySelectorAll('.mr-rows input')].map(i => i.value); box._draw(list);
  MR_SET.call(hid, box._collect()); const f = box.closest('form'); if (f && f._auto) f._auto.delete(box.dataset.mr);
};
ACT.cfRomaji = el => {
  const f = el.closest('form'), g = n => f.elements[n]?.value || '';
  const src = romajiSource(f.dataset.type, g('reading_on'), g('reading_kun'), g('reading_kana'), g('character'));
  if (!src) return toast('Nhập cách đọc (kana) trước', true);
  f.elements.romaji.value = kanaToRomaji(src.split('、')[0]);
};
ACT.cfKana = el => openKanaPad(el.closest('form'));

// ═══ BỘ THẺ ════════════════════════════════════════════════════════════════
// ── Bộ thẻ: tìm, lọc theo danh mục, sắp xếp, thu gọn từng danh mục, ôn nhanh từng bộ ──
const DFILT = { search: '', cat: '', sort: LS.get('jp_decksort', 'name') };
const DECK_SORTS = [['name', 'Tên A→Z'], ['due', 'Cần ôn nhiều nhất'], ['size', 'Nhiều thẻ nhất'], ['new', 'Mới tạo gần đây']];
const catCollapsed = () => new Set(LS.get('jp_catcollapsed', []));
function deckStats(d) {
  const ids = (S.cardsOfDeck.get(d.id) || []).filter(i => { const c = S.byId.get(i); return c && alive(c); });
  const known = ids.filter(i => S.byId.get(i).status === 'known').length, due = ids.filter(i => isDue(S.byId.get(i))).length;
  return { n: ids.length, known, due };
}
function deckRow(d, st) {
  const col = d.color || '#4A90D9', pct = st.n ? Math.round(st.known / st.n * 100) : 0;
  return `<div class="item deckrow" style="padding:0"><button class="row grow" style="background:none;border:0;padding:12px;text-align:left;min-width:0;gap:12px" data-act="openDeck" data-id="${d.id}">
      <span class="deckicon" style="background:color-mix(in srgb, ${esc(col)} 22%, var(--surface2))">${esc(d.icon || '📁')}</span>
      <span class="grow" style="min-width:0"><span class="t" style="display:block">${esc(d.name)}</span>
        <span class="s" style="display:block">${st.n} thẻ${pct ? ` · thuộc ${pct}%` : ''}${st.due ? ` · <b style="color:var(--accent)">${st.due} cần ôn</b>` : ''}</span>
        ${d.description ? `<span class="s" style="display:block;opacity:.8">${esc(d.description)}</span>` : ''}
        <span class="meter" style="margin-top:6px;height:5px"><i style="width:${pct}%;background:${esc(col)}"></i></span></span></button>
      ${st.due ? `<button class="iconbtn deckgo" style="border:0" data-act="studyDeck" data-id="${d.id}" aria-label="Ôn ${st.due} thẻ đến hạn của bộ ${esc(d.name)}" title="Ôn ${st.due} thẻ đến hạn">▶</button>` : ''}
      <button class="iconbtn" style="border:0;background:none" data-act="editDeck" data-id="${d.id}" aria-label="Sửa bộ thẻ">⋯</button></div>`;
}
function decksBody() {
  const all = liveDecks(), cats = S.cats, catIds = new Set(cats.map(c => c.id));
  const inCat = d => (d.category_id && catIds.has(d.category_id)) ? d.category_id : '_none';
  const toks = DFILT.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const stat = new Map(all.map(d => [d.id, deckStats(d)]));
  const ord = { name: (a, b) => (a.name || '').localeCompare(b.name || '', 'vi'), due: (a, b) => stat.get(b.id).due - stat.get(a.id).due || (a.name || '').localeCompare(b.name || '', 'vi'),
    size: (a, b) => stat.get(b.id).n - stat.get(a.id).n, new: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) }[DFILT.sort] || (() => 0);
  const match = d => (!DFILT.cat || inCat(d) === DFILT.cat) && (!toks.length || toks.every(t => ((d.name || '') + ' ' + (d.description || '')).toLowerCase().includes(t)));
  const shown = all.filter(match).sort(ord);
  if (!all.length) return emptyBox('組', 'Chưa có bộ thẻ nào', 'Gom thẻ theo sách, bài học hoặc chủ đề để ôn gọn hơn. Bấm + để tạo bộ đầu tiên.');
  if (!shown.length) return emptyBox('組', 'Không có bộ thẻ khớp', 'Thử đổi danh mục hoặc từ khóa. <button class="linkbtn" data-act="decksClear">Xóa lọc</button>');
  const groups = [...cats.map(c => ({ id: c.id, title: `${esc(c.icon || '🗂️')} ${esc(c.name)}` })), { id: '_none', title: cats.length ? 'Chưa phân loại' : '' }];
  const col = catCollapsed(), filtering = !!(DFILT.cat || toks.length);
  return groups.map(g => {
    const list = shown.filter(d => inCat(d) === g.id); if (!list.length) return '';
    const closed = !filtering && col.has(g.id), dueSum = list.reduce((n, d) => n + stat.get(d.id).due, 0);
    const head = g.title ? `<div class="cathead"><button class="catfold" data-act="catFold" data-id="${g.id}" aria-expanded="${!closed}"><span class="mute">${closed ? '▸' : '▾'}</span> <b>${g.title}</b> <span class="mute small">${list.length} bộ${dueSum ? ` · ${dueSum} cần ôn` : ''}</span></button>
      ${g.id !== '_none' ? `<button class="linkbtn small" data-act="catCards" data-id="${g.id}">Xem thẻ ›</button>` : ''}</div>` : '';
    return `<section class="catgroup">${head}${closed ? '' : `<div class="list">${list.map(d => deckRow(d, stat.get(d.id))).join('')}</div>`}</section>`;
  }).join('');
}
function viewDecks() {
  const all = liveDecks(), cats = S.cats, catIds = new Set(cats.map(c => c.id));
  if (DFILT.cat && DFILT.cat !== '_none' && !catIds.has(DFILT.cat)) DFILT.cat = '';   // danh mục đã bị xóa
  const cnt = id => all.filter(d => ((d.category_id && catIds.has(d.category_id)) ? d.category_id : '_none') === id).length;
  const totalCards = new Set(all.flatMap(d => S.cardsOfDeck.get(d.id) || [])).size, dueTotal = all.reduce((n, d) => n + deckStats(d).due, 0);
  const chip = (id, label) => `<button class="chip ${DFILT.cat === id ? 'on' : ''}" data-act="decksCat" data-v="${id}">${label}</button>`;
  return `<div class="page">${pageTop('Bộ thẻ', false, `<button class="iconbtn" data-act="manageCats" aria-label="Quản lý danh mục">🗂</button>`)}
  ${all.length ? `<p class="small mute" style="margin:-4px 2px 10px">${all.length} bộ · ${totalCards} thẻ${dueTotal ? ` · <b style="color:var(--accent)">${dueTotal} cần ôn</b>` : ''}</p>
  <div class="row" style="gap:8px"><div class="search grow" style="margin:0"><input class="input" id="dq" type="search" placeholder="Tìm bộ thẻ…" value="${esc(DFILT.search)}" autocomplete="off" aria-label="Tìm bộ thẻ"></div>
    <select id="dsort" class="input" style="width:auto;max-width:46%" aria-label="Sắp xếp">${DECK_SORTS.map(([k, l]) => `<option value="${k}" ${DFILT.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  ${cats.length ? `<div class="chips" style="margin-top:8px">${chip('', `Tất cả ${all.length}`)}${cats.map(c => chip(c.id, `${esc(c.icon || '')} ${esc(c.name)} ${cnt(c.id)}`)).join('')}${cnt('_none') ? chip('_none', `Chưa phân loại ${cnt('_none')}`) : ''}</div>` : ''}` : ''}
  <div id="decksbody">${decksBody()}</div>
  </div><button class="fab" data-act="newDeck" aria-label="Thêm bộ thẻ">+</button>`;
}
let dqTimer;
document.addEventListener('input', e => {   // chỉ vẽ lại phần danh sách để ô nhập không mất con trỏ / bộ gõ
  if (e.target.id !== 'dq') return; clearTimeout(dqTimer);
  dqTimer = setTimeout(() => { DFILT.search = e.target.value; const b = $('#decksbody'); if (b) b.innerHTML = decksBody(); }, 150);
});
document.addEventListener('change', e => { if (e.target.id === 'dsort') { DFILT.sort = e.target.value; LS.set('jp_decksort', DFILT.sort); const b = $('#decksbody'); if (b) b.innerHTML = decksBody(); } });
ACT.decksCat = el => { DFILT.cat = el.dataset.v; const y = $('#view').scrollTop; render(); $('#view').scrollTop = y; };
ACT.decksClear = () => { DFILT.cat = ''; DFILT.search = ''; render(); };
ACT.catFold = el => { const c = catCollapsed(); if (c.has(el.dataset.id)) c.delete(el.dataset.id); else c.add(el.dataset.id); LS.set('jp_catcollapsed', [...c]); const b = $('#decksbody'); if (b) b.innerHTML = decksBody(); };
ACT.catCards = el => { Object.assign(FILT, { deck: '', cat: el.dataset.id }); resetPaging(); NAV.tab = 'cards'; render(); $('#view').scrollTop = 0; };
ACT.studyDeck = el => startStudy({ mode: SC.mode, ask: SC.ask, typing: SC.typing, split: SC.split, source: 'due', deck: el.dataset.id, limit: SC.limit });
ACT.openDeck = el => { FILT.deck = el.dataset.id; FILT.cat = ''; resetPaging(); NAV.tab = 'cards'; render(); };
// ── Chọn biểu tượng: theo nhóm, bấm để chọn; có thể gõ/dán emoji khác vào ô nhỏ ──
function iconPicker(cur) {
  const g0 = Math.max(0, ICON_GROUPS.findIndex(g => g[1].includes(cur)));
  return `<div class="field ipick" data-g="${g0}"><span>Biểu tượng</span>
    <div class="ip-top"><input name="icon" class="ip-cur" value="${esc(cur || '')}" maxlength="8" aria-label="Biểu tượng đang chọn (gõ emoji khác nếu muốn)"><span class="mute small">Chọn bên dưới hoặc gõ emoji khác</span></div>
    <div class="ip-tabs">${ICON_GROUPS.map((g, i) => `<button type="button" class="chip ${i === g0 ? 'on' : ''}" data-act="ipGroup" data-i="${i}">${esc(g[0])}</button>`).join('')}</div>
    <div class="ip-grid">${iconGrid(g0, cur)}</div></div>`;
}
const iconGrid = (gi, cur) => ICON_GROUPS[gi][1].map(i => `<button type="button" class="ip-i ${i === cur ? 'on' : ''}" data-act="ipPick" data-v="${i}" aria-label="${i}">${i}</button>`).join('');
ACT.ipGroup = el => { const b = el.closest('.ipick'), i = +el.dataset.i; b.dataset.g = i; $$('.ip-tabs .chip', b).forEach(x => x.classList.toggle('on', x === el)); b.querySelector('.ip-grid').innerHTML = iconGrid(i, b.querySelector('.ip-cur').value); };
ACT.ipPick = el => { const b = el.closest('.ipick'); b.querySelector('.ip-cur').value = el.dataset.v; $$('.ip-i', b).forEach(x => x.classList.toggle('on', x === el)); };
ACT.newDeck = () => openDeckForm(null);
ACT.editDeck = el => openDeckForm(el.dataset.id);
function openDeckForm(id) {
  const d = id ? S.decks.find(x => x.id === id) : { name: '', description: '', color: DECK_COLORS[0], icon: DECK_ICONS[0], category_id: '' };
  const s = openSheet(`<h2>${id ? 'Sửa bộ thẻ' : 'Bộ thẻ mới'}</h2><form id="df">
    <label class="field"><span>Tên *</span><input name="name" value="${esc(d.name)}" maxlength="60" autofocus></label>
    <label class="field"><span>Mô tả</span><input name="description" value="${esc(d.description || '')}"></label>
    ${iconPicker(d.icon)}
    <div class="field"><span>Màu</span><div class="row wrap">${DECK_COLORS.map(i => `<button type="button" class="chip ${d.color === i ? 'on' : ''}" data-act="dfPick" data-k="color" data-v="${i}" style="background:${i};width:34px;height:34px;padding:0;border-color:${d.color === i ? 'var(--text)' : 'transparent'}" aria-label="${i}"></button>`).join('')}</div></div>
    ${S.cats.length ? `<label class="field"><span>Danh mục</span><select name="category_id"><option value="">Chưa phân loại</option>${S.cats.map(c => `<option value="${c.id}" ${d.category_id === c.id ? 'selected' : ''}>${esc(c.icon || '')} ${esc(c.name)}</option>`).join('')}</select></label>` : ''}
    <div class="row">${id ? '<button type="button" class="btn danger" data-act="dfDelete">Xóa</button>' : ''}<button type="button" class="btn grow" data-close>Hủy</button><button class="btn primary grow">Lưu</button></div></form>`);
  const base = id ? { ...d } : null;
  const f = s.$('#df'); f._v = { color: d.color }; f._id = id; f._s = s;
  f.addEventListener('submit', async e => {
    e.preventDefault(); const x = Object.fromEntries(new FormData(f)); if (!x.name.trim()) return toast('Cần nhập tên bộ thẻ', true);
    let note = 'Đã lưu bộ thẻ';
    const ok = await guard(async () => {
      const r = await saveDeck(id, { name: x.name.trim(), description: x.description?.trim() || null, icon: (x.icon || '').trim() || '📁', color: f._v.color, category_id: x.category_id || null }, base, askConflict);
      if (r.cancelled) note = 'Đã giữ bản từ thiết bị khác, thay đổi của bạn không được lưu'; else if (r.merged) note = 'Đã lưu — đã gộp với thay đổi từ thiết bị khác';
    });
    if (ok !== undefined) { toast(note); s.close(); render(); }
  });
}
ACT.dfPick = el => { const f = el.closest('form'); f._v[el.dataset.k] = el.dataset.v; $$(`[data-act=dfPick][data-k=${el.dataset.k}]`, f).forEach(b => { b.classList.toggle('on', b === el); if (el.dataset.k === 'color') b.style.borderColor = b === el ? 'var(--text)' : 'transparent'; }); };
ACT.dfDelete = async el => {
  const f = el.closest('form'); if (!await confirmBox('Xóa bộ thẻ này? Các thẻ bên trong vẫn được giữ lại.', 'Xóa', true)) return;
  await guard(() => deleteDeck(f._id), 'Đã xóa bộ thẻ'); f._s.close(); if (FILT.deck === f._id) FILT.deck = ''; render();
};
ACT.manageCats = () => {
  const draw = () => `<h2>Danh mục bộ thẻ</h2><div class="list">${S.cats.map(c => `<div class="item"><span style="font-size:22px">${esc(c.icon || '🗂️')}</span><b class="grow">${esc(c.name)}</b>
    <button class="btn" data-act="catEdit" data-id="${c.id}">Sửa</button><button class="btn danger" data-act="catDel" data-id="${c.id}">Xóa</button></div>`).join('') || '<p class="mute">Chưa có danh mục.</p>'}</div>
    <div class="sp"></div><button class="btn primary block" data-act="catEdit">+ Danh mục mới</button>`;
  const s = openSheet(draw(), { onClose: render }); window._cat = { s, draw };
};
const catRedraw = () => { _cat.s.sheet.innerHTML = '<div class="grab"></div>' + _cat.draw(); };
ACT.catEdit = el => {
  const id = el.dataset.id, c = id ? S.cats.find(x => x.id === id) : { name: '', icon: '🗂️' };
  const s = openSheet(`<h2>${id ? 'Sửa' : 'Thêm'} danh mục</h2><form id="cform"><label class="field"><span>Tên *</span><input name="name" value="${esc(c.name)}" autofocus></label>
    ${iconPicker(c.icon || '🗂️')}
    <div class="row"><button type="button" class="btn grow" data-close>Hủy</button><button class="btn primary grow">Lưu</button></div></form>`);
  s.$('#cform').addEventListener('submit', async e => {
    e.preventDefault(); const x = Object.fromEntries(new FormData(e.target)); if (!x.name.trim()) return;
    const ok = await guard(() => saveCategory(id, { name: x.name.trim(), icon: x.icon.trim() || '🗂️' })); if (ok !== undefined) { s.close(); catRedraw(); }
  });
};
ACT.catDel = async el => { if (!await confirmBox('Xóa danh mục? Các bộ thẻ bên trong chuyển về "Chưa phân loại".', 'Xóa', true)) return; await guard(() => deleteCategory(el.dataset.id)); catRedraw(); };

// ═══ KHÁC ══════════════════════════════════════════════════════════════════
function viewMore() {
  const link = (g, t, s, name) => `<button class="item${['grammar', 'radicals', 'stats'].includes(name) ? ' mobonly' : ''}" data-act="sub" data-name="${name}"><span class="big jp" style="font-size:26px">${g}</span><span class="grow"><span class="t">${t}</span><br><span class="s">${s}</span></span><span class="mute">›</span></button>`;
  const act = (g, t, s, a) => `<button class="item" data-act="${a}"><span class="big jp" style="font-size:26px">${g}</span><span class="grow"><span class="t">${t}</span><br><span class="s">${s}</span></span><span class="mute">›</span></button>`;
  return `<div class="page">${pageTop('Khác')}
  <div class="list">
    ${link('計', 'Thống kê', 'Tiến độ, độ chính xác, 30 ngày gần đây', 'stats')}
    ${link('文', 'Ngữ pháp', `Mẫu câu, cấu tạo, ví dụ · ${S.grammar_points.length} mẫu`, 'grammar')}
    ${link('部', 'Bộ thủ', 'Nhóm thẻ theo bộ, tra nhanh', 'radicals')}
    ${act('速', 'Nhập nhanh', 'Dán nhiều dòng "chữ - nghĩa" để tạo hàng loạt', 'quickAdd')}
    ${act('備', 'Sao lưu & khôi phục', esc(backupLabel()) + ' · tải toàn bộ dữ liệu về 1 file', 'backupTools')}
    ${act('入', 'Nhập / xuất CSV', 'Trao đổi dữ liệu với Excel, Anki, …', 'csvTools')}
    ${act('移', 'Nhập từ bản desktop', 'Chuyển toàn bộ japanese.db lên web', 'importDb')}
    ${link('組', 'Bộ thẻ mẫu', 'Thêm bộ từ vựng, kanji có sẵn vào thẻ của bạn', 'starters')}
    ${isAdmin() ? link('管', 'Quản trị', 'Tài khoản người dùng, bộ thẻ mẫu, số liệu', 'admin') : ''}
    ${link('廃', 'Thùng rác', `${S.cards.filter(c => !alive(c)).length} thẻ đã xóa`, 'trash')}
    ${act('鍵', 'Đổi mật khẩu', 'Đặt mật khẩu mới cho tài khoản', 'changePassword')}
    ${act('打', 'Gõ tiếng Nhật (Ctrl+`)', 'Gõ romaji ra kana trong ô nhập · hiện: <span id="imestate">' + IME.describe() + '</span>', 'imeCycle')}
    ${act('鍵', 'Phím tắt (?)', 'Bàn phím trên máy tính: chuyển tab, thêm thẻ, tìm, ôn tập…', 'shortcuts').replace('class="item"', 'class="item kbdhint"')}
    ${act('色', 'Giao diện', 'Tự động / tối / sáng', 'theme')}
    ${BAKED_CONFIG ? '' : act('鯖', 'Máy chủ', esc((getConfig().url || '').replace(/^https?:\/\//, '')), 'cfgEdit')}
    ${act('再', 'Tải lại dữ liệu', 'Lấy bản mới nhất từ máy chủ', 'reload')}
  </div>
  <div class="sp"></div><div class="card small"><div class="row" style="justify-content:space-between"><span class="mute">Tài khoản</span><b>${esc(S.user?.email || '')}${isAdmin() ? ' · Admin' : ''}</b></div>
  <div class="row" style="justify-content:space-between;margin-top:6px"><span class="mute">Đồng bộ</span><span id="syncbadge" class="sync"></span></div>
  <div class="sp"></div><div class="row"><button class="btn danger grow" data-act="logout">Đăng xuất</button></div>
  <p class="small" style="text-align:center;margin:12px 0 0"><button class="linkbtn mute" data-act="deleteMyAccount">Xóa tài khoản của tôi</button></p></div></div>`;
}
ACT.theme = themeCycle;
ACT.imeCycle = () => IME.cycle();
ACT.reload = async () => { await guard(async () => { await flushQueue(); await loadAll(); }, 'Đã tải lại'); render(); };

// ── Thống kê ──
function viewStats() {
  const live = liveCards(), n = live.length;
  const cnt = (k, vals) => Object.fromEntries(vals.map(v => [v, live.filter(c => c[k] === v).length]));
  const bar = (label, v, total, color) => `<div style="margin:8px 0"><div class="row" style="justify-content:space-between" ><span>${label}</span><span class="mute small">${v}</span></div><div class="meter"><i style="width:${total ? v / total * 100 : 0}%;background:${color}"></i></div></div>`;
  const types = cnt('type', TYPES), stat = cnt('status', STATUSES), jl = cnt('jlpt_level', JLPT);
  const days = dailyCounts(30), mx = Math.max(1, ...days.map(d => d[1]));
  const src = {}; live.forEach(c => { const k = c.source || '(chưa có)'; src[k] = (src[k] || 0) + 1; });
  const deckSizes = liveDecks().map(d => [d.name, (S.cardsOfDeck.get(d.id) || []).length]).sort((a, b) => b[1] - a[1]);
  const acc = S.sessTotal ? Math.round(S.sessCorrect / S.sessTotal * 100) : 0;
  const fields = [['Nghĩa Anh', 'meaning_en'], ['Ví dụ', 'example_jp'], ['Romaji', 'romaji'], ['JLPT', 'jlpt_level'], ['Nguồn', 'source']];
  return `<div class="page">${pageTop('Thống kê', !isTopTab())}
  <div class="grid2"><div class="card"><div class="mute small">Tổng số thẻ</div><b class="jp" style="font-size:30px">${n}</b></div>
    <div class="card"><div class="mute small">Yêu thích</div><b class="jp" style="font-size:30px">${live.filter(c => c.is_favorite).length}</b></div>
    <div class="card"><div class="mute small">Lượt ôn tập</div><b class="jp" style="font-size:30px">${S.sessTotal}</b></div>
    <div class="card"><div class="mute small">Độ chính xác</div><b class="jp" style="font-size:30px">${acc}%</b></div></div>
  <div class="sp"></div><div class="card"><b>Lượt ôn 30 ngày</b><div class="sp"></div><div class="bars" role="img" aria-label="Lượt ôn mỗi ngày trong 30 ngày">${days.map(([d, c]) => `<i class="${c ? '' : 'z'}" title="${d}: ${c}" style="height:${c ? Math.max(6, c / mx * 100) : 3}%"></i>`).join('')}</div></div>
  <div class="sp"></div><div class="card"><b>Trạng thái</b>${STATUSES.map(s => bar(STATUS_LABEL[s], stat[s], n, { new: '#6b8cff', learning: '#f0b429', known: '#4ecb85' }[s])).join('')}</div>
  <div class="sp"></div><div class="card"><b>Loại thẻ</b>${TYPES.map(t => bar(TYPE_LABEL[t], types[t], n, 'var(--info)')).join('')}</div>
  <div class="sp"></div><div class="card"><b>JLPT</b>${JLPT.map(j => bar(j, jl[j], n, 'var(--accent)')).join('')}${bar('Chưa gắn cấp', live.filter(c => !c.jlpt_level).length, n, 'var(--line)')}</div>
  <div class="sp"></div><div class="card"><b>Độ đầy đủ thông tin</b>${fields.map(([l, k]) => bar(l, live.filter(c => c[k]).length, n, 'var(--ok)')).join('')}</div>
  ${deckSizes.length ? `<div class="sp"></div><div class="card"><b>Bộ thẻ</b>${deckSizes.map(([l, v]) => bar(esc(l), v, n, 'var(--info)')).join('')}</div>` : ''}
  <div class="sp"></div><div class="card"><b>Nguồn</b>${Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, v]) => bar(esc(l), v, n, 'var(--accent)')).join('')}</div></div>`;
}

// ── Thùng rác ──
function viewTrash() {
  const list = S.cards.filter(c => !alive(c)).sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));
  return `<div class="page">${pageTop('Thùng rác', true, list.length ? '<button class="btn danger" data-act="emptyTrash">Dọn sạch</button>' : '')}
  <div class="list">${list.map(c => `<div class="item"><span class="big jp ${[...c.character].length > 3 ? 'long' : ''}">${esc(c.character)}</span><span class="grow"><span class="t">${esc(c.meaning_vi)}</span><br><span class="s">${esc(TYPE_LABEL[c.type])}</span></span>
    <button class="btn" data-act="restore" data-id="${c.id}">Khôi phục</button><button class="btn danger" data-act="purge" data-id="${c.id}" aria-label="Xóa vĩnh viễn">✕</button></div>`).join('') || emptyBox('空', 'Thùng rác trống')}</div></div>`;
}
ACT.restore = async el => { await guard(() => restoreCards([el.dataset.id]), 'Đã khôi phục'); render(); };
ACT.purge = async el => { if (!await confirmBox('Xóa vĩnh viễn thẻ này? Không thể hoàn tác.', 'Xóa vĩnh viễn', true)) return; await guard(() => hardDeleteCards([el.dataset.id])); render(); };
ACT.emptyTrash = async () => { const ids = S.cards.filter(c => !alive(c)).map(c => c.id); if (!await confirmBox(`Xóa vĩnh viễn ${ids.length} thẻ? Không thể hoàn tác.`, 'Dọn sạch', true)) return; await guard(() => hardDeleteCards(ids), 'Đã dọn thùng rác'); render(); };

// ── Bộ thủ ──
function viewRadicals() {
  const rs = liveRadicals();
  return `<div class="page">${pageTop('Bộ thủ', !isTopTab(), '<button class="btn primary" data-act="newRadical">+ Thêm</button>')}
  ${rs.length ? `<div class="list">${rs.map((r, i) => `<div class="item" style="padding:0"><button class="row grow" style="background:none;border:0;padding:10px 12px;text-align:left" data-act="sub" data-name="radical" data-id="${r.id}">
    <span class="big jp" style="color:${esc(r.color || 'var(--text)')}">${esc(r.character)}</span><span class="grow"><span class="t">${esc(r.name || '(chưa đặt tên)')}</span><br><span class="s">${(S.cardsOfRad.get(r.id) || []).length} thẻ</span></span></button>
    <button class="iconbtn" style="border:0;background:none" data-act="radMove" data-id="${r.id}" data-dir="-1" aria-label="Lên" ${i ? '' : 'disabled'}>↑</button>
    <button class="iconbtn" style="border:0;background:none" data-act="radMove" data-id="${r.id}" data-dir="1" aria-label="Xuống" ${i < rs.length - 1 ? '' : 'disabled'}>↓</button></div>`).join('')}</div>`
    : emptyBox('部', 'Chưa có bộ thủ nào', 'Tự tạo các bộ bạn muốn theo dõi (vd 氵 nước), rồi gán thẻ Kanji vào từng bộ.')}</div>`;
}
ACT.radMove = async el => { await guard(() => moveRadical(el.dataset.id, +el.dataset.dir)); render(); };
ACT.newRadical = () => openRadicalForm(null);
function openRadicalForm(id) {
  const r = id ? S.radicals.find(x => x.id === id) : { character: '', name: '', color: DECK_COLORS[5] };
  const s = openSheet(`<h2>${id ? 'Sửa' : 'Thêm'} bộ thủ</h2><form id="rf"><label class="field"><span>Ký tự bộ *</span><input name="character" class="jp" style="font-size:24px" value="${esc(r.character)}" maxlength="4" autofocus></label>
    <label class="field"><span>Tên (vd: bộ Thủy)</span><input name="name" value="${esc(r.name || '')}"></label>
    <div class="field"><span>Màu</span><div class="row wrap">${DECK_COLORS.map(i => `<button type="button" class="chip" data-act="dfPick" data-k="color" data-v="${i}" style="background:${i};width:34px;height:34px;padding:0;border-color:${r.color === i ? 'var(--text)' : 'transparent'}" aria-label="${i}"></button>`).join('')}</div></div>
    <div class="row">${id ? '<button type="button" class="btn danger" data-act="radDelete">Xóa</button>' : ''}<button type="button" class="btn grow" data-close>Hủy</button><button class="btn primary grow">Lưu</button></div></form>`);
  const base = id ? { ...r } : null;
  const f = s.$('#rf'); f._v = { color: r.color }; f._id = id; f._s = s;
  f.addEventListener('submit', async e => {
    e.preventDefault(); const x = Object.fromEntries(new FormData(f)); if (!x.character.trim()) return toast('Cần nhập ký tự bộ', true);
    if (S.radicals.some(q => alive(q) && q.character === x.character.trim() && q.id !== id)) return toast('Bộ thủ này đã tồn tại', true);
    let note = 'Đã lưu';
    const ok = await guard(async () => {
      const rr = await saveRadical(id, { character: x.character.trim(), name: x.name.trim() || null, color: f._v.color }, base, askConflict);
      if (rr.cancelled) note = 'Đã giữ bản từ thiết bị khác, thay đổi của bạn không được lưu'; else if (rr.merged) note = 'Đã lưu — đã gộp với thay đổi từ thiết bị khác';
    });
    if (ok !== undefined) { toast(note); s.close(); render(); }
  });
}
ACT.radDelete = async el => { const f = el.closest('form'); if (!await confirmBox('Xóa bộ thủ này? Thẻ vẫn được giữ.', 'Xóa', true)) return; await guard(() => deleteRadical(f._id), 'Đã xóa'); f._s.close(); leaveSub(); };
function viewRadical(sub) {
  const r = S.radicals.find(x => x.id === sub.id); if (!r) return viewRadicals();
  const cs = (S.cardsOfRad.get(r.id) || []).map(i => S.byId.get(i)).filter(c => c && alive(c));
  return `<div class="page">${pageTop(`${r.character} ${r.name || ''}`, true, `<button class="iconbtn" data-act="radEdit" data-id="${r.id}" aria-label="Sửa">✏️</button>`)}
  <div class="list">${cs.map(c => `<div class="item" style="padding:0"><div style="flex:1;min-width:0">${cardRow(c).replace('class="item"', 'class="item" style="border:0;background:none"')}</div>
    <button class="iconbtn" style="border:0;background:none" data-act="radRemove" data-id="${r.id}" data-card="${c.id}" aria-label="Gỡ khỏi bộ">✕</button></div>`).join('') || emptyBox('部', 'Bộ này chưa có thẻ')}</div>
  <button class="fab" data-act="radAdd" data-id="${r.id}" aria-label="Thêm thẻ vào bộ">+</button></div>`;
}
ACT.radEdit = el => openRadicalForm(el.dataset.id);
ACT.radRemove = async el => { await guard(() => unlinkCardFromRadical(el.dataset.card, el.dataset.id)); render(); };
ACT.radAdd = el => {
  const rid = el.dataset.id; const have = new Set(S.cardsOfRad.get(rid) || []); let q = '';
    const s = openSheet(`<h2>Thêm thẻ vào bộ</h2><div class="search"><input class="input" id="rq" placeholder="Tìm thẻ…" autofocus></div><div class="sp"></div><div class="list" id="rl"></div>`);
  const draw = () => { const l = filterCards({ search: q }).filter(c => !have.has(c.id)).sort((a, b) => (b.type === 'kanji') - (a.type === 'kanji')).slice(0, 40);
    s.$('#rl').innerHTML = l.map(c => cardRow(c).replace('data-act="openCard"', 'data-act="radPick"').replace('<button class="item', `<button data-rad="${rid}" class="item`)).join('') || '<p class="mute">Không có thẻ phù hợp.</p>'; };
  s.$('#rq').addEventListener('input', e => { q = e.target.value; draw(); }); draw();
};
ACT.radPick = async el => { await guard(() => linkCardsToRadical([el.dataset.id], el.dataset.rad), 'Đã thêm'); el.remove(); render(); };
