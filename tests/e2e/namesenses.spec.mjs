import { SEED } from './seed.mjs';
// Thẻ tên riêng (họ/tên/địa danh/tổ chức) và một từ nhiều nghĩa / từ loại
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors, db }) => {
    await page.waitForSelector('#view');
    await page.click('#tabs [data-tab=cards]'); await page.waitForTimeout(300);
    // schema cũ (chưa chạy v15): form không hiện ô tên riêng / nghĩa khác
    await page.click('[data-act=newCard]'); await page.waitForSelector('#cf');
    check('schema cũ: ẩn tên riêng và nghĩa khác', (await page.locator('[data-act=senseAdd]').count()) === 0 && (await page.locator('[name=name_kind]').count()) === 0);
    await page.evaluate(() => document.querySelector('#cf').closest('.sheet')?.querySelector('[data-close]')?.click());
    // giả lập đã chạy schema v15: thẻ có thêm 2 cột
    await page.evaluate(() => { S.cards.forEach(c => { c.senses = null; c.name_kind = null; }); });
    await page.waitForTimeout(600);
    await page.evaluate(() => { document.querySelectorAll('.sheet').forEach(e => e.remove()); document.querySelectorAll('.scrim').forEach(e => e.remove()); });
    await page.click('[data-act=newCard]'); await page.waitForSelector('#cf');
    await page.fill('[name=character]', '学'); await page.fill('[name=meaning_vi]', 'học');
    await page.fill('[name=reading_kana]', 'まなぶ');
    await page.evaluate(() => { document.querySelector('#cf-adv').open = true; });
    await page.click('[data-act=senseAdd]');
    await page.selectOption('.sense .s-pos', 'noun'); await page.fill('.sense .s-reading', 'がく'); await page.fill('.sense .s-meaning', 'học vấn');
    await page.click('[data-act=senseAdd]'); await page.fill('.sense:nth-child(2) .s-meaning', 'dòng trống bị bỏ');
    await page.click('.sense:nth-child(2) [data-act=senseDel]');
    await page.click('#cf [type=submit]'); await page.waitForFunction(() => S.cards.some(c => c.character === '学' && c.type === 'vocab' && !c.deleted_at), null, { timeout: 8000 }).catch(() => {});
    const saved = await page.evaluate(() => S.cards.find(c => c.character === '学' && !c.deleted_at && c.type === 'vocab'));
    check('lưu nghĩa phụ dạng JSON gọn', saved && saved.senses === '[{"pos":"noun","reading":"がく","meaning":"học vấn"}]', saved && saved.senses);
    // tên riêng
    await page.click('[data-act=newCard]'); await page.waitForSelector('#cf');
    await page.fill('[name=character]', '田中'); await page.fill('[name=meaning_vi]', 'Tanaka (họ)');
    await page.evaluate(() => { document.querySelector('#cf-adv').open = true; });
    await page.selectOption('[name=name_kind]', 'surname');
    await page.click('#cf [type=submit]'); await page.waitForFunction(() => S.cards.some(c => c.character === '田中' && !c.deleted_at), null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300);
    const row = await page.locator('#cardlist .item.nk').first().innerText();
    check('thẻ tên riêng nổi bật (viền màu + nhãn Họ)', row.includes('田中') && row.includes('Họ'), row);
    check('thẻ nhiều nghĩa hiện +1', (await page.locator('#cardlist .item', { hasText: '学' }).first().innerText()).includes('+1'));
    // lọc
    await page.click('[data-act=openFilter]'); await page.click('[data-act=fset][data-k=nk][data-v=surname]'); await page.click('[data-act=fapply]'); await page.waitForTimeout(300);
    const only = await page.locator('#cardlist .item').allInnerTexts();
    check('lọc "Họ" chỉ còn thẻ tên riêng loại Họ', only.length === 1 && only[0].includes('田中'), only.join('|'));
    await page.evaluate(() => { ACT.fclear(); });
    await page.click('[data-act=openFilter]'); await page.click('[data-act=fset][data-k=nk][data-v="*"]'); await page.click('[data-act=fapply]'); await page.waitForTimeout(300);
    check('lọc "Mọi tên riêng"', (await page.locator('#cardlist .item').count()) === 1);
    await page.evaluate(() => { ACT.fclear(); });
    // lọc từ loại khớp cả nghĩa phụ: 学 chính là động từ, phụ là danh từ
    await page.evaluate(() => { const c = S.cards.find(c => c.character === '学'); c.pos = 'verb1'; FILT.pos = 'noun'; });
    await page.click('#tabs [data-tab=cards]'); await page.waitForTimeout(200);
    check('lọc danh từ thấy cả thẻ có nghĩa phụ là danh từ', (await page.evaluate(() => filterCards({ pos: 'noun' }).some(c => c.character === '学'))));
    await page.evaluate(() => { FILT.pos = ''; });
    check('tìm kiếm khớp cả nghĩa phụ ("học vấn")', await page.evaluate(() => filterCards({ search: 'học vấn' }).some(c => c.character === '学')));
    // chi tiết
    await page.evaluate(() => ACT.openCard({ dataset: { id: S.cards.find(c => c.character === '学' && c.senses).id } })); await page.waitForSelector('.sheet');
    const d = await page.locator('.sheet').innerText();
    check('chi tiết hiện "Nghĩa / từ loại khác"', d.includes('Nghĩa / từ loại khác (1)') && d.includes('がく') && d.includes('học vấn'), d.slice(0, 300));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'tên riêng + nhiều nghĩa' });
};
