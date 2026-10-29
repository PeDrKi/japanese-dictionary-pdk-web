import { SEED } from './seed.mjs';
// Hiệu ứng GSAP trong app (bật chuyển động): kết thúc phải trả giao diện về trạng thái sạch, không để lại style thừa, không trùng id, không lỗi JS
const dirty = page => page.evaluate(() => [...document.querySelectorAll('#view *, .sheet, .scrim, .paper, .toast')].filter(e => /opacity: 0|transform: (?!none)/.test(e.getAttribute('style') || '') && !e.closest('#tabs') && !e.matches('.toast')).map(e => e.tagName + '.' + e.className).slice(0, 5));
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    check('app có GSAP và đang bật hiệu ứng', await page.evaluate(() => !!window.gsap && FX.live()));
    await page.waitForTimeout(1500);
    check('màn Hôm nay: sau hiệu ứng không còn style thừa', (await dirty(page)).length === 0, (await dirty(page)).join('|'));
    check('số đếm lên về đúng giá trị (thẻ cần ôn)', await page.evaluate(() => { const b = document.querySelector('.stamp b'); return !b || b.textContent.trim() === String(dueCount()); }));
    // chuyển tab
    for (const t of ['cards', 'decks', 'today']) { await page.click(`#tabs [data-tab=${t}]`); await page.waitForTimeout(150); }
    await page.waitForTimeout(1200);
    check('chuyển tab liên tục → cuối cùng nội dung hiện đủ, sạch', (await dirty(page)).length === 0 && (await page.locator('#view .page').count()) === 1, (await dirty(page)).join('|'));
    // thống kê: số đếm + thanh
    await page.click('#tabs [data-tab=more]'); await page.click('.item[data-name=stats]'); await page.waitForTimeout(1600);
    const nums = await page.$$eval('.count', els => els.map(e => e.textContent.trim()));
    const expect = await page.evaluate(() => [String(liveCards().length), String(liveCards().filter(c => c.is_favorite).length), String(S.sessTotal), (S.sessTotal ? Math.round(S.sessCorrect / S.sessTotal * 100) : 0) + '%']);
    check('Thống kê: 4 số đếm xong đúng giá trị', JSON.stringify(nums) === JSON.stringify(expect), JSON.stringify([nums, expect]));
    check('Thống kê: thanh/biểu đồ không còn transform thừa', (await page.evaluate(() => [...document.querySelectorAll('.bars i')].filter(i => /scale/.test(i.getAttribute('style') || '')).length)) === 0);
    // hộp thoại: mở / đóng, không trùng id
    await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('.fab'); await page.click('.fab'); await page.waitForSelector('#cf'); await page.waitForTimeout(600);
    check('mở form: hộp thoại hiện đủ (opacity 1)', (await page.evaluate(() => { const s = document.querySelector('.sheet'); return s && getComputedStyle(s).opacity === '1' && !/opacity: 0/.test(s.getAttribute('style') || ''); })));
    await page.keyboard.press('Escape'); await page.evaluate(() => layers[layers.length - 1]?.close()); await page.waitForTimeout(60);
    check('đóng: id không bị trùng khi có bản sao mờ dần', (await page.locator('#cf').count()) === 0);
    await page.waitForTimeout(700);
    check('bản sao mờ dần được dọn hết', (await page.locator('.scrim').count()) === 0);
    // toast
    await page.evaluate(() => toast('Thử toast')); await page.waitForSelector('.toast'); await page.waitForTimeout(2900);
    check('toast tự mất', (await page.locator('.toast').count()) === 0);
    // ôn tập: lật, chấm, kết quả
    await page.click('#tabs [data-tab=today]'); await page.waitForTimeout(500);
    await page.click('[data-act=startDue][data-mode=flash] >> nth=0'); await page.waitForSelector('.full'); await page.waitForSelector('#paper');
    for (let i = 0; i < 3; i++) { await page.keyboard.press(' '); await page.waitForSelector('#yes'); await page.waitForTimeout(650);
      if (i === 0) check('thẻ lật xong → không còn transform thừa', (await page.evaluate(() => /rotate|transform: (?!none)/.test(document.querySelector('#paper').getAttribute('style') || ''))) === false);
      await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500); }
    await page.waitForSelector('.result'); await page.waitForTimeout(1400);
    check('kết quả: điểm đếm xong = 100%', (await page.locator('.score').innerText()).trim() === '100%');
    check('ghi đủ 3 lượt ôn', (await db()).study_sessions.length === 3);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'hiệu ứng GSAP trong app', motion: true });

  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=more]'); await page.click('.item[data-name=stats]');
    check('giảm chuyển động: không chạy hiệu ứng, số hiện ngay', !(await page.evaluate(() => FX.live())) && (await page.locator('.count').first().innerText()).trim() === String(await page.evaluate(() => liveCards().length)));
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'giảm chuyển động' });

  // Công tắc hiệu ứng: Khác → Hiệu ứng chuyển động (Theo hệ thống → Tắt → Bật)
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=more]'); await page.waitForSelector('#motionstate');
    check('mặc định: Theo hệ thống (máy test xin giảm chuyển động → đang tĩnh)', (await page.locator('#motionstate').innerText()) === 'Theo hệ thống' && !(await page.evaluate(() => FX.live())));
    await page.click('[data-act=motion]');
    check('bấm lần 1 → Tắt (tĩnh): FX tắt, CSS tắt cả hoạt ảnh', (await page.locator('#motionstate').innerText()) === 'Tắt (tĩnh)' && !(await page.evaluate(() => FX.live())) && (await page.evaluate(() => document.documentElement.dataset.motion)) === 'off' && (await page.evaluate(() => getComputedStyle(document.querySelector('#view .page > *')).animationName)) === 'none');
    await page.click('#tabs [data-tab=today]'); await page.waitForTimeout(100);
    check('tắt: chuyển tab hiện ngay, không có style hoạt ảnh nào', (await page.evaluate(() => [...document.querySelectorAll('#view .page > *')].every(e => !/opacity|transform/.test(e.getAttribute('style') || '')))));
    await page.reload(); await page.waitForSelector('#view');
    check('tuỳ chọn được nhớ sau khi tải lại', (await page.evaluate(() => JSON.parse(localStorage.getItem('jp_motion')))) === 'off' && !(await page.evaluate(() => FX.live())));
    await page.click('[data-act=startDue][data-mode=flash] >> nth=0'); await page.waitForSelector('#paper'); await page.keyboard.press(' '); await page.waitForSelector('#yes');
    check('tắt: ôn tập vẫn dùng bình thường (lật thẻ, chấm)', (await page.evaluate(() => /rotate/.test(document.querySelector('#paper').getAttribute('style') || ''))) === false);
    await page.keyboard.press('Escape'); await page.evaluate(() => layers[layers.length - 1]?.close());
    await page.click('#tabs [data-tab=more]'); await page.click('[data-act=motion]');
    check('bấm lần 2 → Bật: bật dù hệ thống xin giảm chuyển động', (await page.locator('#motionstate').innerText()) === 'Bật' && await page.evaluate(() => FX.live()));
    await page.click('[data-act=motion]');
    check('bấm lần 3 → về Theo hệ thống (hệ thống xin giảm → tĩnh)', (await page.locator('#motionstate').innerText()) === 'Theo hệ thống' && !(await page.evaluate(() => FX.live())) && (await page.evaluate(() => document.documentElement.dataset.motion)) === undefined);
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'công tắc hiệu ứng (hệ thống xin giảm chuyển động)' });

  // Trang đăng nhập có công tắc riêng
  await session({ ...SEED, signedIn: false }, async ({ page, check, errors }) => {
    await page.waitForSelector('#authf'); await page.waitForTimeout(1200);
    check('đăng nhập: đang có hiệu ứng (kana đang trôi)', (await page.evaluate(() => gsap.getTweensOf('.ax-g').length)) > 0 && (await page.locator('#motiontog').innerText()) === 'Tắt hiệu ứng chuyển động');
    await page.fill('#authf [name=email]', 'a@x.co'); await page.click('#motiontog'); await page.waitForSelector('#authf');
    check('bấm tắt → trang dựng lại tĩnh, giữ email, nhãn đổi', (await page.evaluate(() => gsap.getTweensOf('.ax-g').length)) === 0 && (await page.inputValue('#authf [name=email]')) === 'a@x.co' && (await page.locator('#motiontog').innerText()) === 'Bật hiệu ứng chuyển động' && (await page.locator('.ax-card').evaluate(e => getComputedStyle(e).opacity)) === '1');
    await page.click('#tosignup'); await page.waitForSelector('#signf'); await page.waitForTimeout(200);
    check('trang đăng ký: vẫn tĩnh, đổi chỗ hai nửa ngay', (await page.locator('.authx').getAttribute('data-page')) === 'signup' && (await page.locator('#motiontog').innerText()) === 'Bật hiệu ứng chuyển động');
    await page.click('#motiontog'); await page.waitForSelector('#signf'); await page.waitForTimeout(1200);
    check('bấm bật lại → có hiệu ứng trở lại', (await page.evaluate(() => gsap.getTweensOf('.ax-g').length)) > 0 && (await page.locator('#motiontog').innerText()) === 'Tắt hiệu ứng chuyển động');
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'công tắc hiệu ứng ở trang đăng nhập', motion: true });
};
