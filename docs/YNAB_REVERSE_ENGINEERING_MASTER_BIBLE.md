# Bản Đồ Toàn Diện Codebase YNAB (Master Reverse-Engineering Bible)

> **Phạm vi phân tích**: 100% các phân hệ nghiệp vụ, kiến trúc dữ liệu và giải thuật trong toàn bộ bundle YNAB Web.  
> **Các bundle giải mã**: `unminified/wrapper.renamed.js`, `unminified/main.renamed.js`, `unminified/internals.renamed.js`.

---

## 1. Cấu Trúc Tổng Thể Các Phân Hệ (System Map)

```
===================================================================================
                                  YNAB WEB ECOSYSTEM
===================================================================================

[1. PRESENTATION & EMBER UI]
 ├── Ember / Embroider Routing & Lifecycle (main.renamed.js)
 ├── Glimmer Wire-Format Bytecode Templates
 └── UI State Management (Inspectors, Modals, Overlays)

[2. DOMAIN LOGIC — KOTLIN MULTIPLATFORM ("SLIK")]
 ├── Budget Calculation Engine (RTA, Rollover, CC Debt, Overspending)
 ├── Smart Auto-Assign & Quick Budget (Priority Sorting)
 ├── Target & Goal Projection (Cadence, Underfunding, Finish Date)
 └── Loan & Amortization Engine (Mortgages, APR, Escrow, Minimum Pay)

[3. TRANSACTION & ACCOUNT LEDGER]
 ├── Unified Transaction Pipeline (Standard, Split, Scheduled, Pending)
 ├── Heuristic Bank Import & 2-Way Match Engine (10-day window)
 ├── Account Reconciliation Engine (3-Step lock & adjustment)
 └── Smart Payee Auto-Categorization (2-of-3 Recent Rule, Renaming)

[4. AUDIT & DATA CONTINUITY]
 ├── Recent Moves & Money Movement Audit Trail (34-day immutable log)
 ├── ChangeSet Transactional Batching (Atomic client mutations)
 ├── Knowledge-Based Delta Sync (Server Knowledge counter)
 └── Portation Engine (Budget & Transaction CSV/TSV Exporters)
===================================================================================
```

---

## 2. Chi Tiết Các Phân Hệ Bổ Sung Được Khôi Phục

### 2.1 Báo cáo & Phân tích Chi tiêu (Reports & Spending Trends)
* **Vị trí code**: `wrapper.renamed.js` (dòng 38190–38420).
* **Cơ chế tổng hợp**:
  1. **Lọc dữ liệu**: Bỏ qua các giao dịch `isOnBudgetTransfer`, `isScheduledTransaction` và `isScheduledSubTransaction` để tránh đếm trùng tiền.
  2. **Phân cấp 3 tầng**:
     - *Top-Level*: Gom nhóm theo Master Category Group.
     - *First-Level*: Chi tiết từng SubCategory trong nhóm.
     - *Second-Level*: Chi tiết từng giao dịch cá nhân.
  3. **Xử lý Uncategorized & Tracking**:
     - Chi tiêu không phân loại trên tài khoản On-Budget đưa vào nhóm `$p.UncategorizedTransactions`.
     - Chi tiêu trên tài khoản Off-Budget đưa vào nhóm `$p.TrackingTransactions`.
  4. **Thuật toán gom nhóm Top N (`groupTopCategories`)**:
     - Tự động giữ lại các nhóm chi tiêu lớn nhất và gộp các khoản chi nhỏ lẻ còn lại vào nhóm `Other Categories` để biểu đồ tròn (Donut Chart) không bị rối mắt.

### 2.2 Thuật toán Tự động Gợi ý Category cho Payee (Smart Auto-Categorization)
* **Vị trí code**: `wrapper.renamed.js` (dòng 22935–23010).
* **Quy tắc "2 of 3" (`two_of_three`)**:
  - Khi người dùng nhập một Payee, hệ thống kiểm tra 3 giao dịch gần nhất của Payee đó thông qua hàm `peekRecent3CategorizedTransactions`.
  - **Luật ra quyết định**:
    * Nếu **2 trong 3 giao dịch gần nhất** dùng chung một SubCategory $\rightarrow$ Đổi default category sang SubCategory đó.
    * Nếu không có danh mục nào chiếm đa số trong 3 lần gần nhất $\rightarrow$ Giữ nguyên danh mục mặc định cũ.
    * Giao dịch Split Transaction hoặc giao dịch gán vào danh mục nội bộ (Internal Category như Uncategorized/Inflow) **không bao giờ** được làm thay đổi danh mục mặc định của Payee.
  - **Tombstone Payee tự động**: Payee nào không còn được tham chiếu bởi bất kỳ transaction hay scheduled transaction nào sẽ tự động bị xóa mềm (`setIsTombstone(true)`).

