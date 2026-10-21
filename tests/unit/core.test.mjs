import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadApp, ROOT } from '../helpers/load.mjs';

const app = loadApp(['core']);
const g = n => app.get(n);
const parity = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/parity.json'), 'utf8'));
// Giá trị tham chiếu trong parity.json được sinh từ chính bản desktop (domain/srs.py, kana.py, quick_add_parser.py)
// → test này canh để web và desktop không bao giờ lệch nhau.

test('SRS: khớp bản desktop với 120 tổ hợp (interval × ease × kết quả)', () => {
  const f = g('computeSrsUpdate');
  for (const v of parity.srs) {
    const [i, e] = f(v.interval, v.ease, v.result);
    assert.equal(i, v.interval_out, `interval ${JSON.stringify(v)}`);
    assert.ok(Math.abs(e - v.ease_out) < 1e-6, `ease ${JSON.stringify(v)} → ${e}`);
  }
});
test('Điểm học: đúng +1, sai −1, không xuống dưới 0', () => {
  const f = g('nextCount');
  assert.equal(f(0, 'correct'), 1); assert.equal(f(5, 'incorrect'), 4); assert.equal(f(1, 'incorrect'), 0); assert.equal(f(0, 'incorrect'), 0); assert.equal(f(undefined, 'incorrect'), 0); assert.equal(f(19, 'correct'), 20);
});
test('Trạng thái thẻ theo số lần học: 0 = Chưa học, 1–19 = Đang học, từ 20 = Đã nhớ', () => {
  const f = g('statusFromCount');
  for (const [n, st] of [[0, 'new'], [undefined, 'new'], [null, 'new'], [1, 'learning'], [19, 'learning'], [20, 'known'], [21, 'known'], [500, 'known']]) assert.equal(f(n), st, String(n));
});
test('kana → romaji: khớp desktop', () => {
  for (const v of parity.romaji) assert.equal(g('kanaToRomaji')(v.kana), v.romaji, v.kana);
});
test('Nhập nhanh: tách dòng khớp desktop', () => {
  const parse = g('parseQuickLine');
  for (const v of parity.quick) {
    const r = parse(v.line);
    assert.equal(r.valid, v.valid, JSON.stringify(v.line));
    if (v.valid) { assert.equal(r.character, v.character); assert.equal(r.meaning_vi, v.meaning_vi); }
  }
});
test('parseQuickText bỏ qua dòng trống', () => {
  assert.equal(g('parseQuickText')('猫 - mèo\n\n  \n犬 - chó\n').length, 2);
});

test('SRS: luôn tăng khoảng cách khi đúng, về 1 khi sai, không vượt trần', () => {
  const f = g('computeSrsUpdate');
  assert.equal(f(1, 1.3, 'correct')[0], 2);          // 1×1.4 làm tròn = 1 nhưng vẫn phải tăng
  assert.equal(f(89, 2.8, 'correct')[0], 90);
  assert.equal(f(90, 2.8, 'correct')[0], 90);
  assert.deepEqual(Array.from(f(50, 2.5, 'incorrect')), [1, 2.3]);
  assert.equal(f(10, 1.3, 'incorrect')[1], 1.3);      // ease không xuống dưới sàn
});
test('làm tròn .5 về số chẵn (giống Python/Postgres)', () => {
  const r = g('roundHalfEven');
  assert.deepEqual([0.5, 1.5, 2.5, 3.5, 2.4, 2.6].map(r), [0, 2, 2, 4, 2, 3]);
});

test('buildCardData: cắt khoảng trắng, chuẩn hoá âm đọc nhiều giá trị, làm sạch từ loại/JLPT', () => {
  const d = g('buildCardData')({ type: 'kanji', character: '  日 ', meaning_vi: ' ngày ', reading_on: 'ニチ, ジツ ,ニチ', reading_kun: ' ひ / か ', jlpt_level: 'n5', pos: 'NOUN', status: '', stroke_count: '4', is_favorite: 1 });
  assert.equal(d.character, '日');
  assert.equal(d.meaning_vi, 'ngày');
  assert.equal(d.reading_on, 'ニチ、ジツ');            // bỏ trùng, nối bằng 、
  assert.equal(d.reading_kun, 'ひ、か');
  assert.equal(d.jlpt_level, 'N5');
  assert.equal(d.pos, 'noun');
  assert.equal(d.status, 'new');
  assert.equal(d.stroke_count, 4);
  assert.equal(d.is_favorite, true);
});
test('buildCardData: giá trị lạ → null, không ném lỗi', () => {
  const d = g('buildCardData')({ type: 'vocab', character: '猫', meaning_vi: 'mèo', jlpt_level: 'N9', pos: 'xyz', stroke_count: 'abc' });
  assert.equal(d.jlpt_level, null);
  assert.equal(d.pos, null);
  assert.equal(d.stroke_count, null);
  assert.equal(d.romaji, null);
});
test('buildCardData: cắt theo giới hạn độ dài', () => {
  const long = 'あ'.repeat(5000);
  const d = g('buildCardData')({ type: 'vocab', character: long, meaning_vi: long, notes: long });
  assert.ok(d.character.length <= app.run('LIMITS.character'));
  assert.ok(d.meaning_vi.length <= app.run('LIMITS.meaning'));
  assert.ok(d.notes.length <= app.run('LIMITS.notes'));
});

