/* data.js — kết nối Supabase, state trong bộ nhớ, CRUD, hàng đợi ghi offline, đồng bộ & xử lý xung đột */
'use strict';

// Điền sẵn nếu muốn (anon key là public, an toàn nhờ RLS). Để trống → app sẽ hỏi lần đầu.
const SUPABASE_URL = (window.JP_CONFIG && window.JP_CONFIG.url || '').trim().replace(/\/+$/, '');   // đặt trong js/config.js
const SUPABASE_ANON_KEY = (window.JP_CONFIG && window.JP_CONFIG.key || '').trim();
const BAKED_CONFIG = !!(SUPABASE_URL && SUPABASE_ANON_KEY);   // đã nhúng sẵn → ẩn mọi chỗ cho người dùng đổi máy chủ

const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
};

let sb = null;
function getConfig() {
  const c = LS.get('jp_cfg', {});
  return { url: SUPABASE_URL || c.url || '', key: SUPABASE_ANON_KEY || c.key || '' };
}
function initSupabase() {
  const { url, key } = getConfig();
  if (!url || !key) return false;
  if (sb && sb._cfgKey === url + '|' + key) return true;   // đã có client: không tạo thêm (tránh 2 bộ tự làm mới token tranh nhau)
  sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  sb._cfgKey = url + '|' + key;
  return true;
}

// ── State ───────────────────────────────────────────────────────────────────
const S = { me: { role: 'user', status: 'active' },
  user: null, cards: [], decks: [], cats: [], deckCards: [], radicals: [], radCards: [], decomps: new Map(),
  daily: [], sessTotal: 0, sessCorrect: 0, grammar_points: [], grammarOk: true, conj_forms: [], conj_verbs: [], conj_cells: [], conjMap: new Map(), conjOk: true, translations: [], transOk: true,
  byId: new Map(), deckOfCard: new Map(), cardsOfDeck: new Map(), radOfCard: new Map(), cardsOfRad: new Map(),
};
const alive = x => !x.deleted_at;

function reindex() {
  S.byId = new Map(S.cards.map(c => [c.id, c]));
  S.deckOfCard = new Map(); S.cardsOfDeck = new Map(); S.radOfCard = new Map(); S.cardsOfRad = new Map();
  const liveDeck = new Set(S.decks.filter(alive).map(d => d.id));
  const liveRad = new Set(S.radicals.filter(alive).map(r => r.id));
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (const dc of S.deckCards) if (alive(dc) && liveDeck.has(dc.deck_id) && S.byId.has(dc.card_id)) { push(S.deckOfCard, dc.card_id, dc.deck_id); push(S.cardsOfDeck, dc.deck_id, dc.card_id); }
  for (const rc of S.radCards) if (alive(rc) && liveRad.has(rc.radical_id) && S.byId.has(rc.card_id)) { push(S.radOfCard, rc.card_id, rc.radical_id); push(S.cardsOfRad, rc.radical_id, rc.card_id); }
}
const liveCards = () => S.cards.filter(alive);
const liveDecks = () => S.decks.filter(alive);
const liveRadicals = () => S.radicals.filter(alive).sort((a, b) => a.sort_order - b.sort_order);

// ── Gọi API ─────────────────────────────────────────────────────────────────
function dbError(error) { const e = new Error(error.message || String(error)); e.code = error.code || ''; e.details = error.details || ''; return e; }
async function must(q) { const { data, error } = await q; if (error) throw dbError(error); return data; }
// Mọi thao tác GHI đi qua mut(): đếm để tự làm mới biết "có thay đổi đang diễn ra" và không ghi đè lên nó
const MUT = { n: 0, inflight: 0 };
async function mut(q) { MUT.n++; MUT.inflight++; try { return await must(q); } finally { MUT.inflight--; MUT.n++; } }

async function fetchAll(table, build = q => q, tie = 'id', cols = '*') {
  const out = []; const page = 1000;
  for (let from = 0; ; from += page) {
    let q = build(sb.from(table).select(cols)); if (tie) q = q.order(tie);
    const rows = await must(q.range(from, from + page - 1));
    out.push(...rows); if (rows.length < page) break;
  }
  return out;
}

