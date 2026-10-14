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
Mọi thẻ (từ vựng, kanji, ...) có thêm trường *Từ loại*: Danh từ · Động từ (hoặc nhóm 1 / 2 / 3) · Tính từ đuôi い / な · Đại từ · Trợ từ · Trạng từ · Liên từ · Thán từ. Hiện trong form sửa thẻ, chi tiết thẻ, danh sách (nhãn nhỏ), bộ lọc, cấu hình ôn tập, CSV (cột `pos`, nhận cả mã `noun/verb1/verb2/verb3/adj_i/adj_na` lẫn tên tiếng Việt) và tự điền khi tra Jisho. **Bắt buộc chạy lại toàn bộ `schema.sql`** (schema phiên bản 5, cột `cards.pos`).

## Bản 3.5–3.6 — giao diện thân thiện hơn (3.6: nút chạm lớn hơn trên điện thoại)
- **Hôm nay**: nút lớn "Ôn N thẻ ngay"; 3 kiểu ôn khác có chú thích ngắn; biểu đồ trống thành lời nhắc.
- **Ôn tập**: chọn kiểu ôn bằng thẻ có mô tả; bộ lọc nâng cao thu gọn (hiện số bộ lọc đang bật); thanh "Bắt đầu ôn" luôn nằm sát đáy kèm số thẻ.
- **Thẻ**: nút "Chọn" và "Lọc" có chữ (thay cho biểu tượng khó hiểu); máy tính hiển thị 2 cột.
- **Form thẻ**: đưa trường chính lên đầu (chữ, cách đọc, nghĩa, từ loại, JLPT, bộ thẻ), phần còn lại dưới "Thông tin thêm"; nút Lưu/Hủy luôn hiện.
- **Đăng nhập**: nút Hiện/Ẩn mật khẩu, "Tạo tài khoản" thành liên kết phụ, sửa chữ chồng lên logo.
- Không đổi schema (vẫn v5). Cần tải lại trang 1–2 lần để service worker lấy bản v3.5.

## Bản 3.7 — xử lý các giới hạn đã biết
- Nút Back (điện thoại/trình duyệt) không còn "kẹt" sau khi vào Thống kê/Bộ thủ rồi đổi tab hoặc xóa bộ thủ.
- Hộp thoại giữ phím Tab bên trong nó và trả focus về nút đã mở khi đóng.
- `schema.sql`: `log_study` chặn giờ ôn ở tương lai (đồng hồ máy nhanh) — **chạy lại schema.sql một lần** để áp dụng (vẫn là bản 5, an toàn).

## Bản 3.8 — Phân quyền: người dùng (user) và quản trị viên (admin)
**Bắt buộc:** chạy lại TOÀN BỘ `schema.sql` mới trong Supabase SQL Editor (bản 6, an toàn, không mất dữ liệu; chạy lại nhiều lần cũng được). Tài khoản có sẵn tự thành "user".

**Cấp quyền admin đầu tiên** (làm 1 lần trong SQL Editor, thay email của bạn):
```sql
update public.profiles set role = 'admin'
where user_id = (select id from auth.users where email = 'ban@example.com');
```
Sau đó đăng nhập lại → tab **Khác** có mục **Quản trị**. Từ đó cấp/hạ quyền admin ngay trong app.

| | Người dùng | Admin |
|---|---|---|
| Thẻ, bộ thẻ, ôn tập của mình | ✔ | ✔ |
| Thấy dữ liệu của người khác | ✘ | ✘ (chỉ thấy email, số thẻ/bộ, lần vào cuối, số liệu tổng) |
| Thêm "Bộ thẻ mẫu" vào thẻ của mình | ✔ | ✔ |
| Xem danh sách tài khoản, khóa/mở khóa, đổi vai trò, xóa tài khoản | ✘ | ✔ |
| Đăng / ẩn / xóa bộ thẻ mẫu dùng chung | ✘ | ✔ |
| Tự xóa tài khoản của mình | ✔ | ✔ (trừ khi là admin duy nhất) |

- Quyền được kiểm tra ở **máy chủ** (RLS + hàm security definer): người dùng không thể tự nâng quyền dù sửa mã trên trình duyệt.
- Tài khoản bị khóa: đăng nhập được nhưng mọi truy vấn dữ liệu bị từ chối; app hiện thông báo bị khóa.
- Admin không tự khóa / hạ quyền / xóa chính mình; không thể xóa admin cuối cùng.
- Bản desktop không có màn quản trị (dùng web để quản trị); đồng bộ desktop vẫn hoạt động bình thường với tài khoản user.

### Bản 3.9
- `log_study` từ chối rõ ràng khi tài khoản bị khóa (mã 42501) và app GIỮ hàng đợi lượt ôn, mở khóa xong tự gửi lại (không mất dữ liệu). **Chạy lại `schema.sql` một lần nữa.**

