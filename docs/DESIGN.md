# DESIGN.md — YNABX Design System & UI/UX Guidelines

Tài liệu này quy định hệ thống Design Tokens, quy tắc ánh xạ màu sắc theo trạng thái (status-based color mapping), các biến thể button, progress bar, bảng số liệu và nguyên tắc popover/modal tương tác của **ynabx**.

---

## 1. Triết lý Thiết kế (YNAB Zero-Based Visual Hierarchy)

YNAB áp dụng nguyên tắc ngân sách phong bì số 0 (Zero-based Envelope Budgeting). Màu sắc trong giao diện không chỉ để trang trí mà phản ánh trực tiếp **nghĩa vụ tài chính** của người dùng:
- **Xanh lá mạ (#aee865)**: Đã được cấp đủ tiền (Funded / Positive).
- **Vàng nghệ (#f8d655)**: Cần lưu ý / Nợ thẻ tín dụng / Chưa đủ chỉ tiêu (Cautious / Credit Overspending / Underfunded).
- **Đỏ san hô (#faada5)**: Bội chi tiền mặt thực tế (Cash Overspent) — Cực kỳ nguy cấp, tiền trong tài khoản ngân hàng đã âm so với thực tế.
- **Xám / Beige (#f3eee2)**: Trạng thái cân bằng hoàn hảo ($0.00 / All Money Assigned / Zero). Không dùng màu xanh khi tiền sẵn sàng bằng 0.

---

## 2. Bảng Mã Màu Trạng Thái (Semantic Color Tokens)

Tất cả các màu này được định nghĩa tại `frontend/src/index.css` và `frontend/src/ynab.css`:

| Trạng thái | Background Hex | Label / Text Hex | CSS Variable | Ý nghĩa tài chính |
| :--- | :--- | :--- | :--- | :--- |
| **Positive / Funded** | `#aee865` | `#191818` | `--categoryBalancePositiveBackground`<br/>`--categoryBalancePositiveLabel` | Danh mục có tiền khả dụng dư; RTA > 0 |
| **Cash Overspent** | `#faada5` | `#191818` | `--categoryBalanceNegativeBackground`<br/>`--categoryBalanceNegativeLabel` | Bội chi từ tài khoản thanh toán/tiền mặt; RTA < 0 |
| **Credit Overspent / Cautious** | `#f8d655` | `#191818` | `--categoryBalanceWarningBackground`<br/>`--categoryBalanceWarningLabel` | Chi tiêu thẻ tín dụng chưa có tiền bảo chứng; chưa hoàn thành target |
| **Zero / Balanced** | `#f3eee2` | `#696763` | `--categoryBalanceZeroBackground`<br/>`--categoryBalanceZeroLabel` | Tiền khả dụng bằng $0; tất cả tiền đã được giao việc (All Money Assigned) |

---

## 3. Quy tắc Ánh xạ Màu theo Thành phần (Component Mappings)

### 3.1. Banner "Ready to Assign" (RTA)
Nằm ở đầu trang ngân sách (`.to-be-budgeted`):

| Điều kiện | CSS Classes | Background | Nhãn hiển thị |
| :--- | :--- | :--- | :--- |
| `rta > 0` | `.to-be-budgeted.is-positive` | `#aee865` (Xanh mạ) | **Ready to Assign** |
| `rta === 0` | `.to-be-budgeted.zero.is-zero` | `#f3eee2` (Beige/Xám) | **All Money Assigned** |
| `rta < 0` | `.to-be-budgeted.is-negative` | `#faada5` (Đỏ san hô) | **You Need to Assign** |

> [!IMPORTANT]
> Tuyệt đối không để RTA = \$0 hiển thị màu xanh lá cây (`is-positive`). Trong YNAB, RTA = \$0 là trạng thái "đã giao việc hết cho từng đồng" (Zero-based), phải dùng màu trung tính (`#f3eee2`).

---

### 3.2. Available Balance Pills (Viên thuốc khả dụng)
Nằm trong cột `Available` của từng danh mục và nhóm (`.ynab-new-budget-available-number`):

```tsx
className={`ynab-new-budget-available-number js-budget-available-number user-data ${
  cat.available_milliunits === 0
    ? "zero pill-zero"
    : cat.available_milliunits > 0
      ? "positive pill-positive"
      : cat.is_credit_card_payment
        ? "cautious pill-warning"
        : "negative pill-negative"
}`}
```

- **`Available > 0`**: Dùng `.positive.pill-positive` (Nền `#aee865`, chữ `#191818`, bo tròn 16px).
- **`Available === 0`**: Dùng `.zero.pill-zero` (Nền `#f3eee2`, chữ `#696763`).
- **`Available < 0` (Thẻ tín dụng)**: Dùng `.cautious.pill-warning` (Nền `#f8d655`, chữ `#191818`).
- **`Available < 0` (Tiền mặt / Checking)**: Dùng `.negative.pill-negative` (Nền `#faada5`, chữ `#191818`).

> [!NOTE]
> Cột `Available` của **Category Group** (dòng nhóm cha) **KHÔNG ĐƯỢC CÓ NỀN PILL**. Trong YNAB chuẩn, nhóm cha chỉ hiển thị chữ số tiền tệ thuần túy căn phải, không bo tròn nền viên thuốc. Chỉ dòng danh mục con (sub-categories) mới có nền pill.

---

### 3.3. Cấu trúc Cell Danh mục & Thanh tiến độ (Category Progress Bar)
Hiển thị trong ô tên danh mục (`.budget-table-cell-name`):
- **Cấu trúc 2 tầng (Two-row layout)**:
  1. **Hàng trên (`.budget-table-cell-edit-category-label`)**: 
     - Góc trái: Nút tên danh mục (`.budget-table-cell-name-row-label-item`) kèm icon bút chì (`.category-edit-trigger-btn`).
     - **Góc phải**: Trạng thái chi tiêu nằm ở phía trên bên phải (`.budget-table-cell-goal-status`), ví dụ: `Funded · Spent $204.65` hoặc `Overspent · -$1,400.00` hoặc `$0.00 needed`.
  2. **Hàng dưới (`figure.ynab-new-budget-bar-v2`)**: 
     - Thanh tiến độ nằm ở dưới, trải dài `width: 100%` toàn bộ ô danh mục (bên dưới cả tên và text trạng thái).
- **Quy cách Bar Track & Bar Fill**:
  - Container cao `4px`, `border-radius: 2px`, nền `var(--backgroundTertiary, #f2efe9)`.
  - Fill khi `isOverspent`: Width `100%`, nền `#faada5` (Đỏ san hô).
  - Fill khi `isFunded`: Width `100%`, nền `#aee865` (Xanh mạ).
  - Fill khi `underfunded / in-progress`: Width theo tỷ lệ %, nền `#f8d655` (Vàng nghệ).

---

### 3.4. Thanh công cụ Filter Danh mục (Category Filters Toolbar)
Các nút lọc nằm phía dưới thanh điều hướng tháng:
- Nút **Overspent**: Chỉ kích hoạt màu đỏ cảnh báo (`.overspent-cash`) khi thực sự có ít nhất 1 danh mục bị âm tiền (`overspentCount > 0`). Khi không có danh mục bội chi (`overspentCount === 0`), nút mang màu trung tính bình thường.
- Cơ chế Toggle: Bấm vào một filter đang chọn sẽ hủy chọn và quay lại chế độ hiển thị toàn bộ (`ALL`). Khi áp dụng filter, ẩn các nhóm danh mục không có phần tử khớp.

---

### 3.4. Hệ thống Buttons (Nút bấm)

| Loại Button | CSS Class | Nền (Background) | Chữ (Text) | Sử dụng cho |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `.button.button-primary` | `#545bfe` (YNAB Indigo Blurple) | `#ffffff` | Submit form, Save, Add Category, Log In |
| **Secondary** | `.button.button-secondary` | `rgba(84, 91, 254, 0.1)` | `#545bfe` | Quick Budget / Auto-Assign actions, Reopen account |
| **Cancel / Danger** | `.button.button-cancel` | `#edf1f5` hoặc viền đỏ | `#6e7a88` hoặc `#bf2e3b` | Hủy thao tác, Xóa danh mục/tài khoản |
| **Ghost Button** | `.ghost-button.primary` | `transparent` (hover: `#f4f6f8`) | `#545bfe` | Thanh Toolbar: Add Transaction, Undo, Redo, File Import |
| **Row Action Trigger** | `.category-edit-trigger-btn` | `transparent` (hover: `#d2d8de`) | `#6e7a88` | Nút bút chì cạnh tên danh mục (chỉ hiện khi hover hoặc focus) |

---

## 4. Quy tắc UX cho Popover & Modal Neo (Anchored Popovers)

### 4.1. Phân biệt Click Row vs Click Edit Button
- **Click vào tên hoặc cả dòng danh mục**: Chỉ kích hoạt `onSelectCategory(id)` để hiển thị panel chi tiết bên phải (**Budget Inspector**). Tuyệt đối **không** mở popover chỉnh sửa để tránh che khuất bảng tính.
- **Double-click hoặc click icon cây bút (`.category-edit-trigger-btn`)**: Mở `CategoryMenuPopover` ngay cạnh tên danh mục.

### 4.2. Neo vị trí Popover (Popover Anchoring)
`MoveMoneyModal`, `ReconcileModal`, và `CategoryMenuPopover` sử dụng lớp `.popover-anchor-overlay`:
```css
.modal-overlay.popover-anchor-overlay {
  display: block !important;
  background-color: transparent !important;
  pointer-events: auto !important;
}
```
- Khi mở modal dạng popover neo theo nút: container không dùng `display: flex; justify-content: center` (tránh popover bị kéo giật ra giữa màn hình), mà neo tuyệt đối theo `rect.bottom + 4px` và tọa độ `rect.left` / `rect.right` của nút kích hoạt.
- Đóng popover: Sử dụng sự kiện `mousedown` kiểm tra `popoverRef.current.contains(event.target)` kết hợp với `triggerRef` để không bị race-condition khi bấm lại vào nút kích hoạt.

---

## 5. Typography & Biểu diễn Tiền tệ

- **Font Family**: Google Fonts `Figtree`, `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Tabular Figures (Chống giật số)**:
  Tất cả các con số tiền tệ phải có class `.tabular-nums` hoặc `font-feature-settings: "tnum"` để các chữ số 0-9 có cùng độ rộng, không làm xô lệch cột Assigned, Activity, Available khi cập nhật.
- **Thẻ `<bdi>` (Bi-directional Isolation)**:
  Bọc mọi ký hiệu tiền tệ và số tiền trong `<bdi>` để tránh lỗi layout khi hiển thị trên các trình duyệt hoặc hệ thống có ngôn ngữ RTL (Right-to-Left).
