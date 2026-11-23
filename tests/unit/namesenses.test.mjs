import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from '../helpers/load.mjs';

const app = loadApp(['core']);
const g = n => app.get(n);
const J = v => JSON.parse(JSON.stringify(v));   // đưa đối tượng từ vm về cùng realm để so sánh

test('cleanSenses: bỏ dòng trống, từ loại sai → null, tối đa 8', () => {
  const l = J(g('cleanSenses')([{ pos: 'verb1', reading: ' まなぶ ', meaning: 'học' }, { pos: 'xyz', reading: '', meaning: 'x' }, { reading: '', meaning: '' }, null, 'a']));
  assert.deepEqual(l, [{ pos: 'verb1', reading: 'まなぶ', meaning: 'học' }, { pos: null, reading: '', meaning: 'x' }]);
  assert.equal(g('cleanSenses')(Array.from({ length: 12 }, (_, i) => ({ meaning: 'm' + i }))).length, 8);
});
test('dumpSenses/parseSenses: JSON gọn, khứ hồi, lỗi → rỗng', () => {
  const t = g('dumpSenses')([{ pos: 'noun', reading: 'がく', meaning: 'học vấn' }]);
  assert.equal(t, '[{"pos":"noun","reading":"がく","meaning":"học vấn"}]');
  assert.deepEqual(J(g('parseSenses')(t)), [{ pos: 'noun', reading: 'がく', meaning: 'học vấn' }]);
  assert.equal(g('dumpSenses')([]), null);
  assert.deepEqual(J(g('parseSenses')('{không phải json')), []);
});
test('posMatchCard: khớp nghĩa chính hoặc nghĩa phụ', () => {
  const c = { pos: 'verb1', senses: g('dumpSenses')([{ pos: 'noun', meaning: 'học vấn' }]) };
  assert.ok(g('posMatchCard')('noun', c)); assert.ok(g('posMatchCard')('verb*', c)); assert.ok(g('posMatchCard')('verb1', c));
  assert.ok(!g('posMatchCard')('adj_i', c)); assert.ok(g('posMatchCard')('', c));
});
test('buildCardData: name_kind / senses chỉ có khi được truyền; tên riêng sai → null', () => {
  const base = g('buildCardData')({ type: 'vocab', character: '田中', meaning_vi: 'Tanaka' });
  assert.ok(!('name_kind' in base) && !('senses' in base));
  const d = g('buildCardData')({ type: 'vocab', character: '田中', meaning_vi: 'Tanaka', name_kind: 'surname', senses: [{ pos: 'noun', meaning: 'x' }] });
  assert.equal(d.name_kind, 'surname'); assert.equal(d.senses, '[{"pos":"noun","reading":"","meaning":"x"}]');
  assert.equal(g('buildCardData')({ type: 'vocab', character: 'a', meaning_vi: 'b', name_kind: 'zzz', senses: [] }).name_kind, null);
});