## Bản 3.10 — Sẵn sàng cho người dùng tự đăng ký
**1. Nhúng sẵn cấu hình (để người dùng khỏi nhập URL/khóa Supabase)** — sửa file `js/config.js`:
```js
window.JP_CONFIG = { url: 'https://xxxx.supabase.co', key: 'eyJ… hoặc sb_publishable_…' };
```
Lấy ở Supabase → Project Settings → API (Project URL + anon/publishable key). **Không** dán khóa `service_role`. Khi đó app đi thẳng vào màn đăng nhập và ẩn mục "Đổi máy chủ". Để trống (mặc định) = app hỏi URL + khóa **một lần** ở lần dùng đầu tiên trên mỗi thiết bị (có kiểm tra kết nối), lưu trong trình duyệt; sau này sửa ở **Khác → Máy chủ**. *Khi cập nhật bằng bản zip mới nhớ giữ lại file `js/config.js` đã điền.*

**2. Cấu hình bắt buộc để "Quên mật khẩu" và email xác nhận hoạt động** — Supabase → Authentication → URL Configuration:
- **Site URL**: địa chỉ Vercel của bạn (vd `https://ten-app.vercel.app`).
- **Redirect URLs**: thêm đúng địa chỉ đó (và bản có dấu `/` cuối nếu có).
Nếu không, liên kết trong email sẽ trỏ sai chỗ.

**3. Email gửi đi** — Supabase mặc định chỉ gửi vài email mỗi giờ (đủ để thử, KHÔNG đủ cho nhiều người). Khi mở rộng: Authentication → SMTP Settings → dùng dịch vụ SMTP riêng (Resend, Brevo, …). Có thể tạm tắt "Confirm email" (Authentication → Sign In / Providers → Email) nếu muốn người dùng vào ngay không cần xác nhận — đổi lại dễ bị tài khoản rác.

**Tính năng mới**
- Quên mật khẩu (gửi liên kết → đặt mật khẩu mới), Đổi mật khẩu trong tab Khác.
- Liên kết xác nhận đăng ký tự đăng nhập; liên kết hết hạn báo tiếng Việt.
- Đăng ký / đặt mật khẩu mới yêu cầu từ 8 ký tự; đăng nhập vẫn chấp nhận mật khẩu cũ 6 ký tự.
- Thông báo lỗi đăng nhập/đăng ký bằng tiếng Việt (sai mật khẩu, email đã đăng ký, thao tác quá nhanh, chưa xác nhận email…).


## Gõ tiếng Nhật trong ô nhập (Ctrl+`)
Bấm **Ctrl+`** (hoặc nút nhỏ あ/ア/A hiện cạnh ô đang gõ, hoặc Khác → "Gõ tiếng Nhật") để đổi vòng: Tắt → あ hiragana → ア katakana → Tắt. Khi bật, gõ romaji sẽ ra kana ngay trong ô: `taberu` → たべる, `kyou` → きょう, `gakkou` → がっこう, `kohi-` → こひー, `nn` hoặc `n'` → ん. Chữ ん gõ bằng **hai lần `n`** (`nn`), ví dụ `shinnbunn` → しんぶん; một chữ `n` đứng trước phụ âm vẫn tự thành ん (`kanta` → かんた).
Chỉ chuyển ra **kana**, không đổi thành kanji (muốn kanji hãy dùng bàn phím tiếng Nhật của hệ điều hành). Không áp dụng cho ô email, mật khẩu, URL, khóa. Mặc định luôn Tắt khi mở app.


