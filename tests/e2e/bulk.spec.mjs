import { SEED } from './seed.mjs';
const U = '11111111-1111-4111-8111-111111111111';
const T = { id: 't1', user_id: U, title: '日記', jp: '今日は友達と映画を見に行きました。とても楽しかったです。\n夜は家で勉強しました。', vi: 'Hôm nay đi xem phim với bạn. Rất vui.\nTối học ở nhà.', note: null, glossary: '映画 = phim\n勉強 = học\n楽しい', jlpt_level: 'N4', version: 1, created_at: '2026-01-01T00:00:00Z' };
const sel = (page, word, idx = 0) => page.evaluate(([w, i]) => {
  const p = document.querySelectorAll('.tjp')[i], tn = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.includes(w));
  const r = document.createRange(), s = tn.textContent.indexOf(w); r.setStart(tn, s); r.setEnd(tn, s + w.length);
  const g = getSelection(); g.removeAllRanges(); g.addRange(r);
}, [word, idx]);
export default async ({ session }) => {
  const g = { id: 'g1', user_id: U, title: '〜に行く', meaning_vi: 'đi để', examples: '', version: 1, created_at: '2026-01-01T00:00:00Z' };
  await session({ ...SEED, translations: [T], grammar_points: [g] }, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=trans]'); await page.click('#translist .item'); await page.waitForSelector('.t2');
    // phạm vi ví dụ ngữ pháp
    await sel(page, '友達'); await page.waitForSelector('#selnote'); await page.click('[data-act=noteGrammar]'); await page.waitForSelector('#gx-scope');
    check('có lựa chọn phạm vi và mặc định là cả câu', (await page.locator('#gx-ex').innerText()) === '今日は友達と映画を見に行きました。');
    await page.click('[data-act=gxScope][data-v=par]');
    check('chọn "Cả đoạn" → ví dụ là cả đoạn, kèm bản dịch', (await page.locator('#gx-ex').innerText()) === '今日は友達と映画を見に行きました。とても楽しかったです。 | Hôm nay đi xem phim với bạn. Rất vui.');
    await page.click('[data-act=gramAddEx]'); await page.waitForTimeout(500);
    check('đã nối đoạn vào ví dụ của mẫu ngữ pháp', ((await db()).grammar_points[0].examples || '').startsWith('今日は友達と映画を見に行きました。とても楽しかったです。 | Hôm nay'));
    // thêm hàng loạt vào bộ thẻ
    await page.click('[data-act=glossBulk]'); await page.waitForSelector('#gb-list');
    check('danh sách 3 từ; từ chưa có nghĩa bị khóa', (await page.locator('#gb-list input').count()) === 3 && (await page.locator('#gb-list input:disabled').count()) === 1 && (await page.locator('#gb-go').innerText()) === 'Thêm 2 thẻ');
    await page.click('#gb-decks .chip'); await page.click('#gb-go'); await page.waitForSelector('#gb-list', { state: 'detached' }); await page.waitForTimeout(400);
    const d = await db(), c = d.cards.find(x => x.character === '映画');
    check('tạo 2 thẻ với nghĩa, câu ví dụ, nguồn', d.cards.filter(x => ['映画', '勉強'].includes(x.character)).length === 2 && c.meaning_vi === 'phim' && c.example_jp === '今日は友達と映画を見に行きました。' && c.source === '日記', JSON.stringify(c));
    check('2 thẻ nằm trong bộ thẻ đã chọn', d.deck_cards.filter(x => [...d.cards.filter(y => ['映画', '勉強'].includes(y.character))].some(y => y.id === x.card_id)).length === 2);
    await page.click('[data-act=glossBulk]'); await page.waitForSelector('#gb-list');
    check('mở lại: 2 từ báo đã có thẻ, nút chọn ít nhất 1 từ', (await page.locator('#gb-list input:disabled').count()) === 3 && (await page.locator('#gb-go').isDisabled()));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'ví dụ theo câu/đoạn + thêm hàng loạt vào bộ thẻ' });
};
