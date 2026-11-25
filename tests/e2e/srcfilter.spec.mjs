import { SEED } from './seed.mjs';
// Bộ lọc theo Nguồn: thư viện + chọn thẻ ôn tập
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    const r = await page.evaluate(() => {
      const L = S.cards.filter(c => !c.deleted_at); L.forEach(c => { c.source = null; });
      L[0].source = 'Minna L1'; L[1].source = 'Minna L1'; L[2].source = ' Genki '; L[3].source = 'Minna L10';
      const sl = sourceList();
      return { names: sl.list.map(x => x[0]), counts: sl.list.map(x => x[1]), none: sl.none, total: L.length,
        a: filterCards({ src: 'Minna L1' }).length, g: filterCards({ src: 'Genki' }).length, n: filterCards({ src: '_none' }).length };
    });
    check('liệt kê nguồn theo thứ tự tự nhiên, gộp khoảng trắng', JSON.stringify(r.names) === JSON.stringify(['Genki', 'Minna L1', 'Minna L10']) && r.counts.join() === '1,2,1', JSON.stringify(r));
    check('lọc đúng theo nguồn / chưa có nguồn', r.a === 2 && r.g === 1 && r.n === r.total - 4, JSON.stringify(r));
    await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('[data-act=openFilter]'); await page.click('[data-act=openFilter]'); await page.waitForSelector('#f-src');
    await page.selectOption('#f-src', 'Minna L1'); await page.click('[data-act=fapply]');
    await page.waitForFunction(() => FILT.src === 'Minna L1');
    check('áp dụng bộ lọc: danh sách chỉ còn thẻ của nguồn', await page.evaluate(() => currentList().length === 2));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'bộ lọc theo nguồn' });
};
