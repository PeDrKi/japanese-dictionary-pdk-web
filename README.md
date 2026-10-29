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

## v3.24 — Bảo mật
- **Mật khẩu:** app KHÔNG tự lưu hay băm mật khẩu. Đăng nhập do Supabase Auth xử lý (mật khẩu được băm bằng bcrypt ở phía Supabase, app không bao giờ thấy mật khẩu đã lưu). Không nên tự viết lại phần này.
- **Giới hạn đăng nhập sai / gửi email:** do Supabase Auth giới hạn theo IP ở phía máy chủ (app đã hiển thị thông báo "thao tác quá nhanh"). Chỉnh trong Supabase → Authentication → Rate Limits. Nên đặt độ dài mật khẩu tối thiểu ở Authentication → Sign In / Providers (Email).
- **Proxy `/api/jisho`:** giới hạn 30 yêu cầu/phút/IP, chỉ nhận GET, lọc ký tự lạ trong từ khóa, có timeout 8 giây. (Giới hạn nằm trong bộ nhớ từng instance của Vercel nên chỉ là lớp chặn cơ bản; muốn chặt hơn hãy bật Rate Limiting/WAF của Vercel.)
- **Hết hạn phiên:** không dùng quá **30 ngày** hoặc đăng nhập quá **90 ngày** thì phải đăng nhập lại (kể cả tab mở sẵn rồi bỏ quên). Đổi bằng `idleDays` / `maxDays` trong `js/config.js`. Token truy cập của Supabase vẫn tự làm mới ngắn hạn như bình thường.
- **Kiểm tra dữ liệu ở server (schema.sql, phiên bản 8):** giới hạn độ dài các trường, số lần SRS, cấp JLPT, số nét… bằng ràng buộc CHECK. Dữ liệu cũ đang có không bị kiểm tra lại (`not valid`), chỉ dữ liệu ghi/sửa từ nay. Cần chạy lại toàn bộ `schema.sql` một lần để bật.

## v3.25 — Sao lưu & khôi phục toàn bộ
- **Khác → Sao lưu & khôi phục → Sao lưu toàn bộ** tải về 1 file `jpdic_backup_NGÀY.json` gồm: thẻ (cả thẻ trong thùng rác), bộ thẻ, danh mục, liên kết bộ–thẻ, bộ thủ, tách bộ tự định nghĩa, ngữ pháp và toàn bộ lịch sử ôn tập. File đọc mới từ máy chủ nên luôn đầy đủ; không chứa email hay mật khẩu.
- **Khôi phục từ file sao lưu** chỉ **thêm phần còn thiếu**, không ghi đè dữ liệu đang có (khôi phục 2 lần không bị nhân đôi). Bộ thẻ / danh mục / bộ thủ trùng tên với cái đang có thì gộp vào cái đang có. Dùng được để chuyển sang tài khoản mới.
- **Nhắc sao lưu:** khi có từ 20 thẻ trở lên mà chưa sao lưu hoặc đã quá 30 ngày, trang Hôm nay hiện thẻ nhắc (có nút "Để sau 7 ngày").
- Nên lưu file sao lưu ở nơi khác máy (Drive, email cho chính mình). Bản sao lưu của Supabase miễn phí không tự động tải về được.
- Không cần chạy lại schema.sql.

## v3.26 — Mỗi âm đọc một ô (kanji)
- Form thêm/sửa thẻ kanji: **Âm On** và **Âm Kun** mỗi âm nằm trong một ô riêng. **Enter** ở ô cuối (đã có chữ) tạo ô mới và nhảy sang; hoặc bấm **+ Thêm âm On / Kun**; **×** xóa ô; **Tab** đi qua các ô; **Ctrl+Enter** vẫn là Lưu.
- Dữ liệu vẫn lưu thành một chuỗi cách nhau bằng "、" (ví dụ `げつ、がつ`) nên thẻ cũ, CSV, bản desktop, chế độ ôn tập đều không đổi. Thẻ cũ tự tách thành từng ô khi mở sửa. Không cần chạy lại schema.sql.

