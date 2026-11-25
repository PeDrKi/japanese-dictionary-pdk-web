import { SEED } from './seed.mjs';
// Nhóm từ riêng tự tạo: tạo nhóm + màu + trường riêng, thêm thẻ vào nhóm, giá trị trường lưu và hiện ở chi tiết, đổi màu nhóm có sẵn, xóa nhóm
export default async ({ session }) => {
  await session(SEED, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.evaluate(() => { S.cards.forEach(c => { c.senses = null; c.name_kind = null; c.extra = null; }); });   // như máy chủ đã chạy schema 15/16
    await page.click('#tabs [data-tab=more]');
    await page.waitForSelector('[data-act=groups]'); await page.click('[data-act=groups]'); await page.waitForSelector('#grp-list');
    check('có sẵn 4 nhóm Họ/Tên/Địa danh/Tổ chức', (await page.locator('#grp-list .item').count()) === 4);
    await page.click('[data-act=groupNew]'); await page.waitForSelector('#gf');
    await page.fill('#gf [name=name]', 'Món ăn');
    await page.evaluate(() => { const c = document.querySelector('#gf [name=color]'); c.value = '#aa3311'; c.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('[data-act=gfAdd]'); await page.fill('#gf-fields input', 'Vùng miền');
    await page.click('#gf button[type=submit]'); await page.waitForSelector('#gf', { state: 'detached' });
    const g = (await db()).card_groups.find(x => x.name === 'Món ăn');
    check('lưu nhóm với màu đã chọn và 1 trường riêng', g && g.color.toLowerCase() === '#aa3311' && JSON.parse(g.fields)[0].label === 'Vùng miền', JSON.stringify(g));
    check('danh sách hiện 5 nhóm', (await page.locator('#grp-list .item').count()) === 5);
    // thêm thẻ vào nhóm
    await page.click(`[data-act=groupAddCard][data-key="${g.id}"]`); await page.waitForSelector('#cf');
    check('form thẻ mở sẵn nhóm + ô trường riêng', (await page.locator('#cf [name=name_kind]').inputValue()) === g.id && (await page.locator('#cf [data-ex]').count()) === 1);
    await page.fill('#cf [name=character]', 'ラーメン'); await page.fill('#cf [name=meaning_vi]', 'mì ramen');
    await page.fill('#cf [data-ex]', 'Fukuoka');
    await page.keyboard.press('Control+Enter'); await page.waitForSelector('#cf', { state: 'detached' });
    const c = (await db()).cards.find(x => x.character === 'ラーメン');
    check('thẻ lưu name_kind = id nhóm và giá trị trường riêng', c && c.name_kind === g.id && JSON.parse(c.extra)[JSON.parse(g.fields)[0].k] === 'Fukuoka', JSON.stringify(c));
    check('trên màn hình, thẻ trong nhóm được tô màu của nhóm', await page.evaluate(id => { S.cards.find(x => x.name_kind === id); return nameKindColor(id).toLowerCase() === '#aa3311'; }, g.id));
    await page.evaluate(id => openCardDetail(S.cards.find(x => x.name_kind === id).id), g.id); await page.waitForSelector('.kv');
    check('chi tiết thẻ hiện tên trường riêng và giá trị', /Vùng miền[\s\S]*Fukuoka/.test(await page.locator('.kv').innerText()));
    await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelectorAll('.overlay,.sheet').forEach(e => e.remove()));
    // đổi màu nhóm có sẵn
    check('đổi màu nhóm có sẵn (Họ) tạo hàng ghi đè', await page.evaluate(async () => { await saveNameGroup('surname', { name: 'Họ', color: '#112233', fields: [] }); return nameKindColor('surname') === '#112233' && S.card_groups.some(r => r.builtin === 'surname'); }));
    // xóa nhóm: thẻ thành thẻ thường
    await page.evaluate(id => deleteNameGroup(id), g.id);
    const d = await db(); const c2 = d.cards.find(x => x.character === 'ラーメン');
    check('xóa nhóm: thẻ còn nguyên, thành thẻ thường', c2 && !c2.name_kind && !c2.extra && !d.card_groups.some(x => x.id === g.id), JSON.stringify(c2));
    // xóa nhóm có sẵn rồi khôi phục
    await page.evaluate(() => { const c = S.cards.find(x => !x.name_kind); return updateCards([c.id], { name_kind: 'place' }); });
    await page.evaluate(() => deleteNameGroup('place'));
    const d2 = await db(); const pl = d2.card_groups.find(x => x.builtin === 'place');
    check('xóa nhóm có sẵn: ẩn khỏi danh sách, thẻ thành thẻ thường', pl && pl.hidden === true && !(await page.evaluate(() => allNameGroups().some(x => x.key === 'place'))) && !(await db()).cards.some(x => x.name_kind === 'place'), JSON.stringify(pl));
    await page.evaluate(() => restoreNameGroup('place'));
    check('khôi phục nhóm có sẵn về mặc định', await page.evaluate(() => { const g = nameGroup('place'); return g && g.name === 'Địa danh' && g.fields.length === 0; }));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'nhóm từ riêng: tạo, màu, trường riêng' });
};
