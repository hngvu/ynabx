# Bổ sung Phân tích Reverse Engineering: Các hệ thống nghiệp vụ khác trong YNAB

Tài liệu này tổng hợp toàn bộ các phân hệ nghiệp vụ khác được giải mã từ `unminified/wrapper.renamed.js` và `unminified/main.renamed.js`.

---

## 1. Hệ thống Khớp Giao Dịch Nhập Khẩu (Bank Import & Matching Engine)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 23700–23925)

YNAB sử dụng thuật toán heuristic 2 chiều để tự động gộp (match) giao dịch do người dùng nhập tay với giao dịch tải về từ ngân hàng (Direct Import/File Import/Plaid).

### Quy tắc Matching:
1. **Khoảng cách ngày tối đa**:
   $$\text{MATCH\_MAX\_DAYS\_APART} = 10 \text{ ngày}$$
2. **Khớp số tiền (Exact Amount)**: Giao dịch phải có cùng số tiền (`amount`).
3. **Cặp trạng thái hợp lệ (`VALID_CANDIDATE_SOURCE_PAIRS`)**:
   - Giao dịch nhập tay (`source: null` hoặc `Matched`) ghép với giao dịch import (`source: Imported` hoặc `ImportedPending`).
4. **Xử lý Payee & Category**:
   - Khi match, YNAB ưu tiên giữ lại Payee và Category mà người dùng đã chỉ định thủ công.
   - Khi người dùng unmatch (`unMatch`), hệ thống khôi phục lại Payee gốc (`importedPayee`) từ ngân hàng.

---

## 2. Quy trình Đối Soát Tài Khoản (Account Reconciliation)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 35740–36240)

Quy trình đối soát tài khoản được thực thi theo 3 bước tuần tự trong class `tp` (Action `ReconcileAccountAction`):

```
+-----------------------------------------------------------+
| 1. Kiểm tra Cleared Balance                               |
|    clearedBalance = SUM(transactions where isCleared)     |
+-----------------------------------------------------------+
                             │
                             ▼
+-----------------------------------------------------------+
| 2. Tạo Adjustment Transaction (nếu có chênh lệch)         |
|    - payee: "Reconciliation Balance Adjustment"           |
|    - adjustmentType: Xf.Reconciliation                    |
|    - amount = targetBalance - clearedBalance              |
+-----------------------------------------------------------+
                             │
                             ▼
+-----------------------------------------------------------+
| 3. Khóa trạng thái giao dịch (Lock to Reconciled)         |
|    - Chuyển tất cả giao dịch Cleared -> Reconciled (ma.Reconciled)
|    - Cập nhật account.setLastReconciledAt(new Date())     |
+-----------------------------------------------------------+
```

---

## 3. Hệ thống Giao Dịch Định Kỳ (Scheduled & Recurring Transactions)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 23300, dòng 25890–25945)

### Các chu kỳ lặp (`Frequency Enum`):
* `Never` (0)
* `Daily` (1 ngày)
* `Weekly` (7 ngày)
* `EveryOtherWeek` (14 ngày)
* `TwiceAMonth` (Cách 15 ngày, tự động căn chỉnh vào ngày cuối tháng nếu rơi vào tháng 2/tháng thiếu)
* `Every4Weeks` (28 ngày)
* `Monthly`, `EveryOtherMonth` (2 tháng), `Every3Months` (Quý), `Every4Months`, `TwiceAYear` (6 tháng)
* `Yearly`, `EveryOtherYear` (2 năm)

### Logic Fabricated Transfer:
Khi một giao dịch định kỳ có đích đến là chuyển khoản giữa 2 tài khoản On-Budget (`transferAccountId`), YNAB tự động tạo một cặp giao dịch ảo đối ứng (*Fabricated Scheduled Transaction Transfer*) để hiển thị ở cả 2 sổ cái mà không ghi đè vào database cho tới khi đến ngày phát sinh thực tế.

---

## 4. Hệ thống Mục Tiêu Tiết Kiệm (Targets / Goals Engine)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 21940, 22460–22520)

### Các loại Target (`GoalTypeIdentifier`):
1. **Needed for Spending** (`NEED`):
   - Cần một khoản tiền theo tuần (`Weekly`), tháng (`Monthly`), hoặc đến một ngày cụ thể (`ByDate`).
   - Tiền thừa từ tháng trước (`Rollover`) sẽ được tính vào mục tiêu của tháng này (giúp giảm số tiền cần assign thêm).
2. **Target Savings Balance** (`TB` / `TBD`):
   - Duy trì một số dư cố định trong envelope, không phụ thuộc vào chu kỳ chi tiêu hàng tháng.
3. **Monthly Savings Builder** (`MF`):
   - Yêu cầu assign đều đặn một số tiền cố định mỗi tháng, bất kể đã chi tiêu bao nhiêu hay còn thừa bao nhiêu.
4. **Credit Card Debt Payment** (`DEBT`):
   - Đặt mục tiêu trả hết nợ thẻ tín dụng vào ngày mục tiêu hoặc trả một số tiền cố định hàng tháng (`PaySpecificAmountMonthly`).

---

## 5. Chỉ Số Tuổi Của Tiền (Age of Money - AoM)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 18795, 30846) & `main.renamed.js` (dòng 36735–37095)

* **Bản chất**: Đo lường bằng thuật toán **FIFO (First-In, First-Out)**:
  * So khớp từng khoản chi tiêu (`Outflow`) gần nhất với các dòng tiền thu nhập (`Inflow`) từ quá khứ.
  * Khoảng cách số ngày trung bình giữa ngày thu nhập vào và ngày chi tiêu tương ứng chính là **Age of Money**.
* Giá trị `ageOfMoney` được backend tính toán và lưu trực tiếp trong bản ghi `MonthlyBudgetCalculation` của từng tháng.
