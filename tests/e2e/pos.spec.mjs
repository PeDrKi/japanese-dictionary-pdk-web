import { SEED } from './seed.mjs';
// Từ loại 2 cấp: form thẻ (loại → loại con), bộ lọc, cấu hình ôn tập, hiển thị trong chi tiết thẻ
export default async ({ session }) => {
  const mk = (n, o) => ({ ...SEED.cards[0], id: `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`, type: 'vocab', is_favorite: false, status: 'new', study_count: 0, srs_due_date: null, jlpt_level: null, romaji: '', pos: null, ...o });
  const cards = [mk(31, { character: '飲む', reading_kana: 'のむ', meaning_vi: 'uống', pos: 'verb1' }), mk(32, { character: '食べる', reading_kana: 'たべる', meaning_vi: 'ăn', pos: 'verb2' }), mk(33, { character: '来る', reading_kana: 'くる', meaning_vi: 'đến', pos: 'verb3' }),
    mk(34, { character: '行く', reading_kana: 'いく', meaning_vi: 'đi', pos: 'verb' }), mk(35, { character: '高い', reading_kana: 'たかい', meaning_vi: 'cao', pos: 'adj_i' }), mk(36, { character: '静か', reading_kana: 'しずか', meaning_vi: 'yên tĩnh', pos: 'adj_na' }), mk(37, { character: '本', reading_kana: 'ほん', meaning_vi: 'sách', pos: 'noun' })];
  await session({ ...SEED, cards }, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('[data-act=openFilter]');
    const shown = async () => (await page.$$eval('#view .item .big', els => els.map(e => e.textContent.trim()))).filter(t => ['飲む', '食べる', '来る', '行く', '高い', '静か', '本'].includes(t)).sort();
    // ── Bộ lọc 2 cấp ──
    await page.click('[data-act=openFilter]'); await page.waitForSelector('#posbox');
    check('chưa chọn cha → chưa có hàng con', (await page.locator('#posbox .pos-kids').count()) === 0);
    await page.click('#posbox [data-v="verb*"]');
    check('chọn Động từ → hiện hàng con: Tất cả / Chưa rõ nhóm / Nhóm 1-3', (await page.locator('#posbox .pos-kids .chip').allInnerTexts()).join('|') === 'Tất cả động từ|Chưa rõ nhóm|Nhóm 1|Nhóm 2|Nhóm 3');
    await page.click('[data-act=fapply]'); await page.waitForTimeout(150);
    check('lọc "Động từ" → đủ 4 động từ (mọi nhóm), không có tính từ / danh từ', JSON.stringify(await shown()) === JSON.stringify(['来る', '行く', '飲む', '食べる'].sort()), JSON.stringify(await shown()));
    await page.click('[data-act=openFilter]'); await page.waitForSelector('#posbox .pos-kids');
    check('mở lại bộ lọc: "Động từ" đang được chọn, hàng con vẫn hiện', (await page.locator('#posbox [data-v="verb*"].on').count()) === 2 && (await page.locator('#posbox .pos-kids [data-v="verb*"].on').count()) === 1);
    await page.click('#posbox .pos-kids [data-v="verb2"]'); await page.click('[data-act=fapply]'); await page.waitForTimeout(150);
    check('lọc Động từ › Nhóm 2 → chỉ 食べる', JSON.stringify(await shown()) === JSON.stringify(['食べる']));
    await page.click('[data-act=openFilter]'); await page.waitForSelector('#posbox'); await page.click('#posbox [data-v="adj*"]');
    check('chọn Tính từ → hàng con: Tất cả / Đuôi い / Đuôi な', (await page.locator('#posbox .pos-kids .chip').allInnerTexts()).join('|') === 'Tất cả tính từ|Đuôi い|Đuôi な');
    await page.click('[data-act=fapply]'); await page.waitForTimeout(150);
    check('lọc "Tính từ" → 高い + 静か', JSON.stringify(await shown()) === JSON.stringify(['静か', '高い'].sort()));
    await page.click('[data-act=openFilter]'); await page.waitForSelector('#posbox'); await page.click('#posbox [data-v="adj_na"]'); await page.click('[data-act=fapply]'); await page.waitForTimeout(150);
    check('lọc Tính từ › Đuôi な → chỉ 静か', JSON.stringify(await shown()) === JSON.stringify(['静か']));
    await page.click('[data-act=openFilter]'); await page.waitForSelector('#posbox'); await page.click('#posbox [data-v="noun"]');
    check('chọn Danh từ (không có con) → không hiện hàng con', (await page.locator('#posbox .pos-kids').count()) === 0);
    await page.click('[data-act=fclear]'); await page.waitForTimeout(150);
    check('Xóa lọc → thấy lại đủ 7 thẻ', (await shown()).length === 7);

    // ── Chi tiết thẻ hiện đường dẫn ──
    await page.locator('#view .item', { hasText: '飲む' }).first().click(); await page.waitForSelector('.sheet');
    check('chi tiết hiện "Động từ › Nhóm 1"', (await page.locator('.sheet').innerText()).includes('Động từ › Nhóm 1'));
    await page.keyboard.press('Escape'); await page.evaluate(() => layers[layers.length - 1]?.close()); await page.waitForTimeout(100);
    await page.locator('#view .item', { hasText: '行く' }).first().click(); await page.waitForSelector('.sheet');
    check('verb (chưa rõ nhóm) hiện "Động từ"', /Từ loại\s*\n?\s*Động từ\s*(\n|$)/.test(await page.locator('.sheet').innerText()) || !(await page.locator('.sheet').innerText()).includes('Nhóm'));
    await page.keyboard.press('Escape'); await page.evaluate(() => layers[layers.length - 1]?.close()); await page.waitForTimeout(100);

    // ── Form thẻ 2 cấp ──
    await page.click('.fab'); await page.waitForSelector('#cf'); await page.click('#cf-advs');
    const kidOpts = async () => (await page.locator('#pos-kid option').allInnerTexts()).join('|');
    check('form: ban đầu chưa chọn, ô con ẩn', (await page.inputValue('#cf [name=pos]')) === '' && !(await page.locator('#pos-kid').isVisible()));
    await page.fill('#cf [name=character]', '走る'); await page.fill('#cf [name=meaning_vi]', 'chạy');
    await page.selectOption('#pos-par', 'verb');
    check('chọn Động từ → ô con hiện, mặc định "Chưa rõ nhóm" (verb)', (await page.locator('#pos-kid').isVisible()) && (await kidOpts()) === 'Chưa rõ nhóm|Nhóm 1|Nhóm 2|Nhóm 3' && (await page.inputValue('#cf [name=pos]')) === 'verb');
    await page.selectOption('#pos-kid', 'verb1');
    check('chọn Nhóm 1 → pos = verb1', (await page.inputValue('#cf [name=pos]')) === 'verb1');
    await page.selectOption('#pos-par', 'adj');
    check('đổi sang Tính từ → pos rỗng đến khi chọn đuôi, có gợi ý', (await page.inputValue('#cf [name=pos]')) === '' && (await kidOpts()) === '— chọn đuôi —|Đuôi い|Đuôi な' && await page.locator('#pos-hint').isVisible());
    await page.selectOption('#pos-kid', 'adj_na');
    check('chọn Đuôi な → pos = adj_na, gợi ý ẩn', (await page.inputValue('#cf [name=pos]')) === 'adj_na' && !(await page.locator('#pos-hint').isVisible()));
    await page.selectOption('#pos-par', 'noun');
    check('đổi sang Danh từ (không có con) → pos = noun, ô con ẩn', (await page.inputValue('#cf [name=pos]')) === 'noun' && !(await page.locator('#pos-kid').isVisible()));
    await page.selectOption('#pos-par', 'verb'); await page.selectOption('#pos-kid', 'verb1');
    await page.click('#cf button.primary'); await page.waitForSelector('#cf', { state: 'detached' });
    const d = await db(); const c = d.cards.find(x => x.character === '走る');
    check('lưu thẻ: pos = verb1', c && c.pos === 'verb1', JSON.stringify(c?.pos));
    // sửa thẻ: mở lại thấy đúng cha + con
    await page.locator('#view .item', { hasText: '走る' }).first().click(); await page.waitForSelector('.sheet'); await page.click('[data-act=editCard]'); await page.waitForSelector('#cf'); await page.click('#cf-advs').catch(() => {});
    check('mở sửa: cha = Động từ, con = Nhóm 1', (await page.inputValue('#pos-par')) === 'verb' && (await page.inputValue('#pos-kid')) === 'verb1');
    await page.keyboard.press('Escape'); await page.evaluate(() => layers[layers.length - 1]?.close());

    // ── Cấu hình ôn tập ──
    await page.click('#tabs [data-tab=study]'); await page.waitForSelector('#sc-adv'); await page.click('#sc-adv summary');
    await page.click('[data-act=scSet][data-k=pos][data-v="adj*"]');
    check('ôn tập: chọn Tính từ → hàng con hiện Đuôi い / な', (await page.locator('.pos-kids .chip').allInnerTexts()).join('|') === 'Tất cả tính từ|Đuôi い|Đuôi な');
    await page.click('.pos-kids [data-v="adj_i"]');
    check('ôn tập: chọn Đuôi い → nhóm thẻ để ôn chỉ còn 高い', (await page.evaluate(() => studyPool().map(c => c.character).join())) === '高い');
    await page.click('[data-act=scSet][data-k=pos][data-v="verb*"]');
    check('ôn tập: Động từ (mọi nhóm) → 5 thẻ (4 có sẵn + 走る vừa tạo)', (await page.evaluate(() => studyPool().length)) === 5);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'từ loại 2 cấp' });
};
