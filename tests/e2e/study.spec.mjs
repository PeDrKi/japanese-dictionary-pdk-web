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
    const c1 = d.cards.find(c => c.character === '食べる'), c3 = d.cards.find(c => c.character === '日'), c4 = d.cards.find(c => c.character === 'あ');
    check('thẻ học 5 lần, ôn thêm 1 → 6 lần, vẫn "đang học", lịch ôn dời ra xa', c1.status === 'learning' && c1.study_count === 6 && c1.srs_interval >= 2, JSON.stringify(c1));
    check('thẻ đã nhớ (25 lần) ôn thêm → 26 lần, vẫn "đã nhớ"', c3.status === 'known' && c3.study_count === 26);
    check('thẻ chưa học trả lời đúng lần đầu → 1, "đang học"', c4.status === 'learning' && c4.study_count === 1);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'flashcard' });

  // Biên: đúng +1 → 20 là "đã nhớ"
  const S19 = { ...SEED, cards: SEED.cards.map(c => c.character === '食べる' ? { ...c, study_count: 19 } : c) };
  await session(S19, async ({ page, check, db }) => {
    await page.waitForSelector('#view');
    await page.click('[data-act=startDue][data-mode=flash] >> nth=0'); await page.waitForSelector('.full');
    for (let i = 0; i < 3; i++) { await page.keyboard.press(' '); await page.waitForSelector('#yes'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
    await page.waitForTimeout(600);
    const d = await db(), c = d.cards.find(x => x.character === '食べる');
    check('19 + 1 lượt đúng = 20 → "đã nhớ"', c.study_count === 20 && c.status === 'known', JSON.stringify([c.study_count, c.status]));
  }, { name: 'ranh giới 20' });
  // Trả lời sai: −1, tụt trạng thái, không xuống dưới 0
  const SW = { ...SEED, cards: SEED.cards.map(c => c.character === '日' ? { ...c, study_count: 20 } : c) };
  await session(SW, async ({ page, check, db }) => {
    await page.waitForSelector('#view');
    await page.click('[data-act=startDue][data-mode=flash] >> nth=0'); await page.waitForSelector('.full');
    for (let i = 0; i < 3; i++) { await page.keyboard.press(' '); await page.waitForSelector('#yes'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250); }
    await page.waitForTimeout(600);
    const d = await db(), g = n => d.cards.find(x => x.character === n);
    check('trả lời sai: 20 → 19, tụt từ "đã nhớ" xuống "đang học"', g('日').study_count === 19 && g('日').status === 'learning', JSON.stringify([g('日').study_count, g('日').status]));
    check('trả lời sai: 5 → 4, vẫn "đang học"', g('食べる').study_count === 4 && g('食べる').status === 'learning');
    check('thẻ chưa học trả lời sai: giữ 0, vẫn "chưa học"', g('あ').study_count === 0 && g('あ').status === 'new');
  }, { name: 'trả lời sai' });

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
