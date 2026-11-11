import { SEED } from './seed.mjs';
// Kho thẻ: cất / đưa ra / ẩn mọi nơi / giữ bộ thẻ + tiến độ / cảnh báo trùng / ôn tập / xóa kho
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('#cardlist');
    // 1) cất từng thẻ (水) bằng chi tiết thẻ, tạo kho ngay trong hộp chọn
    await page.click('#cardlist .item:has-text("水")'); await page.waitForSelector('[data-act=vaultOne]');
    await page.click('[data-act=vaultOne]'); await page.waitForSelector('#vp-new');
    await page.fill('#vp-new [name=name]', 'Đã thuộc'); await page.click('#vp-new [type=submit]'); await page.waitForTimeout(500);
    let d = await db(), v = d.vaults[0], c2 = d.cards.find(c => c.character === '水');
    check('tạo kho "Đã thuộc" và cất 水 vào đó', d.vaults.length === 1 && v.name === 'Đã thuộc' && c2.vault_id === v.id, JSON.stringify([d.vaults.length, c2.vault_id]));
    check('thư viện ẩn thẻ trong kho (còn 3 thẻ)', (await page.locator('#cardlist .item').count()) === 3 && !(await page.locator('#cardlist').innerText()).includes('水'));
    // 2) cất 食べる (thuộc bộ thẻ N5) → ẩn khỏi bộ thẻ + số thẻ đến hạn
    await page.click('#cardlist .item:has-text("食べる")'); await page.click('[data-act=vaultOne]'); await page.waitForSelector('[data-vid]');
    await page.click(`[data-vid="${v.id}"]`); await page.waitForTimeout(400);
    await page.click('#tabs [data-tab=decks]'); await page.waitForTimeout(200);
    check('bộ thẻ N5 không tính thẻ đang ở trong kho', /\b0\b/.test(await page.locator('#view .item:has-text("Từ vựng N5")').first().innerText()));
    await page.click('#tabs [data-tab=today]');
    check('Hôm nay: thẻ trong kho không tính đến hạn (còn 日 + あ = 2)', (await page.locator('.hero h2').innerText()).startsWith('2 thẻ'), await page.locator('.hero h2').innerText());
    // 3) tab Kho: xem, tìm kiếm, đưa ra
    await page.click('#tabs [data-tab=vault]'); await page.waitForSelector('[data-act=vaultOpen]');
    check('tab Kho liệt kê kho với số thẻ', (await page.locator('[data-act=vaultOpen]').innerText()).includes('2 thẻ'));
    await page.click('[data-act=vaultOpen]'); await page.waitForSelector('#vlist');
    check('trong kho thấy 2 thẻ', (await page.locator('#vlist .item').count()) === 2);
    await page.fill('#vq', 'nước'); check('tìm trong kho', (await page.locator('#vlist .item').count()) === 1);
    await page.fill('#vq', ''); await page.click('[data-act=vaultPick] >> nth=0'); await page.click('[data-act=vaultPick] >> nth=1');
    check('chọn 2 thẻ → nút đưa ra bật', (await page.locator('[data-act=vaultOut]').isEnabled()) && (await page.locator('.selbar').innerText()).includes('Đã chọn 2'));
    // trước khi đưa ra: thử trùng thẻ
    await page.click('#tabs [data-tab=cards]'); await page.click('.fab'); await page.waitForSelector('#cf');
    await page.fill('#cf [name=character]', '水'); await page.fill('#cf [name=meaning_vi]', 'nước'); await page.click('#cf [type=submit]');
    await page.waitForSelector('#cf-ok');
    check('thêm thẻ trùng thẻ trong kho → cảnh báo kèm tên kho', (await page.locator('.sheet h2').last().innerText()).includes('Đã thuộc'), await page.locator('.sheet h2').last().innerText());
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await page.evaluate(() => { document.querySelectorAll('.scrim').forEach(s => s.remove()); });
    // 4) đưa ra: giữ nguyên bộ thẻ + tiến độ
    await page.click('#tabs [data-tab=vault]'); await page.click('[data-act=vaultOpen]');
    await page.click('[data-act=vaultSelAll]'); await page.click('[data-act=vaultOut]'); await page.waitForTimeout(500);
    d = await db(); const c1 = d.cards.find(c => c.character === '食べる');
    check('đưa ra: vault_id về null, giữ trạng thái + số lần học + bộ thẻ', d.cards.every(c => !c.vault_id) && c1.study_count === 5 && c1.status === 'learning' && d.deck_cards.length === 1 && d.deck_cards[0].card_id === c1.id);
    await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('#cardlist');
    check('thư viện trở lại 4 thẻ', (await page.locator('#cardlist .item').count()) === 4);
    // 5) cất hàng loạt bằng chế độ chọn
    await page.click('[data-act=toggleSelect]'); await page.click('#cardlist .item:has-text("あ")'); await page.click('#cardlist .item:has-text("日")');
    await page.click('[data-act=bulkVault]'); await page.waitForSelector('[data-vid]'); await page.click(`[data-vid="${v.id}"]`); await page.waitForTimeout(500);
    d = await db();
    check('cất 2 thẻ cùng lúc', d.cards.filter(c => c.vault_id === v.id).length === 2 && (await page.locator('#cardlist .item').count()) === 2);
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'kho thẻ: cất / ẩn / đưa ra' });

  // Màn ôn tập: cất thẻ đang ôn mà không cần chấm đúng/sai
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.click('[data-act=startDue][data-mode=flash] >> nth=0'); await page.waitForSelector('.full');
    const word = async () => (await page.locator('#paper .ch').allInnerTexts()).join('').trim();
    const first = await word();
    await page.click('[data-vault]'); await page.waitForSelector('#vp-new');
    await page.fill('#vp-new [name=name]', 'Tạm gác'); await page.click('#vp-new [type=submit]'); await page.waitForTimeout(600);
    let d = await db(); const c = d.cards.find(x => x.character === first);
    check('cất ngay trong màn ôn: thẻ vào kho, chưa ghi lượt ôn nào', d.vaults.length === 1 && c.vault_id === d.vaults[0].id && d.study_sessions.length === 0, JSON.stringify([first, c.vault_id, d.study_sessions.length]));
    const second = await word();
    check('chuyển sang thẻ kế tiếp và thanh tiến độ trừ thẻ đã cất (còn 2 thẻ)', second !== first && (await page.locator('.studybar').innerText()).includes('/2'), await page.locator('.studybar').innerText());
    for (let i = 0; i < 2; i++) { await page.keyboard.press(' '); await page.waitForSelector('#yes'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
    await page.waitForTimeout(500); d = await db();
    check('ôn xong 2 thẻ còn lại; thẻ trong kho không xuất hiện lại', d.study_sessions.length === 2 && !d.study_sessions.some(s => s.card_id === c.id));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'kho thẻ: cất trong màn ôn' });

  // Xóa kho: thẻ ra khỏi kho; trùng tên bị chặn; schema cũ
  await session({ ...SEED, vaults: [{ id: 'v1', user_id: '11111111-1111-4111-8111-111111111111', name: 'Khó', icon: '🔥', sort_order: 0, version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
    cards: SEED.cards.map(c => c.character === '水' ? { ...c, vault_id: 'v1' } : c) }, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=vault]'); await page.click('[data-act=vaultNew]'); await page.fill('#vn [name=name]', 'khó'); await page.click('#vn [type=submit]'); await page.waitForTimeout(400);
    check('tạo kho trùng tên (không phân biệt hoa thường) bị chặn', (await db()).vaults.length === 1 && (await page.locator('.toast').last().innerText()).includes('Đã có kho'));
    await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelectorAll('.scrim').forEach(s => s.remove()));
    await page.click('[data-act=vaultOpen]'); await page.click('[data-act=vaultEdit]'); await page.click('[data-act=vaultDel]'); await page.waitForSelector('#cf-ok');
    check('xóa kho hỏi xác nhận, nêu số thẻ sẽ được đưa ra', (await page.locator('.sheet h2').last().innerText()).includes('1 thẻ'));
    await page.click('#cf-ok'); await page.waitForTimeout(600);
    const d = await db();
    check('xóa kho: kho mất, thẻ ra khỏi kho', d.vaults.length === 0 && d.cards.every(c => !c.vault_id));
    check('không lỗi JS ngoài lỗi trùng tên có chủ đích', errors.filter(e => !e.includes('Đã có kho tên')).length === 0, errors.join('|'));
  }, { name: 'kho thẻ: xóa kho' });

  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=decks]'); await page.waitForSelector('[data-act=editDeck]');
    check('trước khi chuyển: tab Bộ thẻ có bộ N5', (await page.locator('#view').innerText()).includes('Từ vựng N5'));
    await page.click('[data-act=editDeck]'); await page.waitForSelector('[data-act=dfStash]'); await page.click('[data-act=dfStash]');
    await page.waitForSelector('#vp-new'); await page.fill('#vp-new [name=name]', 'Cả bộ'); await page.click('#vp-new [type=submit]'); await page.waitForTimeout(700);
    let d = await db(); const v = d.vaults[0], dk = d.decks.find(x => x.vault_id);
    check('bộ thẻ chuyển vào kho: decks.vault_id + thẻ của bộ cùng vào kho, giữ liên kết bộ-thẻ', !!v && dk && dk.vault_id === v.id && d.deck_cards.length === 1 && d.cards.filter(c => c.vault_id === v.id).length === 1, JSON.stringify(d.decks.map(x => x.vault_id)));
    check('bộ thẻ biến khỏi tab Bộ thẻ', !(await page.locator('#view').innerText()).includes('Từ vựng N5'));
    await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('#cardlist');
    check('thẻ của bộ cũng ẩn khỏi thư viện (còn 3)', (await page.locator('#cardlist .item').count()) === 3);
    await page.click('#tabs [data-tab=vault]'); await page.waitForSelector('[data-act=vaultOpen]'); await page.click('[data-act=vaultOpen]'); await page.waitForSelector('#vdecks');
    check('trong Kho thấy bộ thẻ, không lặp thẻ lẻ', (await page.locator('#vdecks .item').count()) === 1 && (await page.locator('#vlist .item').count()) === 0, await page.locator('#vlist').innerText());
    await page.click('[data-act=vaultDeckOut]'); await page.waitForTimeout(700);
    d = await db();
    check('đưa bộ thẻ ra: bộ + thẻ trở lại', d.decks.every(x => !x.vault_id) && d.cards.every(c => !c.vault_id));
    await page.click('#tabs [data-tab=decks]');
    check('bộ N5 hiện lại trong tab Bộ thẻ', (await page.locator('#view').innerText()).includes('Từ vựng N5'));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'kho thẻ: chuyển cả bộ thẻ' });

  await session({ ...SEED, oldSchema: true }, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=vault]');
    check('máy chủ chưa nâng schema: tab Kho báo cần nâng cấp, app vẫn dùng được', (await page.locator('#view').innerText()).includes('schema.sql') && !(await page.$('[data-act=vaultNew]')));
    await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('#cardlist');
    check('thư viện vẫn đủ 4 thẻ', (await page.locator('#cardlist .item').count()) === 4);
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'kho thẻ: schema cũ' });
};
