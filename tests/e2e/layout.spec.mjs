import { SEED } from './seed.mjs';
// Điện thoại: không tràn ngang, nút bấm đủ lớn
export default async ({ session }) => {
  for (const [name, w, h] of [['iPhone SE', 320, 568], ['iPhone 13', 390, 844]]) {
    await session(SEED, async ({ page, check }) => {
      await page.waitForSelector('#view');
      for (const tab of ['today', 'cards', 'study', 'decks', 'more']) {
        await page.click(`#tabs [data-tab=${tab}]`); await page.waitForTimeout(150);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(`${name} · ${tab}: không tràn ngang`, over <= 0, 'tràn ' + over + 'px');
      }
      await page.click('#tabs [data-tab=cards]'); await page.click('.fab'); await page.waitForSelector('#cf'); await page.waitForTimeout(600);   // chờ hiệu ứng trượt lên của hộp thoại
      const saveBtn = await page.locator('#cf button[type=submit]').boundingBox();
      check(`${name} · form thêm thẻ: nút Lưu nằm trong màn hình`, saveBtn && saveBtn.y + saveBtn.height <= h && saveBtn.height >= 40);
    }, { viewport: { width: w, height: h }, name: 'layout ' + name });
  }
};
