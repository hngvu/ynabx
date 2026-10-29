# YNAB Playwright Scraper & Resource Extractor

Bộ công cụ Playwright tự động hóa trích xuất DOM, Computed Styles, Theme CSS Variables, SVG Icons và ảnh chụp màn hình UI từ YNAB (`app.ynab.com`).

---

## Tính năng

1. **Bảo toàn Phiên đăng nhập (Session)**: Sử dụng Chrome Persistent Context (`.user-data`), chỉ cần đăng nhập tài khoản YNAB một lần duy nhất.
2. **Hỗ trợ kết nối trực tiếp (CDP)**: Có thể kết nối thẳng vào Chrome đang mở sẵn của bạn qua `--remote-debugging-port=9222`.
3. **Trích xuất Component chi tiết**:
   - Tách riêng từng component: Sidebar, Budget Header, Ready To Assign banner, Category rows, Inspector sidebar, Reconcile modal, Add Transaction row.
   - Trích xuất HTML kèm `*-styles.json` (toàn bộ CSS computed styles thật của element).
4. **Trích xuất Theme & Biến CSS**: Lưu toàn bộ `--*` CSS custom properties (màu sắc, spacing, typography).
5. **Trích xuất SVG Icons**: Tự động bóc tách các icon SVG và Symbol sprites thành file `.svg` độc lập.

---

## Cài đặt & Hướng dẫn sử dụng

### 1. Khởi tạo & Đăng nhập lần đầu

Mở terminal và di chuyển vào thư mục scraper:
```powershell
cd scripts/scraper
npm run login
```
* Trình duyệt Chromium sẽ mở ra trang `https://app.ynab.com`.
* Bạn đăng nhập vào tài khoản YNAB bình thường (Google, Apple hoặc Email).
* Script sẽ tự động phát hiện khi bạn vào màn hình Budget/Accounts, in thông báo thành công và lưu session vào `.user-data`.

---

### 2. Trích xuất Tài nguyên

Sau khi đã đăng nhập:

* **Dump Budget View (Bảng ngân sách, Inspector, RTA banner):**
  ```powershell
  npm run dump:budget
  ```
  Kết quả lưu tại `scripts/scraper/output/budget/`.

* **Dump Accounts View (Sổ cái giao dịch, Add Row, Reconcile modal):**
  ```powershell
  npm run dump:accounts
  ```
  Kết quả lưu tại `scripts/scraper/output/accounts/`.

* **Trích xuất SVG Icons:**
  ```powershell
  npm run extract:icons
  ```
  Kết quả lưu tại `scripts/scraper/output/icons/`.

---

### 3. Tùy chọn nâng cao

* **Chạy ẩn (Headless mode)**: Thêm cờ `--headless`
  ```powershell
  node dump-budget.mjs --headless
  ```

* **Kết nối vào Chrome hiện có của bạn qua CDP**:
  1. Khởi động Chrome của bạn với tham số gỡ lỗi:
     ```powershell
     chrome.exe --remote-debugging-port=9222
     ```
  2. Chạy script với cờ `--cdp`:
     ```powershell
     node dump-budget.mjs --cdp
     ```
