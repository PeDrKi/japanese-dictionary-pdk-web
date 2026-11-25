import { SEED } from './seed.mjs';
// Gõ romaji → tự đổi sang kana ở Cách đọc / Âm On / Âm Kun
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    const clear = async () => { await page.evaluate(() => { const e = document.querySelector('[name=reading_kana]'); e.value = ''; e.focus(); }); await page.waitForFunction(() => document.querySelector('[name=reading_kana]').value === ''); };
    await page.evaluate(() => openCardForm(null, { type: 'vocab' })); await page.waitForSelector('#cf');
    await page.waitForFunction(() => document.activeElement?.name === 'character'); await page.waitForTimeout(250);   // form tự focus ô Chữ sau ~60ms — đợi xong rồi mới sang ô khác
    const val = () => page.inputValue('[name=reading_kana]');
    await page.focus('[name=reading_kana]'); await page.keyboard.type('gakusei');
    check('mặc định Abc: gõ gakusei giữ nguyên', (await val()) === 'gakusei', await val());
    await page.evaluate(() => IME.cycle(1)); await clear(); await page.keyboard.type('gakusei');
    check('bật あ (Ctrl+~): gakusei → がくせい', (await val()) === 'がくせい', await val());
    await clear(); await page.keyboard.type('kan');
    check('đang gõ: n cuối chờ', (await val()) === 'かn');
    await page.focus('[name=character]');
    check('rời ô: n → ん', (await val()) === 'かん');
    await page.evaluate(() => IME.cycle(2)); await clear(); await page.keyboard.type('nichi');
    check('bật ア: nichi → ニチ', (await val()) === 'ニチ', await val());
    await page.evaluate(() => { const f = document.querySelector('#cf'); f.dataset.type = 'kanji'; syncFormType(f); });
    await page.click('[data-mr=reading_on] .mr-rows input'); await page.keyboard.type('nichi');
    check('Âm On cũng theo kiểu chữ chung (ア)', (await page.inputValue('[name=reading_on]')) === 'ニチ', await page.inputValue('[name=reading_on]'));
    await page.evaluate(() => { IME.cycle(0); const f = document.querySelector('#cf'); f.dataset.type = 'vocab'; syncFormType(f); }); await clear(); await page.keyboard.type('ka');
    check('về Abc: không đổi', (await val()) === 'ka', await val());
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'gõ romaji → kana' });
};
