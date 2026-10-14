import { SEED } from './seed.mjs';
const G = (n, o) => ({ id: `g0000000-0000-4000-8000-${String(n).padStart(12, '0')}`, user_id: '11111111-1111-4111-8111-111111111111', version: 1, created_at: `2026-02-0${n}T00:00:00Z`, updated_at: '2026-02-01T00:00:00Z', ...o });
const GSEED = { ...SEED, grammar_points: [
  G(1, { title: '〜てから', meaning_vi: 'Sau khi làm A thì làm B', structure: 'V-て + から', jlpt_level: 'N5', explanation: 'Nhấn mạnh thứ tự.', examples: '食べてから、寝ます。 | Ăn xong rồi ngủ.\nシャワーを浴びてから出かけます。' }),
  G(2, { title: '〜ながら', meaning_vi: 'Vừa… vừa…', structure: 'V-ます bỏ ます + ながら', jlpt_level: 'N4' }),
] };
export default async ({ session }) => {
  await session(GSEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=more]');
    check('Khác có mục Ngữ pháp, đếm đúng 2 mẫu', (await page.locator('[data-name=grammar]').innerText()).includes('2 mẫu'));
    await page.click('[data-name=grammar]'); await page.waitForSelector('#gramlist');
    check('trang Ngữ pháp liệt kê 2 mẫu', (await page.locator('#gramlist .item').count()) === 2);
    await page.fill('#gq', 'vừa'); await page.waitForTimeout(400);
    check('tìm theo nghĩa', (await page.locator('#gramlist .item').count()) === 1 && (await page.locator('#gramlist').innerText()).includes('ながら'));
    await page.fill('#gq', ''); await page.waitForTimeout(400);
    await page.click('[data-act=gramLevel][data-v=N5]');
    check('lọc N5', (await page.locator('#gramlist .item').count()) === 1);
    await page.click('[data-act=gramLevel][data-v=""]');
    await page.click('#gramlist .item >> text=てから'); await page.waitForSelector('.sheet');
    const t = await page.locator('.sheet').last().innerText();
    check('chi tiết: cấu tạo + giải thích + 2 ví dụ (dòng thiếu nghĩa vẫn hiện)', t.includes('V-て + から') && t.includes('Nhấn mạnh') && t.includes('Ăn xong rồi ngủ') && t.includes('シャワー'));
    await page.click('[data-act=editGrammar]'); await page.waitForSelector('#gf');
    await page.fill('#gf [name=meaning_vi]', 'Sau khi A thì B'); await page.keyboard.press('Control+Enter'); await page.waitForSelector('#gf', { state: 'detached' });
    check('sửa + Ctrl+Enter lưu', (await db()).grammar_points.find(g => g.title === '〜てから').meaning_vi === 'Sau khi A thì B');
    // thêm mới
    await page.click('.fab'); await page.waitForSelector('#gf');
    await page.click('#gf button[type=submit]');
    check('thiếu mẫu câu/nghĩa → báo lỗi, không lưu', (await (await db()).grammar_points.length) === 2);
    await page.fill('#gf [name=title]', '〜たことがある'); await page.fill('#gf [name=meaning_vi]', 'Đã từng'); await page.selectOption('#gf [name=jlpt_level]', 'N4');
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#gf', { state: 'detached' });
    const saved = (await db()).grammar_points.find(g => g.title === '〜たことがある');
    check('thêm mẫu mới', saved && saved.jlpt_level === 'N4' && saved.meaning_vi === 'Đã từng', JSON.stringify(saved));
    check('danh sách cập nhật (3 mẫu)', (await page.locator('#gramlist .item').count()) === 3);
    // xóa
    await page.click('#gramlist .item >> text=たことがある'); await page.waitForSelector('[data-act=delGrammar]');
    await page.click('[data-act=delGrammar]'); await page.click('#cf-ok'); await page.waitForTimeout(500);
    check('xóa mẫu', (await db()).grammar_points.length === 2 && (await page.locator('#gramlist .item').count()) === 2);
    // phím tắt g
    await page.click('[data-act=back]'); await page.click('#tabs [data-tab=today]');
    await page.keyboard.press('g'); await page.waitForSelector('#gramlist');
    check('phím g mở trang Ngữ pháp', true);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'grammar' });

  // Máy chủ chưa chạy schema v7: app vẫn dùng bình thường, trang Ngữ pháp báo cần nâng cấp
  await session({ ...SEED, oldSchema: true }, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    check('schema cũ: app vẫn vào được', (await page.locator('#tabs').count()) === 1);
    await page.click('#tabs [data-tab=more]'); await page.click('[data-name=grammar]'); await page.waitForSelector('.empty');
    check('báo cần chạy schema.sql bản 7, không có nút thêm', (await page.locator('.empty').innerText()).includes('schema.sql') && (await page.locator('.fab').count()) === 0);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'grammar-old', });
};