// Tải toàn bộ dữ liệu. Với { ifQuiet:true }: nếu trong lúc tải người dùng vừa thao tác gì đó
// thì BỎ kết quả (đã cũ) và trả false — tránh bản tải về đè mất thao tác vừa làm.
async function loadAll(opts = {}) {
  const seq = MUT.n;
  const sig = await getSig();                                   // lấy chữ ký TRƯỚC khi tải: thay đổi xảy ra giữa chừng sẽ bị phát hiện ở lần sau
  const since = new Date(Date.now() - 400 * 864e5).toISOString(); // đủ để tính chuỗi ngày học dài
  const [cards, decks, cats, dcs, rads, rcs, dec, daily] = await Promise.all([
    fetchAll('cards', q => q.order('created_at', { ascending: false }).order('id')),
    fetchAll('decks'), fetchAll('deck_categories'), fetchAll('deck_cards'), fetchAll('radicals'), fetchAll('radical_cards'),
    fetchAll('user_decompositions', q => q, 'character'),
    fetchAll('study_sessions', q => q.gte('studied_at', since).order('studied_at'), 'id', 'result,studied_at'),
  ]);
  const t = await sb.from('study_sessions').select('id', { count: 'exact', head: true });
  const c = await sb.from('study_sessions').select('id', { count: 'exact', head: true }).eq('result', 'correct');
  if (opts.ifQuiet && (MUT.n !== seq || MUT.inflight)) return false;
  // Ngữ pháp (schema v7): nếu máy chủ chưa chạy schema mới thì bỏ qua êm, phần còn lại của app vẫn dùng bình thường
  let gram = null; try { gram = await fetchAll('grammar_points', q => q.order('created_at', { ascending: false }).order('id')); } catch { gram = null; }
  S.grammar_points = gram || []; S.grammarOk = !!gram;
  // Bảng chia động từ (schema v10): chưa chạy schema mới thì bỏ qua êm
  try {
    const [cf, cv, cc] = await Promise.all([fetchAll('conj_forms', q => q.order('sort_order')), fetchAll('conj_verbs', q => q.order('sort_order')), fetchAll('conj_cells', q => q.order('verb_id'), 'form_id')]);
    S.conj_forms = cf; S.conj_verbs = cv; S.conj_cells = cc; S.conjOk = true;
  } catch { S.conj_forms = []; S.conj_verbs = []; S.conj_cells = []; S.conjOk = false; }
  reindexConj();
  // Bản dịch (schema v11)
  try { S.translations = await fetchAll('translations', q => q.order('created_at', { ascending: false })); S.transOk = true; } catch { S.translations = []; S.transOk = false; }
  S.cards = cards; S.decks = decks; S.cats = cats.sort((a, b) => a.sort_order - b.sort_order); S.deckCards = dcs; S.radicals = rads; S.radCards = rcs;
  S.decomps = new Map(dec.filter(alive).map(d => [d.character, d.parts]));
  S.daily = daily.map(s => ({ result: s.result, day: localDate(new Date(s.studied_at)) }));
  S.sessTotal = t.count || 0; S.sessCorrect = c.count || 0;
  reindex();
  SYNC.sig = sig;
  return true;
}
async function getSig() { try { const { data, error } = await sb.rpc('jp_sync_sig'); return error ? null : data; } catch { return null; } }

// Cơ sở dữ liệu phải đã chạy schema.sql bản 3 (có cột version + hàm log_study)
async function checkSchema() {
  const { data, error } = await sb.rpc('jp_schema_version');
  if (error || !(data >= 6)) throw new Error('Cơ sở dữ liệu chưa được nâng cấp lên bản mới (thiếu cột version / từ loại / vai trò admin / hàm log_study / jp_sync_sig).');
}

// ── Đồng bộ nhiều thiết bị: tự làm mới ─────────────────────────────────────
const SYNC = { last: 0, busy: false, needsSchema: false, sig: null };
// → 'changed' | 'same' | 'pending' (còn thao tác chưa gửi) | 'busy' | 'skip' | 'error'
async function refreshData({ force = false } = {}) {
  if (!sb || !S.user || SYNC.busy || !navigator.onLine) return 'skip';
  if (!force && Date.now() - SYNC.last < 15000) return 'skip';
  SYNC.busy = true;
  try {
    await flushQueue();
    if (pending().length) return 'pending';   // chưa gửi hết kết quả ôn → chưa tải về để khỏi đè lên bản cục bộ
    // Hỏi chữ ký nhẹ trước; chỉ tải lại toàn bộ khi dữ liệu trên máy chủ thật sự đổi (tiết kiệm băng thông Supabase)
    const sig = await getSig();
    if (sig && sig === SYNC.sig) { SYNC.last = Date.now(); return 'same'; }
    if (!await loadAll({ ifQuiet: true })) return 'busy';
    SYNC.last = Date.now();
    return 'changed';
  } catch (e) { console.warn('refresh', e); return 'error'; } finally { SYNC.busy = false; updateSyncBadge(); }
}

