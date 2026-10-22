/* core.js — hằng số, tiện ích và logic thuần (port từ constants.py + domain/*.py) */
'use strict';

// ── Hằng số ────────────────────────────────────────────────────────────────
const TYPES = ['vocab', 'kanji', 'hiragana', 'katakana'];
const TYPE_LABEL = { kanji: '漢字', hiragana: 'ひらがな', katakana: 'カタカナ', vocab: '語彙' };
const TYPE_GLYPH = { kanji: '漢', hiragana: 'ひ', katakana: 'ア', vocab: '語' };
const STATUSES = ['new', 'learning', 'known'];
const STATUS_LABEL = { new: 'Chưa học', learning: 'Đang học', known: 'Đã nhớ' };
const JLPT = ['N5', 'N4', 'N3', 'N2', 'N1'];
// Từ loại (mọi loại thẻ: từ vựng, kanji, ...). "verb" = động từ chưa rõ nhóm; verb1/2/3 = có chỉ rõ nhóm
const POS = ['noun', 'verb', 'verb1', 'verb2', 'verb3', 'adj_i', 'adj_na', 'pronoun', 'particle', 'adverb', 'conjunction', 'interjection'];
const POS_LABEL = { noun: 'Danh từ', verb: 'Động từ', verb1: 'Động từ nhóm 1', verb2: 'Động từ nhóm 2', verb3: 'Động từ nhóm 3',
  adj_i: 'Tính từ đuôi い', adj_na: 'Tính từ đuôi な', pronoun: 'Đại từ', particle: 'Trợ từ', adverb: 'Trạng từ', conjunction: 'Liên từ', interjection: 'Thán từ' };
const POS_SHORT = { noun: 'Danh từ', verb: 'Động từ', verb1: 'Động từ 1', verb2: 'Động từ 2', verb3: 'Động từ 3', adj_i: 'Tính từ い', adj_na: 'Tính từ な',
  pronoun: 'Đại từ', particle: 'Trợ từ', adverb: 'Trạng từ', conjunction: 'Liên từ', interjection: 'Thán từ' };
// Nhận mã chuẩn hoặc tên gọi quen thuộc (CSV / file .db / bản desktop) → mã chuẩn hoặc null
const POS_ALIAS = { 'danh từ': 'noun', 'danh tu': 'noun', 'meishi': 'noun', n: 'noun',
  'động từ': 'verb', 'dong tu': 'verb', 'doushi': 'verb', 'verb': 'verb',
  'động từ nhóm 1': 'verb1', 'dong tu nhom 1': 'verb1', 'nhóm 1': 'verb1', 'godan': 'verb1', 'group 1': 'verb1', 'v1': 'verb1', 'verb 1': 'verb1',
  'động từ nhóm 2': 'verb2', 'dong tu nhom 2': 'verb2', 'nhóm 2': 'verb2', 'ichidan': 'verb2', 'group 2': 'verb2', 'v2': 'verb2', 'verb 2': 'verb2',
  'động từ nhóm 3': 'verb3', 'dong tu nhom 3': 'verb3', 'nhóm 3': 'verb3', 'group 3': 'verb3', 'v3': 'verb3', 'verb 3': 'verb3', 'irregular': 'verb3',
  'tính từ đuôi い': 'adj_i', 'tính từ đuôi i': 'adj_i', 'tinh tu duoi i': 'adj_i', 'i-adj': 'adj_i', 'i adj': 'adj_i', 'adj-i': 'adj_i',
  'tính từ đuôi な': 'adj_na', 'tính từ đuôi na': 'adj_na', 'tinh tu duoi na': 'adj_na', 'na-adj': 'adj_na', 'na adj': 'adj_na', 'adj-na': 'adj_na',
  'đại từ': 'pronoun', 'dai tu': 'pronoun', 'daimeishi': 'pronoun',
  'trợ từ': 'particle', 'tro tu': 'particle', 'joshi': 'particle',
  'trạng từ': 'adverb', 'trang tu': 'adverb', 'fukushi': 'adverb',
  'liên từ': 'conjunction', 'lien tu': 'conjunction', 'setsuzokushi': 'conjunction',
  'thán từ': 'interjection', 'than tu': 'interjection', 'kandoushi': 'interjection' };
