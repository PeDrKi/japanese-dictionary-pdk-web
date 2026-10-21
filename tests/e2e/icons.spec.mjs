import { SEED } from './seed.mjs';
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=decks]'); await page.click('[data-act=newDeck]'); await page.waitForSelector('#df');
    const total = await page.evaluate(() => ICON_GROUPS.reduce((n, g) => n + g[1].length, 0));
    check('có hơn 300 biểu tượng, chia nhóm', total > 300 && (await page.locator('.ip-tabs .chip').count()) >= 10, String(total));
    check('đang hiện lưới của nhóm đầu', (await page.locator('.ip-grid .ip-i').count()) > 20);
    await page.click('.ip-tabs .chip >> text=Động vật'); await page.click('.ip-i[data-v="🐱"]');
    check('chọn 🐱: ô hiện biểu tượng đã chọn', (await page.inputValue('#df [name=icon]')) === '🐱');
    await page.fill('#df [name=name]', 'Con vật'); await page.click('#df button.primary'); await page.waitForSelector('#df', { state: 'detached' });
    check('lưu bộ thẻ với biểu tượng 🐱', (await db()).decks.find(d => d.name === 'Con vật')?.icon === '🐱');
    // danh mục
    await page.click('[data-act=manageCats]'); await page.waitForSelector('.sheet'); await page.click('[data-act=catEdit]:not([data-id])'); await page.waitForSelector('#cform');
    await page.click('.ip-tabs .chip >> text=Đồ ăn'); await page.click('.ip-i[data-v="🍝"]'); await page.fill('#cform [name=name]', 'Ăn uống'); await page.click('#cform button.primary');
    await page.waitForTimeout(500);
    check('lưu danh mục với biểu tượng 🍝', (await db()).deck_categories.find(d => d.name === 'Ăn uống')?.icon === '🍝');
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  });
};