// ── Hàng đợi ghi kết quả ôn (chịu được mất mạng, gửi lại không bị tính 2 lần) ──
let flushing = false;
const pending = () => LS.get('jp_pending', []);
function enqueue(op) { const q = pending(); q.push(op); LS.set('jp_pending', q); flushQueue(); }
// Bản cũ lưu hàng đợi dạng insert/update trực tiếp; đổi sang lệnh 'study' (bản cũ ghi đè lịch SRS nên bỏ)
function migratePending() {
  const q = pending(); if (!q.some(o => o.op !== 'study')) return;
  LS.set('jp_pending', q.flatMap(o => (o.op === 'insert' && o.table === 'study_sessions')
    ? [{ op: 'study', id: o.row.id, card_id: o.row.card_id, result: o.row.result, at: o.row.studied_at, today: localDate(new Date(o.row.studied_at)) }]
    : o.op === 'study' ? [o] : []));
}
// Lỗi tạm thời (mạng, máy chủ quá tải/khởi động lại, hết hạn token, deadlock, timeout) → giữ hàng đợi và thử lại; chỉ bỏ lượt ôn khi dữ liệu sai thật sự
const isTransient = e => !e.code || /fetch|network|timeout|load failed/i.test(e.message || '') || /^(PGRST30[13]|PGRST00|57|40|53|08|55)/.test(e.code) || Number(e.status) >= 500;
async function flushQueue() {
  if (flushing || !sb || !navigator.onLine) return; flushing = true;
  try {
    // Mất phiên đăng nhập (token hết hạn không làm mới được) → KHÔNG gửi: gửi bằng quyền ẩn danh sẽ bị bỏ qua êm và mất lượt ôn
    const { data: ss } = await sb.auth.getSession(); if (!ss.session) return;
    for (;;) {
      const q = pending(); if (!q.length) break;
      const op = q[0];
      let r;
      try { r = await sb.rpc('log_study', { p_id: op.id, p_card: op.card_id, p_result: op.result, p_at: op.at, p_today: op.today }); }
      catch (e) { break; }                                   // lỗi mạng: thử lại sau, giữ nguyên hàng đợi
      if (r.error) {
        if (r.error.code === 'PGRST202' || r.error.code === '42883') { SYNC.needsSchema = true; break; }   // chưa chạy schema mới: GIỮ hàng đợi, không mất dữ liệu
        if (isTransient(r.error) || r.error.code === '42501') break;   // 42501 = tài khoản bị khóa/không đủ quyền: GIỮ hàng đợi, mở khóa xong sẽ gửi lại
        console.warn('Bỏ qua lượt ôn bị từ chối:', r.error.message, op);                                     // lỗi dữ liệu thật sự (vd thẻ đã bị xóa vĩnh viễn)
      } else {
        SYNC.needsSchema = false;
        const row = r.data;
        // chỉ cập nhật thẻ cục bộ bằng kết quả máy chủ khi không còn lượt ôn nào khác của thẻ này đang chờ (tránh nhấp nháy về trạng thái cũ)
        if (row && row.id && !q.slice(1).some(o => o.card_id === row.id)) {
          const i = S.cards.findIndex(x => x.id === row.id); if (i >= 0) S.cards[i] = row;
        }
      }
      LS.set('jp_pending', pending().filter(o => o.id !== op.id)); // loại đúng lượt vừa gửi theo id (nhiều tab cùng gửi cũng không làm mất lượt khác)
    }
  } catch { /* thử lại sau */ } finally { flushing = false; reindex(); updateSyncBadge(); }
}
window.addEventListener('online', flushQueue);

// Ghi 1 lượt ôn: cập nhật hiển thị ngay (dự đoán), máy chủ mới là bên tính kết quả chính thức
function logStudy(cardId, result) {
  const c = S.byId.get(cardId); if (!c) return;
  const now = new Date();
  const [iv, ease] = computeSrsUpdate(c.srs_interval, c.srs_ease, result);
  c.study_count = nextCount(c.study_count, result);
  Object.assign(c, { status: statusFromCount(c.study_count), srs_interval: iv, srs_ease: ease, srs_due_date: addDays(iv) });
  S.daily.push({ result, day: localDate(now) }); S.sessTotal++; if (result === 'correct') S.sessCorrect++;
  MUT.n++;
  enqueue({ op: 'study', id: uuid7(), card_id: cardId, result, at: now.toISOString(), today: localDate(now) });
}