test('planMerge: tự gộp phần không xung đột, báo xung đột đúng trường', () => {
  const base = { meaning_vi: 'a', notes: 'x', pos: null };
  const remote = { meaning_vi: 'a', notes: 'REMOTE', pos: null };       // người kia chỉ sửa notes
  const changes = { meaning_vi: 'b', notes: 'MINE' };                    // mình sửa meaning + notes
  const r = g('planMerge')(base, changes, remote);
  assert.deepEqual({ ...r.apply }, { meaning_vi: 'b' });
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].field, 'notes');
  assert.equal(r.conflicts[0].mine, 'MINE');
  assert.equal(r.conflicts[0].theirs, 'REMOTE');
  const same = g('planMerge')(base, { meaning_vi: 'b' }, { ...remote, meaning_vi: 'b' });
  assert.deepEqual(Array.from(same.already), ['meaning_vi']);
});
test('planMerge: null và chuỗi rỗng coi là như nhau', () => {
  const r = g('planMerge')({ notes: null }, { notes: 'x' }, { notes: '' });
  assert.deepEqual({ ...r.apply }, { notes: 'x' });
  assert.equal(r.conflicts.length, 0);
});

test('Ngày: localDate/addDays/daysBetween', () => {
  assert.equal(g('localDate')(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(g('addDays')(1, new Date(2026, 0, 31)), '2026-02-01');
  assert.equal(g('daysBetween')('2026-02-27', '2026-03-01'), 2);
  assert.equal(g('fmtDMY')('2026-10-12'), '12/10/2026');
});
test('isDue: thẻ mới / quá hạn / chưa tới hạn', () => {
  const isDue = g('isDue');
  assert.equal(isDue({ srs_due_date: null }, '2026-10-12'), true);
  assert.equal(isDue({ srs_due_date: '2026-10-12' }, '2026-10-12'), true);
  assert.equal(isDue({ srs_due_date: '2026-10-13' }, '2026-10-12'), false);
});

test('uuid7: đúng định dạng, tăng dần theo thời gian, không trùng', async () => {
  const f = g('uuid7'); const a = f(); await new Promise(r => setTimeout(r, 3)); const b = f();
  assert.match(a, app.run('UUID_RE'));
  assert.equal(a[14], '7');
  assert.ok(a < b, 'uuid7 sau phải lớn hơn');
  assert.equal(new Set(Array.from({ length: 500 }, f)).size, 500);
});

test('CSV: toCsv → parseCsv giữ nguyên dấu phẩy, ngoặc kép, xuống dòng, tiếng Việt/Nhật', () => {
  const cards = [{ id: 'x', type: 'vocab', character: '猫', meaning_vi: 'con "mèo", dễ thương\nhai dòng', reading_kana: 'ねこ', status: 'new' }];
  const rows = g('parseCsv')(g('toCsv')(cards));
  const back = g('csvRowsToCards')(rows);
  assert.equal(back.valid.length, 1);
  assert.equal(back.valid[0].character, '猫');
  assert.equal(back.valid[0].meaning_vi, 'con "mèo", dễ thương\nhai dòng');
});
test('CSV: nhận tên từ loại tiếng Việt, báo dòng thiếu dữ liệu', () => {
  const r = g('csvRowsToCards')([{ character: '高い', meaning_vi: 'cao', type: 'vocab', pos: 'Tính từ đuôi i' }, { character: '', meaning_vi: 'x', type: 'vocab' }]);
  assert.equal(r.valid[0].pos, 'adj_i');
  assert.equal(r.valid.length, 1);
  assert.equal(r.invalid ? r.invalid.length : r.errors.length, 1);
});
