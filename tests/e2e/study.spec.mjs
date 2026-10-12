import { SEED } from './seed.mjs';
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.click('[data-act=startDue][data-mode=flash] >> nth=0'); await page.waitForSelector('.full');
    check('mở phiên Flashcard', true);
    for (let i = 0; i < 3; i++) {                                        // 3 thẻ đến hạn: lật rồi chấm "đã nhớ"
      await page.keyboard.press(' '); await page.waitForSelector('#yes'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
    }
    await page.waitForTimeout(600);
    const d = await db();
    check('đã ghi 3 lượt ôn', d.study_sessions.length === 3, String(d.study_sessions.length));
    const c1 = d.cards.find(c => c.character === '食べる'), c4 = d.cards.find(c => c.character === 'あ');
    check('thẻ đang học trả lời đúng → "đã nhớ", lịch ôn dời ra xa', c1.status === 'known' && c1.srs_interval >= 2, JSON.stringify(c1));
    check('thẻ mới trả lời đúng → "đang học"', c4.status === 'learning');
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'flashcard' });

  // Cài đặt ôn tập được nhớ qua lần mở sau
  await session(SEED, async ({ page, check }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=study]');
    check('Ôn tập: có dòng tóm tắt, tùy chọn gập sẵn', (await page.locator('.sumcard').count()) === 1 && !(await page.evaluate(() => document.getElementById('sc-adv').open)));
    await page.click('[data-act=scSet][data-k=mode][data-v=quiz]'); await page.click('#sc-adv summary'); await page.click("[data-act=scLimit][data-v='10']");
    await page.reload(); await page.waitForSelector('#view'); await page.click('#tabs [data-tab=study]');
    const t = await page.locator('.sumcard').innerText();
    check('nhớ kiểu Quiz + 10 thẻ + mục tùy chỉnh đang mở sau khi tải lại', t.includes('Quiz') && t.includes('10 thẻ') && await page.evaluate(() => document.getElementById('sc-adv').open), t);
  }, { name: 'study-settings' });

  // Quiz: gõ phím 1-4 chọn đáp án
  await session(SEED, async ({ page, check, db }) => {
    await page.waitForSelector('#view'); await page.click('[data-act=startDue][data-mode=quiz] >> nth=0'); await page.waitForSelector('.opt');
    check('Quiz hiện 4 lựa chọn (hoặc ít hơn nếu ít thẻ)', (await page.locator('.opt').count()) >= 2);
    await page.keyboard.press('1'); await page.waitForTimeout(500);
    check('chọn đáp án bằng phím số ghi lại 1 lượt ôn', (await db()).study_sessions.length === 1);
  }, { name: 'quiz' });
};