const safePos = v => { const s = String(v ?? '').trim().toLowerCase(); return POS.includes(s) ? s : (POS_ALIAS[s] || null); };
const DECK_COLORS = ['#3ECFCF', '#F0B429', '#E85D5D', '#9B7FE8', '#4ECB85', '#4A90D9', '#FF6B9D'];
const ICON_GROUPS = [
  ['Học tập', '📁 📚 📖 📘 📗 📙 📕 📓 📒 📝 ✏️ 🖊️ 🎓 🏫 🧠 💡 🔍 🗂️ 📌 📎 🔖 🧾 📊 🗒️ 🧮 🔤 🔠 🔡 🈁 🈯 🈳 🈶 🈚 🈸 🈺 🈷️ 🉐 🉑 🀄'],
  ['Nhật Bản', '🎌 🗾 🌸 🏯 ⛩️ 🗻 🍣 🍙 🍱 🍜 🍡 🍵 🎍 🎎 🎏 🎐 🎑 🎋 🎆 🎇 🧧 🎴 👘 🥋 🏮 🍶 🥢 🛕 🚄 🎭 🪷 🎨 ⛰️ 🐟 🦀 🌊'],
  ['Đồ ăn', '🍎 🍊 🍋 🍌 🍉 🍇 🍓 🍑 🍒 🍍 🥝 🍅 🥕 🌽 🥔 🍆 🥦 🍞 🧀 🥚 🍳 🥞 🍗 🍖 🍔 🍟 🍕 🌭 🥪 🌮 🍝 🍲 🍛 🍤 🍦 🍩 🍪 🎂 🍰 🍫 🍬 ☕ 🥛 🍺 🍷 🧃'],
  ['Thiên nhiên', '🌳 🌲 🌴 🌵 🌿 🍀 🍁 🍂 🍃 🌺 🌻 🌼 🌷 🌹 💐 🌾 ☀️ 🌙 ⭐ 🌟 ☁️ ⛅ 🌧️ ⛈️ ❄️ ☃️ 🌈 💧 🔥 🌍 🏔️ 🏖️ 🌋'],
  ['Động vật', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🐙 🐠 🐬 🐳 🦈 🐘 🦒 🐇 🐿️'],
  ['Con người', '👤 👥 👨 👩 🧑 👶 👴 👵 🙂 😀 😊 😍 🤔 😴 😭 😡 💪 👀 👂 👃 👄 🖐️ 👍 🙏 ❤️ 🦷 🦴 🧍 🏃 🚶 👋 ✋ 🤝'],
  ['Nhà & đời sống', '🏠 🏢 🏥 🏦 🏪 🛒 🛏️ 🚪 🪑 🛁 🚿 🧹 🧺 👕 👗 👟 🎒 👜 👓 ⌚ 📱 💻 📷 🔑 💰 💳 ✉️ 📞 🕐 📅 🧴 🪥 🧼 💡'],
  ['Du lịch', '🚗 🚕 🚌 🚆 🚲 🛵 ✈️ 🚢 🚀 🗺️ 🧭 ⛽ 🏨 🎫 🛂 🧳 🌏 🏝️ ⛺ 🚉 🚏 🗼 🗽 🎡 🎢'],
  ['Công việc', '💼 🏭 🔧 🔨 ⚙️ 🧰 🖥️ ⌨️ 🖨️ 📈 📉 🗄️ 📋 📣 📢 ⚖️ 🔬 🧪 💊 ⚕️ 🩺 🏗️ 🚜 📦 🛠️'],
  ['Giải trí', '⚽ 🏀 🎾 🏐 ⛳ 🏊 🚴 🎮 🎲 🎯 🎵 🎶 🎤 🎧 🎸 🎹 🥁 🎬 📺 🧩 ♟️ 🎁 🎉 🎈 📻 🎻 🎺'],
  ['Biểu tượng', '⭐ 💎 🔥 ⚡ ❤️ 🧡 💛 💚 💙 💜 🖤 ✅ ❌ ❗ ❓ ♾️ 🔔 🔒 🏆 🥇 🎖️ 🚩 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🆕 🆗 🔰'],
].map(([name, list]) => [name, list.split(' ')]);
const DECK_ICONS = ICON_GROUPS.flatMap(g => g[1]);
const LIMITS = { character: 50, meaning: 200, reading: 100, example: 500, notes: 1000, source: 100 };

// SRS (SM-2 rút gọn) — y hệt domain/srs.py
const SRS = { MAX_INTERVAL: 90, MIN_EASE: 1.3, MAX_EASE: 2.8, STEP: 0.1, PENALTY: 0.2, DEFAULT_EASE: 2.5 };

// ── Tiện ích ────────────────────────────────────────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// JLPT chỉ nhận N1–N5 (giá trị lạ từ CSV/DB nhập vào bị bỏ để không chèn được mã vào HTML)
const safeJlpt = v => { const u = String(v ?? '').trim().toUpperCase(); return ['N5', 'N4', 'N3', 'N2', 'N1'].includes(u) ? u : null; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nz = v => (v === undefined || v === null || v === '' ? null : v);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function localDate(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(n, from = new Date()) { const d = new Date(from); d.setDate(d.getDate() + n); return localDate(d); }
function daysBetween(a, b) { // a,b: 'YYYY-MM-DD' → số ngày b - a
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 864e5);
}
function fmtDMY(s) { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }

// UUIDv7 (RFC 9562) — cùng định dạng với bản desktop nên ID dùng chung được
function uuid7() {
  const ms = BigInt(Date.now()) & 0xFFFFFFFFFFFFn;
  const r = crypto.getRandomValues(new Uint8Array(10));
  const b = new Uint8Array(16);
  for (let i = 0; i < 6; i++) b[i] = Number((ms >> BigInt(8 * (5 - i))) & 0xFFn);
  b[6] = 0x70 | (r[0] & 0x0F); b[7] = r[1];
  b[8] = 0x80 | (r[2] & 0x3F);
  for (let i = 9; i < 16; i++) b[i] = r[i - 6];
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── SRS ─────────────────────────────────────────────────────────────────────
// Python/Postgres làm tròn .5 về số chẵn; Math.round của JS làm tròn lên → phải tự viết cho khớp desktop & server
const roundHalfEven = x => { const f = Math.floor(x), d = x - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : (f % 2 === 0 ? f : f + 1); };
function computeSrsUpdate(interval, ease, result) {
  interval = interval || 1; ease = ease || SRS.DEFAULT_EASE;
  if (result === 'correct') {
    const ne = Math.min(ease + SRS.STEP, SRS.MAX_EASE);
    const grown = roundHalfEven(interval * ne);
    return [Math.min(Math.max(interval + 1, grown), SRS.MAX_INTERVAL), ne];
  }
  return [1, Math.max(ease - SRS.PENALTY, SRS.MIN_EASE)];
}
// Trạng thái theo số lần học: 0 = Chưa học · 1–19 = Đang học · từ 20 = Đã nhớ
const KNOWN_AT = 20;
// Số lần học: trả lời đúng +1; trả lời sai −1 (không xuống dưới 0)
function nextCount(n, result) { n = Number(n) || 0; return result === 'correct' ? n + 1 : Math.max(0, n - 1); }
function statusFromCount(n) { n = Number(n) || 0; return n <= 0 ? 'new' : n < KNOWN_AT ? 'learning' : 'known'; }
// ── Gộp 3 chiều: so sánh theo trường ────────────────────────────────────────
const sameVal = (a, b) => nz(a) === nz(b);
function diffFields(a, b, fields) { const o = {}; for (const f of fields) if (!sameVal(a[f], b[f])) o[f] = nz(b[f]); return o; }
// base = bản lúc mở form · changes = trường bạn sửa · remote = bản hiện tại trên máy chủ
function planMerge(base, changes, remote) {
  const apply = {}, conflicts = [], already = [];
  for (const f of Object.keys(changes)) {
    const mine = changes[f];
    if (sameVal(remote[f], mine)) already.push(f);                 // người kia đã sửa thành đúng giá trị này
    else if (sameVal(remote[f], base[f])) apply[f] = mine;          // người kia không đụng trường này → áp dụng
    else conflicts.push({ field: f, base: nz(base[f]), mine, theirs: nz(remote[f]) });
  }
  return { apply, conflicts, already };
}
function isDue(c, today = localDate()) { return !c.srs_due_date || c.srs_due_date <= today; }
function dueInfo(c) {
  if (!c.srs_due_date) return '🆕 Thẻ mới — cần ôn ngay';
  const left = daysBetween(localDate(), c.srs_due_date);
  if (left <= 0) return '🎯 Cần ôn ngay';
  return `⏳ Còn ${left} ngày nữa (${fmtDMY(c.srs_due_date)})`;
}
function easeLabel(e) {
  if (e == null) return '—';
  if (e <= 1.6) return '🔴 Khó — cần ôn thường xuyên';
  if (e <= 2.2) return '🟡 Trung bình';
  return '🟢 Dễ — giãn cách ôn dài';
}

// ── Kana → romaji (port domain/kana.py) ─────────────────────────────────────
const HIRA = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho', ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo', ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo', じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo', ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
};
const KANA_ALL = (() => {
  const all = { ...HIRA };
  const toKata = s => [...s].map(c => (c >= 'ぁ' && c <= 'ゖ') ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c).join('');
  for (const [k, v] of Object.entries(HIRA)) all[toKata(k)] = v;
  Object.assign(all, {
    ファ: 'fa', フィ: 'fi', フェ: 'fe', フォ: 'fo', ウィ: 'wi', ウェ: 'we', ウォ: 'wo',
    ティ: 'ti', ディ: 'di', デュ: 'dyu', ツァ: 'tsa', ツィ: 'tsi', ツェ: 'tse', ツォ: 'tso',
  });
  return all;
})();
function kanaAt(t, i) {
  if (i + 1 < t.length && KANA_ALL[t.slice(i, i + 2)]) return KANA_ALL[t.slice(i, i + 2)];
  return KANA_ALL[t[i]] ?? t[i];
}
function kanaToRomaji(text) {
  if (!text) return '';
  const out = []; const n = text.length; let i = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === 'っ' || ch === 'ッ') {
      if (i + 1 < n) { const nx = kanaAt(text, i + 1); if (nx && /[a-z]/i.test(nx[0])) out.push(nx[0]); }
      i++; continue;
    }
    if (ch === 'ー') {
      if (out.length) { const last = out[out.length - 1]; for (let k = last.length - 1; k >= 0; k--) if ('aeiou'.includes(last[k])) { out.push(last[k]); break; } }
      i++; continue;
    }
    if ('、・/ 　'.includes(ch)) { out.push('、・'.includes(ch) ? ', ' : ' '); i++; continue; }
    if (i + 1 < n && KANA_ALL[text.slice(i, i + 2)]) { out.push(KANA_ALL[text.slice(i, i + 2)]); i += 2; continue; }
    if (KANA_ALL[ch]) { out.push(KANA_ALL[ch]); i++; continue; }
    out.push(ch); i++;
  }
  return out.join('');
}

