import { SEED } from './seed.mjs';
// Gõ romaji → tự đổi sang kana ở Cách đọc / Âm On / Âm Kun
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    const clear = async () => { await page.evaluate(() => { const e = document.querySelector('[name=reading_kana]'); e.value = ''; e.focus(); }); await page.waitForFunction(() => document.querySelector('[name=reading_kana]').value === ''); };
    await page.evaluate(() => openCardForm(null, { type: 'vocab' })); await page.waitForSelector('#cf');
    await page.waitForFunction(() => document.activeElement?.name === 'character'); await page.waitForTimeout(250);   // form tự focus ô Chữ sau ~60ms — đợi xong rồi mới sang ô khác
    await page.focus('[name=reading_kana]'); await page.keyboard.type('gakusei');
    check('Cách đọc: gakusei → がくせい', (await page.inputValue('[name=reading_kana]')) === 'がくせい', await page.evaluate(() => JSON.stringify({ k: document.querySelector('[name=reading_kana]').value, c: document.querySelector('[name=character]').value, a: document.activeElement?.name || document.activeElement?.tagName, m: document.querySelector('[name=meaning_vi]')?.value })));
    await clear(); await page.keyboard.type('toyoTA');
    check('Cách đọc: chữ hoa → katakana', (await page.inputValue('[name=reading_kana]')) === 'とよタ', await page.inputValue('[name=reading_kana]'));
    await clear(); await page.keyboard.type('kan');
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