## Phím tắt trên máy tính
Bấm **?** (khi không đang gõ) để xem bảng phím tắt đầy đủ, hoặc Khác → "Phím tắt".
`1`–`5` chuyển tab · `/` tìm thẻ · `n` thêm thẻ · `r` ôn thẻ đến hạn · `t` đổi giao diện · `Esc` đóng / xóa ô tìm · `Ctrl+Enter` lưu form đang mở · `Ctrl+`` bật/tắt gõ tiếng Nhật. Khi ôn tập: `Space/Enter` lật thẻ, `←`/`→` hoặc `1`/`2` chấm chưa nhớ/đã nhớ, `1`–`4` chọn đáp án Quiz.
Phím đơn chỉ hoạt động khi bạn không đang gõ trong ô nhập và không có hộp thoại mở. Trên điện thoại không ảnh hưởng gì.

## Đợt chỉnh UX (v3.16)
- **Thêm thẻ nhanh:** gõ chữ Nhật xong, app tự tra Jisho và điền cách đọc, nghĩa, từ loại, JLPT (nghĩa tiếng Việt là dịch máy — có nhãn nhắc kiểm tra). Ô bạn đã sửa tay không bị ghi đè. Từ loại/JLPT/trạng thái/ví dụ… nằm trong mục "Tùy chọn thêm" (gập sẵn, dòng tóm tắt cho thấy cái đã điền). Link "Thêm nhiều thẻ một lúc" ngay đầu form. *Tự điền cần chạy trên Vercel (có `/api/jisho`); chạy ngoài Vercel thì im lặng, vẫn nhập tay được.*
- **Ôn tập:** màn chọn chỉ còn kiểu ôn + tóm tắt "Lần này sẽ ôn" + nút Bắt đầu; câu hỏi/số thẻ/bộ lọc gập trong "Tùy chỉnh bài ôn". Cài đặt được nhớ cho lần mở sau.
- **Hôm nay:** chưa có dữ liệu thì không vẽ biểu đồ rỗng. **Thư viện:** đổi tên tab; có chú thích màu trạng thái; nhãn từ loại viết đủ ("Động từ 2", "Tính từ い"); nút + không che thẻ cuối; chữ nghĩa to hơn.

## Chạy test

```
npm install
npx playwright install chromium   # lần đầu
npm test            # 54 unit test (logic SRS, kana, IME, lọc thẻ...)
npm run test:e2e    # 87 test giao diện (Playwright, Supabase giả lập trong bộ nhớ)
npm run test:all    # cả hai
```

- Nếu máy đã có Chromium: `PW_CHROMIUM=/đường/dẫn/chromium npm run test:e2e`.
- `tests/fixtures/parity.json` sinh từ bản desktop Python để đảm bảo web và desktop tính SRS giống nhau.
- Test E2E không gọi Supabase/Jisho thật. Kiểm tra RLS trên Postgres thật chưa nằm trong dự án.
- GitHub Actions (`.github/workflows/web-tests.yml`) chạy `npm run test:all` mỗi lần push.

## v3.18 — Phân trang và nhập thẻ bằng bàn phím
- Thư viện có 2 kiểu xem, đổi bằng liên kết dưới danh sách (chỉ hiện khi hơn 50 thẻ) và được nhớ lại: **Xem thêm** (như cũ) hoặc **Phân trang** (50 thẻ/trang, « ‹ Trang x/y › »).
- Form thêm thẻ: gõ chữ → **Enter** (hoặc Tab tới nút rồi Enter) để tra Jisho → **↑ ↓ / 1–8** chọn, **Enter** chốt → con trỏ tự nhảy sang ô nghĩa tiếng Việt → **Tab** đi tiếp → **Ctrl + .** dùng bản dịch tiếng Việt gợi ý → **Ctrl + Enter** lưu.

## v3.19 — Trang Ngữ pháp (cần nâng cấp schema)
- **Khác → Ngữ pháp** (hoặc phím `g`): lưu mẫu câu (vd 〜てから), nghĩa, cấu tạo, giải thích, ví dụ (mỗi dòng `câu tiếng Nhật | nghĩa`), cấp JLPT. Có tìm kiếm, lọc N5–N1, sửa/xóa. Sửa từ 2 thiết bị cùng lúc được gộp giống thẻ.
- **Bắt buộc một lần:** vào Supabase → SQL Editor → dán lại TOÀN BỘ `schema.sql` → Run (chạy lại nhiều lần vẫn an toàn). Nếu chưa chạy, mọi tính năng cũ vẫn dùng bình thường; trang Ngữ pháp chỉ báo cần nâng cấp.
- Dữ liệu ngữ pháp thuộc riêng từng tài khoản (RLS) và bị xóa cùng tài khoản. Chưa có trong bản desktop, chưa có trong nhập/xuất CSV.

## v3.20 — Bộ thẻ gọn hơn, lọc theo danh mục
- **Bộ thẻ:** ô tìm, chip lọc theo danh mục (có số bộ), sắp xếp (tên / cần ôn nhiều nhất / nhiều thẻ nhất / mới tạo), thu gọn từng danh mục (được nhớ), nút ▶ ôn nhanh các thẻ đến hạn của một bộ (dùng kiểu ôn đang chọn ở tab Ôn tập), liên kết "Xem thẻ ›" của danh mục.
- **Thư viện:** Bộ lọc có thêm **Danh mục** (thẻ thuộc bất kỳ bộ nào trong danh mục), kết hợp được với các lọc khác; có liên kết "bỏ lọc".

## v3.21 — Thanh bên 8 mục
- Trên màn hình rộng (≥ 900px, máy tính), **Ngữ pháp, Bộ thủ, Thống kê** nằm ngay trên thanh bên, ngang hàng với Thư viện, Ôn tập, Bộ thẻ. Phím tắt: `1–8` (Khác là `5`, Ngữ pháp `6`, Bộ thủ `7`, Thống kê `8`).
- Trên điện thoại thanh dưới vẫn 5 mục cho khỏi chật; ba mục này vẫn nằm trong **Khác**.

## v3.22 — Chọn bộ thẻ gọn hơn (form thêm/sửa thẻ)
- Form không còn bày ra mọi bộ thẻ thành hàng chip. Chỉ hiện các bộ **đã chọn** (bấm chip để bỏ), tối đa 4 bộ **dùng gần đây** (thẻ mới, chạm 1 lần để chọn) và nút **＋ Chọn bộ thẻ**.
- Hộp chọn: có ô tìm, nhóm theo danh mục, ô tích; gõ tên rồi **Enter** để chọn bộ khớp đầu tiên; **Xong** để đóng.

## v3.23 — Chỉ báo bàn phím tiếng Nhật ở thanh bên
- Cuối thanh bên (màn hình rộng) luôn hiện trạng thái gõ tiếng Nhật: **A** (tắt) · **あ** (hiragana) · **ア** (katakana). Đổi bằng `Ctrl + `` ` `` hoặc bấm thẳng vào chỉ báo.