// Bố cục bàn phím kana
const KANA_ROWS = {
  '五十音': [
    ['あア', 'いイ', 'うウ', 'えエ', 'おオ'], ['かカ', 'きキ', 'くク', 'けケ', 'こコ'], ['さサ', 'しシ', 'すス', 'せセ', 'そソ'],
    ['たタ', 'ちチ', 'つツ', 'てテ', 'とト'], ['なナ', 'にニ', 'ぬヌ', 'ねネ', 'のノ'], ['はハ', 'ひヒ', 'ふフ', 'へヘ', 'ほホ'],
    ['まマ', 'みミ', 'むム', 'めメ', 'もモ'], ['やヤ', null, 'ゆユ', null, 'よヨ'], ['らラ', 'りリ', 'るル', 'れレ', 'ろロ'],
    ['わワ', null, null, null, 'をヲ'], ['んン', 'っッ', 'ーー', null, null]],
  '濁音': [
    ['がガ', 'ぎギ', 'ぐグ', 'げゲ', 'ごゴ'], ['ざザ', 'じジ', 'ずズ', 'ぜゼ', 'ぞゾ'], ['だダ', 'ぢヂ', 'づヅ', 'でデ', 'どド'],
    ['ばバ', 'びビ', 'ぶブ', 'べベ', 'ぼボ'], ['ぱパ', 'ぴピ', 'ぷプ', 'ぺペ', 'ぽポ']],
  '拗音': [
    ['きゃキャ', 'きゅキュ', 'きょキョ'], ['しゃシャ', 'しゅシュ', 'しょショ'], ['ちゃチャ', 'ちゅチュ', 'ちょチョ'],
    ['にゃニャ', 'にゅニュ', 'にょニョ'], ['ひゃヒャ', 'ひゅヒュ', 'ひょヒョ'], ['みゃミャ', 'みゅミュ', 'みょミョ'],
    ['りゃリャ', 'りゅリュ', 'りょリョ'], ['ぎゃギャ', 'ぎゅギュ', 'ぎょギョ'], ['じゃジャ', 'じゅジュ', 'じょジョ'],
    ['びゃビャ', 'びゅビュ', 'びょビョ'], ['ぴゃピャ', 'ぴゅピュ', 'ぴょピョ']],
};

