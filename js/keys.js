/* keys.js — phím tắt cho máy tính (bàn phím vật lý). Bấm ? để xem danh sách.
   Phím đơn chỉ chạy khi KHÔNG đang gõ trong ô nhập và KHÔNG có hộp thoại/màn hình ôn tập đang mở. */
'use strict';
const SHORTCUTS = [
  ['Chung', [['1 – 9, 0', 'Chuyển mục: Hôm nay, Thư viện, Ôn tập, Bộ thẻ, Khác (5), Ngữ pháp, Bộ thủ, Thống kê, Chia động từ, Bản dịch (0)'], ['/', 'Tìm trong Thư viện'], ['n', 'Thêm thẻ mới'], ['g', 'Mở trang Ngữ pháp'], ['v', 'Mở bảng Chia động từ'], ['d', 'Mở trang Bản dịch'], ['r', 'Ôn các thẻ đến hạn hôm nay'], ['t', 'Đổi giao diện sáng / tối'], ['?', 'Mở bảng phím tắt này'], ['Esc', 'Đóng hộp thoại / xóa ô tìm kiếm']]],
  ['Khi nhập liệu', [['Ctrl + Enter', 'Lưu form đang mở'], ['Enter (ở ô Chữ)', 'Tra Jisho — ↑ ↓ hoặc 1–8 để chọn, con trỏ tự nhảy sang ô nghĩa'], ['Ctrl + .', 'Dùng bản dịch tiếng Việt gợi ý cho ô nghĩa'], ['Ctrl + `', 'Bật / tắt gõ tiếng Nhật (A → あ → ア)'], ['nn', 'Gõ ん (khi đang bật gõ tiếng Nhật)']]],
  ['Khi ôn tập', [['Space / Enter', 'Lật thẻ'], ['← hoặc 1', 'Chưa nhớ'], ['→ hoặc 2', 'Đã nhớ'], ['1 – 4', 'Chọn đáp án (Quiz)'], ['Esc', 'Thoát phiên ôn tập']]],
];
function openShortcuts() {
  const rows = SHORTCUTS.map(([g, list]) => `<h3 style="margin:14px 0 6px;font-size:14px">${esc(g)}</h3>` +
    list.map(([k, d]) => `<div class="row" style="justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(d)}</span><kbd class="kbd">${esc(k)}</kbd></div>`).join('')).join('');
  const s = openSheet(`<h2>Phím tắt</h2>${rows}<div class="sp"></div><button class="btn block" data-close>Đóng</button>`);
  return s;
}
ACT.shortcuts = openShortcuts;

(() => {
  const TABKEYS = { 1: 'today', 2: 'cards', 3: 'study', 4: 'decks', 5: 'more', 6: 'grammar', 7: 'radicals', 8: 'stats', 9: 'conj', 0: 'trans' };
  const wide = () => window.matchMedia && matchMedia('(min-width: 900px)').matches;   // có thanh bên → mở thẳng; điện thoại → qua Khác
  const isTyping = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const overlay = () => (typeof layers !== 'undefined' && layers.length > 0) || !!document.querySelector('.full');
  const openTabKey = tab => { if (['grammar', 'radicals', 'stats', 'conj', 'trans'].includes(tab) && !wide()) { goTab('more'); ACT.sub({ dataset: { name: tab } }); } else goTab(tab); };
  const goTab = tab => { if (!$('#view')) return false; ACT.tab({ dataset: { tab } }); return true; };

  document.addEventListener('keydown', e => {
    if (e.isComposing || e.defaultPrevented) return;
    const t = e.target, k = e.key;

    // Ctrl/⌘ + Enter: lưu form đang mở (kể cả khi đang gõ trong textarea)
    if (k === 'Enter' && (e.ctrlKey || e.metaKey) && !e.altKey) {
      const f = (t && t.closest && t.closest('form')) || (layers.length && layers[layers.length - 1].el.querySelector('form'));
      if (f && f.requestSubmit) { e.preventDefault(); f.requestSubmit(); }
      return;
    }
    // Ctrl + . : dùng bản dịch tiếng Việt gợi ý (trong form thêm/sửa thẻ)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === '.' || e.code === 'Period')) {
      const f = t && t.closest && t.closest('#cf');
      if (f) { e.preventDefault(); useViSuggestion(f); }
      return;
    }
    // Esc trong ô tìm kiếm: xóa & rời ô
    if (k === 'Escape' && t && t.id === 'q') {
      if (t.value) { t.value = ''; t.dispatchEvent(new Event('input', { bubbles: true })); } else t.blur();
      e.preventDefault(); return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(t) || !$('#root')) return;

    if (k === '?') { if (!overlay()) { e.preventDefault(); openShortcuts(); } return; }
    if (overlay() || !$('#view')) return;
    if (TABKEYS[k] && !e.shiftKey) { e.preventDefault(); openTabKey(TABKEYS[k]); return; }
    switch (k) {
      case '/': e.preventDefault(); goTab('cards'); { const q = $('#q'); if (q) { q.focus(); q.select(); } } break;
      case 'n': e.preventDefault(); ACT.newCard(); break;
      case 'g': e.preventDefault(); openTabKey('grammar'); break;
      case 'v': e.preventDefault(); openTabKey('conj'); break;
      case 'd': e.preventDefault(); openTabKey('trans'); break;
      case 'r': e.preventDefault(); goTab('today'); { const b = $('[data-act=startDue]'); if (b) b.click(); else toast('Hôm nay chưa có thẻ nào đến hạn ôn'); } break;
      case 't': e.preventDefault(); themeCycle(); break;
    }
  });
})();
