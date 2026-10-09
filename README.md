# 日本語 Web — bản web/PWA của app Học Tiếng Nhật

Chạy trên trình duyệt máy tính và điện thoại, cài được lên màn hình chính như một app. Dữ liệu lưu ở Supabase của bạn (đăng nhập bằng email), nên điện thoại và máy tính dùng chung một kho thẻ.

## Có gì (so với bản desktop)
- Thẻ: thêm/sửa/xóa mềm, 4 loại (語彙/漢字/ひらがな/カタカナ), JLPT, trạng thái, yêu thích, tìm kiếm, lọc, chọn nhiều để đổi trạng thái / thêm vào bộ / xóa
- Ôn tập: **Flashcard, Quiz trắc nghiệm, Luyện gõ** (nghĩa, romaji, kana, on/kun, Hán Việt), SRS SM-2 rút gọn đúng như `domain/srs.py`, "Ôn hôm nay"
- Bộ thẻ + danh mục, bộ thủ, tách bộ kanji (dữ liệu IDS offline + tự sửa), thùng rác, thống kê
- Nhập nhanh nhiều dòng, nhập/xuất CSV, tự tạo romaji, bàn phím kana nổi, tra Jisho + gợi ý nghĩa Việt
- **Nhập thẳng `japanese.db` của bản desktop** (Khác → Nhập từ bản desktop): giữ nguyên UUID nên nhập lại không bị nhân đôi
- Giao diện tối/sáng, bố cục điện thoại (thanh tab dưới) và máy tính (thanh bên), nút Back của điện thoại đóng được hộp thoại
- Kết quả ôn được xếp hàng và tự gửi lại khi có mạng trở lại

Chưa có: xuất Anki (.apkg), đồng bộ ngược về file .db, dùng offline hoàn toàn (giao diện mở được offline, nhưng dữ liệu cần mạng để tải).

## Cài đặt (làm một lần)
1. **Supabase**: tạo project → SQL Editor → dán toàn bộ `schema.sql` → Run.
   (Authentication → Providers → Email: tắt "Confirm email" nếu muốn đăng ký xong dùng ngay.)
2. **GitHub + Vercel**: đẩy thư mục này lên một repo, import vào Vercel (không cần build). `api/jisho.js` tự thành hàm tra Jisho.
3. Mở trang → nhập **Project URL** và **anon key** (Settings → API) → tạo tài khoản. Muốn bỏ bước nhập này, điền sẵn 2 hằng số đầu `js/data.js` (anon key là khóa công khai, an toàn nhờ RLS).
4. Chuyển dữ liệu cũ: Khác → **Nhập từ bản desktop** → chọn `database/japanese.db`.
5. Điện thoại: mở link → "Thêm vào màn hình chính" (iOS: Chia sẻ; Android: menu ⋮).

Chạy thử cục bộ: `python3 -m http.server 8000` rồi mở http://localhost:8000 (tra Jisho cần Vercel).

## Ghi chú
- Mỗi lần cập nhật code, tăng `VERSION` trong `sw.js`. Mã giao diện (html/js/css) lấy từ mạng trước (tối đa 4 giây) rồi mới tới cache, nên các tệp luôn cùng một phiên bản.
- `data/kanji_ids.tsv` có nguồn/giấy phép ở `data/README.md` (GPLv2 — giữ kèm khi phát hành).
- Luyện gõ: trả lời sai sẽ chờ bạn bấm "Tiếp" (đúng thì tự qua sau ~1 giây).

## Xử lý xung đột nhiều thiết bị (bản 3)

**Nâng cấp từ bản cũ (hoặc từ bản 3 đầu tiên): bắt buộc chạy lại TOÀN BỘ `schema.sql` mới** (schema phiên bản 3) trong Supabase SQL Editor (an toàn, không mất dữ liệu, chạy lại bao nhiêu lần cũng được). Chưa chạy thì app hiện màn hình hướng dẫn nâng cấp.

