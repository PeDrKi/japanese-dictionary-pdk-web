import { SEED } from './seed.mjs';
// Sắp xếp tên bộ thẻ theo số: Lession_2 trước Lession_10
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    await page.evaluate(() => { for (const n of [10, 2, 12, 1, 11, 9]) S.decks.push({ ...S.decks[0], id: uuid7(), name: 'Lession_' + n, icon: '' }); reindex(); render(); });
    await page.click('#tabs [data-tab=decks]'); await page.waitForTimeout(300);
    const names = (await page.locator('.deckrow .t').allInnerTexts()).filter(t => t.startsWith('Lession_'));
    check('bộ thẻ sắp xếp theo số 1 2 9 10 11 12', names.join(',') === 'Lession_1,Lession_2,Lession_9,Lession_10,Lession_11,Lession_12', names.join(','));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'sắp xếp bộ thẻ theo số' });
};
