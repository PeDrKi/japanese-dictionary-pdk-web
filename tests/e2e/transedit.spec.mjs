import { SEED } from './seed.mjs';
// Trang Thêm/Sửa bản dịch chia đôi + dịch từng câu + phân biệt gốc/dịch
export default async ({ session }) => {
  const JP = '今日は雨です。でも行きます！\n明日は晴れです。';          // 2 đoạn, 3 câu
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=trans]'); await page.waitForSelector('#transbody');
    await page.click('.topbar [data-act=newTrans]'); await page.waitForSelector('#tf .ted2');
    const a = await page.locator('#tf textarea[name=jp]').boundingBox(), b = await page.locator('#tf textarea[name=vi]').boundingBox();
    check('chia đôi màn: khung gốc bên trái, khung dịch bên phải, cùng hàng', a.x < b.x && Math.abs(a.y - b.y) < 6 && a.width > 200 && b.width > 200, JSON.stringify([a, b]));
    check('có nhãn phân biệt 原文 / VI', (await page.locator('.colh .lb.orig').count()) === 1 && (await page.locator('.colh .lb.trn').count()) === 1);
    await page.fill('#tf [name=jp]', JP);
    await page.click('[data-act=tedMode][data-v=sent]'); await page.waitForSelector('.sedit');
    check('chế độ từng câu: 3 câu = 3 ô dịch, câu gốc hiển thị riêng', (await page.locator('.sedit [data-sv]').count()) === 3 && (await page.locator('.sedit .sjp').first().innerText()).includes('今日は雨です。'));
    await page.fill('[data-sv="0"]', 'Hôm nay trời mưa.'); await page.fill('[data-sv="2"]', 'Ngày mai trời nắng.');
    await page.click('#tf button[type=submit]'); await page.waitForSelector('#tf', { state: 'detached' });
    const t = (await db()).translations.at(-1);
    check('lưu từng câu: mỗi câu một dòng, câu chưa dịch là …', t.jp === JP && t.vi === 'Hôm nay trời mưa.\n…\nNgày mai trời nắng.', JSON.stringify(t.vi));
    await page.click('#translist .item'); await page.waitForSelector('.t2'); await page.click('[data-act=transMode][data-v=pair]'); await page.waitForSelector('.tpair.sent');
    check('trang đọc: ghép cặp từng câu (3 dòng gốc + 3 dòng dịch, 1 "chưa dịch")', (await page.locator('.srow').count()) === 3 && (await page.locator('.srow .tvi').count()) === 3 && (await page.locator('.tvi.todo').count()) === 1);
    const st = await page.evaluate(() => { const g = e => getComputedStyle(document.querySelector(e)); return [g('.srow .tjp').borderLeftColor, g('.srow .tvi:not(.todo)').borderLeftColor, g('.srow .tjp').fontFamily, g('.srow .tvi').fontFamily, g('.srow .tvi:not(.todo)').backgroundColor]; });
    check('gốc và dịch khác màu viền, khác phông, bản dịch có nền riêng', st[0] !== st[1] && st[2] !== st[3] && st[4] !== 'rgba(0, 0, 0, 0)', JSON.stringify(st));
    await page.click('[data-act=transEdit]'); await page.waitForSelector('#tf .ted2');
    check('sửa: vi nhiều dòng khớp số câu → báo ghép từng câu', (await page.locator('#tpair').innerText()).includes('3 câu tiếng Nhật khớp 3'));
    await page.click('[data-act=tedMode][data-v=sent]'); await page.waitForSelector('.sedit');
    check('mở lại dịch từng câu: giữ bản dịch cũ, câu … hiện ô trống', (await page.inputValue('[data-sv="0"]')) === 'Hôm nay trời mưa.' && (await page.inputValue('[data-sv="1"]')) === '');
    await page.click('[data-act=back]'); await page.waitForSelector('.tbody');
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  });
};
