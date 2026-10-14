import { SEED, JISHO_CAT, MYMEMORY_CAT } from './seed.mjs';
// 120 thẻ để thử phân trang (3 trang × 50)
const many = n => Array.from({ length: n }, (_, i) => ({ ...SEED.cards[3], id: `c1000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, character: 'ア' + i, type: 'katakana', meaning_vi: 'm' + i }));
export default async ({ session }) => {
  const BIG = { ...SEED, cards: [...SEED.cards, ...many(116)] };   // 120 thẻ
  await session(BIG, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('#cardlist');
    check('mặc định: 50 thẻ + nút Xem thêm', (await page.locator('#cardlist .item').count()) === 50 && (await page.locator('[data-act=moreCards]').count()) === 1);
    await page.click('[data-act=moreCards]');
    check('Xem thêm: hiện 120 thẻ (50+100 giới hạn)', (await page.locator('#cardlist .item').count()) === 120);
    await page.click('[data-act=pageMode]');
    check('chuyển sang phân trang: 50 thẻ, Trang 1 / 3', (await page.locator('#cardlist .item').count()) === 50 && (await page.locator('.pager .pg').innerText()) === 'Trang 1 / 3');
    check('không còn nút Xem thêm', (await page.locator('[data-act=moreCards]').count()) === 0);
    check('trang đầu: « ‹ bị khóa', await page.locator('.pager [data-p="-1"]').isDisabled());
    await page.click('.pager [aria-label="Trang sau"]');
    check('sang trang 2', (await page.locator('.pager .pg').innerText()) === 'Trang 2 / 3');
    await page.click('.pager [aria-label="Trang cuối"]');
    check('trang cuối: 20 thẻ, › bị khóa', (await page.locator('#cardlist .item').count()) === 20 && await page.locator('.pager [aria-label="Trang sau"]').isDisabled());
    await page.fill('#q', 'm1'); await page.waitForTimeout(400);
    check('tìm kiếm quay về trang 1', (await page.locator('.pager').count()) === 0 || (await page.locator('.pager .pg').innerText()).startsWith('Trang 1 /'));
    await page.fill('#q', ''); await page.waitForTimeout(400);
    check('chế độ phân trang được nhớ sau khi tải lại', await (async () => { await page.reload(); await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('#cardlist'); return (await page.locator('.pager').count()) === 1; })());
    await page.click('[data-act=pageMode]');
    check('chuyển lại Xem thêm', (await page.locator('[data-act=moreCards]').count()) === 1);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'paging' });

  // Luồng nhập bằng bàn phím: gõ chữ → Enter → chọn Jisho → con trỏ nhảy sang ô nghĩa → Ctrl+. → Ctrl+Enter
  const NO_AUTO = { data: JISHO_CAT.data };
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.click('.fab'); await page.waitForSelector('#cf');
    await page.waitForTimeout(200);
    await page.type('#cf [name=character]', 'ねこ');   // chưa khớp từ → autofill im lặng (word là 猫, reading ねこ khớp reading)
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-act=jishoPick]');
    await page.waitForTimeout(250);
    check('mở danh sách Jisho, mục đầu có focus', await page.evaluate(() => document.activeElement && document.activeElement.dataset.act === 'jishoPick'));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.name);
    check('chọn xong: con trỏ ở ô cần nhập kế tiếp (nghĩa tiếng Việt hoặc đã có sẵn gợi ý)', focused === 'meaning_vi', String(focused));
    check('đã điền chữ từ Jisho', (await page.inputValue('#cf [name=character]')) === '猫');
    // xoá nghĩa tự điền (nếu có) để thử Ctrl+.
    await page.fill('#cf [name=meaning_vi]', ''); await page.focus('#cf [name=meaning_vi]');
    await page.keyboard.press('Control+.'); await page.waitForTimeout(500);
    check('Ctrl+. điền bản dịch vào ô nghĩa', (await page.inputValue('#cf [name=meaning_vi]')) === 'con mèo');
    await page.keyboard.press('Tab');
    check('Tab đi tiếp được (rời ô nghĩa)', (await page.evaluate(() => document.activeElement.name)) !== 'meaning_vi');
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    const saved = (await db()).cards.find(c => c.character === '猫');
    check('Ctrl+Enter lưu thẻ', saved && saved.meaning_vi === 'con mèo', JSON.stringify(saved));
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { jisho: NO_AUTO, mymemory: MYMEMORY_CAT, name: 'flow' });
};
