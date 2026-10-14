import { SEED } from './seed.mjs';
const U = '11111111-1111-4111-8111-111111111111';
const base = { deleted_at: null, version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', user_id: U };
const did = n => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`, cid = n => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DSEED = { ...SEED,
  deck_categories: [{ ...base, id: 'k0000000-0000-4000-8000-000000000001', name: 'Giáo trình', icon: '📚', sort_order: 0 }, { ...base, id: 'k0000000-0000-4000-8000-000000000002', name: 'Chủ đề', icon: '🏷️', sort_order: 1 }],
  decks: [
    { ...base, id: did(1), name: 'Minna bài 1', icon: '📘', color: '#4A90D9', category_id: 'k0000000-0000-4000-8000-000000000001', description: 'Bài mở đầu' },
    { ...base, id: did(2), name: 'Minna bài 2', icon: '📗', color: '#4ECB85', category_id: 'k0000000-0000-4000-8000-000000000001', description: '' },
    { ...base, id: did(3), name: 'Đồ ăn', icon: '🍣', color: '#F0B429', category_id: 'k0000000-0000-4000-8000-000000000002', description: '' },
    { ...base, id: did(4), name: 'Lẻ tẻ', icon: '📁', color: '#9B7FE8', category_id: null, description: '' },
  ],
  deck_cards: [ // 食べる (đến hạn) vào Minna 1 + Đồ ăn · 水 vào Minna 2 · 日 vào Lẻ tẻ
    { ...base, deck_id: did(1), card_id: cid(1) }, { ...base, deck_id: did(3), card_id: cid(1) },
    { ...base, deck_id: did(2), card_id: cid(2) }, { ...base, deck_id: did(4), card_id: cid(3) } ],
};
export default async ({ session }) => {
  await session(DSEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=decks]'); await page.waitForSelector('#decksbody');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
    const names = async () => (await page.locator('.deckrow .t').allInnerTexts());
    check('hiện đủ 4 bộ, nhóm theo danh mục', (await names()).length === 4 && (await page.locator('.catgroup').count()) === 3);
    check('tóm tắt: 4 bộ · 3 thẻ · có số cần ôn', /4 bộ · 3 thẻ/.test(await page.locator('.page > p.small').innerText()) && (await page.locator('.page > p.small').innerText()).includes('cần ôn'));
    check('chip danh mục có số bộ', (await page.locator('[data-act=decksCat][data-v=""]').innerText()).includes('4'));
    // lọc theo danh mục
    await page.click('[data-act=decksCat][data-v="k0000000-0000-4000-8000-000000000001"]');
    check('lọc danh mục "Giáo trình" → 2 bộ', (await names()).join() === 'Minna bài 1,Minna bài 2');
    await page.click('[data-act=decksCat][data-v="_none"]');
    check('lọc "Chưa phân loại" → 1 bộ', (await names()).join() === 'Lẻ tẻ');
    await page.click('[data-act=decksCat][data-v=""]');
    // tìm
    await page.fill('#dq', 'ăn'); await page.waitForTimeout(300);
    check('tìm bộ theo tên', (await names()).join() === 'Đồ ăn');
    await page.fill('#dq', 'mở đầu'); await page.waitForTimeout(300);
    check('tìm bộ theo mô tả', (await names()).join() === 'Minna bài 1');
    await page.fill('#dq', 'zzz'); await page.waitForTimeout(300);
    check('không khớp → thông báo + Xóa lọc', (await page.locator('#decksbody').innerText()).includes('Không có bộ thẻ khớp'));
    await page.click('[data-act=decksClear]');
    check('Xóa lọc trả lại 4 bộ', (await names()).length === 4);
    // sắp xếp
    await page.selectOption('#dsort', 'due');
    check('sắp xếp theo cần ôn: bộ có thẻ đến hạn lên đầu (trong nhóm)', (await names())[0] === 'Minna bài 1');
    await page.selectOption('#dsort', 'name');
    // thu gọn danh mục
    await page.click('[data-act=catFold][data-id="k0000000-0000-4000-8000-000000000002"]');
    check('thu gọn 1 danh mục → còn 3 bộ hiện', (await names()).length === 3);
    await page.reload(); await page.waitForSelector('#view'); await page.click('#tabs [data-tab=decks]');
    check('trạng thái thu gọn được nhớ', (await names()).length === 3);
    await page.click('[data-act=catFold][data-id="k0000000-0000-4000-8000-000000000002"]');
    // ôn nhanh 1 bộ
    const go = await page.locator('.deckrow:has(.deckgo) .t').allInnerTexts();
    check('chỉ bộ có thẻ đến hạn mới có nút ▶ (Minna 1 + Đồ ăn chứa 食べる, Lẻ tẻ chứa 日; Minna 2 thì không)', go.length === 3 && !go.includes('Minna bài 2'), go.join());
    await page.locator('.deckrow', { hasText: 'Minna bài 1' }).locator('.deckgo').click(); await page.waitForSelector('.studybar');
    check('▶ mở phiên ôn', true); await page.keyboard.press('Escape'); await page.click('[data-close]').catch(() => {}); await page.waitForTimeout(300);
    // xem thẻ của danh mục
    await page.click('#tabs [data-tab=decks]'); await page.click('[data-act=catCards][data-id="k0000000-0000-4000-8000-000000000001"]'); await page.waitForSelector('#cardlist');
    const chars = (await page.locator('#cardlist .item').allInnerTexts()).join(' ');
    check('Xem thẻ của danh mục → thẻ trong Minna 1+2 (食べる, 水), không có 日', chars.includes('食べる') && chars.includes('水') && !chars.includes('日') && (await page.locator('.topbar h1').innerText()).includes('Giáo trình'));
    check('có liên kết bỏ lọc danh mục', (await page.locator('[data-act=clearCat]').count()) === 1);
    // bộ lọc trong Thư viện có Danh mục
    await page.click('[data-act=openFilter]'); await page.selectOption('#f-cat', 'k0000000-0000-4000-8000-000000000002'); await page.click('[data-act=fapply]'); await page.waitForTimeout(300);
    check('Bộ lọc → Danh mục "Chủ đề" chỉ còn 食べる', (await page.locator('#cardlist .item').count()) === 1 && (await page.locator('#cardlist').innerText()).includes('食べる'));
    await page.click('[data-act=clearCat]'); check('bỏ lọc → đủ 4 thẻ', (await page.locator('#cardlist .item').count()) === 4);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'decks', viewport: { width: 390, height: 800 } });
};
