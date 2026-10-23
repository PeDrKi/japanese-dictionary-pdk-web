import { SEED } from './seed.mjs';
const U = '11111111-1111-4111-8111-111111111111';
const T = { id: 't1', user_id: U, title: '日記', jp: '今日は友達と映画を見に行きました。\nその映画はとても面白かったです。', vi: 'Hôm nay tôi đi xem phim với bạn.\nBộ phim đó rất thú vị.', note: null, glossary: null, jlpt_level: 'N4', version: 1, created_at: '2026-01-01T00:00:00Z' };
const sel = (page, word, idx = 0) => page.evaluate(([w, i]) => {
  const p = document.querySelectorAll('.tjp')[i], tn = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.includes(w));
  const r = document.createRange(), s = tn.textContent.indexOf(w); r.setStart(tn, s); r.setEnd(tn, s + w.length);
  const g = getSelection(); g.removeAllRanges(); g.addRange(r);
}, [word, idx]);
export default async ({ session }) => {
  await session({ ...SEED, translations: [T] }, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=trans]'); await page.click('#translist .item'); await page.waitForSelector('.t2');
    const L = await page.locator('.tpassage').boundingBox(), R = await page.locator('.tside').boundingBox();
    check('màn hình rộng: bài đọc bên trái, cột từ vựng bên phải (cạnh nhau)', R.x > L.x + L.width - 5 && Math.abs(R.y - L.y) < 40, JSON.stringify([L, R]));
    check('cột phải có tab Từ vựng / Bản dịch; chưa có từ → gợi ý', (await page.locator('.tside .chip').count()) === 2 && (await page.locator('.tside').innerText()).includes('Chưa có từ vựng'));
    // thêm từ bằng cách bôi đen
    await sel(page, '友達'); await page.waitForSelector('#selnote');
    check('thanh ghi nhanh có 3 nút', (await page.locator('#selnote button').count()) === 3);
    await page.click('[data-act=noteGloss]'); await page.waitForSelector('#glf');
    check('form từ vựng điền sẵn từ đã bôi đen, con trỏ ở ô nghĩa', (await page.inputValue('#glf [name=term]')) === '友達' && await page.evaluate(() => document.activeElement.name === 'meaning'));
    await page.fill('#glf [name=meaning]', 'bạn bè'); await page.keyboard.press('Control+Enter'); await page.waitForSelector('#glf', { state: 'detached' }); await page.waitForTimeout(300);
    check('lưu vào cột glossary dạng "từ = nghĩa"', (await db()).translations[0].glossary === '友達 = bạn bè', JSON.stringify((await db()).translations[0].glossary));
    check('cột phải hiện "友達 = bạn bè" và bài đọc gạch chân 友達', (await page.locator('.gl-item').first().innerText()).includes('友達') && (await page.locator('.gl-item').first().innerText()).includes('bạn bè') && (await page.locator('.tpassage mark.gl').allInnerTexts()).join() === '友達');
    // thêm bằng nút + Thêm từ
    await page.click('[data-act=glossAdd]'); await page.waitForSelector('#glf'); await page.fill('#glf [name=term]', '映画'); await page.fill('#glf [name=meaning]', 'phim'); await page.click('#glf button.primary'); await page.waitForSelector('#glf', { state: 'detached' }); await page.waitForTimeout(300);
    check('thêm tay từ thứ 2; cả 2 từ được gạch chân (3 chỗ: 友達, 映画 ×2)', (await db()).translations[0].glossary === '友達 = bạn bè\n映画 = phim' && (await page.locator('.tpassage mark.gl').count()) === 3);
    // sửa
    await page.click('.gl-item >> nth=1'); await page.waitForSelector('#glf'); await page.fill('#glf [name=meaning]', 'bộ phim'); await page.click('#glf button.primary'); await page.waitForSelector('#glf', { state: 'detached' }); await page.waitForTimeout(300);
    check('sửa nghĩa 1 từ', (await db()).translations[0].glossary === '友達 = bạn bè\n映画 = bộ phim');
    // → thẻ
    await page.click('.gl-item >> nth=0'); await page.waitForSelector('#glf'); await page.click('[data-act=glossToCard]'); await page.waitForSelector('#cf');
    check('"Lưu thành thẻ từ vựng": thẻ điền sẵn chữ, nghĩa, câu ví dụ, nguồn', (await page.inputValue('#cf [name=character]')) === '友達' && (await page.inputValue('#cf [name=meaning_vi]')) === 'bạn bè' && (await page.inputValue('#cf [name=example_jp]')).includes('映画を見に') && (await page.inputValue('#cf [name=source]')) === '日記');
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    check('đã tạo thẻ 友達', (await db()).cards.some(c => c.character === '友達' && c.meaning_vi === 'bạn bè'));
    // xóa
    await page.click('.gl-item >> nth=0'); await page.waitForSelector('#glf'); await page.click('[data-act=glossDel]'); await page.waitForSelector('#cf-ok'); await page.click('#cf-ok'); await page.waitForTimeout(400);
    check('xóa 1 từ khỏi từ vựng', (await db()).translations[0].glossary === '映画 = bộ phim' && (await page.locator('.gl-item').count()) === 1);
    // tab bản dịch
    await page.click('[data-act=transSide][data-v=vi]');
    check('tab Bản dịch hiện 2 đoạn tiếng Việt', (await page.locator('.tvi2').count()) === 2 && (await page.locator('.tside').innerText()).includes('Bộ phim đó'));
    // sửa từ form bài
    await page.click('[data-act=transEdit]'); await page.waitForSelector('#tf');
    check('form sửa bài có ô từ vựng điền sẵn', (await page.inputValue('#tf [name=glossary]')) === '映画 = bộ phim');
    await page.fill('#tf [name=glossary]', '映画 = phim\n面白い = thú vị'); await page.click('#tf button[type=submit]'); await page.waitForSelector('#tf', { state: 'detached' });
    await page.waitForTimeout(300);
    check('lưu từ vựng qua form bài', (await db()).translations[0].glossary === '映画 = phim\n面白い = thú vị');
    // các chế độ khác vẫn gạch chân
    await page.click('[data-act=transMode][data-v=pair]'); await page.waitForSelector('.tpair');
    check('chế độ Đối chiếu vẫn gạch chân từ vựng', (await page.locator('.tpair mark.gl').count()) >= 2);
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'từ vựng bản dịch' });
  await session({ ...SEED, translations: [T] }, async ({ page, check }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=more]'); await page.click('.item[data-name=trans]'); await page.click('#translist .item'); await page.waitForSelector('.t2');
    check('điện thoại: bài đọc và cột từ vựng xếp dọc, không tràn ngang', await page.evaluate(() => { const a = document.querySelector('.tpassage').getBoundingClientRect(), b = document.querySelector('.tside').getBoundingClientRect(); return b.top >= a.bottom - 1 && document.documentElement.scrollWidth <= innerWidth + 1; }));
  }, { name: 'bản dịch hai bên – điện thoại', viewport: { width: 390, height: 800 } });
};
