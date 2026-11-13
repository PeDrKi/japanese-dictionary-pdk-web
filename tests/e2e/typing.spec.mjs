import { SEED } from './seed.mjs';
// Luyện gõ nghĩa: nghĩa có nhiều vế ngăn bởi "/" , ";" → chỉ cần nhập 1 trong các vế
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    await page.evaluate(() => { for (const c of S.cards) { c.meaning_vi = c.character === '日' ? 'Ngày / Mặt trời' : 'xxxx'; c.meaning_en = ''; } SC.mode = 'typing'; SC.typing = 'meaning'; SC.source = 'all'; SC.limit = 0; SC.type = ''; SC.deck = ''; SC.jlpt = ''; SC.status = ''; SC.pos = ''; SC.fav = false; });
    await page.click('#tabs [data-tab=study]'); await page.waitForSelector('[data-act=scStart]'); await page.click('[data-act=scStart]');
    let ok = 0, seen = 0;
    for (let i = 0; i < 6 && seen < 4; i++) {
      await page.waitForSelector('#ti'); const ch = (await page.locator('#paper .ch').allInnerTexts()).join('');
      if (ch === '日') { await page.fill('#ti', 'mặt trời'); await page.press('#ti', 'Enter'); await page.waitForTimeout(150); ok = (await page.locator('#fb').innerText()).match(/Đúng|✓|Chính xác/i) ? 1 : -1; break; }
      await page.click('#skip'); await page.waitForTimeout(200); seen++;
      if (await page.locator('#nx button').count()) await page.click('#nx button');
    }
    check('nhập 1 trong 2 nghĩa ("Mặt trời" của "Ngày / Mặt trời") được tính đúng', ok === 1, 'ok=' + ok);
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'gõ nghĩa: chỉ cần 1 trong các nghĩa' });
};