## v3.27 — Trạng thái thẻ theo số lần học (schema phiên bản 9)
- **Chưa học** = 0 lần · **Đang học** = 1–19 lần · **Đã nhớ** = từ 20 lần trở lên. Mỗi lượt ôn (đúng hay sai) đều tính là 1 lần học; trả lời sai không làm tụt trạng thái nữa. (Mốc 20 tính là Đã nhớ.)
- Số lần học lưu ở cột mới `cards.study_count`; server tự tính `status` từ cột này (trigger), nên mọi thiết bị luôn khớp nhau. Vì vậy **đã bỏ** ô chọn Trạng thái trong form thẻ và nút "Trạng thái" ở thao tác hàng loạt. Chi tiết thẻ hiện "Đang học · 7 lần học".
- **Cần chạy lại toàn bộ `schema.sql`** trong Supabase SQL Editor (an toàn, không mất dữ liệu): tự đếm lại số lần học của thẻ cũ từ lịch sử ôn đã có và cập nhật trạng thái theo quy tắc mới — thẻ nào từng được đặt tay "Đã nhớ" nhưng chưa đủ 20 lượt sẽ chuyển về "Đang học" / "Chưa học".
- Bản desktop chưa theo quy tắc này (vẫn tự đổi trạng thái theo đúng/sai).

## v3.28 — Điểm học đúng +1 / sai −1, thêm nhiều biểu tượng (schema phiên bản 9, cập nhật)
- **Cách đếm mới** (thay cho v3.27): mỗi lần trả lời **đúng +1**, **sai −1**; đã về 0 thì giữ 0, không âm. **Chưa học** = 0 · **Đang học** = 1–19 · **Đã nhớ** = từ 20 trở lên. Thẻ đã nhớ (20) trả lời sai một lần sẽ tụt về 19 = Đang học.
- **Chạy lại toàn bộ `schema.sql`** (an toàn, không mất dữ liệu): điểm học của thẻ cũ được tính lại bằng cách phát lại lịch sử ôn theo thời gian với đúng quy tắc trên.
- **Biểu tượng** của Bộ thẻ và Danh mục: hơn 300 emoji chia 11 nhóm (Học tập, Nhật Bản, Đồ ăn, Thiên nhiên, Động vật, Con người, Nhà & đời sống, Du lịch, Công việc, Giải trí, Biểu tượng). Bấm tab nhóm rồi bấm biểu tượng; hoặc gõ / dán emoji khác vào ô lớn ở trên.

## v3.29 — Bảng chia động từ (schema phiên bản 10)
- Mục mới **Chia động từ** (thanh bên trên máy tính, phím **9** hoặc **v**; trên điện thoại: Khác → Chia động từ).
- **Bảng:** cột đầu là thể **ます** (kèm nhóm 1 / 2 / 3 và nghĩa), các cột sau là các thể khác. **Sửa nội dung bất kỳ ô nào ngay trên bảng** (rời ô hoặc Enter là lưu; Enter nhảy xuống ô dưới; Esc hoàn tác; xóa chữ = xóa ô). Bấm tên động từ để sửa / xóa; bấm tên cột để sửa / xóa; nút **+** cuối hàng tiêu đề thêm cột.
- **Cột:** thêm / sửa / xóa, **ẩn / hiện** (👁), đổi thứ tự (↑ ↓) trong **Cột…**; trạng thái ẩn lưu trên máy chủ nên đồng bộ mọi thiết bị. "Thêm thể thông dụng" tạo sẵn 11 cột: 辞書形, ない形, て形, た形, 可能形, 意向形, 命令形, 受身形, 使役形, ば形, 禁止形 (ngoài ra có thêm ません形, ました形, なかった形). Cột chọn "Cột tự đặt" thì tự nhập nội dung.
- **Tự điền theo quy tắc chia** (nhóm 1 五段, nhóm 2 一段, nhóm 3 します・来ます, kể cả ngoại lệ 行く → 行って, ある → ない): khi thêm động từ, khi thêm cột có loại thể, hoặc nút **Tự điền ô trống**. Không bao giờ ghi đè ô đã có chữ (trừ khi bạn chọn "Điền lại TOÀN BỘ"). Bạn luôn sửa lại được từng ô.
- **Lấy từ thẻ:** thêm nhanh các thẻ có từ loại Động từ nhóm 1 / 2 / 3 trong thư viện (tự đổi sang thể ます).
- Có lọc theo nhóm và ô tìm (tìm cả trong các thể đã chia). Sao lưu / khôi phục toàn bộ đã bao gồm bảng này.
- **Cần chạy lại toàn bộ `schema.sql`** (thêm 3 bảng conj_forms, conj_verbs, conj_cells; không ảnh hưởng dữ liệu cũ).

