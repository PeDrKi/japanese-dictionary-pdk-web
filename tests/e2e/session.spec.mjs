import { SEED } from './seed.mjs';
const DAY = 864e5;
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#tabs');
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('jp_session')));
    check('lần đầu: ghi mốc đăng nhập + hoạt động', rec && rec.login && rec.last && rec.uid);
    // dùng bình thường (mới dùng hôm qua, đăng nhập 10 ngày) → vẫn vào được
    await page.evaluate(([d]) => { const r = JSON.parse(localStorage.getItem('jp_session')); r.last = Date.now() - 1 * d; r.login = Date.now() - 10 * d; localStorage.setItem('jp_session', JSON.stringify(r)); }, [DAY]);
    await page.reload(); await page.waitForSelector('#tabs');
    check('trong hạn → vẫn đăng nhập', (await page.locator('#tabs').count()) === 1);
    // không dùng 31 ngày → hết hạn
    await page.evaluate(([d]) => { const r = JSON.parse(localStorage.getItem('jp_session')); r.last = Date.now() - 31 * d; localStorage.setItem('jp_session', JSON.stringify(r)); }, [DAY]);
    await page.reload(); await page.waitForSelector('.ax-card');
    check('không dùng quá 30 ngày → về màn hình đăng nhập kèm thông báo', (await page.locator('#tabs').count()) === 0 && (await page.locator('.ax-card').innerText()).includes('hơn 30 ngày'), await page.locator('.ax-card').innerText());
    await page.reload(); await page.waitForSelector('.ax-card');
    check('thông báo chỉ hiện 1 lần', !(await page.locator('.ax-card').innerText()).includes('hơn 30 ngày'));
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'session-idle' });

  await session(SEED, async ({ page, check }) => {
    await page.waitForSelector('#tabs');
    await page.evaluate(([d]) => { const r = JSON.parse(localStorage.getItem('jp_session')); r.login = Date.now() - 91 * d; localStorage.setItem('jp_session', JSON.stringify(r)); }, [DAY]);
    await page.reload(); await page.waitForSelector('.ax-card');
    check('đăng nhập quá 90 ngày (dù vẫn dùng) → phải đăng nhập lại', (await page.locator('.ax-card').innerText()).includes('quá 90 ngày'));
  }, { name: 'session-max' });

  await session(SEED, async ({ page, check }) => {
    await page.waitForSelector('#tabs');
    await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('jp_session')); r.last = Date.now() - 5 * 864e5; localStorage.setItem('jp_session', JSON.stringify(r)); });
    await page.mouse.click(300, 300); await page.waitForTimeout(200);
    const age = await page.evaluate(() => Date.now() - JSON.parse(localStorage.getItem('jp_session')).last);
    check('thao tác trong app làm mới mốc "lần dùng gần nhất"', age < 5000, String(age));
  }, { name: 'session-touch' });

  // tab mở sẵn rồi bỏ quên rất lâu: quay lại thao tác thì bị đăng xuất, KHÔNG được tự gia hạn
  await session(SEED, async ({ page, check }) => {
    await page.waitForSelector('#tabs');
    await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('jp_session')); r.last = Date.now() - 40 * 864e5; localStorage.setItem('jp_session', JSON.stringify(r)); });
    await page.mouse.click(300, 300);
    await page.waitForSelector('.ax-card'); await page.waitForFunction(() => !document.querySelector('#tabs'));
    check('tab mở sẵn bị bỏ quên >30 ngày: thao tác tiếp thì bị đăng xuất, không tự gia hạn', (await page.locator('.ax-card').innerText()).includes('hơn 30 ngày'));
  }, { name: 'session-resume' });
};
