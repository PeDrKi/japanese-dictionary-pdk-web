import { SEED } from './seed.mjs';
// Ghép kanji: từ ghép trong chi tiết thẻ kanji, công cụ ghép → tạo thẻ từ vựng mới với Hán Việt/cách đọc gợi ý
export default async ({ session }) => {
  await session(SEED, async ({ page, check, errors }) => {
    await page.waitForSelector('#view');
    await page.evaluate(() => {
      const mk = (type, character, extra) => ({ id: uuid7(), type, character, meaning_vi: 'nghĩa ' + character, status: 'new', study_count: 0, is_favorite: false, srs_interval: 1, srs_ease: 2.5, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, ...extra });
      for (const c of S.cards) if (c.type === 'kanji' && (c.character === '日' || c.character === '本')) c.deleted_at = new Date().toISOString();
      S.cards.push(mk('kanji', '日', { reading_hanviet: 'nhật', reading_on: 'ニチ' }), mk('kanji', '本', { reading_hanviet: 'bản', reading_on: 'ホン' }), mk('vocab', '日曜日', { meaning_vi: 'chủ nhật' }));
      reindex(); render();
    });
    await page.evaluate(() => ACT.openCard({ dataset: { id: S.cards.find(c => c.character === '日' && !c.deleted_at).id } }));
    await page.waitForSelector('.sheet');
    const txt = await page.locator('.sheet').innerText();
    check('thẻ kanji hiện mục Từ ghép có "日曜日"', /Từ ghép \(1\)/.test(txt) && txt.includes('日曜日'), txt.slice(0, 200));
    await page.click('.sheet [data-act=compound]');
    await page.waitForSelector('#cmp-out');
    check('mở từ chi tiết: đã có sẵn 日 trong khay', (await page.locator('#cmp-out [data-act=cmpDel]').allInnerTexts()).join('') === '日');
    await page.click('#cmp-pick [data-act=cmpAdd][data-ch="本"]');
    const out = await page.locator('#cmp-out').innerText();
    check('gợi ý Hán Việt "nhật bản" và cách đọc "にちほん"', out.includes('nhật bản') && out.includes('にちほん'), out);
    await page.fill('#cmp-q', 'bản');
    check('tìm theo Hán Việt lọc danh sách kanji', (await page.locator('#cmp-pick [data-act=cmpAdd]').count()) === 1);
    await page.click('[data-act=cmpMake]'); await page.waitForSelector('#cf');
    const f = await page.evaluate(() => { const e = document.querySelector('#cf').elements; return [e.character.value, e.reading_hanviet.value, e.reading_kana.value]; });
    check('form thẻ mới được điền sẵn', f.join('|') === '日本|nhật bản|にちほん', f.join('|'));
    check('không lỗi JS', errors.length === 0, errors.join('|'));
  }, { name: 'ghép kanji' });
};
