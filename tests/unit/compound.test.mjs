import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from '../helpers/load.mjs';

const app = loadApp(['core', 'compound']);
const g = n => app.get(n);
const K = (character, hv, on, kun, mean) => ({ id: 'k' + character, type: 'kanji', character, reading_hanviet: hv, reading_on: on, reading_kun: kun, meaning_vi: mean });
const V = (character, mean) => ({ id: 'v' + character, type: 'vocab', character, meaning_vi: mean });
const cards = [K('日', 'nhật', 'ニチ、ジツ', 'ひ', 'ngày'), K('本', 'bản', 'ホン', 'もと', 'sách'), K('人', 'nhân', 'ジン、ニン', 'ひと', 'người'),
  V('日本', 'Nhật Bản'), V('日本人', 'người Nhật'), V('人', 'x'), V('本日', 'hôm nay')];

test('compoundsOf: từ ≥2 chữ chứa kanji, không tính thẻ kanji', () => {
  assert.deepEqual(g('compoundsOf')(cards, '日').map(c => c.character), ['日本', '日本人', '本日']);
  assert.deepEqual(g('compoundsOf')(cards, '人').map(c => c.character), ['日本人']);
});
test('buildCompound: gợi ý Hán Việt và cách đọc, nhận ra từ đã có', () => {
  const b = g('buildCompound')(cards, ['人', '日']);
  assert.equal(b.word, '人日'); assert.equal(b.hanviet, 'nhân nhật'); assert.equal(b.kana, 'じんにち'); assert.equal(b.existing, null);
  const e = g('buildCompound')(cards, ['日', '本']);
  assert.equal(e.hanviet, 'nhật bản'); assert.equal(e.kana, 'にちほん'); assert.equal(e.existing.id, 'v日本');
});
test('buildCompound: thiếu thẻ kanji thì để trống gợi ý', () => {
  const b = g('buildCompound')(cards, ['日', '水']);
  assert.equal(b.hanviet, ''); assert.equal(b.kana, ''); assert.equal(b.hints[1].meaning, '');
});
test('wordsFromKanji: chỉ từ có mọi kanji nằm trong tập đã chọn', () => {
  assert.deepEqual(g('wordsFromKanji')(cards, ['日', '本']).map(c => c.character), ['日本', '本日']);
  assert.deepEqual(g('wordsFromKanji')(cards, ['日', '本', '人']).map(c => c.character), ['日本', '日本人', '本日']);
});
