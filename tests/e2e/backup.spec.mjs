import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { SEED } from './seed.mjs';
const U = '11111111-1111-4111-8111-111111111111';
const base = { deleted_at: null, version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', user_id: U };
const BSEED = { ...SEED,
  deck_categories: [{ ...base, id: 'k0000000-0000-4000-8000-000000000001', name: 'Giáo trình', icon: '📚', sort_order: 0 }],
  decks: [{ ...SEED.decks[0], category_id: 'k0000000-0000-4000-8000-000000000001' }],
  deck_cards: SEED.deck_cards.map(l => ({ ...l, id: 'l0000000-0000-4000-8000-000000000001' })),
  grammar_points: [{ ...base, id: 'g0000000-0000-4000-8000-000000000001', title: '〜てから', meaning_vi: 'Sau khi', structure: 'V-て + から', jlpt_level: 'N5', examples: '' }],
  study_sessions: [{ id: 's0000000-0000-4000-8000-000000000001', user_id: U, card_id: 'c0000000-0000-4000-8000-000000000001', result: 'correct', studied_at: '2026-03-01T00:00:00Z' }],
  conj_forms: [{ ...base, id: 'f0000000-0000-4000-8000-000000000001', name: 'て形', kind: 'te', hidden: false, sort_order: 0 }],
  conj_verbs: [{ ...base, id: 'v0000000-0000-4000-8000-000000000001', masu: '食べます', meaning_vi: 'ăn', grp: 2, sort_order: 0 }],
  conj_cells: [{ user_id: U, verb_id: 'v0000000-0000-4000-8000-000000000001', form_id: 'f0000000-0000-4000-8000-000000000001', value: '食べて', updated_at: '2026-01-01T00:00:00Z' }],
  translations: [{ ...base, id: 't0000000-0000-4000-8000-000000000001', title: 'Câu 1', jp: '私は学生です。', vi: 'Tôi là sinh viên.', note: null, jlpt_level: 'N5' }],
  user_decompositions: [{ user_id: U, character: '明', parts: '日月', updated_at: '2026-01-01T00:00:00Z', deleted_at: null }],
};
export default async ({ session }) => {
  const file = path.join(os.tmpdir(), `jpdic_e2e_backup_${process.pid}.json`);
  await session(BSEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.click('#tabs [data-tab=more]');
    check('Khác: có mục Sao lưu & khôi phục, ghi "Chưa sao lưu lần nào"', (await page.locator('#view').innerText()).includes('Chưa sao lưu lần nào'));
    await page.click('[data-act=backupTools]'); await page.waitForSelector('.sheet');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=backupExport]')]);
    check('tên file sao lưu có ngày', /^jpdic_backup_\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    await dl.saveAs(file);
    const b = JSON.parse(fs.readFileSync(file, 'utf8'));
    check('file đủ các bảng: 4 thẻ, 1 bộ, 1 danh mục, 1 liên kết, 1 ngữ pháp, 1 lượt ôn, 1 tách bộ',
      b.app === 'jpdic-web' && b.counts.cards === 4 && b.counts.decks === 1 && b.counts.deck_categories === 1 && b.counts.deck_cards === 1 && b.counts.grammar_points === 1 && b.counts.study_sessions === 1 && b.counts.user_decompositions === 1 && b.counts.conj_forms === 1 && b.counts.conj_verbs === 1 && b.counts.conj_cells === 1 && b.counts.translations === 1, JSON.stringify(b.counts));
    check('file không chứa email / mật khẩu', !/@|password/i.test(fs.readFileSync(file, 'utf8')));
    await page.waitForTimeout(300);
    check('ghi nhận thời điểm sao lưu', (await page.locator('#view').innerText()).includes('Lần cuối: hôm nay'));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  });
  await session({}, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.click('#tabs [data-tab=more]'); await page.click('[data-act=backupTools]'); await page.waitForSelector('#bkin', { state: 'attached' });
    fs.writeFileSync(file + '.bad', '{"x":1}');
    await page.setInputFiles('#bkin', file + '.bad'); await page.waitForTimeout(400);
    check('file lạ bị từ chối, không ghi gì', (await db()).cards.length === 0 && (await page.locator('.toast').allInnerTexts()).join('').includes('không phải file sao lưu'));
    await page.setInputFiles('#bkin', file); await page.waitForTimeout(500);
    await page.waitForSelector('#cf-ok'); await page.click('#cf-ok');
    await page.waitForFunction(() => window.__DB.cards.length === 4, null, { timeout: 5000 });
    const d = await db();
    check('khôi phục vào tài khoản trống: đủ thẻ, bộ, danh mục, liên kết, ngữ pháp, lịch sử, tách bộ',
      d.cards.length === 4 && d.decks.length === 1 && d.deck_categories.length === 1 && d.deck_cards.length === 1 && d.grammar_points.length === 1 && d.study_sessions.length === 1 && d.user_decompositions.length === 1 && d.conj_forms.length === 1 && d.conj_verbs.length === 1 && d.conj_cells.length === 1 && d.translations.length === 1,
      JSON.stringify(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v && v.length]))));
    check('bộ thẻ giữ liên kết tới danh mục', d.decks[0].category_id === 'k0000000-0000-4000-8000-000000000001');
    // khôi phục lần 2: không nhân đôi
    await page.click('#tabs [data-tab=more]'); await page.click('[data-act=backupTools]'); await page.waitForSelector('#bkin', { state: 'attached' });
    await page.setInputFiles('#bkin', file); await page.waitForSelector('#cf-ok'); await page.click('#cf-ok'); await page.waitForTimeout(800);
    const d2 = await db();
    check('khôi phục lần 2 không nhân đôi dữ liệu', d2.cards.length === 4 && d2.decks.length === 1 && d2.deck_cards.length === 1 && d2.study_sessions.length === 1 && d2.grammar_points.length === 1 && d2.conj_cells.length === 1 && d2.conj_verbs.length === 1);
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  });
  for (const f of [file, file + '.bad']) try { fs.unlinkSync(f); } catch {}
};
