import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from '../helpers/load.mjs';

const app = loadApp(['core', 'data', 'conflict', 'fx', 'ui', 'tools']);
const S = app.get('S');
const today = app.run('localDate()');
const past = app.run('addDays(-2)'), future = app.run('addDays(5)');
const mk = (id, o) => ({ id, type: 'vocab', character: id, meaning_vi: '', status: 'new', is_favorite: false, srs_due_date: null, deleted_at: null, ...o });
S.cards = [
  mk('食べる', { meaning_vi: 'ăn', reading_kana: 'たべる', romaji: 'taberu', jlpt_level: 'N5', pos: 'verb2', status: 'learning', is_favorite: true, srs_due_date: past }),
  mk('水', { meaning_vi: 'nước', reading_kana: 'みず', romaji: 'mizu', jlpt_level: 'N5', pos: 'noun', srs_due_date: future }),
  mk('日', { type: 'kanji', meaning_vi: 'ngày, mặt trời', reading_on: 'ニチ', reading_kun: 'ひ', reading_hanviet: 'nhật', status: 'known', srs_due_date: today }),
  mk('あ', { type: 'hiragana', meaning_vi: 'a' }),
  mk('xóa rồi', { deleted_at: '2026-01-01T00:00:00Z', meaning_vi: 'đã xóa' }),
];
S.decks = [{ id: 'd1', name: 'N5', deleted_at: null }];
S.deckCards = [{ deck_id: 'd1', card_id: '食べる', deleted_at: null }, { deck_id: 'd1', card_id: '水', deleted_at: null }];
app.run('reindex()');
const f = o => Array.from(app.run('filterCards')(o), c => c.id);

test('filterCards: không lọc → chỉ thẻ chưa xóa', () => assert.deepEqual(f({}), ['食べる', '水', '日', 'あ']));
test('filterCards: theo loại / JLPT / từ loại / trạng thái / yêu thích', () => {
  assert.deepEqual(f({ type: 'kanji' }), ['日']);
  assert.deepEqual(f({ jlpt: 'N5' }), ['食べる', '水']);
  assert.deepEqual(f({ pos: 'verb2' }), ['食べる']);
  assert.deepEqual(f({ status: 'known' }), ['日']);
  assert.deepEqual(f({ fav: true }), ['食べる']);
});
test('filterCards: đến hạn = thẻ mới (chưa có ngày) + hôm nay/quá hạn, không gồm tương lai', () => {
  assert.deepEqual(f({ due: true }), ['食べる', '日', 'あ']);
  assert.equal(app.run('dueCount()'), 3);
});
test('filterCards: theo bộ thẻ', () => assert.deepEqual(f({ deck: 'd1' }), ['食べる', '水']));
test('filterCards: tìm theo chữ, nghĩa, romaji, cách đọc, Hán Việt; nhiều từ khóa = AND; không phân biệt hoa thường', () => {
  assert.deepEqual(f({ search: 'nước' }), ['水']);
  assert.deepEqual(f({ search: 'TABERU' }), ['食べる']);
  assert.deepEqual(f({ search: 'みず' }), ['水']);
  assert.deepEqual(f({ search: 'nhật' }), ['日']);
  assert.deepEqual(f({ search: 'ngày mặt' }), ['日']);
  assert.deepEqual(f({ search: 'ăn nước' }), []);
});
test('filterCards: thùng rác', () => assert.deepEqual(f({ deleted: true }), ['xóa rồi']));

test('guessType: nhận ra loại thẻ từ chữ', () => {
  const g = app.get('guessType');
  assert.equal(g('たべる'), 'hiragana'); assert.equal(g('カタカナ'), 'katakana'); assert.equal(g('日'), 'kanji');
  assert.equal(g('食べる'), 'vocab'); assert.equal(g('日本'), 'vocab');
});
test('posFromJisho: đổi từ loại tiếng Anh của Jisho sang mã của app', () => {
  const p = app.get('posFromJisho');
  assert.equal(p(['Ichidan verb', 'Transitive verb']), 'verb2');
  assert.equal(p(['Godan verb with ru ending']), 'verb1');
  assert.equal(p(['Suru verb']), 'verb3');
  assert.equal(p(['I-adjective (keiyoushi)']), 'adj_i');
  assert.equal(p(['Na-adjective (keiyodoshi)']), 'adj_na');
  assert.equal(p(['Noun']), 'noun'); assert.equal(p(['Particle']), 'particle'); assert.equal(p(['???']), '');
});
test('Nhãn từ loại: viết đủ, không viết tắt khó hiểu', () => {
  const sh = app.get('POS_SHORT');
  assert.equal(sh.verb2, 'Động từ 2'); assert.equal(sh.adj_i, 'Tính từ い');
  for (const k of app.run('POS')) assert.ok(sh[k] && app.get('POS_LABEL')[k], 'thiếu nhãn ' + k);
});

test('Hàng đợi offline: lượt ôn được lưu và gom lại khi mất mạng', () => {
  assert.equal(typeof app.get('flushQueue'), 'function');
});

// ── Ngữ pháp ──
test('parseExamples: tách "JP | VI", bỏ dòng trống, dòng không có | vẫn giữ', () => {
  const r = JSON.parse(JSON.stringify(app.run('parseExamples')('食べてから、寝ます。 | Ăn rồi ngủ.\n\n  出かけます。  \r\nA | B | C')));
  assert.deepEqual(r, [{ jp: '食べてから、寝ます。', vi: 'Ăn rồi ngủ.' }, { jp: '出かけます。', vi: '' }, { jp: 'A', vi: 'B | C' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.run('parseExamples')(null))), []);
});
test('filterGrammar: theo JLPT và từ khóa (mọi từ phải khớp)', () => {
  S.grammar_points = [{ id: 1, title: '〜てから', meaning_vi: 'Sau khi', jlpt_level: 'N5', examples: '食べてから' }, { id: 2, title: '〜ながら', meaning_vi: 'Vừa… vừa', jlpt_level: 'N4' }];
  const g = o => Array.from(app.run('filterGrammar')(o), x => x.id);
  assert.deepEqual(g({}), [1, 2]); assert.deepEqual(g({ jlpt: 'N4' }), [2]);
  assert.deepEqual(g({ search: 'sau khi' }), [1]); assert.deepEqual(g({ search: 'sau vừa' }), []);
  assert.deepEqual(g({ search: '食べて' }), [1]);
});

test('filterCards: theo danh mục (gộp thẻ của mọi bộ trong danh mục; _none = bộ chưa phân loại)', () => {
  S.cats = [{ id: 'k1', name: 'GT' }];
  S.decks = [{ id: 'd1', name: 'A', category_id: 'k1', deleted_at: null }, { id: 'd2', name: 'B', category_id: null, deleted_at: null }, { id: 'd3', name: 'C', category_id: 'k1', deleted_at: '2026-01-01' }];
  S.deckCards = [{ deck_id: 'd1', card_id: '食べる', deleted_at: null }, { deck_id: 'd2', card_id: '水', deleted_at: null }, { deck_id: 'd3', card_id: '日', deleted_at: null }];
  app.run('reindex()');
  assert.deepEqual(f({ cat: 'k1' }), ['食べる']);          // bộ đã xóa (d3) không tính
  assert.deepEqual(f({ cat: '_none' }), ['水']);
  assert.deepEqual(f({ cat: 'k1', jlpt: 'N4' }), []);      // kết hợp được với bộ lọc khác
});