## v3.30 — Bản dịch (schema phiên bản 11)
- Mục mới **Bản dịch** (thanh bên trên máy tính, phím **0** hoặc **d**; trên điện thoại: Khác → Bản dịch). Dán **một câu hoặc cả đoạn văn tiếng Nhật** (tới ~30.000 chữ, thừa cho một trang A4) rồi tự ghi **nghĩa tiếng Việt** (tới 40.000 chữ). Có tiêu đề, JLPT, ghi chú; ô tìm tìm cả trong tiếng Nhật lẫn tiếng Việt; lọc theo JLPT.
- **Trang đọc đối chiếu từng đoạn:** nếu mỗi dòng / đoạn tiếng Nhật ứng với một dòng / đoạn tiếng Việt (cùng số đoạn) thì hiện từng cặp Nhật – Việt. Khác số đoạn thì hiện hai khối riêng và báo rõ. Khi gõ, form cho biết số chữ và có khớp đoạn hay chưa.
- **Tự kiểm tra:** nút **Che bản dịch** làm mờ bản dịch từng đoạn, bấm vào đoạn để hiện — dịch thử trong đầu trước rồi đối chiếu. **Chỉ tiếng Nhật** để đọc thuần.
- Ctrl+Enter lưu như các form khác; xung đột nhiều thiết bị được gộp giống các mục khác. Sao lưu / khôi phục toàn bộ đã gồm bản dịch.
- **Cần chạy lại toàn bộ `schema.sql`** (thêm bảng `translations`; không ảnh hưởng dữ liệu cũ).

## v3.31 — Ghi lại từ mới khi đang đọc Bản dịch
- Ở trang đọc một bài trong **Bản dịch**, **bôi đen** một từ / cụm từ / câu tiếng Nhật → hiện thanh nhỏ với 2 nút:
  - **＋ Thẻ từ vựng:** mở form thêm thẻ đã điền sẵn chữ vừa bôi đen, **câu chứa từ đó làm câu ví dụ**, bản dịch của câu (khi bài đang ghép cặp đoạn và đoạn chỉ có 1 câu) và **nguồn = tên bài**. Hệ thống tự tra Jisho để gợi ý cách đọc / nghĩa, con trỏ nhảy sẵn tới ô nghĩa tiếng Việt (Ctrl + . dùng nghĩa gợi ý, Ctrl + Enter lưu). Từ đã có trong thư viện thì báo và mở thẻ cũ, không tạo trùng.
  - **＋ Ví dụ ngữ pháp:** chọn một mẫu ngữ pháp có sẵn (có ô tìm) để **nối vào phần ví dụ** (câu tiếng Nhật | nghĩa); hoặc **tạo mẫu ngữ pháp mới** với câu đó đã điền sẵn. Ví dụ trùng không bị thêm 2 lần. Bôi đen ngắn (dưới 8 chữ) thì lấy cả câu chứa nó; bôi đen cả câu / cụm dài thì lấy đúng đoạn đã bôi.
- Không cần chạy lại schema.sql.

## v3.32 — Gọn thanh bên
- **Thống kê** và **Chia động từ** chuyển vào mục **Khác** (cả máy tính lẫn điện thoại). Thanh bên máy tính còn 8 mục: Hôm nay, Thư viện, Ôn tập, Bộ thẻ, Ngữ pháp, Bộ thủ, Bản dịch, Khác.
- Phím tắt giữ nguyên: **8** = Thống kê, **9** hoặc **v** = Chia động từ (tự mở qua Khác). Bấm ← để quay lại Khác.
- Không cần chạy lại schema.sql.

## v3.33 — Bản dịch chia hai bên (kiểu bài đọc có cột từ vựng)
- Trang đọc mặc định **Hai bên**: bên trái là bài tiếng Nhật, bên phải là bảng cố định có 2 tab **Từ vựng** và **Bản dịch**. Điện thoại thì xếp dọc.
- **Cột từ vựng:** mỗi dòng dạng `từ = nghĩa`. Các từ trong bài được **gạch chân đỏ**; bấm một dòng để sửa / xóa / **Lưu thành thẻ từ vựng**; nút **+ Thêm từ** để thêm.
- Bôi đen trong bài → nút mới **＋ Ghi vào từ vựng** (cạnh Thẻ từ vựng và Ví dụ ngữ pháp).
- Form bài có thêm ô **Từ vựng** (mỗi dòng một từ). Các chế độ cũ (Đối chiếu, Che bản dịch, Chỉ tiếng Nhật) vẫn còn.
- **Cần chạy lại toàn bộ `schema.sql`** (thêm cột `translations.glossary`, bản 12). Chưa chạy thì phần từ vựng báo lỗi rõ ràng, các phần khác vẫn dùng bình thường.