// ── Validators (domain/validators.py) ───────────────────────────────────────
const trunc = (v, n) => (v ? String(v).slice(0, n) : v);
function normalizeMultiReading(v) {
  if (!v) return v;
  const seen = new Set(), out = [];
  for (let p of v.split(/[、,，/；;]+/)) { p = p.trim(); if (p && !seen.has(p)) { seen.add(p); out.push(p); } }
  return out.join('、');
}
function buildCardData(f) {
  const t = trunc;
  const rd = v => v == null ? null : (t(normalizeMultiReading(v.trim()), LIMITS.reading) || null);
  return {
    type: f.type,
    character: t((f.character || '').trim(), LIMITS.character),
    reading_on: rd(f.reading_on), reading_kun: rd(f.reading_kun), reading_kana: rd(f.reading_kana),
    reading_hanviet: f.reading_hanviet == null ? null : (t(f.reading_hanviet.trim(), LIMITS.reading) || null),
    romaji: t((f.romaji || '').trim(), LIMITS.reading) || null,
    meaning_vi: t((f.meaning_vi || '').trim(), LIMITS.meaning),
    meaning_en: t((f.meaning_en || '').trim(), LIMITS.meaning) || null,
    example_jp: t((f.example_jp || '').trim(), LIMITS.example) || null,
    example_vi: t((f.example_vi || '').trim(), LIMITS.example) || null,
    stroke_count: f.stroke_count ? parseInt(f.stroke_count, 10) || null : null,
    jlpt_level: safeJlpt(f.jlpt_level),
    pos: safePos(f.pos),
    status: f.status || 'new',
    is_favorite: !!f.is_favorite,
    source: t((f.source || '').trim(), LIMITS.source) || null,
    notes: t((f.notes || '').trim(), LIMITS.notes) || null,
  };
}
// Chọn nguồn kana để tự sinh romaji (resolve_romaji_source)
function romajiSource(type, on, kun, kana, ch) {
  const k = type === 'kanji' ? ((kun || '').trim() || (on || '').trim()) : (kana || '').trim();
  return k || (ch || '').trim();
}