// ── Gộp thay đổi 3 chiều (xung đột nhiều thiết bị) ─────────────────────────
// base = bản lúc bạn mở form · ch = các trường bạn đã sửa · remote = bản hiện tại trên máy chủ
// Chỉ gửi những trường BẠN sửa; hàng chỉ được ghi nếu version vẫn là bản bạn đã thấy (so sánh-và-ghi).
// Nếu ai đó đã sửa trước: trường khác nhau → tự gộp; cùng 1 trường khác giá trị → hỏi bạn.
const EDIT_FIELDS = {
  cards: ['type', 'character', 'reading_on', 'reading_kun', 'reading_kana', 'reading_hanviet', 'romaji', 'meaning_vi', 'meaning_en',
    'example_jp', 'example_vi', 'stroke_count', 'jlpt_level', 'status', 'is_favorite', 'source', 'notes', 'pos'],
  decks: ['name', 'description', 'color', 'icon', 'category_id'],
  radicals: ['character', 'name', 'color'],
  grammar_points: ['title', 'meaning_vi', 'structure', 'explanation', 'examples', 'jlpt_level'],
  translations: ['title', 'jp', 'vi', 'note', 'jlpt_level'],
};
function putLocal(table, row) {
  const arr = S[table], i = arr.findIndex(x => x.id === row.id);
  if (i >= 0) arr[i] = row; else if (table === 'cards' || table === 'grammar_points' || table === 'translations') arr.unshift(row); else arr.push(row);
  reindex();
}
async function saveMerged(table, id, base, data, ask) {
  const fields = EDIT_FIELDS[table];
  let b = base, ch = diffFields(base, data, fields), merged = false, restore = false;
  if (!Object.keys(ch).length) return { row: S[table].find(x => x.id === id) || base, unchanged: true };
  for (let attempt = 0; attempt < 5; attempt++) {
    const patch = restore ? { ...ch, deleted_at: null } : ch;
    const rows = await mut(sb.from(table).update(patch).eq('id', id).eq('version', b.version).select());
    if (rows.length) { putLocal(table, rows[0]); return { row: rows[0], merged }; }
    // So sánh-và-ghi trượt: hàng đã bị sửa/xóa ở nơi khác kể từ lúc bạn mở form
    const remote = (await must(sb.from(table).select('*').eq('id', id)))[0];
    if (!remote) {                                           // đã bị xóa vĩnh viễn
      if (await ask('gone', table) !== 'recreate') return { cancelled: true };
      const full = { ...b, ...ch, id }; delete full.version; delete full.updated_at; delete full.user_id; delete full.deleted_at;
      const [row] = await mut(sb.from(table).insert(full).select()); putLocal(table, row); return { row, merged: true, recreated: true };
    }
    if (remote.deleted_at && !b.deleted_at && !restore) {    // đã bị chuyển vào thùng rác
      if (await ask('deleted', table) !== 'restore') { putLocal(table, remote); return { cancelled: true }; }
      restore = true;
    }
    const plan = planMerge(b, ch, remote);
    const apply = { ...plan.apply };
    if (plan.conflicts.length) {
      const pick = await ask('fields', table, plan.conflicts, remote);
      if (!pick) { putLocal(table, remote); return { cancelled: true }; }
      for (const c of plan.conflicts) if (pick[c.field] === 'mine') apply[c.field] = c.mine;
    }
    merged = true; b = remote; ch = apply;
    if (!Object.keys(ch).length && !restore) { putLocal(table, remote); return { row: remote, merged: true, nothing: true }; }
  }
  throw new Error('Mục này đang được sửa liên tục từ thiết bị khác, hãy thử lại sau ít giây.');
}

