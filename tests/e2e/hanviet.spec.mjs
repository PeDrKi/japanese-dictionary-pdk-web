import { SEED } from './seed.mjs';
// Flashcard hiện Hán Việt ở mặt sau (chỉ thẻ có dữ liệu)
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=study]');
    await page.click('#sc-adv summary'); await page.click('[data-act=scSet][data-k=source][data-v=all]'); await page.click('[data-act=scSet][data-k=mode][data-v=flash]');
    await page.click('[data-act=scStart]'); await page.waitForSelector('#paper');
    let seenK = 0, seenV = 0, wrong = 0;
    for (let i = 0; i < 6; i++) {
      if (!(await page.$('#paper'))) break;
      const kanji = (await page.locator('#paper .ch').first().innerText()).trim() === '日';
      await page.keyboard.press(' '); await page.waitForSelector('#yes');
      const hv = await page.locator('.back .hv').count();
      if (kanji) { seenK++; if (hv !== 1 || !(await page.locator('.back .hv').innerText()).toLowerCase().includes('nhật')) wrong++; } else { seenV++; if (hv) wrong++; }
      await page.click('#yes'); await page.waitForTimeout(50);
    }
    check('flashcard: thẻ có Hán Việt (日 → nhật) hiện ở mặt sau, thẻ không có thì không hiện', seenK >= 1 && seenV >= 1 && wrong === 0, JSON.stringify({ seenK, seenV, wrong }));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  });
};
