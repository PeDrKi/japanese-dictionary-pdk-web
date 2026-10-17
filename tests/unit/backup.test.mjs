import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from '../helpers/load.mjs';
const app = loadApp(['core', 'data', 'conflict', 'ui', 'tools', 'backup']);
const build = app.run('buildBackup'), validate = app.run('validateBackup'), plan = app.run('planRestore');
const J = x => JSON.parse(JSON.stringify(x));
const data = { cards: [{ id: 'c1', character: '水', user_id: 'u', version: 3, updated_at: 'x' }, { id: 'c2', character: '火' }],
  decks: [{ id: 'd1', name: 'N5', deleted_at: null, category_id: 'k1' }, { id: 'd9', name: 'Trùng tên', deleted_at: null }],
  deck_categories: [{ id: 'k1', name: 'Giáo trình' }],
  deck_cards: [{ id: 'l1', deck_id: 'd1', card_id: 'c1' }, { id: 'l2', deck_id: 'd9', card_id: 'c2' }, { id: 'l3', deck_id: 'd1', card_id: 'zzz' }],
  study_sessions: [{ id: 's1', card_id: 'c1', result: 'correct', studied_at: 't' }, { id: 's2', card_id: 'gone', result: 'correct', studied_at: 't' }] };

test('buildBackup: đếm đúng và luôn có đủ các bảng', () => {
  const b = build(data, new Date('2026-10-16T00:00:00Z'));
  assert.equal(b.format, 1); assert.equal(b.counts.cards, 2); assert.equal(b.counts.radicals, 0); assert.equal(b.exported_at, '2026-10-16T00:00:00.000Z');
});
test('validateBackup: chấp nhận bản hợp lệ, từ chối file lạ / hỏng', () => {
  assert.equal(validate(build(data)).ok, true);
  assert.equal(validate({ x: 1 }).ok, false); assert.equal(validate(null).ok, false);
  assert.equal(validate({ app: 'jpdic-web', format: 99, data: {} }).ok, false);
  assert.equal(validate({ app: 'jpdic-web', format: 1, data: { cards: 'x' } }).ok, false);
  assert.equal(validate({ app: 'jpdic-web', format: 1, data: { cards: [{ character: 'a' }] } }).ok, false);
});
test('planRestore: bỏ user_id/version, giữ id; gộp bộ trùng tên; bỏ liên kết/lịch sử mồ côi', () => {
  const p = J(plan(build(data), { cats: [], decks: [{ id: 'dX', name: 'Trùng tên', deleted_at: null }], cards: [], deckCards: [], radicals: [], radCards: [] }));
  const T = Object.fromEntries(p.tables.map(([t, r]) => [t, r]));
  assert.equal(T.cards[0].id, 'c1'); assert.equal('user_id' in T.cards[0], false); assert.equal('version' in T.cards[0], false);
  assert.deepEqual(T.decks.map(d => d.id), ['d1']);
  assert.deepEqual(T.deck_cards.map(l => [l.deck_id, l.card_id]), [['d1', 'c1'], ['dX', 'c2']]);   // d9 → dX; l3 mồ côi bị bỏ
  assert.deepEqual(T.study_sessions.map(s => s.id), ['s1']);
  assert.equal(p.skipped.links, 1); assert.equal(p.skipped.study_sessions, 1);
});
test('planRestore: liên kết đã có sẵn không thêm lại', () => {
  const p = J(plan(build(data), { cats: [], decks: [], cards: [], deckCards: [{ deck_id: 'd1', card_id: 'c1' }], radicals: [], radCards: [] }));
  assert.deepEqual(p.tables.find(t => t[0] === 'deck_cards')[1].map(l => l.id), ['l2']);
});
test('backupStale: cần ≥20 thẻ và quá 30 ngày / chưa từng', () => {
  assert.equal(app.run('backupStale(5)'), false); assert.equal(app.run('backupStale(50)'), true);
  app.run(`LS.set('jp_last_backup', new Date().toISOString())`); assert.equal(app.run('backupStale(50)'), false);
  app.run(`LS.set('jp_last_backup', new Date(Date.now()-40*864e5).toISOString())`); assert.equal(app.run('backupStale(50)'), true);
  app.run(`LS.set('jp_backup_snooze', new Date(Date.now()+864e5).toISOString())`); assert.equal(app.run('backupStale(50)'), false);
});