### 2.3 Nhật ký Vết Dòng Tiền (Recent Moves / Money Movement Audit Trail)
* **Vị trí code**: `wrapper.renamed.js` (dòng 26620–26700).
* **Đặc tính bất biến (Immutable Record)**:
  - Khi tiền được di chuyển giữa 2 danh mục (Move Money), một thực thể `MoneyMovement` được tạo ra.
  - Các thuộc tính cốt lõi là **Read-Only / Immutable**: `amount`, `fromMonthlySubcategoryBudgetId`, `toMonthlySubcategoryBudgetId`, `moveStartedAt`, `performedByUserId`. Bất kỳ hành vi gọi setter nào đều ném ngoại lệ `Error("... is immutable after creation")`.
  - **Cửa sổ lưu vết**: `RECENT_MOVES_DAYS_TO_TRACK = 34` ngày. Sau 34 ngày, các bản ghi di chuyển tiền sẽ bị ẩn khỏi drawer Recent Moves.

### 2.4 Bộ Xuất Dữ liệu Ngân sách (Portation & Export Engine)
* **Vị trí code**: `wrapper.renamed.js` (dòng 40910–40940).
* **Tự động thích ứng Locale**:
  - Kiểm tra dấu thập phân của tiền tệ hiện tại (`decimal_separator`):
    * Nếu là dấu phẩy `,` (kiểu Châu Âu/Việt Nam) $\rightarrow$ Dùng dấu Tab `\t` làm dấu phân cách cột (TSV) để tránh xung đột với số tiền.
    * Nếu là dấu chấm `.` (kiểu Mỹ) $\rightarrow$ Dùng dấu phẩy `,` (CSV chuẩn).
  - Xuất 2 file nén đồng thời: `BudgetMonths.csv` (lịch sử ngân sách từng tháng) và `Register.csv` (toàn bộ sổ cái giao dịch).

---

## 3. Tổng Hợp Quy Tắc Ngân Sách Cốt Lõi Cần Tuân Thủ Cho `ynabx`

| Nghiệp vụ | Quy tắc vàng được giải mã từ YNAB | Tránh lỗi (Footguns) |
| :--- | :--- | :--- |
| **Tiền tệ** | Toàn bộ tính toán dùng số nguyên `long` (Milliunits, $1 = 1000$). | Tuyệt đối không dùng `float` / `double` vì sai số làm lệch zero-sum. |
| **RTA Math** | $RTA = \text{AvailableToBudget} - \max(0, \sum \text{Budgeted tương lai})$. | Không trừ trùng lặp tiền khi đã assign ở tháng sau. |
| **Rollover** | Chỉ số dư dương mới được cộng dồn. Bội chi tiền mặt trừ vào RTA tháng sau. | Bội chi thẻ tín dụng trở thành nợ, không được trừ vào RTA. |
| **Auto-Assign** | Ưu tiên: Âm tiền mặt $\rightarrow$ Trả thẻ tín dụng $\rightarrow$ Hạn hóa đơn gần nhất $\rightarrow$ Thứ tự trên lưới. | Không chia tiền theo tỷ lệ phần trăm (pro-rata). |
| **Bank Match** | Khớp chính xác `amount` và khoảng cách ngày tối đa $\le 10$ ngày. | Không tự động match nếu là giao dịch On-Budget Transfer đối ứng. |
| **Payee Autocat**| Luật "2 trong 3 giao dịch gần nhất đồng thuận". | Split transaction không được thay đổi default category của Payee. |
| **Reconcile** | Khóa giao dịch sang `Reconciled` và sinh transaction cân bằng nếu lệch tiền. | Không cho phép sửa xóa các transaction đã reconciled mà không mở khóa. |
