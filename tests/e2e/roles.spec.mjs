import { SEED } from './seed.mjs';
export default async ({ session }) => {
  await session({ ...SEED, me: { role: 'admin', status: 'active' } }, async ({ page, check }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=more]');
    check('admin thấy mục Quản trị', (await page.locator('[data-name=admin]').count()) === 1);
  }, { name: 'admin' });
  await session(SEED, async ({ page, check }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=more]');
    check('người dùng thường không thấy mục Quản trị', (await page.locator('[data-name=admin]').count()) === 0);
    check('có mục Phím tắt và Gõ tiếng Nhật', (await page.locator('[data-act=shortcuts]').count()) === 1 && (await page.locator('#view [data-act=imeCycle]').count()) === 1);
  }, { name: 'user' });
  await session({ ...SEED, me: { role: 'user', status: 'blocked' } }, async ({ page, check, db }) => {
    await page.waitForSelector('.auth');
    check('tài khoản bị khóa → màn thông báo, dữ liệu không bị xóa', /bị khóa/.test(await page.locator('.auth-h').innerText()) && (await db()).cards.length === 4);
  }, { name: 'blocked' });
};