| Tình huống | Cách xử lý |
|---|---|
| 2 máy cùng ôn 1 thẻ | Lịch SRS được tính **trên server** (hàm `log_study`, khoá hàng) → cả hai lượt ôn đều được tính, không ghi đè nhau; gửi lại sau khi mất mạng không bị tính 2 lần; lượt ôn cũ hơn lượt gần nhất không phá lịch mới. |
| 2 máy cùng sửa 1 thẻ / bộ thẻ / bộ thủ, **khác trường** | Tự gộp (chỉ gửi những trường bạn sửa, kiểm tra theo `version`). |
| Cùng sửa **một trường** thành 2 giá trị khác nhau | Hiện hộp thoại để bạn chọn "của bạn" hay "thiết bị khác" cho từng trường (không chọn sẵn). |
| Mục đã bị đưa vào thùng rác / xóa vĩnh viễn ở máy khác trong lúc bạn sửa | Hỏi: khôi phục & lưu, hoặc bỏ thay đổi. |
| Tạo trùng tên bộ thẻ / ký tự bộ thủ từ 2 máy | Báo thân thiện và tải lại dữ liệu. |
| Đổi trạng thái, ★, xóa/khôi phục, thao tác hàng loạt | Ghi giá trị tuyệt đối, **không đụng các trường khác** (người nhấn sau thắng cho đúng trường đó). |
| Danh mục, liên kết thẻ↔bộ, tách bộ | Người ghi sau thắng. |

Tự làm mới: khi quay lại tab/ứng dụng, khi có mạng lại và mỗi ~60 giây. Mỗi lần chỉ hỏi một "chữ ký" rất nhẹ (`jp_sync_sig`) và chỉ tải lại toàn bộ khi dữ liệu thật sự đổi, nên không tốn băng thông. **Không phải thời gian thực.** Nếu còn lượt ôn chưa gửi (đang offline) hoặc bạn đang thao tác thì lần làm mới được hoãn để không đè lên.

Nhập `japanese.db`: mặc định **không ghi đè** mục đã có trên web (cùng ID); bộ thẻ / bộ thủ trùng tên được gộp vào bản đã có. Có tuỳ chọn "ghi đè" kèm xác nhận. Đồng bộ web ↔ desktop vẫn là thủ công, một chiều.

## Dùng chung dữ liệu với bản desktop
Bản desktop (`japanese-dictionary-pdk-fixed`) giờ đồng bộ vào đúng Postgres này (cùng tài khoản, cùng `schema.sql`). Cùng email đăng nhập ở cả hai nơi. Desktop tự giải quyết xung đột cùng trường theo thời gian sửa mới hơn (web hỏi bạn); file âm thanh/ảnh của desktop chỉ ở máy.

## Bản 3.1 — vá sau rà soát
- Bảo mật: `jlpt_level` chỉ nhận N1–N5 (trước đây giá trị lạ từ CSV/.db có thể chèn mã vào trang).
- Hàng đợi ôn tập: giữ lại khi lỗi tạm thời của máy chủ (5xx/timeout/deadlock), xoá theo id (nhiều tab không làm mất lượt).
- Chống tạo thẻ trùng khi bấm Lưu 2 lần / mất mạng giữa chừng; nhập lỗi giữa chừng báo rõ đã thêm bao nhiêu.
- Nhập .db: gộp danh mục trùng tên; loại thẻ lạ → vocab. Nhập CSV: bỏ dòng trùng ngay trong file.
- Sửa thẻ: trường không đụng tới giữ nguyên (không bị cắt độ dài/chuẩn hoá → không sinh xung đột giả).
- Form thẻ không đóng khi chạm ra ngoài; ô nhập 16px (iOS không tự phóng to); gợi ý dịch bỏ khi MyMemory hết hạn mức.

## Bản 3.2/3.3 — Từ loại
Thẻ **từ vựng** có thêm trường *Từ loại*: Danh từ · Động từ (hoặc nhóm 1 / 2 / 3) · Tính từ đuôi い / な · Đại từ · Trợ từ · Trạng từ · Liên từ · Thán từ. Hiện trong form sửa thẻ, chi tiết thẻ, danh sách (nhãn nhỏ), bộ lọc, cấu hình ôn tập, CSV (cột `pos`, nhận cả mã `noun/verb1/verb2/verb3/adj_i/adj_na` lẫn tên tiếng Việt) và tự điền khi tra Jisho. **Bắt buộc chạy lại toàn bộ `schema.sql`** (schema phiên bản 5, cột `cards.pos`).
