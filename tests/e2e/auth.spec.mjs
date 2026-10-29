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

  // Đăng nhập và đăng ký là hai trang riêng
  await session({ ...SEED, signedIn: false }, async ({ page, check, errors }) => {
    await page.waitForSelector('#authf');
    check('trang đăng nhập không còn nút tạo tài khoản trong form', (await page.locator('#authf #signup').count()) === 0 && (await page.locator('#authf [name=password2]').count()) === 0);
    await page.fill('#authf [name=email]', 'moi@x.co'); await page.click('#tosignup'); await page.waitForSelector('#signf');
    check('bấm Đăng ký → sang trang riêng (#/dang-ky), giữ email đã gõ', (await page.evaluate(() => location.hash)) === '#/dang-ky' && (await page.inputValue('#signf [name=email]')) === 'moi@x.co' && (await page.locator('h1.auth-h').innerText()) === 'Tạo tài khoản');
    await page.waitForTimeout(1100);
    const pos = async () => page.evaluate(() => [document.querySelector('.ax-stage').getBoundingClientRect().left, document.querySelector('.ax-side').getBoundingClientRect().left]);
    const [sg, sd] = await pos(); check('trang đăng ký: sân khấu bên trái, thẻ bên phải', sg < sd, `${sg} ${sd}`);
    await page.fill('#signf [name=password]', 'matkhau-12345'); await page.fill('#signf [name=password2]', 'khac-12345678'); await page.click('#signf button.primary');
    check('hai mật khẩu khác nhau → báo lỗi, chưa gửi', (await page.locator('#signmsg').innerText()).includes('chưa giống') && (await page.locator('#signf').count()) === 1);
    await page.fill('#signf [name=password]', 'ngan'); await page.fill('#signf [name=password2]', 'ngan');
    await page.evaluate(() => { document.querySelector('#signf').noValidate = true; }); await page.click('#signf button.primary');
    check('mật khẩu dưới 8 ký tự → báo lỗi', (await page.locator('#signmsg').innerText()).includes('8 ký tự'));
    await page.goBack(); await page.waitForSelector('#authf');
    await page.waitForTimeout(1100); { const [sg2, sd2] = await page.evaluate(() => [document.querySelector('.ax-stage').getBoundingClientRect().left, document.querySelector('.ax-side').getBoundingClientRect().left]); check('trang đăng nhập: thẻ bên trái, sân khấu bên phải', sd2 < sg2, `${sg2} ${sd2}`); }
    check('nút Quay lại của trình duyệt → về trang đăng nhập', (await page.locator('h1.auth-h').innerText()) === 'Đăng nhập');
    await page.goForward(); await page.waitForSelector('#signf'); await page.fill('#signf [name=email]', 'moi@x.co');
    await page.fill('#signf [name=password]', 'matkhau-12345'); await page.fill('#signf [name=password2]', 'matkhau-12345'); await page.click('#signf button.primary');
    await page.waitForSelector('#donelogin');
    check('đăng ký xong (cần xác nhận email) → trang nhắc kiểm tra email', (await page.locator('.ax-card').innerText()).includes('moi@x.co'));
    await page.click('#donelogin'); await page.waitForSelector('#authf');
    check('về trang đăng nhập, email được điền sẵn', (await page.inputValue('#authf [name=email]')) === 'moi@x.co' && (await page.evaluate(() => location.hash)) === '');
    await page.click('#tosignup'); await page.waitForSelector('#signf'); await page.reload(); await page.waitForSelector('#signf');
    check('tải lại trang #/dang-ky → vẫn ở trang đăng ký', (await page.locator('h1.auth-h').innerText()) === 'Tạo tài khoản');
    await page.click('#tologin'); await page.waitForSelector('#authf');
    check('không có lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'đăng nhập / đăng ký tách trang', motion: true });
};