// ── Thẻ ─────────────────────────────────────────────────────────────────────
async function addCard(data, id = uuid7()) {
  const row = { id, ...data, srs_interval: 1, srs_ease: SRS.DEFAULT_EASE, srs_due_date: null };
  let saved;
  try { [saved] = await mut(sb.from('cards').insert(row).select()); }
  catch (e) {
    if (e.code !== '23505') throw e;                       // trùng khoá chính = lần Lưu trước đã vào máy chủ (mất mạng giữa chừng) → lấy lại bản đó
    saved = (await must(sb.from('cards').select('*').eq('id', id)))[0]; if (!saved) throw e;
  }
  const i = S.cards.findIndex(x => x.id === saved.id); if (i >= 0) S.cards[i] = saved; else S.cards.unshift(saved);
  reindex(); return saved;
}
async function addCardsBulk(list) {
  const rows = list.map(d => ({ id: uuid7(), ...d, srs_interval: 1, srs_ease: SRS.DEFAULT_EASE, srs_due_date: null }));
  const out = [];
  try { for (let i = 0; i < rows.length; i += 200) out.push(...await mut(sb.from('cards').insert(rows.slice(i, i + 200)).select())); }
  catch (e) {
    // Lỗi giữa chừng: các lô trước đã vào máy chủ → thêm vào danh sách hiện có để bước kiểm tra trùng lần thử lại thấy chúng
    if (out.length) { S.cards.unshift(...out.reverse()); reindex(); e.message += ` (đã thêm được ${out.length}/${rows.length} thẻ trước khi lỗi; thử lại sẽ bỏ qua các thẻ đã có)`; }
    throw e;
  }
  S.cards.unshift(...out.reverse()); reindex(); return out;
}
// Sửa hẹp (chỉ vài trường, giá trị tuyệt đối) — an toàn không cần so sánh version, không đụng trường khác
async function updateCards(ids, patch) {
  for (let i = 0; i < ids.length; i += 100) {
    const rows = await mut(sb.from('cards').update(patch).in('id', ids.slice(i, i + 100)).select());
    for (const r of rows) { const k = S.cards.findIndex(x => x.id === r.id); if (k >= 0) S.cards[k] = r; }
  }
  reindex();
}
const updateCard = (id, patch) => updateCards([id], patch);
const softDeleteCards = ids => updateCards(ids, { deleted_at: new Date().toISOString() });
const restoreCards = ids => updateCards(ids, { deleted_at: null });
async function hardDeleteCards(ids) {
  for (let i = 0; i < ids.length; i += 100) await mut(sb.from('cards').delete().in('id', ids.slice(i, i + 100)));
  const s = new Set(ids); S.cards = S.cards.filter(c => !s.has(c.id)); reindex();
}
async function toggleFavorite(ids) {
  const cs = ids.map(i => S.byId.get(i)).filter(Boolean);
  const want = !cs.every(c => c.is_favorite);               // chọn lẫn lộn → đặt tất cả là yêu thích; chọn toàn yêu thích → bỏ hết
  await updateCards(cs.map(c => c.id), { is_favorite: want });
}
function findDuplicates(character, type, excludeId) {
  return liveCards().filter(c => c.character === character.trim() && c.type === type && c.id !== excludeId);
}

// ── Thẻ ↔ bộ thẻ ───────────────────────────────────────────────────────────
async function linkCardsToDeck(cardIds, deckId) {
  const now = new Date().toISOString(); const rows = [];
  for (const cid of cardIds) {
    const ex = S.deckCards.find(x => x.deck_id === deckId && x.card_id === cid);
    rows.push({ id: ex?.id || uuid7(), deck_id: deckId, card_id: cid, deleted_at: null, updated_at: now });
  }
  for (let i = 0; i < rows.length; i += 200) {
    const saved = await mut(sb.from('deck_cards').upsert(rows.slice(i, i + 200), { onConflict: 'deck_id,card_id' }).select());
    for (const r of saved) { const k = S.deckCards.findIndex(x => x.id === r.id || (x.deck_id === r.deck_id && x.card_id === r.card_id)); if (k >= 0) S.deckCards[k] = r; else S.deckCards.push(r); }
  }
  reindex();
}
async function unlinkCardFromDeck(cardId, deckId) {
  const ex = S.deckCards.find(x => x.deck_id === deckId && x.card_id === cardId && alive(x)); if (!ex) return;
  const patch = { deleted_at: new Date().toISOString() };
  await mut(sb.from('deck_cards').update(patch).eq('deck_id', deckId).eq('card_id', cardId)); Object.assign(ex, patch); reindex();
}
async function setCardDecks(cardId, deckIds) {
  const cur = new Set(S.deckOfCard.get(cardId) || []); const want = new Set(deckIds);
  for (const d of want) if (!cur.has(d)) await linkCardsToDeck([cardId], d);
  for (const d of cur) if (!want.has(d)) await unlinkCardFromDeck(cardId, d);
}

// ── Bộ thẻ / danh mục ──────────────────────────────────────────────────────
// id=null → tạo mới; có id → sửa có kiểm tra xung đột (base = bản lúc mở form, ask = hàm hỏi người dùng)
async function saveDeck(id, f, base, ask) {
  if (id) return saveMerged('decks', id, base, f, ask);
  const [r] = await mut(sb.from('decks').insert({ id: uuid7(), ...f }).select()); S.decks.push(r); reindex(); return { row: r };
}
async function deleteDeck(id) {
  const [r] = await mut(sb.from('decks').update({ deleted_at: new Date().toISOString() }).eq('id', id).select()); if (r) putLocal('decks', r);
}
async function saveCategory(id, f) {
  if (id) { const [r] = await mut(sb.from('deck_categories').update(f).eq('id', id).select()); if (r) Object.assign(S.cats.find(d => d.id === id) || {}, r); }
  else { const [r] = await mut(sb.from('deck_categories').insert({ id: uuid7(), sort_order: S.cats.length, ...f }).select()); S.cats.push(r); }
}
async function deleteCategory(id) {
  await mut(sb.from('deck_categories').delete().eq('id', id));
  S.cats = S.cats.filter(c => c.id !== id); S.decks.forEach(d => { if (d.category_id === id) d.category_id = null; });
}

