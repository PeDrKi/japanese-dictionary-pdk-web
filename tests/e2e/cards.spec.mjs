import { SEED, JISHO_CAT, MYMEMORY_CAT } from './seed.mjs';
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    check('Hôm nay: đếm đúng thẻ đến hạn (quá hạn + hôm nay + thẻ mới = 3)', (await page.locator('.hero h2').innerText()).startsWith('3 thẻ'), await page.locator('.hero h2').innerText());
    await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('#cardlist');
    check('Thư viện: hiện 4 thẻ', (await page.locator('#cardlist .item').count()) === 4);
    check('có chú thích màu trạng thái', (await page.locator('.legend .st').count()) === 3);
    check('nhãn từ loại viết đủ', (await page.locator('#cardlist').innerText()).includes('Động từ 2'));
    // tìm kiếm
    await page.fill('#q', 'nước'); await page.waitForTimeout(400);
    check('tìm theo nghĩa', (await page.locator('#cardlist .item').count()) === 1);
    await page.fill('#q', 'taberu'); await page.waitForTimeout(400);
    check('tìm theo romaji', (await page.locator('#cardlist .item').innerText()).includes('食べる'));
    await page.fill('#q', ''); await page.waitForTimeout(400);
    // lọc theo loại
    await page.click('[data-act=setType][data-v=kanji]'); check('lọc theo Kanji', (await page.locator('#cardlist .item').count()) === 1);
    await page.click('[data-act=setType][data-v=""]');
    // thêm thẻ: tự điền từ Jisho, lưu một bước
    await page.click('.fab'); await page.waitForSelector('#cf');
    check('form mới: tùy chọn thêm đang gập', !(await page.evaluate(() => document.getElementById('cf-adv').open)));
    await page.fill('#cf [name=character]', '猫'); await page.waitForTimeout(2200);
    const v = n => page.inputValue(`#cf [name=${n}]`);
    check('tự điền cách đọc (thẻ Kanji → Kun)', (await v('reading_kun')) === 'ねこ');
    check('tự điền nghĩa tiếng Việt (dịch máy, có nhắc kiểm tra)', (await v('meaning_vi')) === 'con mèo' && (await page.locator('#cf-suggest').innerText()).includes('dịch máy'));
    check('tự điền từ loại + JLPT', (await v('pos')) === 'noun' && (await v('jlpt_level')) === 'N5');
    await page.fill('#cf [name=meaning_vi]', 'mèo nhà');
    await page.fill('#cf [name=character]', ''); await page.type('#cf [name=character]', '猫'); await page.waitForTimeout(2200);
    check('ô đã sửa tay không bị ghi đè', (await v('meaning_vi')) === 'mèo nhà');
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    const saved = (await db()).cards.find(c => c.character === '猫');
    check('Ctrl+Enter lưu thẻ mới', saved && saved.meaning_vi === 'mèo nhà' && saved.pos === 'noun', JSON.stringify(saved));
    // trùng → hỏi xác nhận
    await page.click('.fab'); await page.waitForSelector('#cf'); await page.waitForTimeout(500); await page.fill('#cf [name=character]', '水'); await page.fill('#cf [name=meaning_vi]', 'nước 2');
    await page.waitForTimeout(900); await page.click('#cf button[type=submit]'); await page.waitForSelector('text=đã tồn tại');
    check('thẻ trùng → có hộp xác nhận', true); await page.locator('.scrim').last().locator('[data-close]').click(); await page.locator('#cf [data-close]').click(); await page.waitForSelector('#cf', { state: 'detached' });
    // sửa thẻ
    await page.click('#cardlist .item >> text=ăn'); await page.waitForSelector('.sheet');
    await page.click('[data-act=editCard]'); await page.waitForSelector('#cf');
    check('form sửa: mở sẵn tùy chọn thêm', await page.evaluate(() => document.getElementById('cf-adv').open));
    await page.fill('#cf [name=meaning_vi]', 'ăn (đã sửa)'); await page.click('#cf button[type=submit]'); await page.waitForSelector('#cf', { state: 'detached' });
    check('sửa thẻ được lưu', (await db()).cards.find(c => c.character === '食べる').meaning_vi === 'ăn (đã sửa)');
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { jisho: JISHO_CAT, mymemory: MYMEMORY_CAT, name: 'cards' });

  // Nhập nhanh
  await session(SEED, async ({ page, check, db }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.click('.fab'); await page.waitForSelector('#cf');
    await page.click('[data-act=cfQuick]'); await page.waitForSelector('#qa');
    check('Nhập nhanh mở được từ form thêm thẻ', (await page.locator('#cf').count()) === 0);
    await page.fill('#qa', '猫 - con mèo\n犬: con chó\nxấu'); await page.waitForTimeout(200);
    check('báo 2 dòng hợp lệ, 1 lỗi', /2 dòng hợp lệ/.test(await page.locator('#qp').innerText()) && /1 lỗi/.test(await page.locator('#qp').innerText()));
    await page.click('#qg'); await page.waitForTimeout(800);
    check('đã thêm 2 thẻ', (await db()).cards.length === 6);
  }, { name: 'quickadd' });
};
