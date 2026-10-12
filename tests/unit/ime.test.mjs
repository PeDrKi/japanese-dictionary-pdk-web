import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from '../helpers/load.mjs';

const app = loadApp(['core', 'ime']);
const IME = app.get('IME');
// Mô phỏng gõ từng phím. Trường hợp "nn" + nguyên âm (onna → おんな) cần ô nhập thật nên được test trong tests/e2e
function type(romaji, kata = false) { let b = ''; for (const ch of romaji) { b += ch; const o = IME.convertTail(b, kata); if (o !== null) b = o; } return b; }

const HIRA = {
  taberu: 'たべる', kyou: 'きょう', gakkou: 'がっこう', chotto: 'ちょっと', matcha: 'まっちゃ', shinbun: 'しんぶn' /* n cuối chờ nn */,
  shinnbunn: 'しんぶん', kanta: 'かんた', sensei: 'せんせい', nihongo: 'にほんご', 'kohi-': 'こひー', jisho: 'じしょ',
  tsukue: 'つくえ', fuji: 'ふじ', syashin: 'しゃしn', sha: 'しゃ', ja: 'じゃ', fa: 'ふぁ', xtu: 'っ', "kon'ya": 'こんや', Taberu: 'たべる',
  'ten,ki': 'てn、き', '1.5': '1.5', wo: 'を', nn: 'ん',
};
for (const [r, k] of Object.entries(HIRA)) test(`hiragana: ${r} → ${k}`, () => assert.equal(type(r), k));

test('katakana: chuyển đúng', () => {
  assert.equal(type('kohi-', true), 'コヒー');
  assert.equal(type('chotto', true), 'チョット');
  assert.equal(type('paatexi'.replace('xi', 'thi'), true), 'パーテ'.replace('ー', 'ア') + 'ティ');
});
test('chữ không phải romaji giữ nguyên', () => {
  assert.equal(type('123'), '123');
  assert.equal(type('日本'), '日本');
});
