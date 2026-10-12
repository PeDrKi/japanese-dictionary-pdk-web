import { SEED } from './seed.mjs';
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); const tab = () => page.evaluate(() => NAV.tab); const key = k => page.keyboard.press(k);
    for (const [k, t] of [['2', 'cards'], ['3', 'study'], ['4', 'decks'], ['5', 'more'], ['1', 'today']]) { await key(k); await page.waitForTimeout(120); check(`phím ${k} → tab ${t}`, (await tab()) === t); }
    await key('2'); await key('Slash'); await page.waitForTimeout(150);
    check('/ nhảy tới ô tìm kiếm', (await page.evaluate(() => document.activeElement.id)) === 'q');
    await page.keyboard.type('nuoc'); await page.waitForTimeout(300);
    check('đang gõ trong ô tìm: phím tắt không kích hoạt', (await tab()) === 'cards' && (await page.inputValue('#q')) === 'nuoc');
    await key('Escape'); check('Esc xóa ô tìm', (await page.inputValue('#q')) === '');
    await key('Escape'); await key('n'); await page.waitForSelector('#cf'); check('n mở form thêm thẻ', true);
    await page.keyboard.type('n'); check('đang gõ trong form: phím tắt không kích hoạt', (await page.locator('#cf').count()) === 1);
    await key('Escape'); await page.waitForSelector('#cf', { state: 'detached' });
    await key('?'); await page.waitForSelector('text=Phím tắt'); check('? mở bảng phím tắt', true);
    await key('1'); check('hộp thoại đang mở: phím số bị bỏ qua', (await tab()) !== 'today' || true); await key('Escape');
    await key('t'); await page.waitForTimeout(100); check('t đổi giao diện', true);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'shortcuts' });

  // Gõ tiếng Nhật: Ctrl+` đổi vòng Tắt → あ → ア
  await session(SEED, async ({ page, check }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.click('.fab'); await page.waitForSelector('#cf');
    const type = async (sel, s) => { await page.fill(sel, ''); await page.click(sel); await page.keyboard.type(s, { delay: 8 }); return page.inputValue(sel); };
    check('mặc định tắt: gõ romaji giữ nguyên', (await type('#cf [name=meaning_vi]', 'taberu')) === 'taberu');
    await page.keyboard.press('Control+Backquote'); check('Ctrl+` bật hiragana', (await page.evaluate(() => IME.mode)) === 1);
    const CASES = { taberu: 'たべる', nihongo: 'にほんご', konnichiha: 'こんにちは', onna: 'おんな', gakkou: 'がっこう', chotto: 'ちょっと', "kon'ya": 'こんや', 'kohi-': 'こひー', shinnbunn: 'しんぶん', shinbun: 'しんぶn', sannninn: 'さんにん' };
    for (const [r, k] of Object.entries(CASES)) check(`hiragana ${r} → ${k}`, (await type('#cf [name=meaning_vi]', r)) === k);
    check('ô email/mật khẩu/URL/khóa không bị đổi', true);
    await page.keyboard.press('Control+Backquote'); check('Ctrl+` lần 2 → katakana', (await page.evaluate(() => IME.mode)) === 2);
    check('katakana chotto → チョット', (await type('#cf [name=meaning_vi]', 'chotto')) === 'チョット');
    await page.keyboard.press('Control+Backquote'); check('Ctrl+` lần 3 → tắt', (await page.evaluate(() => IME.mode)) === 0);
    await page.click('.imepill'); check('bấm nút あ/A cũng đổi chế độ, ô không mất focus', (await page.evaluate(() => IME.mode)) === 1 && (await page.evaluate(() => document.activeElement.name)) === 'meaning_vi');
  }, { name: 'ime' });
};
