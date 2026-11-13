/* compound.js — Ghép kanji thành từ: xem từ ghép của 1 kanji, và dựng thẻ từ vựng mới từ các kanji đã có (port domain/compound.py) */
'use strict';

const isKanjiChar = ch => !!ch && ch >= '一' && ch <= '鿿';
const kataToHira = s => (s || '').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const firstOf = v => ((v || '').split(/[,、;／/・]/)[0] || '').trim();
// Âm On thường viết katakana, kun có thể kèm dấu '.' tách okurigana (あめ、あま / み.る)
const cleanReading = v => kataToHira(firstOf(v)).replace(/[.\-]/g, '');

// Từ (không phải thẻ kanji đơn) có chứa kanji này, ≥ 2 chữ — dùng cho mục "Từ ghép" của thẻ kanji
function compoundsOf(cards, kanji) {
  return cards.filter(c => c.type !== 'kanji' && [...(c.character || '')].length >= 2 && (c.character || '').includes(kanji));
}
// Thẻ kanji đơn theo chữ → thẻ (trùng chữ: ưu tiên thẻ có Hán Việt)
function kanjiIndex(cards) {
  const m = new Map();
  for (const c of cards) {
    if (c.type !== 'kanji') continue;
    const cur = m.get(c.character);
    if (!cur || (!cur.reading_hanviet && c.reading_hanviet)) m.set(c.character, c);   // trùng chữ → ưu tiên thẻ có Hán Việt
  }
  return m;
}
// Dựng gợi ý cho từ ghép từ danh sách kanji theo thứ tự. Âm On ghép tự động chỉ là gợi ý (có thể rendaku / âm xúc) — người dùng kiểm tra lại.
function buildCompound(cards, chars) {
  const idx = kanjiIndex(cards), word = chars.join('');
  const parts = chars.map(ch => idx.get(ch) || null);
  const hv = parts.map(p => firstOf(p?.reading_hanviet).toLowerCase());
  const on = parts.map(p => cleanReading(p?.reading_on));
  const hasAll = (a) => a.length > 0 && a.every(Boolean);
  const existing = cards.find(c => c.type !== 'kanji' && c.character === word) || null;
  return {
    word,
    hanviet: hasAll(hv) ? hv.join(' ') : '',
    kana: hasAll(on) ? on.join('') : '',
    hints: chars.map((ch, i) => ({ ch, meaning: firstOf(parts[i]?.meaning_vi), hanviet: hv[i], on: on[i] })),
    existing,
  };
}
// Từ đã có trong thư viện mà MỌI chữ kanji của nó nằm trong tập đã chọn (ít nhất 2 chữ kanji) — "ghép được từ các chữ này"
function wordsFromKanji(cards, chars) {
  const set = new Set(chars);
  return cards.filter(c => {
    if (c.type === 'kanji') return false;
    const ks = [...(c.character || '')].filter(isKanjiChar);
    return ks.length >= 2 && ks.every(k => set.has(k));
  });
}
