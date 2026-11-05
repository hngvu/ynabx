# Toàn cảnh Kiến trúc và Phân hệ Ẩn của YNAB (Decompiled Master Report)

Tài liệu này bao quát các phân hệ cấp sâu (deep subsystems) còn lại trong bundle YNAB:
1. **Thuật toán Phân bổ Tự động Thông minh (Smart Auto-Assign Engine & Priority Sorting)**
2. **Hệ thống Quản lý Giao dịch Phân tách (Split Transactions & Tombstone Cleanup)**
3. **Bộ tính toán Khoản vay & Trả góp (Loan & Amortization Engine)**
4. **Mô hình Giao dịch Khối phân tán (ChangeSet Transactional Management & Offline Store)**

---

## 1. Thuật toán Phân bổ Tự động Thông minh (Smart Auto-Assign Engine)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 148360–148530)

Khi người dùng ấn **Auto-Assign (Quick Budget)** với tùy chọn **Underfunded**, nếu số tiền Ready to Assign ($RTA$) không đủ để cấp vốn cho toàn bộ các danh mục còn thiếu, YNAB **không chia đều (không chia tỷ lệ)**. Thay vào đó, hệ thống sử dụng thuật toán **Sắp xếp Đa tầng Ưu tiên (Multi-level Priority Sorting)** để rót tiền lần lượt:

### Thứ tự ưu tiên rót tiền (Priority Order):
1. **`isOverSpent` (Bội chi tiền mặt)**: Danh mục nào đang bị âm tiền mặt (`balance < 0`) sẽ được cứu trước tiên để tránh thủng ngân sách.
2. **`isCreditCardPaymentCategory`**: Thanh toán nợ thẻ tín dụng đến hạn.
3. **`firstNeededByDate` (Hạn cần tiền gần nhất)**:
   - Các danh mục có hóa đơn sắp đến hạn (`upcomingTransactionsFirstDate`) hoặc mục tiêu tiết kiệm có `goalFinishDate` gần nhất trong tháng sẽ được cấp tiền trước.
4. **Phân bổ tuần tự cho mục tiêu hàng tuần (`Weekly Cadence`)**: Với các mục tiêu hàng tuần, thuật toán chia nhỏ thành từng tuần và cấp vốn từng tuần một cho đến khi cạn $RTA$.
5. **`sortIndex` (Thứ tự danh mục trên giao diện)**: Nếu các tiêu chí trên ngang nhau, danh mục nào nằm ở vị trí cao hơn trong danh sách (Category Group / Sort Order) sẽ nhận tiền trước.

### Các tùy chọn Auto-Assign khác (`QuickBudgetOption Enum`):
* `Underfunded`: Cấp tiền đúng số tiền còn thiếu theo Target hoặc Hóa đơn sắp tới.
* `Assigned Last Month` (`BudgetedLastMonth`): Sao chép chính xác số tiền đã gán tháng trước.
* `Spent Last Month` (`SpentLastMonth`): Gán đúng số tiền thực tế đã tiêu ở tháng trước.
* `Average Assigned` (`AverageBudgeted`): Gán theo số tiền trung bình đã assign trong các tháng trước.
* `Average Spent` (`AverageSpent`): Gán theo mức chi tiêu trung bình.
* `Reset Assigned Amount` (`ResetBudgetedAmounts`): Đưa Assigned về 0.
* `Set Available Amount to Zero`: Rút toàn bộ tiền thừa trong category về Ready to Assign.

---

## 2. Hệ thống Giao dịch Phân tách (Split Transactions)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 25165–25210)

Giao dịch chia nhỏ một khoản chi tiêu cho nhiều danh mục khác nhau (`SubTransactions`):
- Khi một giao dịch được chia nhỏ: `_editTransaction.setIsSplit(true)`.
- **Nguyên tắc bảo toàn số tiền**:
  $$\text{ParentTransaction.amount} = \sum \text{SubTransaction}_i\text{.amount}$$
- **Xử lý Tombstone (Xóa mềm)**: Khi người dùng xóa một dòng split, sub-transaction đó không bị xóa khỏi bộ nhớ ngay mà được đánh dấu `setIsTombstone(true)`. Nếu tất cả sub-transaction đều bị tombstone, giao dịch tự động chuyển về dạng đơn lẻ (`unSplitTransaction`).

---

## 3. Bộ Tính toán Khoản vay & Trả góp (Loan & Amortization Engine)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 24040–24280)

YNAB tích hợp một công cụ giải bài toán tài chính khoản vay (Mortgage, Auto Loan, Personal Loan) ngay ở client:
* **Các tham số đầu vào**:
  * `balance`: Dư nợ gốc ban đầu.
  * `interestRate`: Lãi suất hàng năm (APR).
  * `paymentAmount`: Số tiền trả mỗi kỳ.
  * `escrowAmount`: Tiền thuế/bảo hiểm giữ hộ (Escrow).
  * `paymentFrequency`: Tần suất thanh toán.
* **Bộ giải Amortization (`solveAmortization`)**:
  * Tự động tính số kỳ thanh toán cần thiết (`paymentPeriodCount`) hoặc tính ngược số tiền phải trả mỗi tháng (`periodicPaymentAmount`) để tất toán vào ngày định trước.
  * Tách bạch từng khoản thanh toán thành 2 phần: **Gốc (Principal)** và **Lãi (Interest)**.

---

## 4. Mô hình Giao dịch Khối phân tán (ChangeSet Transactional Management)

> **Mã nguồn giải mã**: `wrapper.renamed.js` (dòng 27338, 31405–31420)

Mọi thao tác thay đổi dữ liệu trong YNAB (từ gán tiền, nhập giao dịch, đối soát cho đến match giao dịch) đều được thực hiện thông qua **ChangeSet Manager**:
```javascript
this.entityManager.performAsSingleChangeSet(() => {
  // Thực hiện nhiều thao tác ghi dữ liệu liên hoàn
  // Đảm bảo tính nguyên tử (Atomicity) ở client
  // Chỉ emit signal / notify giao diện 1 lần duy nhất khi khối hoàn tất
});
```
* **Đặc tính**:
  1. Ngăn chặn hiện tượng giật lag UI do render lại nhiều lần khi cập nhật hàng loạt danh mục.
  2. Gom tất cả các thực thể thay đổi vào một batch duy nhất để gửi lên server trong đợt sync tiếp theo.
