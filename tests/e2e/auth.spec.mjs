import { SEED } from './seed.mjs';
export default async ({ session }) => {
  // Lần đầu: hỏi URL + khóa một lần, kiểm tra kết nối, rồi nhớ
  await session({ signedIn: false }, async ({ page, check, errors }) => {
    await page.waitForSelector('#cfgf');
    check('lần đầu hiện màn Kết nối máy chủ', (await page.locator('h1.auth-h').innerText()) === 'Kết nối máy chủ');
    await page.fill('#cfgf [name=url]', 'abc'); await page.fill('#cfgf [name=key]', 'anon'); await page.click('#cfgf .btn'); await page.waitForTimeout(900);
    check('URL chưa đúng bị từ chối', /Project URL/.test(await page.locator('#cfgmsg').innerText()));
    const SR = 'x.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.y';
    await page.fill('#cfgf [name=url]', 'fake.supabase.test'); await page.fill('#cfgf [name=key]', SR); await page.click('#cfgf .btn'); await page.waitForTimeout(900);
    check('khóa service_role bị từ chối', /service_role/.test(await page.locator('#cfgmsg').innerText()));
    await page.fill('#cfgf [name=key]', 'sai'); await page.click('#cfgf .btn'); await page.waitForTimeout(900);
    check('khóa sai bị từ chối', /Khóa không đúng/.test(await page.locator('#cfgmsg').innerText()));
    check('chưa lưu gì khi còn lỗi', (await page.evaluate(() => localStorage.getItem('jp_cfg'))) === null);
    await page.fill('#cfgf [name=key]', 'anon'); await page.click('#cfgf .btn'); await page.waitForSelector('#authf', { timeout: 8000 });
    const cfg = JSON.parse(await page.evaluate(() => localStorage.getItem('jp_cfg')));
    check('lưu URL đã chuẩn hoá (thêm https/http, bỏ dấu / cuối)', cfg.url === 'https://fake.supabase.test' || cfg.url === 'http://fake.supabase.test', JSON.stringify(cfg));
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { noCfg: true, name: 'auth-config' });

  // Đăng nhập / sai mật khẩu / đăng xuất
  await session({ ...SEED, signedIn: false }, async ({ page, check }) => {
    await page.waitForSelector('#authf');
    await page.fill('#authf [name=email]', 'a@x.co'); await page.fill('#authf [name=password]', 'wrong-password'); await page.click('#authf [data-mode=in]');
    await page.waitForFunction(() => document.querySelector('#authmsg')?.textContent.includes('Sai email'));
    check('sai mật khẩu → thông báo tiếng Việt', true);
    await page.fill('#authf [name=password]', 'dung-roi-12345'); await page.click('#authf [data-mode=in]');
    await page.waitForSelector('#view'); check('đăng nhập đúng → vào app', true);
    await page.click('#tabs [data-tab=more]'); await page.click('[data-act=logout]'); await page.waitForSelector('#authf');
    check('đăng xuất → về màn đăng nhập', true);
  }, { name: 'login' });
};
