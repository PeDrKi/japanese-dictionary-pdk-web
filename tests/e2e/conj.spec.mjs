import { SEED } from './seed.mjs';
const row = (db, masu) => db.conj_verbs.find(v => v.masu === masu);
const cellOf = (db, masu, kind) => { const v = row(db, masu), f = db.conj_forms.find(x => x.kind === kind); return v && f ? db.conj_cells.find(c => c.verb_id === v.id && c.form_id === f.id)?.value : undefined; };
export default async ({ session }) => {
  const S1 = { ...SEED, cards: SEED.cards.map(c => c.character === '食べる' ? { ...c, pos: 'verb2' } : c) };
  await session(S1, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.click('#tabs [data-tab=more]'); await page.click('.item[data-name=conj]'); await page.waitForSelector('#conjbody');
    check('trang Chia động từ mở từ Khác, chưa có cột → gợi ý thêm thể thông dụng', (await page.locator('[data-act=conjDefaults]').count()) === 1);
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
    await page.click('[data-act=cvGrp][data-v="1"]'); await page.click('#cvf button.primary'); await page.waitForSelector('#cvf', { state: 'detached' }); await page.waitForFunction(m => { const D = window.__DB, v = D.conj_verbs.find(x => x.masu === m); return v && D.conj_cells.filter(c => c.verb_id === v.id).length >= 11; }, '飲みます', { timeout: 20000 }).catch(async e => { const D = await db(); console.log('DIAG', JSON.stringify({ verbs: D.conj_verbs.map(v => [v.masu, v.grp]), cells: D.conj_cells.length, forms: D.conj_forms.length, toast: await page.locator('.toast').allInnerTexts(), sheet: await page.locator('.scrim').count(), url: page.url() })); throw e; });
    d = await db();
    check('飲みます nhóm 1: て形 飲んで, 可能形 飲める', cellOf(d, '飲みます', 'te') === '飲んで' && cellOf(d, '飲みます', 'potential') === '飲める');
    // gợi ý nhóm 3 khi gõ します
    await page.click('[data-act=newConjVerb]'); await page.waitForSelector('#cvf'); await page.fill('#cvf [name=masu]', '勉強します');
    check('gõ 勉強します → tự chọn nhóm 3', (await page.locator('[data-act=cvGrp][data-v="3"].on').count()) === 1);
    await page.click('#cvf button.primary'); await page.waitForSelector('#cvf', { state: 'detached' }); await page.waitForFunction(m => { const D = window.__DB, v = D.conj_verbs.find(x => x.masu === m); return v && D.conj_cells.filter(c => c.verb_id === v.id).length >= 11; }, '勉強します', { timeout: 20000 });
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

  // từ tab Thẻ → Chia động từ (chọn nhiều thẻ)
  const mk = (n, o) => ({ ...SEED.cards[0], id: `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`, pos: null, is_favorite: false, status: 'new', study_count: 0, srs_due_date: null, type: 'vocab', romaji: '', jlpt_level: null, ...o });
  const S2 = { ...SEED, cards: [...SEED.cards, mk(21, { character: '飲む', reading_kana: 'のむ', meaning_vi: 'uống' }), mk(22, { character: '帰る', reading_kana: 'かえる', meaning_vi: 'về' }), mk(23, { character: '勉強する', reading_kana: 'べんきょうする', meaning_vi: 'học' })] };
  await session(S2, async ({ page, check, db, errors }) => {
    await page.waitForSelector('#view');
    await page.click('#tabs [data-tab=more]'); await page.click('.item[data-name=conj]'); await page.waitForSelector('#conjbody'); await page.click('[data-act=conjDefaults]'); await page.waitForSelector('table.conj');
    await page.click('#tabs [data-tab=cards]'); await page.waitForSelector('[data-act=toggleSelect]'); await page.click('[data-act=toggleSelect]');
    for (const ch of ['飲む', '帰る', '勉強する', '水']) await page.locator(`[data-act=openCard]:has-text("${ch}")`).first().click();
    await page.click('[data-act=bulkConj]'); await page.waitForSelector('#bcj');
    const txt = await page.locator('#bcj').innerText();
    check('liệt kê 飲みます / 帰ります / 勉強します, 水 bị bỏ qua', txt.includes('飲みます') && txt.includes('帰ります') && txt.includes('勉強します') && txt.includes('Không giống động từ'), txt);
    check('帰る được đoán là nhóm 1, 勉強する nhóm 3', (await page.locator('#bcj .item[data-i] select').evaluateAll(a => a.map(x => x.value))).join() === '1,1,3');
    await page.locator('#bcj .item', { hasText: '帰ります' }).locator('select').selectOption('2');
    check('đổi nhóm → thể ます đổi theo', (await page.locator('#bcj').innerText()).includes('帰ます'));
    await page.locator('#bcj .item', { hasText: '帰ます' }).locator('select').selectOption('1');
    await page.click('#bcj-ok'); await page.waitForFunction(() => { const D = window.__DB; return D.conj_verbs.length === 3 && D.conj_cells.length >= 33; }, null, { timeout: 20000 });
    const d = await db();
    check('thêm 3 động từ đúng nhóm + nghĩa, tự điền ô', row(d, '飲みます')?.grp === 1 && row(d, '帰ります')?.grp === 1 && row(d, '勉強します')?.grp === 3 && row(d, '飲みます').meaning_vi === 'uống' && cellOf(d, '勉強します', 'te') === '勉強して' && cellOf(d, '帰ります', 'nai') === '帰らない');
    check('thoát chế độ chọn', (await page.locator('[data-act=bulkConj]').count()) === 0);
    await page.click('[data-act=toggleSelect]'); await page.locator('[data-act=openCard]:has-text("飲む")').first().click(); await page.click('[data-act=bulkConj]'); await page.waitForSelector('#bcj');
    check('thêm lần nữa → báo đã có, nút Thêm bị khóa', (await page.locator('#bcj').innerText()).includes('đã có trong bảng') && await page.locator('#bcj-ok').isDisabled());
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'thẻ → chia động từ' });

  await session({ ...SEED, oldSchema: true }, async ({ page, check, errors }) => {
    await page.waitForSelector('#view'); await page.click('#tabs [data-tab=more]'); await page.click('.item[data-name=conj]'); await page.waitForSelector('#conjbody');
    check('chưa chạy schema mới → báo rõ, không lỗi', (await page.locator('#conjbody').innerText()).includes('schema.sql') && errors.length === 0, errors.join('|'));
  }, { name: 'chia động từ schema cũ' });
};
