import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from '../helpers/load.mjs';

const app = loadApp(['core']);
const k = (t, sc, fin = true) => app.get('romajiToKana')(t, sc, fin);

test('hiragana cơ bản, âm đục, âm ghép', () => {
  assert.equal(k('gakusei'), 'がくせい'); assert.equal(k('shinbun'), 'しんぶん'); assert.equal(k('kyouto'), 'きょうと');
  assert.equal(k('chi tsu fu'), 'ち つ ふ'); assert.equal(k('jiten'), 'じてん'); assert.equal(k('ryokou'), 'りょこう');
});
test('っ, ん, ー', () => {
  assert.equal(k('kippu'), 'きっぷ'); assert.equal(k('matcha'), 'まっちゃ'); assert.equal(k('tatte'), 'たって');
  assert.equal(k('kanna'), 'かんな'); assert.equal(k('konnichiha'), 'こんにちは'); assert.equal(k('kon\'ya'), 'こんや'); assert.equal(k('sen'), 'せん');
  assert.equal(k('ra-men', 'kata'), 'ラーメン');
});
test('katakana và auto (chữ hoa → katakana)', () => {
  assert.equal(k('nichi', 'kata'), 'ニチ'); assert.equal(k('toyota', 'kata'), 'トヨタ');
  assert.equal(k('toyoTA', 'auto'), 'とよタ'); assert.equal(k('SAN', 'auto'), 'サン');
});
test('đang gõ: phần dở dang giữ nguyên, n cuối chờ', () => {
  assert.equal(k('gak', 'hira', false), 'がk'); assert.equal(k('kan', 'hira', false), 'かn'); assert.equal(k('sh', 'hira', false), 'sh');
  assert.equal(k('kan', 'hira', true), 'かん'); assert.equal(k('kann', 'hira', false), 'かん');
});
test('giữ nguyên kanji, kana có sẵn, dấu', () => {
  assert.equal(k('日本go'), '日本ご'); assert.equal(k('み.る'), 'み.る'); assert.equal(k('あいu'), 'あいう'); assert.equal(k('123'), '123');
});