## v3.34 — Chọn cả câu / cả đoạn làm ví dụ ngữ pháp; thêm từ hàng loạt vào bộ thẻ
- **＋ Ví dụ ngữ pháp:** hộp chọn có thêm 3 lựa chọn **Phần đã chọn / Cả câu / Cả đoạn** (hiện ví dụ ngay khi đổi). Chỉ cần bôi đen một chữ bất kỳ rồi chọn "Cả câu" hoặc "Cả đoạn" — không cần kéo chọn dài trên điện thoại. Chọn cả đoạn thì kèm bản dịch của đoạn (khi bài ghép cặp).
- **＋ Thêm vào bộ thẻ…** (tab Từ vựng bên phải): liệt kê các từ trong cột từ vựng, tick những từ muốn thêm, chọn một hoặc nhiều bộ thẻ (mặc định bộ dùng gần nhất) rồi bấm **Thêm n thẻ**. Mỗi thẻ có sẵn nghĩa, câu ví dụ lấy từ bài, nguồn = tên bài. Từ đã có thẻ hoặc chưa có nghĩa thì bị khóa.
- Không cần chạy lại schema.sql (đã chạy bản 12 là đủ).

## v3.35 — Sắp xếp lại trang Khác
- Chia thành 4 nhóm có tiêu đề: **Học và tra cứu** (Thống kê, Chia động từ; điện thoại thêm Ngữ pháp, Bản dịch, Bộ thủ), **Thêm thẻ** (Nhập nhanh, Bộ thẻ mẫu, Nhập / xuất CSV, Nhập từ desktop), **Dữ liệu** (Sao lưu, Thùng rác, Tải lại, Quản trị), **Cài đặt** (Giao diện, Gõ tiếng Nhật, Phím tắt, Đổi mật khẩu, Máy chủ).
- Máy tính: 2 cột. Điện thoại: 1 cột. Dòng cài đặt gọn, hiện giá trị hiện tại bên phải (vd Giao diện: Theo hệ thống).
- Tài khoản và trạng thái đồng bộ lên đầu trang; Đăng xuất ở cuối.
- Không cần chạy lại schema.sql.

## v3.36 — Đưa động từ từ tab Thẻ sang Chia động từ
- Tab Thẻ → **☑ Chọn** → tick các thẻ → nút **Chia ĐT**. Hiện danh sách các động từ tìm thấy kèm nhóm (1/2/3); đổi nhóm nếu app đoán sai (thể ます đổi theo), bỏ tick từ không muốn thêm, rồi bấm **Thêm vào bảng**. Các ô được tự điền theo cột đang có.
- Thẻ đã đặt "từ loại" Động từ nhóm 1/2/3 thì dùng đúng nhóm đó; thẻ chưa đặt thì app đoán từ cách đọc (có danh sách ngoại lệ như 帰る, 切る, 入る…). Thẻ không giống động từ bị bỏ qua; động từ đã có trong bảng hiện "đã có trong bảng".
- Không cần chạy lại schema.sql.

## v3.37 — Đăng nhập và Đăng ký thành hai trang riêng
- **Đăng nhập** (trang chính) chỉ có email, mật khẩu, "Quên mật khẩu?" và liên kết **Đăng ký**. Không còn nút tạo tài khoản nằm chung trong form đăng nhập.
- **Đăng ký** là trang riêng (địa chỉ `#/dang-ky`): email, mật khẩu (từ 8 ký tự), nhập lại mật khẩu, nút Hiện/Ẩn. Hai mật khẩu phải giống nhau mới gửi đi. Nút Quay lại của trình duyệt và tải lại trang đều hoạt động đúng.
- Đăng ký xong mà cần xác nhận email → trang "Kiểm tra email của bạn" rồi nút **Đến trang đăng nhập** (email được điền sẵn). Nếu Supabase tắt xác nhận email thì vào app luôn.
- Email đã gõ được giữ khi chuyển qua lại giữa hai trang. Không cần chạy lại schema.sql.

