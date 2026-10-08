/* conflict.js — hộp thoại xử lý xung đột khi 2 thiết bị cùng sửa 1 mục */
'use strict';

const FIELD_LABEL = {
  type: 'Loại', character: 'Chữ / từ', reading_on: 'Âm On', reading_kun: 'Âm Kun', reading_kana: 'Cách đọc (kana)',
  reading_hanviet: 'Âm Hán Việt', romaji: 'Romaji', meaning_vi: 'Nghĩa tiếng Việt', meaning_en: 'Nghĩa tiếng Anh',
  example_jp: 'Câu ví dụ', example_vi: 'Dịch câu ví dụ', stroke_count: 'Số nét', jlpt_level: 'JLPT', status: 'Trạng thái',
  source: 'Nguồn', notes: 'Ghi chú', is_favorite: 'Yêu thích', name: 'Tên', description: 'Mô tả', color: 'Màu', icon: 'Biểu tượng',
  category_id: 'Danh mục',
};
function fmtVal(field, v) {
  if (v === null || v === undefined || v === '') return '(trống)';
  if (field === 'is_favorite') return v ? '★ Có' : 'Không';
  if (field === 'status') return STATUS_LABEL[v] || v;
  if (field === 'type') return TYPE_LABEL[v] || v;
  if (field === 'category_id') { const c = S.cats.find(x => x.id === v); return c ? c.name : '(danh mục khác)'; }
  return String(v);
}

// kind: 'fields' (cùng trường khác giá trị) | 'deleted' (đã vào thùng rác) | 'gone' (đã xóa vĩnh viễn)
// Trả về: 'fields' → { field: 'mine'|'theirs' } hoặc null (hủy) · 'deleted' → 'restore'|'cancel' · 'gone' → 'recreate'|'cancel'
function askConflict(kind, table, conflicts = []) {
  return new Promise(res => {
    let done = false;
    const finish = v => { if (done) return; done = true; res(v); };
    if (kind !== 'fields') {
      const msg = kind === 'deleted'
        ? 'Mục này vừa bị chuyển vào thùng rác ở thiết bị khác. Khôi phục và lưu thay đổi của bạn?'
        : 'Mục này đã bị xóa vĩnh viễn ở thiết bị khác. Tạo lại với nội dung của bạn?';
      const ok = kind === 'deleted' ? 'restore' : 'recreate';
      const s = openSheet(`<h2>${esc(msg)}</h2><div class="row"><button class="btn grow" data-close>Bỏ thay đổi</button>
        <button class="btn grow primary" id="cx-ok">${kind === 'deleted' ? 'Khôi phục & lưu' : 'Tạo lại'}</button></div>`, { onClose: () => finish('cancel') });
      s.$('#cx-ok').onclick = () => { finish(ok); s.close(); };
      return;
    }
    const pick = {};
    const html = `<h2>⚠️ Có thay đổi từ thiết bị khác</h2>
      <p class="small mute">Mục này vừa được sửa ở nơi khác. Các trường khác nhau đã được tự gộp. Với ${conflicts.length} trường dưới đây, cả hai bên đều sửa — hãy chọn giá trị giữ lại.</p>
      ${conflicts.map((c, i) => `<div class="field" data-i="${i}"><span>${esc(FIELD_LABEL[c.field] || c.field)}</span>
        <div class="row" style="gap:8px;align-items:stretch">
          <button type="button" class="btn grow cx-pick" data-i="${i}" data-v="theirs" style="text-align:left;white-space:normal"><small class="mute">Thiết bị khác</small><br><b class="jp">${esc(fmtVal(c.field, c.theirs))}</b></button>
          <button type="button" class="btn grow cx-pick" data-i="${i}" data-v="mine" style="text-align:left;white-space:normal"><small class="mute">Của bạn</small><br><b class="jp">${esc(fmtVal(c.field, c.mine))}</b></button>
        </div></div>`).join('')}
      <div class="row"><button class="btn grow" data-close>Hủy, bỏ thay đổi</button><button class="btn grow primary" id="cx-ok" disabled>Lưu</button></div>`;
    const s = openSheet(html, { onClose: () => finish(null) });
    s.el.addEventListener('click', e => {
      const b = e.target.closest('.cx-pick'); if (!b) return;
      const i = +b.dataset.i; pick[conflicts[i].field] = b.dataset.v;
      $$('.cx-pick', b.parentElement).forEach(x => x.classList.toggle('primary', x === b));
      s.$('#cx-ok').disabled = conflicts.some(c => !pick[c.field]);
    });
    s.$('#cx-ok').onclick = () => { finish({ ...pick }); s.close(); };
  });
}