// ── Nhập nhanh (domain/quick_add_parser.py) ─────────────────────────────────
function parseQuickLine(line) {
  const raw = line; line = line.trim();
  if (!line) return { character: '', meaning_vi: '', raw, valid: false, error: 'Dòng trống' };
  const parts = line.split(/\t|\s*[-:–—]\s*/);
  const character = (parts.shift() || '').trim();
  // maxsplit=1: phần còn lại giữ nguyên (nối lại bằng gạch ngang nếu bị tách)
  const m = line.match(/\t|\s*[-:–—]\s*/);
  const meaning_vi = m ? line.slice(m.index + m[0].length).trim() : '';
  if (!character) return { character, meaning_vi, raw, valid: false, error: 'Thiếu ký tự/từ' };
  if (!meaning_vi) return { character, meaning_vi, raw, valid: false, error: 'Thiếu nghĩa tiếng Việt' };
  return { character, meaning_vi, raw, valid: true, error: null };
}
const parseQuickText = t => (t || '').split(/\r?\n/).filter(l => l.trim()).map(parseQuickLine);

// ── IDS / tách bộ (domain/kanji_decomposition.py) ───────────────────────────
const IDC_ARITY = { '⿰': 2, '⿱': 2, '⿲': 3, '⿳': 3, '⿴': 2, '⿵': 2, '⿶': 2, '⿷': 2, '⿸': 2, '⿹': 2, '⿺': 2, '⿻': 2 };
const IDC_LABEL = {
  '⿰': 'trái – phải', '⿱': 'trên – dưới', '⿲': 'trái – giữa – phải', '⿳': 'trên – giữa – dưới', '⿴': 'bao quanh (kín)',
  '⿵': 'bao phía trên', '⿶': 'bao phía dưới', '⿷': 'bao phía trái', '⿸': 'bao góc trên-trái', '⿹': 'bao góc trên-phải',
  '⿺': 'bao góc dưới-trái', '⿻': 'chồng lên nhau',
};
function parseIds(s) {
  const chars = [...(s || '').trim()];
  if (!chars.length) throw new Error('Chuỗi IDS rỗng');
  let pos = 0;
  const unit = () => {
    if (pos >= chars.length) throw new Error('IDS không hợp lệ');
    const ch = chars[pos++]; const ar = IDC_ARITY[ch];
    if (!ar) return { character: ch, operator: null, children: [] };
    const children = []; for (let i = 0; i < ar; i++) children.push(unit());
    return { character: '', operator: ch, children };
  };
  const root = unit();
  if (pos !== chars.length) throw new Error('Dư ký tự sau IDS');
  return root;
}

