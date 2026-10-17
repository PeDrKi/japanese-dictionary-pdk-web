/* config.js — ĐIỀN 2 DÒNG DƯỚI ĐÂY để người dùng KHÔNG phải nhập URL/khóa Supabase (họ chỉ thấy ô email + mật khẩu).
   Lấy ở Supabase → Project Settings → API:  Project URL  và  anon / publishable key.
   Anon key là khóa CÔNG KHAI, an toàn nhờ RLS. TUYỆT ĐỐI KHÔNG dán khóa service_role / secret vào đây.
   Để trống → app tự hỏi lần đầu (cách cũ). Khi cập nhật app bằng bản zip mới, nhớ giữ lại file này của bạn. */
window.JP_CONFIG = {
  url: 'https://efuhmeypsmnbkofptaiu.supabase.co',   // ví dụ 'https://abcdxyz.supabase.co'
  key: 'sb_publishable_Ksxg7fKf3oVorJS1MFgKXw_rfwT35mb',   // ví dụ 'eyJhbGciOi…' hoặc 'sb_publishable_…'
  // idleDays: 30,   // không dùng quá số ngày này → phải đăng nhập lại (mặc định 30)
  // maxDays: 90,    // đăng nhập quá số ngày này → phải đăng nhập lại dù đang dùng (mặc định 90)
};
