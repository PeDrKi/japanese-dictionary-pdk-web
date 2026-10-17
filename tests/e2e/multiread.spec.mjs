import { SEED } from './seed.mjs';
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.click('.fab'); await page.waitForSelector('#cf');
    await page.click('[data-act=cfType][data-v=kanji]');
    check('kanji: mỗi âm On / Kun có 1 ô riêng ban đầu', (await page.locator('[data-mr=reading_on] .mr-row').count()) === 1 && (await page.locator('[data-mr=reading_kun] .mr-row').count()) === 1);
    await page.fill('#cf [name=character]', '月'); await page.fill('#cf [name=meaning_vi]', 'tháng, mặt trăng');
    const on = page.locator('[data-mr=reading_on] input[data-mrin]');
    await on.first().fill('げつ'); await on.first().press('Enter');
    check('Enter ở ô cuối tạo ô mới và nhảy sang', (await page.locator('[data-mr=reading_on] .mr-row').count()) === 2);
    await page.keyboard.type('がつ');
    await page.click('[data-act=mrAdd][data-name=reading_kun]'); 
    await page.keyboard.type('つき');
    await page.click('[data-mr=reading_kun] [data-act=mrAdd]'); await page.click('[data-mr=reading_kun] [data-act=mrAdd]');
    check('bấm "+ Thêm" khi đang có ô trống không tạo thêm ô thừa', (await page.locator('[data-mr=reading_kun] .mr-row').count()) === 2);
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    const c = (await db()).cards.find(x => x.character === '月');
    check('lưu: các âm nối bằng "、" trong cùng 1 trường', c && c.reading_on === 'げつ、がつ' && c.reading_kun === 'つき', JSON.stringify(c && [c.reading_on, c.reading_kun]));
    // sửa: các âm hiện lại thành từng ô; xóa 1 ô
    await page.click('#tabs [data-tab=cards]'); await page.click('text=月 >> nth=0'); await page.waitForSelector('.sheet');
    await page.click('[data-act=editCard]').catch(async () => { await page.click('text=Sửa'); }); await page.waitForSelector('#cf');
    check('sửa: 2 âm On hiện ở 2 ô', (await page.locator('[data-mr=reading_on] input[data-mrin]').evaluateAll(l => l.map(i => i.value))).join('|') === 'げつ|がつ');
    await page.click('[data-mr=reading_on] .mr-row:first-child .mr-x');
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    check('xóa 1 ô On → chỉ còn âm kia', (await db()).cards.find(x => x.character === '月').reading_on === 'がつ');
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  });
};