## v3.38 — Trang Đăng nhập / Đăng ký có hiệu ứng (GSAP)
- Bố cục hai nửa: bên trái là "sân khấu" 日本語 — các chữ hiện dần như mực loang, nét cọ vàng được vẽ ra, rồi con dấu đỏ 学 đóng xuống kèm gợn sóng; kana trôi chậm theo 3 lớp sâu và lệch nhẹ theo con trỏ chuột; các câu tục ngữ Nhật đổi dần bên dưới. Bên phải là thẻ đăng nhập. Điện thoại: sân khấu thu gọn ở trên, thẻ nằm đè lên.
- Chuyển giữa **Đăng nhập ⇄ Đăng ký ⇄ Quên mật khẩu**: thẻ lật như mặt sau của flashcard, con dấu nhấn lại; sân khấu giữ nguyên nên mượt. Địa chỉ vẫn riêng (`#/dang-ky`).
- Sai mật khẩu / nhập lỗi → thẻ rung nhẹ. Đăng nhập xong → thẻ bay lên rồi vào app. Đăng ký xong → dấu tick được vẽ ra ở trang "Kiểm tra email".
- Nút chính có vệt sáng khi rê chuột và hút nhẹ theo con trỏ; ô nhập sáng viền vàng khi chọn.
- Máy bật "Giảm chuyển động" (hoặc không tải được GSAP) → trang tĩnh, vẫn dùng bình thường.
- GSAP 3.12.5 đặt tại `vendor/gsap.min.js` (giấy phép chuẩn của GreenSock, dùng miễn phí). Mã hiệu ứng: `js/auth-fx.js`; kiểu dáng: cuối `styles.css`. Không cần chạy lại schema.sql.

## v3.39 — Đổi chỗ hai nửa giữa Đăng nhập và Đăng ký
- Trang **Đăng nhập**: thẻ ở bên trái, sân khấu 日本語 ở bên phải. Trang **Đăng ký**: sân khấu bên trái, thẻ bên phải.
- Khi chuyển trang, hai nửa trượt qua nhau để đổi chỗ (thẻ vẫn lật nhẹ). Quên mật khẩu giữ bố cục của trang đăng nhập; trang "Kiểm tra email" giữ bố cục của trang đăng ký. Điện thoại xếp dọc nên không đổi chỗ.
- Không cần chạy lại schema.sql.

## v3.40 — Hiệu ứng GSAP trong toàn app
Mã ở `js/fx.js`. Mọi hiệu ứng ngắn (≤ 0.5 giây), chỉ dùng transform/opacity, không chặn thao tác; chỉ chạy khi **đổi màn hình** chứ không chạy lại mỗi lần dữ liệu vẽ lại.
- **Chuyển tab / vào màn phụ**: các khối nội dung hiện lần lượt (vào màn phụ trượt từ phải, quay lại trượt từ trái); biểu tượng tab nảy nhẹ.
- **Hôm nay**: con dấu "cần ôn" đóng xuống, số thẻ đếm lên. **Thống kê**: 4 số đếm lên, biểu đồ cột mọc từ đáy, các thanh dài ra.
- **Hộp thoại**: nền mờ dần, hộp trượt lên (điện thoại) hoặc phóng nhẹ ra (máy tính); lúc đóng mờ đi êm. **Toast** nảy lên rồi mờ đi. **Thanh chọn nhiều thẻ** trượt lên; **huy hiệu số thẻ đến hạn** nảy khi đổi số; nút ＋ bật ra.
- **Ôn tập**: thẻ lật 3D khi bấm; thẻ kế tiếp bay vào từ phải (nhớ) hoặc từ trái (không nhớ); Quiz/Gõ: đúng thì thẻ nhấp nhẹ, sai thì thẻ rung; màn kết quả: điểm đếm lên.
- Bật "Giảm chuyển động" của hệ điều hành (hoặc không có GSAP) → tắt toàn bộ, app chạy như trước. Test giao diện mặc định chạy ở chế độ giảm chuyển động cho ổn định; `tests/e2e/fx.spec.mjs` bật hiệu ứng để kiểm tra không để lại style thừa, không trùng id, không lỗi JS.
- Không cần chạy lại schema.sql.

## v3.41 — Công tắc bật/tắt hiệu ứng chuyển động
- **Khác → Cài đặt → Hiệu ứng chuyển động**: bấm để đổi vòng **Theo hệ thống → Tắt (tĩnh) → Bật**. "Tắt" làm toàn bộ app đứng yên (không còn hiệu ứng GSAP lẫn hoạt ảnh CSS), "Bật" luôn chạy hiệu ứng dù hệ điều hành đang xin giảm chuyển động, "Theo hệ thống" nghe theo cài đặt của máy (mặc định).
- Trang **Đăng nhập / Đăng ký** có liên kết nhỏ "Tắt hiệu ứng chuyển động" ngay dưới thẻ, để tắt được từ trước khi vào app (trang dựng lại tĩnh, giữ nguyên email đã gõ).
- Lựa chọn lưu trên từng thiết bị. Không cần chạy lại schema.sql.
