import { SEED } from './seed.mjs';
// Gõ romaji → tự đổi sang kana ở Cách đọc / Âm On / Âm Kun
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    await page.evaluate(() => openCardForm(null, { type: 'vocab' })); await page.waitForSelector('#cf');
    await page.focus('[name=reading_kana]'); await page.keyboard.type('gakusei');
    check('Cách đọc: gakusei → がくせい', (await page.inputValue('[name=reading_kana]')) === 'がくせい', await page.inputValue('[name=reading_kana]'));
    await page.fill('[name=reading_kana]', ''); await page.keyboard.type('toyoTA');
    check('Cách đọc: chữ hoa → katakana', (await page.inputValue('[name=reading_kana]')) === 'とよタ');
    await page.fill('[name=reading_kana]', ''); await page.keyboard.type('kan');
    check('đang gõ: n cuối chờ', (await page.inputValue('[name=reading_kana]')) === 'かn');
    await page.focus('[name=character]');
    check('rời ô: n → ん', (await page.inputValue('[name=reading_kana]')) === 'かん');
    await page.evaluate(() => { const f = document.querySelector('#cf'); f.dataset.type = 'kanji'; syncFormType(f); });
    await page.click('[data-mr=reading_on] .mr-rows input'); await page.keyboard.type('nichi');
    await page.click('[data-mr=reading_kun] .mr-rows input'); await page.keyboard.type('hi');
    check('Âm On → katakana, Âm Kun → hiragana', (await page.inputValue('[name=reading_on]')) === 'ニチ' && (await page.inputValue('[name=reading_kun]')) === 'ひ', (await page.inputValue('[name=reading_on]')) + '|' + (await page.inputValue('[name=reading_kun]')));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'gõ romaji → kana' });
};
