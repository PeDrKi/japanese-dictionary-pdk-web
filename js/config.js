/* config.js — ĐIỀN 2 DÒNG DƯỚI ĐÂY để người dùng KHÔNG phải nhập URL/khóa Supabase (họ chỉ thấy ô email + mật khẩu).
   Lấy ở Supabase → Project Settings → API:  Project URL  và  anon / publishable key.
   Anon key là khóa CÔNG KHAI, an toàn nhờ RLS. TUYỆT ĐỐI KHÔNG dán khóa service_role / secret vào đây.
   Để trống → app tự hỏi lần đầu (cách cũ). Khi cập nhật app bằng bản zip mới, nhớ giữ lại file này của bạn. */
window.JP_CONFIG = {
  url: '',   // ví dụ 'https://abcdxyz.supabase.co'
  key: '',   // ví dụ 'eyJhbGciOi…' hoặc 'sb_publishable_…'
};
