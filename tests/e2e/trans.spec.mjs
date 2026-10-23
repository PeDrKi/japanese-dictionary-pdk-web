import { SEED } from './seed.mjs';
export default async ({ session }) => {
  const para = n => `これは${n}番目の段落です。日本語の勉強は楽しいですが、毎日続けるのは簡単ではありません。`.repeat(10);   // ≈ 450 chữ / đoạn
  const longJp = Array.from({ length: 6 }, (_, i) => para(i + 1)).join('\n');                                              // ≈ 2.700 chữ ≈ 1 trang A4
  const longVi = Array.from({ length: 6 }, (_, i) => `Đây là đoạn thứ ${i + 1}. Học tiếng Nhật rất vui nhưng kiên trì mỗi ngày thì không dễ.`).join('\n');
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=trans]'); await page.waitForSelector('#transbody');
    check('Bản dịch ở thanh bên (8 mục) và có trạng thái trống', (await page.locator('#tabs button[data-tab]:visible').count()) === 8 && (await page.locator('#transbody').innerText()).includes('Chưa có bản dịch nào'));
    await page.click('.topbar [data-act=newTrans]'); await page.waitForSelector('#tf');
    await page.click('#tf button[type=submit]'); check('thiếu tiếng Nhật → báo lỗi, chưa lưu', (await page.locator('#tf').count()) === 1 && (await db()).translations.length === 0);
    await page.fill('#tf [name=jp]', '私は毎日日本語を勉強します。'); await page.fill('#tf [name=vi]', 'Tôi học tiếng Nhật mỗi ngày.');
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#tf', { state: 'detached' });
    check('thêm 1 câu (Ctrl+Enter lưu)', (await db()).translations.length === 1 && (await db()).translations[0].vi.startsWith('Tôi học'));
    // bài dài ≈ 1 trang A4
    await page.click('.topbar [data-act=newTrans]'); await page.waitForSelector('#tf');
    await page.fill('#tf [name=title]', 'Bài đọc dài'); await page.fill('#tf [name=jp]', longJp); await page.fill('#tf [name=vi]', longVi);
    check('đếm chữ và báo khớp 6/6 đoạn', (await page.locator('#tc-jp').innerText()).includes('chữ') && (await page.locator('#tpair').innerText()).includes('6 đoạn tiếng Nhật khớp 6'));
    await page.selectOption('#tf [name=jlpt_level]', 'N4'); await page.click('#tf button[type=submit]'); await page.waitForSelector('#tf', { state: 'detached' });
    const saved = (await db()).translations.find(t => t.title === 'Bài đọc dài');
    check('lưu bài dài ~2.700 chữ nguyên vẹn (không cắt)', saved && saved.jp === longJp && saved.jp.length > 2500 && saved.vi === longVi && saved.jlpt_level === 'N4', String(saved && saved.jp.length));
    check('danh sách: 2 bài, bài dài hiện số chữ + N4', (await page.locator('#translist .item').count()) === 2 && (await page.locator('#translist').innerText()).includes('N4'));
    // đọc
    await page.click('#translist .item >> text=Bài đọc dài'); await page.waitForSelector('.t2');
    check('trang đọc mặc định: hai bên (bài đọc | từ vựng + bản dịch)', (await page.locator('.t2 .tpassage .tjp').count()) === 6 && (await page.locator('.t2 .tside').count()) === 1);
    await page.click('[data-act=transMode][data-v=pair]'); await page.waitForSelector('.tpair');
    check('trang đọc: ghép cặp 6 đoạn Nhật – Việt', (await page.locator('.tpair').count()) === 6 && (await page.locator('.tpair .tvi').count()) === 6 && (await page.locator('.tpair .tjp').first().innerText()).includes('1番目'));
    await page.click('[data-act=transMode][data-v=jp]');
    check('chế độ "Chỉ tiếng Nhật": ẩn bản dịch', (await page.locator('.tvi').count()) === 0);
    await page.click('[data-act=transMode][data-v=hide]');
    check('chế độ "Che bản dịch": có che', (await page.locator('.tvi.cover').count()) === 6 && (await page.locator('.tvi.cover.shown').count()) === 0);
    await page.locator('.tvi.cover').first().click();
    check('bấm đoạn để hiện bản dịch', (await page.locator('.tvi.cover.shown').count()) === 1);
    // sửa: số đoạn khác nhau → không ghép cặp
    await page.click('[data-act=transEdit]'); await page.waitForSelector('#tf');
    await page.fill('#tf [name=vi]', 'Chỉ có một đoạn dịch.'); await page.click('#tf button[type=submit]'); await page.waitForSelector('#tf', { state: 'detached' }); await page.waitForTimeout(300);
    check('lưu sửa; số đoạn lệch → hiện thông báo không ghép cặp', (await db()).translations.find(t => t.title === 'Bài đọc dài').vi === 'Chỉ có một đoạn dịch.' && (await page.locator('.tbody').innerText()).includes('không ghép cặp'));
    await page.click('[data-act=back]'); await page.waitForSelector('#translist');
    // tìm
    await page.fill('#tq', '毎日日本語'); await page.waitForTimeout(400);
    check('tìm trong tiếng Nhật → 1 bài', (await page.locator('#translist .item').count()) === 1);
    await page.fill('#tq', 'học tiếng nhật'); await page.waitForTimeout(400);
    check('tìm trong tiếng Việt (không phân biệt hoa thường)', (await page.locator('#translist .item').count()) === 1);
    await page.fill('#tq', ''); await page.waitForTimeout(400);
    await page.click('[data-act=transLevel][data-v=N4]'); check('lọc N4 → 1 bài', (await page.locator('#translist .item').count()) === 1); await page.click('[data-act=transLevel][data-v=""]');
    // xóa
    await page.click('#translist .item >> text=Bài đọc dài'); await page.waitForSelector('[data-act=transEdit]'); await page.click('[data-act=transEdit]'); await page.waitForSelector('#tf');
    await page.click('[data-act=transDel]'); await page.waitForSelector('#cf-ok'); await page.click('#cf-ok'); await page.waitForTimeout(500);
    check('xóa bản dịch và quay lại danh sách', (await db()).translations.length === 1 && (await page.locator('#translist').count()) === 1);
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'bản dịch' });
  await session({ ...SEED, oldSchema: true }, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=trans]'); await page.waitForSelector('#transbody');
    check('chưa chạy schema mới → báo rõ, không lỗi', (await page.locator('#transbody').innerText()).includes('schema.sql') && errors.length === 0, errors.join('|'));
  }, { name: 'bản dịch schema cũ' });
};
