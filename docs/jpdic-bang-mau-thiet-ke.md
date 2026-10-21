# Bảng màu thiết kế — Japanese Dictionary (web v3.26)

Nguồn: `styles.css` (khối `:root`). Hai giao diện: **tối** (mặc định) và **sáng** (theo máy hoặc chọn ở Khác → Giao diện).

## 1. Màu nền và chữ

| Biến | Vai trò | Tối | Sáng |
|---|---|---|---|
| `--bg` | Nền trang | `#0f1626` | `#eceff4` |
| `--surface` | Thẻ, thanh dưới | `#172036` | `#ffffff` |
| `--surface2` | Nền phụ, ô nhập nổi | `#1f2b47` | `#e3e8f0` |
| `--line` | Đường viền | `#2b3856` | `#cdd5e2` |
| `--guide` | Đường kẻ ô tập viết | `rgba(236,230,214,.09)` | `rgba(23,32,58,.09)` |
| `--text` | Chữ chính | `#ece6d6` | `#17203a` |
| `--mute` | Chữ phụ | `#9aa3b8` | `#5d6985` |

## 2. Màu nhấn và trạng thái

| Biến | Vai trò | Tối | Sáng |
|---|---|---|---|
| `--accent` | Nhấn, nút chính (vàng hổ phách) | `#e2a93b` | `#b9770e` |
| `--accent-ink` | Chữ trên nút nhấn | `#1a1405` | `#ffffff` |
| `--ok` | Thành công | `#67b58c` | `#2f8a5c` |
| `--bad` | Lỗi, xóa | `#e0675b` | `#c4443a` |
| `--info` | Thông tin | `#7fa6e8` | `#3b6bc4` |
| `--shadow` | Bóng đổ | `0 10px 30px rgba(0,0,0,.35)` | `0 10px 30px rgba(23,32,58,.12)` |

## 3. Màu cố định (cả hai giao diện)

- Trạng thái ghi nhớ: Mới `#6b8cff` · Đang học `#f0b429` · Đã nhớ `#4ecb85`
- Cấp JLPT: N5 `#4ecb85` · N4 `#3ecfcf` · N3 `#4a90d9` · N2 `#9b7fe8` · N1 `#e85d5d`
- Màu mặc định của bộ thẻ mới: `#4A90D9`
- Màu thanh trình duyệt điện thoại (`index.html`, `theme-color`): `#0f1626`

## 4. Chữ và kích thước

- Giao diện, tiếng Việt: Be Vietnam Pro (dự phòng Zen Kaku Gothic New, Hiragino Sans, Noto Sans JP, system-ui)
- Chữ Nhật, tiêu đề: Zen Old Mincho (dự phòng Hiragino Mincho ProN, Noto Serif JP, Yu Mincho)
- Cỡ chữ gốc 15px, chữ nhỏ 13px; ô nhập 16px (tránh iOS tự phóng to)
- Bo góc chuẩn `--r: 14px`; thanh dưới điện thoại cao `--nav-h: 64px`; thanh bên máy tính hiện từ 900px

## 5. Đoạn CSS để dùng lại

```css
:root {
  --bg: #0f1626; --surface: #172036; --surface2: #1f2b47; --line: #2b3856; --guide: rgba(236, 230, 214, .09);
  --text: #ece6d6; --mute: #9aa3b8; --accent: #e2a93b; --accent-ink: #1a1405;
  --ok: #67b58c; --bad: #e0675b; --info: #7fa6e8; --shadow: 0 10px 30px rgba(0, 0, 0, .35);
  --nav-h: 64px; --r: 14px;
}
:root[data-theme="light"] {
  --bg: #eceff4; --surface: #ffffff; --surface2: #e3e8f0; --line: #cdd5e2; --guide: rgba(23, 32, 58, .09);
  --text: #17203a; --mute: #5d6985; --accent: #b9770e; --accent-ink: #ffffff;
  --ok: #2f8a5c; --bad: #c4443a; --info: #3b6bc4; --shadow: 0 10px 30px rgba(23, 32, 58, .12);
}
```

Muốn đổi màu: sửa các biến `--...` trong `styles.css` (khối tối và hai khối sáng), không cần sửa chỗ khác.
