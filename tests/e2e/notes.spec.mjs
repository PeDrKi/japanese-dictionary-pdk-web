import { SEED } from './seed.mjs';
const U = '11111111-1111-4111-8111-111111111111';
const T = { id: 't1', user_id: U, title: '日記', jp: '今日は友達と映画を見に行きました。\nその映画はとても面白かったです。', vi: 'Hôm nay tôi đi xem phim với bạn.\nBộ phim đó rất thú vị.', note: null, jlpt_level: 'N4', version: 1, created_at: '2026-01-01T00:00:00Z' };
const G = { id: 'g0000000-0000-4000-8000-000000000001', user_id: U, title: '〜と', meaning_vi: 'cùng với', structure: 'N + と', explanation: null, examples: '母と買い物に行きます。 | Tôi đi mua sắm với mẹ.', jlpt_level: 'N5', version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
const sel = (page, word, idx = 0) => page.evaluate(([w, i]) => {
  const p = document.querySelectorAll('.tjp')[i], tn = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.includes(w));
  const r = document.createRange(), s = tn.textContent.indexOf(w); r.setStart(tn, s); r.setEnd(tn, s + w.length);
  const g = getSelection(); g.removeAllRanges(); g.addRange(r);
}, [word, idx]);
export default async ({ session }) => {
  await session({ ...SEED, translations: [T], grammar_points: [G] }, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=trans]'); await page.click('#translist .item'); await page.waitForSelector('.tpair');
    check('chưa bôi đen → không có thanh ghi nhanh', (await page.locator('#selnote').count()) === 0);
    await page.evaluate(() => { const p = document.querySelector('.tvi'), r = document.createRange(); r.selectNodeContents(p); getSelection().removeAllRanges(); getSelection().addRange(r); }); await page.waitForTimeout(400);
    check('bôi đen bản dịch tiếng Việt → không hiện thanh', (await page.locator('#selnote').count()) === 0);
    // từ vựng
    await sel(page, '友達'); await page.waitForSelector('#selnote');
    check('bôi đen 友達 → hiện thanh với 2 nút', (await page.locator('#selnote button').count()) === 2);
    await page.click('[data-act=noteVocab]'); await page.waitForSelector('#cf');
    const v = n => page.inputValue(`#cf [name=${n}]`);
    check('form thẻ mở sẵn: chữ, câu ví dụ, bản dịch câu, nguồn', (await v('character')) === '友達' && (await v('example_jp')) === '今日は友達と映画を見に行きました。' && (await v('example_vi')) === 'Hôm nay tôi đi xem phim với bạn.' && (await v('source')) === '日記');
    await page.waitForTimeout(400);
    check('con trỏ nhảy tới ô nghĩa tiếng Việt', await page.evaluate(() => document.activeElement && document.activeElement.name === 'meaning_vi'));
    await page.fill('#cf [name=meaning_vi]', 'bạn bè'); await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    let d = await db(), c = d.cards.find(x => x.character === '友達');
    check('đã lưu thành thẻ từ vựng (kèm ví dụ + nguồn)', c && c.type === 'vocab' && c.meaning_vi === 'bạn bè' && c.example_jp.includes('映画') && c.source === '日記', JSON.stringify(c));
    // trùng
    await sel(page, '友達'); await page.waitForSelector('#selnote'); await page.click('[data-act=noteVocab]'); await page.waitForTimeout(500);
    check('từ đã có → báo và không tạo thẻ trùng', (await db()).cards.filter(x => x.character === '友達').length === 1 && (await page.locator('#cf').count()) === 0);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    // ví dụ ngữ pháp: thêm vào mẫu có sẵn
    await sel(page, 'と', 0); await page.waitForSelector('#selnote'); await page.click('[data-act=noteGrammar]'); await page.waitForSelector('#gx-list');
    check('hộp chọn mẫu ngữ pháp hiện câu ví dụ + danh sách', (await page.locator('.sheet').last().innerText()).includes('今日は友達と映画') && (await page.locator('#gx-list .item').count()) === 1);
    await page.click('[data-act=gramAddEx]'); await page.waitForTimeout(600);
    const g = (await db()).grammar_points[0];
    check('ví dụ được nối vào mẫu 〜と (giữ ví dụ cũ, kèm bản dịch)', g.examples === '母と買い物に行きます。 | Tôi đi mua sắm với mẹ.\n今日は友達と映画を見に行きました。 | Hôm nay tôi đi xem phim với bạn.', JSON.stringify(g.examples));
    await sel(page, 'と', 0); await page.waitForSelector('#selnote'); await page.click('[data-act=noteGrammar]'); await page.waitForSelector('#gx-list'); await page.click('[data-act=gramAddEx]'); await page.waitForTimeout(400);
    check('thêm lại cùng ví dụ → không nhân đôi', (await db()).grammar_points[0].examples.split('\n').length === 2);
    // tạo mẫu mới
    await sel(page, 'とても面白かった', 1); await page.waitForSelector('#selnote'); await page.click('[data-act=noteGrammar]'); await page.waitForSelector('[data-act=gramNewFromEx]'); await page.click('[data-act=gramNewFromEx]'); await page.waitForSelector('#gf');
    check('tạo mẫu mới: ô ví dụ đã điền sẵn đoạn bôi đen', (await page.inputValue('#gf [name=examples]')).startsWith('とても面白かった'));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'ghi nhanh từ mới' });
};
