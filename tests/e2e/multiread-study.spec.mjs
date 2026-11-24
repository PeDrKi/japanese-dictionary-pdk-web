import { SEED } from './seed.mjs';
// Ôn tập (gõ): kanji nhiều âm → hỏi 1 lần, gõ âm nào cũng đúng, rồi hiện các âm còn lại
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    await page.evaluate(() => {
      for (const c of S.cards) { c.study_count = 0; c.next_review = null; }
      const k = S.cards.find(c => c.type === 'kanji'); k.reading_on = 'ニチ、ジツ'; k.reading_kun = 'ひ、か'; window._k = k.character;
      SC.mode = 'typing'; SC.typing = 'kana'; SC.source = 'all'; SC.type = 'kanji';
    });
    await page.click('#tabs [data-tab=study]'); await page.waitForSelector('[data-act=scStart]'); await page.click('[data-act=scStart]');
    const K = await page.evaluate(() => window._k);
    let done = false, prompts = [], fb = '';
    for (let i = 0; i < 12 && !done; i++) {
      await page.waitForSelector('#ti'); const ch = (await page.locator('#paper .ch').allInnerTexts()).join('');
      if (ch === K) {
        prompts.push(await page.locator('#paper').innerText());
        await page.fill('#ti', 'か'); await page.press('#ti', 'Enter'); await page.waitForSelector('#fb');
        fb = await page.locator('#fb').innerText(); done = true;
      } else { await page.click('#skip'); await page.waitForTimeout(150); if (await page.locator('#nx button').count()) await page.click('#nx button'); }
    }
    check('gõ 1 âm bất kỳ (か) được tính đúng', /✓/.test(fb), fb);
    check('hiện các âm còn lại (ニチ, ジツ, ひ)', /ニチ/.test(fb) && /ジツ/.test(fb) && /ひ/.test(fb) && !/か\s*\//.test(fb.replace(/^.*?:/, '')), fb);
    check('không còn nhãn (1/4)', !prompts.some(p => /\(\d\/\d\)/.test(p)), prompts.join('|'));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'ôn gõ: nhiều âm đọc, chọn âm bất kỳ' });
};
