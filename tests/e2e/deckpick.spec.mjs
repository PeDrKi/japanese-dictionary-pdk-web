import { SEED } from './seed.mjs';
const U = '11111111-1111-4111-8111-111111111111';
const base = { deleted_at: null, version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', user_id: U };
const did = n => `d1000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const decks = Array.from({ length: 45 }, (_, i) => ({ ...base, id: did(i + 1), name: `Lession_${i + 1}`, icon: '📚', color: '#4A90D9', category_id: null, description: '' }));
const DS = { ...SEED, decks, deck_cards: [] };
export default async ({ session }) => {
  await session(DS, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.click('.fab'); await page.waitForSelector('#cf');
    check('45 bộ thẻ KHÔNG còn bày ra 45 chip trong form (chỉ 1 nút chọn)', (await page.locator('#cf-decks .chip').count()) === 0 && (await page.locator('[data-act=cfDeckPick]').innerText()).includes('45'));
    await page.fill('#cf [name=character]', '雨'); await page.fill('#cf [name=meaning_vi]', 'mưa');
    await page.click('[data-act=cfDeckPick]'); await page.waitForSelector('#dp-q');
    await page.waitForTimeout(700); if (process.env.SHOT3) await page.screenshot({ path: process.env.SHOT3 });
    check('hộp chọn liệt kê 45 bộ', (await page.locator('#dp-list .dp').count()) === 45);
    await page.fill('#dp-q', 'lession_2'); 
    const n2 = await page.locator('#dp-list .dp').count();
    check('tìm "lession_2" → còn Lession_2, 20–29 (11 bộ)', n2 === 11, String(n2));
    await page.keyboard.press('Enter');
    check('Enter chọn bộ đầu tiên khớp (Lession_2) + hiện số đã chọn', (await page.locator('#dp-n').innerText()).includes('1'));
    await page.fill('#dp-q', 'lession_30'); await page.locator('#dp-list .dp').first().click();
    check('bấm chọn thêm Lession_30 → đã chọn 2', (await page.locator('#dp-n').innerText()).includes('2'));
    await page.click('.scrim:last-child >> text=Xong');
    await page.waitForSelector('#dp-q', { state: 'detached' });
    const chips = await page.locator('#cf-decks .chip.on').allInnerTexts();
    check('form hiện đúng 2 chip đã chọn, có ✕ để bỏ', chips.length === 2 && chips.every(c => c.includes('✕')), chips.join('|'));
    await page.locator('#cf-decks .chip.on', { hasText: 'Lession_30' }).click();
    check('bấm chip để bỏ chọn', (await page.locator('#cf-decks .chip.on').count()) === 1);
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    const dc = (await db()).deck_cards.filter(x => !x.deleted_at);
    check('lưu thẻ vào đúng 1 bộ (Lession_2)', dc.length === 1 && dc[0].deck_id === did(2), JSON.stringify(dc));
    // thẻ mới kế tiếp: gợi ý bộ vừa dùng
    await page.click('.fab'); await page.waitForSelector('#cf');
    const rec = await page.locator('#cf-decks .chip.dashed').allInnerTexts();
    check('thẻ mới: gợi ý bộ dùng gần đây (Lession_2) chỉ 1 chạm', rec.length === 1 && rec[0].includes('Lession_2'), rec.join('|'));
    await page.locator('#cf-decks .chip.dashed').click();
    check('chạm gợi ý → thành đã chọn', (await page.locator('#cf-decks .chip.on').count()) === 1 && (await page.locator('#cf-decks .chip.dashed').count()) === 0);
    await page.locator('#cf [data-close]').click();
    // sửa thẻ: hiện bộ hiện có
    await page.click('#cardlist .item >> text=mưa'); await page.click('[data-act=editCard]'); await page.waitForSelector('#cf');
    check('sửa thẻ: hiện bộ hiện có là chip đã chọn, không có gợi ý', (await page.locator('#cf-decks .chip.on').count()) === 1 && (await page.locator('#cf-decks .chip.dashed').count()) === 0);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'deckpick' });
};