// ── Bộ thủ ──────────────────────────────────────────────────────────────────
async function saveRadical(id, f, base, ask) {
  if (id) return saveMerged('radicals', id, base, f, ask);
  const [r] = await mut(sb.from('radicals').insert({ id: uuid7(), sort_order: S.radicals.length, ...f }).select()); S.radicals.push(r); reindex(); return { row: r };
}
async function deleteRadical(id) {
  const [r] = await mut(sb.from('radicals').update({ deleted_at: new Date().toISOString() }).eq('id', id).select()); if (r) putLocal('radicals', r);
}
async function linkCardsToRadical(cardIds, radId) {
  const now = new Date().toISOString();
  const rows = cardIds.map(cid => ({ id: S.radCards.find(x => x.radical_id === radId && x.card_id === cid)?.id || uuid7(), radical_id: radId, card_id: cid, deleted_at: null, updated_at: now }));
  const saved = await mut(sb.from('radical_cards').upsert(rows, { onConflict: 'radical_id,card_id' }).select());
  for (const r of saved) { const k = S.radCards.findIndex(x => x.id === r.id || (x.radical_id === r.radical_id && x.card_id === r.card_id)); if (k >= 0) S.radCards[k] = r; else S.radCards.push(r); }
  reindex();
}
async function unlinkCardFromRadical(cardId, radId) {
  const ex = S.radCards.find(x => x.radical_id === radId && x.card_id === cardId && alive(x)); if (!ex) return;
  const patch = { deleted_at: new Date().toISOString() };
  await mut(sb.from('radical_cards').update(patch).eq('radical_id', radId).eq('card_id', cardId)); Object.assign(ex, patch); reindex();
}
async function moveRadical(id, dir) {
  const list = liveRadicals(); const i = list.findIndex(r => r.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) if (list[k].sort_order !== k) { await mut(sb.from('radicals').update({ sort_order: k }).eq('id', list[k].id)); list[k].sort_order = k; }
}
async function setDecomp(character, parts) {
  await mut(sb.from('user_decompositions').upsert({ character, parts, deleted_at: null }, { onConflict: 'user_id,character' }));
  S.decomps.set(character, parts);
}
async function clearDecomp(character) {
  await mut(sb.from('user_decompositions').update({ deleted_at: new Date().toISOString() }).eq('character', character));
  S.decomps.delete(character);
}

// ── Ngữ pháp ────────────────────────────────────────────────────────────────
// id=null → tạo mới; có id → sửa có kiểm tra xung đột (giống bộ thẻ / bộ thủ)
async function saveGrammar(id, f, base, ask) {
  if (id) return saveMerged('grammar_points', id, base, f, ask);
  const [r] = await mut(sb.from('grammar_points').insert({ id: uuid7(), ...f }).select()); S.grammar_points.unshift(r); return { row: r };
}
async function deleteGrammar(id) {
  await mut(sb.from('grammar_points').delete().eq('id', id)); S.grammar_points = S.grammar_points.filter(g => g.id !== id);
}
function filterGrammar({ search = '', jlpt = '' } = {}) {
  let list = S.grammar_points.slice();
  if (jlpt) list = list.filter(g => g.jlpt_level === jlpt);
  const toks = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (toks.length) list = list.filter(g => toks.every(t => ['title', 'meaning_vi', 'structure', 'explanation', 'examples'].some(k => (g[k] || '').toLowerCase().includes(t))));
  return list;
}
// Ví dụ: mỗi dòng "câu tiếng Nhật | nghĩa tiếng Việt" (nghĩa có thể bỏ trống)
function parseExamples(text) {
  return String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf('|'); return i < 0 ? { jp: l, vi: '' } : { jp: l.slice(0, i).trim(), vi: l.slice(i + 1).trim() }; });
}