// ── CSV ─────────────────────────────────────────────────────────────────────
const CSV_FIELDS = ['type', 'character', 'reading_on', 'reading_kun', 'reading_kana', 'reading_hanviet', 'romaji', 'meaning_vi',
  'meaning_en', 'example_jp', 'example_vi', 'stroke_count', 'jlpt_level', 'status', 'is_favorite', 'source', 'notes', 'pos'];
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
function toCsv(cards) {
  const q = v => { v = v == null ? '' : (typeof v === 'boolean' ? (v ? '1' : '0') : String(v)); return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return '﻿' + [CSV_FIELDS.join(','), ...cards.map(c => CSV_FIELDS.map(k => q(c[k])).join(','))].join('\r\n');
}
function csvRowsToCards(rows) {
  const valid = [], errors = [];
  rows.forEach((row, idx) => {
    const line = idx + 2; const s = (k, d = '') => ((row[k] ?? d) + '').trim();
    const character = s('character'), meaning_vi = s('meaning_vi');
    if (!character) return errors.push([line, "Thiếu 'character'"]);
    if (!meaning_vi) return errors.push([line, "Thiếu 'meaning_vi'"]);
    const type = (s('type', 'vocab') || 'vocab').toLowerCase();
    if (!TYPES.includes(type)) return errors.push([line, `type không hợp lệ: ${type}`]);
    const stat = s('status', 'new') || 'new';
    valid.push(buildCardData({
      type, character, meaning_vi, reading_on: s('reading_on'), reading_kun: s('reading_kun'), reading_kana: s('reading_kana'),
      reading_hanviet: s('reading_hanviet'), romaji: s('romaji'), meaning_en: s('meaning_en'), example_jp: s('example_jp'),
      example_vi: s('example_vi'), stroke_count: s('stroke_count'), jlpt_level: s('jlpt_level').toUpperCase(),
      status: STATUSES.includes(stat) ? stat : 'new', is_favorite: s('is_favorite', '0') === '1', source: s('source'), notes: s('notes'), pos: s('pos'),
    }));
  });
  return { valid, errors };
}

// ═══ CHIA ĐỘNG TỪ (thể ます → các thể khác) ═══════════════════════════════════════════════
// Nhóm 1 (五段: 飲みます), nhóm 2 (一段: 食べます), nhóm 3 (bất quy tắc: します / 来ます). Cột "kind" của bảng chia dùng các mã dưới đây.
const CONJ_KINDS = [
  ['dict', '辞書形', 'Thể từ điển'], ['nai', 'ない形', 'Phủ định (ない)'], ['te', 'て形', 'Thể て'], ['ta', 'た形', 'Quá khứ (た)'],
  ['potential', '可能形', 'Khả năng'], ['volitional', '意向形', 'Ý chí (〜よう)'], ['imperative', '命令形', 'Mệnh lệnh'], ['passive', '受身形', 'Bị động'],
  ['causative', '使役形', 'Sai khiến'], ['ba', 'ば形', 'Điều kiện (〜ば)'], ['prohibitive', '禁止形', 'Cấm (〜な)'],
  ['masu_neg', 'ません形', 'ます phủ định'], ['masu_ta', 'ました形', 'ます quá khứ'], ['nakatta', 'なかった形', 'Phủ định quá khứ'],
];
const CONJ_DEFAULT_KINDS = CONJ_KINDS.slice(0, 11).map(k => k[0]);
const CONJ_ROW = { う: 'わいうえお', く: 'かきくけこ', ぐ: 'がぎぐげご', す: 'さしすせそ', つ: 'たちつてと', ぬ: 'なにぬねの', ぶ: 'ばびぶべぼ', む: 'まみむめも', る: 'らりるれろ' };
const CONJ_I2U = { い: 'う', き: 'く', ぎ: 'ぐ', し: 'す', ち: 'つ', に: 'ぬ', び: 'ぶ', み: 'む', り: 'る' };
const CONJ_U2I = Object.fromEntries(Object.entries(CONJ_I2U).map(([i, u]) => [u, i]));
const lastCh = s => s.slice(-1), initCh = s => s.slice(0, -1);

// Thể ます → thể từ điển; null nếu không suy ra được
function masuToDict(masu, grp) {
  masu = (masu || '').trim(); if (!masu.endsWith('ます') || masu.length < 3) return null;
  const stem = masu.slice(0, -2), l = lastCh(stem);
  if (grp === 2) return stem + 'る';
  if (grp === 1) return CONJ_I2U[l] ? initCh(stem) + CONJ_I2U[l] : null;
  if (grp === 3) return l === 'し' ? initCh(stem) + 'する' : l === 'き' ? initCh(stem) + 'くる' : l === '来' ? stem + 'る' : null;
  return null;
}
// Thể từ điển → thể ます (dùng khi lấy động từ từ thẻ trong thư viện)
function dictToMasu(dict, grp) {
  dict = (dict || '').trim(); if (dict.length < 2) return null;
  const l = lastCh(dict), h = initCh(dict);
  if (grp === 2) return l === 'る' ? h + 'ます' : null;
  if (grp === 1) return CONJ_U2I[l] ? h + CONJ_U2I[l] + 'ます' : null;
  if (grp === 3) return dict.endsWith('する') ? initCh(h) + 'します' : dict.endsWith('くる') ? initCh(initCh(h)) + 'きます' : l === 'る' && lastCh(h) === '来' ? h + 'ます' : null;
  return null;
}
// Chia từ thể ます + nhóm sang thể `kind`; trả '' nếu không chia được (cột tự đặt, thiếu nhóm, dạng lạ)
function conjugate(masu, grp, kind) {
  masu = (masu || '').trim(); grp = Number(grp);
  if (kind === 'masu_neg' || kind === 'masu_ta') return masu.endsWith('ます') ? masu.slice(0, -2) + (kind === 'masu_neg' ? 'ません' : 'ました') : '';
  const d = masuToDict(masu, grp); if (!d) return '';
  if (kind === 'dict') return d;
  if (kind === 'prohibitive') return d + 'な';
  if (kind === 'nakatta') { const n = conjugate(masu, grp, 'nai'); return n ? n.slice(0, -1) + 'かった' : ''; }
  if (grp === 2) {
    const st = initCh(d);
    return { nai: st + 'ない', te: st + 'て', ta: st + 'た', potential: st + 'られる', volitional: st + 'よう', imperative: st + 'ろ', passive: st + 'られる', causative: st + 'させる', ba: st + 'れば' }[kind] || '';
  }
  if (grp === 1) {
    const b = initCh(d), u = lastCh(d), r = CONJ_ROW[u]; if (!r) return '';
    if (kind === 'nai') return d === 'ある' ? 'ない' : b + r[0] + 'ない';
    if (kind === 'te' || kind === 'ta') {
      const t = kind === 'te';
      if (u === 'く' && (d.endsWith('行く') || d === 'いく' || d.endsWith('逝く'))) return b + (t ? 'って' : 'った');
      const m = { う: 'っ', つ: 'っ', る: 'っ', ぶ: 'ん', む: 'ん', ぬ: 'ん', く: 'い', ぐ: 'い', す: 'し' }[u], dv = 'ぶむぬぐ'.includes(u);
      return b + m + (t ? (dv ? 'で' : 'て') : (dv ? 'だ' : 'た'));
    }
    if (d === 'ある' && ['potential', 'volitional', 'imperative', 'passive', 'causative'].includes(kind)) return '';   // ある không có các thể này
    return { potential: b + r[3] + 'る', volitional: b + r[4] + 'う', imperative: b + r[3], passive: b + r[0] + 'れる', causative: b + r[0] + 'せる', ba: b + r[3] + 'ば' }[kind] || '';
  }
  if (grp === 3) {
    if (d.endsWith('する')) { const p = d.slice(0, -2); return { nai: p + 'しない', te: p + 'して', ta: p + 'した', potential: p + 'できる', volitional: p + 'しよう', imperative: p + 'しろ', passive: p + 'される', causative: p + 'させる', ba: p + 'すれば' }[kind] || ''; }
    const pre = d.slice(0, -2), kanji = d.endsWith('来る'), k = kana => pre + (kanji ? '来' : kana);   // 来る: 来 giữ nguyên; くる: こ / き / く
    return { nai: k('こ') + 'ない', te: k('き') + 'て', ta: k('き') + 'た', potential: k('こ') + 'られる', volitional: k('こ') + 'よう', imperative: k('こ') + 'い', passive: k('こ') + 'られる', causative: k('こ') + 'させる', ba: k('く') + 'れば' }[kind] || '';
  }
  return '';
}
