import { SEED } from './seed.mjs';
// Ôn gõ: chọn kiểu chữ gõ vào — Hiragana / Katakana / Abc (không đổi), và nhớ lựa chọn
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    await page.evaluate(() => { for (const c of S.cards) { c.study_count = 0; c.next_review = null; } SC.mode = 'typing'; SC.typing = 'kana'; SC.source = 'all'; SC.type = ''; });
    await page.click('#tabs [data-tab=study]'); await page.waitForSelector('[data-act=scStart]'); await page.click('[data-act=scStart]');
    await page.waitForSelector('#sc');
    const type = async s => { await page.fill('#ti', ''); await page.focus('#ti'); await page.keyboard.type(s); await page.waitForTimeout(50); return page.inputValue('#ti'); };
    check('mặc định Abc: ni giữ nguyên', (await type('ni')) === 'ni');
    await page.click('#sc [data-s="1"]'); check('chọn Hiragana: ni → に', (await type('ni')) === 'に');
    await page.click('#sc [data-s="2"]'); check('chọn Katakana: ni → ニ', (await type('ni')) === 'ニ');
    await page.click('#sc [data-s="0"]'); check('chọn Abc: ni giữ nguyên', (await type('ni')) === 'ni');
    await page.evaluate(() => IME.cycle(1)); check('bấm phím tắt đổi cả nút chọn trong màn ôn', await page.evaluate(() => document.querySelector('#sc [data-s="1"]').classList.contains('on')));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'ôn gõ: chọn hira / kata / không đổi' });
};
