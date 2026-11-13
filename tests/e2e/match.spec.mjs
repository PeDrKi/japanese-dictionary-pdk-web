import { SEED } from './seed.mjs';
// Ghép thẻ: chọn kiểu cặp, nối đúng thì biến mất, nhầm ghi "sai" 1 lần, tính vào tiến độ
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=study]'); await page.waitForSelector('.modes');
    check('có chế độ Ghép thẻ', (await page.locator('.modeopt').allInnerTexts()).some(t => t.includes('Ghép thẻ')));
    await page.click('.modeopt:has-text("Ghép thẻ")'); await page.waitForSelector('[data-act=scPairs]');
    check('hiện chọn kiểu cặp (8) và số cặp 5-25', (await page.locator('.chips [data-k=pair]').count()) === 8 && (await page.locator('[data-act=scPairs]').allInnerTexts()).join() === '5,10,15,20,25');
    await page.evaluate(() => { SC.source = 'all'; SC.pairs = 5; SC.pair = 'meaning'; render(); });
    await page.click('[data-act=scStart]'); await page.waitForSelector('.mt-grid');
    check('4 thẻ có nghĩa → 4 cặp, mỗi bên 4 mục', (await page.locator('.mt-col[data-col=L] .mt-item').count()) === 4 && (await page.locator('.mt-col[data-col=R] .mt-item').count()) === 4);
    check('bảng 2 cột × 5 hàng cố định (mỗi cột đủ 5 ô kể cả ô trống)', (await page.locator('.mt-col[data-col=L] > *').count()) === 5 && (await page.locator('.mt-col[data-col=R] > *').count()) === 5);
    const idOf = async txt => (await page.locator(`.mt-col[data-col=L] .mt-item:has-text("${txt}")`).first().getAttribute('data-id'));
    const pick = async (side, id) => page.click(`.mt-col[data-col=${side}] .mt-item[data-id="${id}"]`);
    const a = await idOf('食べる'), b = await idOf('水'), c = await idOf('日'), e = await idOf('あ');
    await pick('L', a); await pick('R', b); await page.waitForTimeout(100);
    check('nối nhầm: cả hai mục báo lỗi', (await page.locator('.mt-item.bad').count()) === 2);
    await page.waitForTimeout(600);
    for (const id of [a, b, c, e]) { await pick('L', id); await pick('R', id); await page.waitForTimeout(450); }
    await page.waitForSelector('.result');
    const d = await db();
    check('ghi 4 lượt ôn: 食べる, 水 sai (nhầm) — 日, あ đúng', d.study_sessions.length === 4 && d.study_sessions.filter(s => s.result === 'incorrect').length === 2, JSON.stringify(d.study_sessions.map(s => s.result)));
    check('thẻ ghép đúng ngay lần đầu cộng điểm học', d.cards.find(x => x.character === 'あ').study_count === 1);
    check('kết quả: 2/4 đúng ngay lần đầu = 50%', (await page.locator('.result .score').innerText()) === '50%');
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'ghép thẻ' });

  // Kiểu cặp thiếu dữ liệu: Chữ ↔ Âm Kun chỉ có 1 kanji → báo không đủ thẻ
  await session(SEED, async ({ page, check }) => {
    await page.waitForSelector('#view'); await page.evaluate(() => { SC.mode = 'match'; SC.source = 'all'; SC.pair = 'kun'; render(); });
    await page.click('#tabs [data-tab=study]'); await page.waitForSelector('[data-act=scStart]');
    check('Chữ ↔ Âm Kun: nút bắt đầu bị khóa khi < 2 thẻ đủ dữ liệu', await page.locator('[data-act=scStart]').isDisabled());
  }, { name: 'ghép thẻ thiếu dữ liệu' });
};