// ── Lọc thẻ (port get_all_cards) ───────────────────────────────────────────
function filterCards(f = {}) {
  let list = f.deleted ? S.cards.filter(c => !alive(c)) : liveCards();
  if (f.type) list = list.filter(c => c.type === f.type);
  if (f.jlpt) list = list.filter(c => c.jlpt_level === f.jlpt);
  if (f.status) list = list.filter(c => c.status === f.status);
  if (f.pos) list = list.filter(c => c.pos === f.pos);
  if (f.fav) list = list.filter(c => c.is_favorite);
  if (f.due) { const t = localDate(); list = list.filter(c => isDue(c, t)); }
  if (f.deck) { const s = new Set(S.cardsOfDeck.get(f.deck) || []); list = list.filter(c => s.has(c.id)); }
  if (f.cat) {   // danh mục: thẻ thuộc bất kỳ bộ nào trong danh mục ('_none' = các bộ chưa phân loại)
    const ok = new Set(S.cats.map(c => c.id)), s = new Set();
    for (const d of liveDecks()) if (((d.category_id && ok.has(d.category_id)) ? d.category_id : '_none') === f.cat) for (const id of S.cardsOfDeck.get(d.id) || []) s.add(id);
    list = list.filter(c => s.has(c.id));
  }
  if (f.search) {
    const toks = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const fields = ['character', 'meaning_vi', 'meaning_en', 'romaji', 'reading_kana', 'reading_kun', 'reading_on', 'reading_hanviet'];
    list = list.filter(c => toks.every(t => fields.some(k => (c[k] || '').toLowerCase().includes(t))));
  }
  return list;
}
const dueCount = () => filterCards({ due: true }).length;

// ── Bảng chia động từ ───────────────────────────────────────────────────────
const reindexConj = () => { S.conjMap = new Map(S.conj_cells.map(c => [c.verb_id + '|' + c.form_id, c])); };
const conjForms = (all = false) => S.conj_forms.filter(f => all || !f.hidden).sort((a, b) => a.sort_order - b.sort_order || (a.created_at > b.created_at ? 1 : -1));
const conjVerbs = () => S.conj_verbs.slice().sort((a, b) => a.sort_order - b.sort_order || (a.created_at > b.created_at ? 1 : -1));
const conjCell = (verbId, formId) => S.conjMap.get(verbId + '|' + formId)?.value || '';
const nextOrder = arr => arr.reduce((m, x) => Math.max(m, x.sort_order || 0), -1) + 1;
const putConj = (table, row) => { const a = S[table], i = a.findIndex(x => x.id === row.id); if (i >= 0) a[i] = row; else a.push(row); };

