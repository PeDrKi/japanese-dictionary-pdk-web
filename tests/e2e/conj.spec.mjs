import { SEED } from './seed.mjs';
const row = (db, masu) => db.conj_verbs.find(v => v.masu === masu);
const cellOf = (db, masu, kind) => { const v = row(db, masu), f = db.conj_forms.find(x => x.kind === kind); return v && f ? db.conj_cells.find(c => c.verb_id === v.id && c.form_id === f.id)?.value : undefined; };
export default async ({ session }) => {
  const S1 = { ...SEED, cards: SEED.cards.map(c => c.character === '食べる' ? { ...c, pos: 'verb2' } : c) };
  await session(S1, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.click('#tabs [data-tab=conj]'); await page.waitForSelector('#conjbody');
    check('trang Chia động từ ở thanh bên, chưa có cột → gợi ý thêm thể thông dụng', (await page.locator('[data-act=conjDefaults]').count()) === 1);
    await page.click('[data-act=conjDefaults]'); await page.waitForSelector('table.conj');
    const heads = await page.locator('table.conj thead .c-head').allInnerTexts();
    check('tạo sẵn 11 cột thể thông dụng', heads.length === 11 && heads[0] === '辞書形' && heads[2] === 'て形', heads.join('|'));
    // lấy từ thẻ động từ
    await page.click('[data-act=conjImport]'); await page.waitForSelector('#cimp'); check('liệt kê thẻ 食べる → 食べます (nhóm 2)', (await page.locator('#cimp').innerText()).includes('食べます'));
    await page.click('#cimp-ok'); await page.waitForTimeout(600);
    let d = await db();
    check('thêm 食べます nhóm 2, tự điền đủ 11 ô', row(d, '食べます')?.grp === 2 && d.conj_cells.length === 11 && cellOf(d, '食べます', 'te') === '食べて' && cellOf(d, '食べます', 'passive') === '食べられる', JSON.stringify(d.conj_cells.length));
    check('bảng hiện 食べて trong ô', (await page.inputValue('.cell[data-f] >> nth=2')) === '食べて');
    // thêm động từ thủ công
    await page.click('[data-act=newConjVerb]'); await page.waitForSelector('#cvf');
    await page.fill('#cvf [name=masu]', '飲みます'); await page.fill('#cvf [name=meaning_vi]', 'uống');
    await page.click('#cvf button.primary'); await page.waitForTimeout(300);
    check('thiếu nhóm → báo lỗi, chưa lưu', !row(await db(), '飲みます') && (await page.locator('#cvf').count()) === 1);
    await page.click('[data-act=cvGrp][data-v="1"]'); await page.click('#cvf button.primary'); await page.waitForSelector('#cvf', { state: 'detached' }); await page.waitForFunction(m => { const D = window.__DB, v = D.conj_verbs.find(x => x.masu === m); return v && D.conj_cells.filter(c => c.verb_id === v.id).length >= 11; }, '飲みます', { timeout: 8000 });
    d = await db();
    check('飲みます nhóm 1: て形 飲んで, 可能形 飲める', cellOf(d, '飲みます', 'te') === '飲んで' && cellOf(d, '飲みます', 'potential') === '飲める');
    // gợi ý nhóm 3 khi gõ します
    await page.click('[data-act=newConjVerb]'); await page.waitForSelector('#cvf'); await page.fill('#cvf [name=masu]', '勉強します');
    check('gõ 勉強します → tự chọn nhóm 3', (await page.locator('[data-act=cvGrp][data-v="3"].on').count()) === 1);
    await page.click('#cvf button.primary'); await page.waitForSelector('#cvf', { state: 'detached' }); await page.waitForFunction(m => { const D = window.__DB, v = D.conj_verbs.find(x => x.masu === m); return v && D.conj_cells.filter(c => c.verb_id === v.id).length >= 11; }, '勉強します', { timeout: 8000 });
    check('勉強します: 勉強しない / 勉強できる', cellOf(await db(), '勉強します', 'nai') === '勉強しない' && cellOf(await db(), '勉強します', 'potential') === '勉強できる');
    // sửa ô trực tiếp
    const cell = page.locator(`.cell[data-v="${row(await db(), '飲みます').id}"]`).nth(2);
    await cell.fill('飲んで（sửa）'); await cell.press('Tab'); await page.waitForTimeout(300);
    check('sửa ô ngay trên bảng → lưu', cellOf(await db(), '飲みます', 'te') === '飲んで（sửa）');
    await cell.fill(''); await cell.press('Tab'); await page.waitForTimeout(300);
    check('xóa chữ trong ô → xóa ô trên server', cellOf(await db(), '飲みます', 'te') === undefined);
    // lọc / tìm
    await page.click('[data-act=conjGrp][data-v="2"]'); await page.waitForSelector('#conjbody');
    check('lọc Nhóm 2 → còn 食べます', (await page.locator('table.conj tbody tr').count()) === 1);
    await page.click('[data-act=conjGrp][data-v=""]');
    await page.fill('#cq', 'uống'); await page.waitForTimeout(400);
    check('tìm theo nghĩa "uống" → 飲みます', (await page.locator('table.conj tbody tr').count()) === 1 && (await page.locator('table.conj tbody').innerText()).includes('飲みます'));
    await page.fill('#cq', ''); await page.waitForTimeout(400);
    // ẩn / hiện cột, đổi thứ tự
    await page.click('[data-act=conjCols]'); await page.waitForSelector('[data-act=ccToggle]');
    await page.click('[data-act=ccToggle] >> nth=0'); await page.waitForTimeout(300);
    check('ẩn cột 辞書形 (lưu trên server)', (await db()).conj_forms.find(f => f.kind === 'dict').hidden === true);
    await page.click('[data-act=ccMove][data-dir="1"] >> nth=1'); await page.waitForTimeout(300);
    let ord = (await db()).conj_forms.slice().sort((a, b) => a.sort_order - b.sort_order).map(f => f.kind).slice(0, 3);
    check('↓ đổi chỗ: て形 lên trước ない形', ord.join() === 'dict,te,nai', ord.join());
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    const heads2 = await page.locator('table.conj thead .c-head').allInnerTexts();
    check('bảng không còn cột 辞書形 và て形 đứng trước ない形', !heads2.includes('辞書形') && heads2.indexOf('て形') < heads2.indexOf('ない形') && heads2.length === 10, heads2.join('|'));
    check('có dòng báo "1 cột đang ẩn"', (await page.locator('#conjbody').innerText()).includes('1 cột đang ẩn'));
    await page.click('[data-act=conjCols]'); await page.waitForSelector('[data-act=ccToggle]'); await page.click('[data-act=ccToggle] >> nth=0'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    check('hiện lại cột 辞書形', (await page.locator('table.conj thead .c-head').count()) === 11);
    // thêm cột tự đặt, nhập nội dung, xóa cột
    await page.click('table.conj .c-add button'); await page.waitForSelector('#cff');
    await page.fill('#cff [name=name]', 'Lịch sự'); await page.click('#cff button.primary'); await page.waitForSelector('#cff', { state: 'detached' }); await page.waitForTimeout(300);
    const nf = (await db()).conj_forms.find(f => f.name === 'Lịch sự');
    check('thêm cột tự đặt (không có loại thể): không tự điền', nf && nf.kind === null && (await db()).conj_cells.every(c => c.form_id !== nf.id));
    const c9 = page.locator(`.cell[data-f="${nf.id}"]`).first(); await c9.fill('食べてください'); await c9.press('Tab'); await page.waitForTimeout(300);
    check('nhập nội dung cột tự đặt', (await db()).conj_cells.some(c => c.form_id === nf.id && c.value === '食べてください'));
    await page.click(`[data-act=editConjForm][data-id="${nf.id}"]`); await page.waitForSelector('#cff'); await page.click('[data-act=cfDelete]'); await page.waitForSelector('#cf-ok'); await page.click('#cf-ok'); await page.waitForTimeout(400);
    d = await db();
    check('xóa cột: mất cột và các ô của cột', !d.conj_forms.some(f => f.id === nf.id) && d.conj_cells.every(c => c.form_id !== nf.id));
    // xóa động từ
    await page.click(`[data-act=editConjVerb][data-id="${row(d, '勉強します').id}"]`); await page.waitForSelector('#cvf'); await page.click('[data-act=cvDelete]'); await page.waitForSelector('#cf-ok'); await page.click('#cf-ok'); await page.waitForTimeout(400);
    d = await db();
    check('xóa động từ: mất hàng và các ô', !row(d, '勉強します') && d.conj_cells.every(c => d.conj_verbs.some(v => v.id === c.verb_id)));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'chia động từ' });

  await session({ ...SEED, oldSchema: true }, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=conj]'); await page.waitForSelector('#conjbody');
    check('chưa chạy schema mới → báo rõ, không lỗi', (await page.locator('#conjbody').innerText()).includes('schema.sql') && errors.length === 0, errors.join('|'));
  }, { name: 'chia động từ schema cũ' });
};