async function addConjForm(f) {
  const [r] = await mut(sb.from('conj_forms').insert({ id: uuid7(), name: f.name, kind: f.kind || null, hidden: !!f.hidden, sort_order: nextOrder(S.conj_forms) }).select());
  S.conj_forms.push(r); return r;
}
// Thêm các thể thông dụng còn thiếu (theo kind). Trả về các cột vừa thêm.
async function addDefaultConjForms() {
  const have = new Set(S.conj_forms.map(f => f.kind)); let o = nextOrder(S.conj_forms);
  const rows = CONJ_KINDS.filter(k => CONJ_DEFAULT_KINDS.includes(k[0]) && !have.has(k[0])).map(k => ({ id: uuid7(), name: k[1], kind: k[0], hidden: false, sort_order: o++ }));
  if (!rows.length) return [];
  const out = await mut(sb.from('conj_forms').insert(rows).select()); S.conj_forms.push(...out); return out;
}
async function updateConjForm(id, patch) {
  const [r] = await mut(sb.from('conj_forms').update(patch).eq('id', id).select()); if (r) putConj('conj_forms', r); return r;
}
async function deleteConjForm(id) {
  await mut(sb.from('conj_forms').delete().eq('id', id));
  S.conj_forms = S.conj_forms.filter(f => f.id !== id); S.conj_cells = S.conj_cells.filter(c => c.form_id !== id); reindexConj();
}
async function moveConjForm(id, dir) {   // đổi chỗ với cột kề (tính cả cột đang ẩn)
  const list = conjForms(true), i = list.findIndex(f => f.id === id), j = i + dir; if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const changed = list.map((f, n) => [f, n]).filter(([f, n]) => f.sort_order !== n);
  await Promise.all(changed.map(([f, n]) => updateConjForm(f.id, { sort_order: n })));
}
async function addConjVerb(v) {
  const [r] = await mut(sb.from('conj_verbs').insert({ id: uuid7(), masu: v.masu, meaning_vi: v.meaning_vi || null, grp: v.grp || null, sort_order: nextOrder(S.conj_verbs) }).select());
  S.conj_verbs.push(r); return r;
}
async function addConjVerbs(list) {   // nhiều động từ một lần (lấy từ thẻ)
  let o = nextOrder(S.conj_verbs); const out = [];
  for (let i = 0; i < list.length; i += 100) {
    const rows = list.slice(i, i + 100).map(v => ({ id: uuid7(), masu: v.masu, meaning_vi: v.meaning_vi || null, grp: v.grp || null, sort_order: o++ }));
    out.push(...await mut(sb.from('conj_verbs').insert(rows).select()));
  }
  S.conj_verbs.push(...out); return out;
}
async function updateConjVerb(id, patch) {
  const [r] = await mut(sb.from('conj_verbs').update(patch).eq('id', id).select()); if (r) putConj('conj_verbs', r); return r;
}
async function deleteConjVerb(id) {
  await mut(sb.from('conj_verbs').delete().eq('id', id));
  S.conj_verbs = S.conj_verbs.filter(v => v.id !== id); S.conj_cells = S.conj_cells.filter(c => c.verb_id !== id); reindexConj();
}
// Ghi 1 ô: rỗng → xóa ô; có chữ → thêm / sửa
async function setConjCell(verbId, formId, value) {
  value = (value || '').trim(); const cur = S.conjMap.get(verbId + '|' + formId);
  if ((cur?.value || '') === value) return;
  if (!value) { await mut(sb.from('conj_cells').delete().eq('verb_id', verbId).eq('form_id', formId)); S.conj_cells = S.conj_cells.filter(c => c !== cur); }
  else {
    const [r] = await mut(sb.from('conj_cells').upsert({ verb_id: verbId, form_id: formId, value }, { onConflict: 'verb_id,form_id' }).select());
    if (cur) Object.assign(cur, r); else S.conj_cells.push(r);
  }
  reindexConj();
}
// Tự điền các ô theo quy tắc chia (chỉ cột có kind). overwrite=false: giữ nguyên ô đã có chữ. Trả về số ô đã ghi.
async function fillConj({ verbIds = null, formIds = null, overwrite = false } = {}) {
  const rows = [];
  for (const v of conjVerbs()) {
    if (verbIds && !verbIds.includes(v.id)) continue;
    for (const f of conjForms(true)) {
      if (!f.kind || (formIds && !formIds.includes(f.id))) continue;
      if (!overwrite && conjCell(v.id, f.id)) continue;
      const val = conjugate(v.masu, v.grp, f.kind); if (val) rows.push({ verb_id: v.id, form_id: f.id, value: val });
    }
  }
  for (let i = 0; i < rows.length; i += 200) {
    const out = await mut(sb.from('conj_cells').upsert(rows.slice(i, i + 200), { onConflict: 'verb_id,form_id' }).select());
    for (const r of out) { const cur = S.conjMap.get(r.verb_id + '|' + r.form_id); if (cur) Object.assign(cur, r); else S.conj_cells.push(r); }
    reindexConj();
  }
  return rows.length;
}
// Thẻ động từ trong thư viện chưa có trong bảng: [{ card, masu, grp }]
function conjCandidates() {
  const have = new Set(S.conj_verbs.map(v => v.masu)), out = [];
  for (const c of liveCards()) {
    const grp = { verb1: 1, verb2: 2, verb3: 3 }[c.pos]; if (!grp) continue;
    const masu = dictToMasu(c.character, grp) || dictToMasu(c.reading_kana, grp); if (!masu || have.has(masu)) continue;
    have.add(masu); out.push({ card: c, masu, grp });
  }
  return out;
}

// ── Bản dịch ────────────────────────────────────────────────────────────────
async function saveTranslation(id, f, base, ask) {
  if (id) return saveMerged('translations', id, base, f, ask);
  const [r] = await mut(sb.from('translations').insert({ id: uuid7(), ...f }).select()); S.translations.unshift(r); return { row: r };
}
async function deleteTranslation(id) { await mut(sb.from('translations').delete().eq('id', id)); S.translations = S.translations.filter(t => t.id !== id); }
function filterTranslations({ search = '', jlpt = '' } = {}) {
  let list = S.translations.slice();
  if (jlpt) list = list.filter(t => t.jlpt_level === jlpt);
  const toks = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (toks.length) list = list.filter(t => toks.every(k => ['title', 'jp', 'vi', 'note'].some(f => (t[f] || '').toLowerCase().includes(k))));
  return list;
}
// Tách văn bản thành các đoạn (mỗi dòng / đoạn một mục) để ghép cặp Nhật – Việt
const splitParas = t => String(t || '').split(/\r?\n+/).map(x => x.trim()).filter(Boolean);
