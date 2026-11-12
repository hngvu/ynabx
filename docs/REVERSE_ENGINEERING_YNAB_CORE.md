# YNAB Architecture & Domain Reverse Engineering Report

> **Nguồn phân tích**: Bundle production YNAB (`wrapper.renamed.js`, `main.renamed.js`, `internals.renamed.js`).  
> **Bộ dịch**: Kotlin MultiPlatform (KMP - Project "Slik") compile sang JavaScript + Ember.js/Embroider Framework.  
> **Vị trí code**: `c:\Users\hoang\Desktop\ynabx\unminified\`

---

## 1. Kiến trúc phân tầng (Multi-tier Architecture)

```
+-------------------------------------------------------------------------------+
|                             EMBER.JS APPLICATION                              |
|   - Controllers & Routes (main.renamed.js)                                    |
|   - Glimmer UI Wire Format / Components                                       |
|   - Ember Data Store & Local Storage Adapters                                 |
+-------------------------------------------------------------------------------+
                                        │
                         JS Interop / Wrapper Bridge
                                        ▼
+-------------------------------------------------------------------------------+
|                      SLIK DOMAIN CORE (Kotlin Multiplatform)                   |
|   Namespace: default.ynab.slik.*                                              |
|                                                                               |
|   ├── domain.entities.web.CategoryMonth.BudgetCategoryMonth                    |
|   ├── domain.entities.web.CategoryMonth.ReadyToAssignMonth                    |
|   ├── domain.payees.usecases.web (AutoCategorize, CombinePayees)              |
|   ├── domain.filebasedimport.web (EnrichTransactions, ParseFile)              |
|   └── domain.savebudgetsettings.web                                           |
+-------------------------------------------------------------------------------+
                                        │
                         Calculations & Reducers (AST)
                                        ▼
+-------------------------------------------------------------------------------+
|                   YNAB ZERO-BASED BUDGET ENGINE (Milliunits)                  |
|   - Rollover Calculations (Positive rollover vs Cash overspent)               |
|   - Ready To Assign (RTA) Reduction across future budgeted months             |
|   - Target / Goal Progress Bar Calculators (Needed for Spending, Target Bal)  |
|   - Credit Card Payment Auto-Assignment Handler                               |
+-------------------------------------------------------------------------------+
```

---

## 2. Công thức toán & Thuật toán cốt lõi (Decompiled Core Math)

### 2.1 Ready to Assign (RTA) Calculation
Trích xuất từ hàm `calculateReadyToAssignAmount_yd5wci_k$(targetMonth, allMonths)` (dòng 83514–83536):

$$\text{RTA}_{\text{Month } M} = \text{AvailableToBudget}_M - \max\left(0, \sum_{m > M} \text{Budgeted}_m\right)$$

* **Cơ chế**:
  1. Lấy `availableToBudget` của tháng đích $M$.
  2. Lọc tất cả các tháng tương lai $m > M$.
  3. Lấy tổng số tiền đã phân bổ (`budgeted`) trong tương lai thông qua hàm `yA(t) { return t.budgeted_1; }`.
  4. Nếu số tiền phân bổ trong tương lai > 0, nó sẽ khấu trừ trực tiếp vào RTA của tháng hiện tại để ngăn chặn việc chi tiêu 2 lần cùng một dòng tiền (*Double Assignment Protection*).

### 2.2 Category Rollover & Available Math
Trích xuất từ `originalKotlinClass_BudgetCategoryMonth` (dòng 83740–83800):

* **Rollover từ tháng trước**:
  ```javascript
  get_rolloverFromLastMonth() {
    var t = previousMonthBalance;
    return 0n >= t ? 0n : t; // Chỉ roll số dương, số âm do tiền mặt được xử lý qua RTA
  }
  ```
* **Available của Category**:
  $$\text{Available} = \text{Rollover} + \text{Assigned} + \text{CashOutflows} + \text{CreditOutflows}$$
* **Phân định Cash vs Credit Overspending**:
  * **Cash Overspending** ($\text{CashOutflows} > \text{Funded}$): Làm âm quỹ tiền mặt thực tế $\rightarrow$ Reset Available của tháng sau về 0, trừ khoản thiếu hụt vào `Ready to Assign` của tháng sau.
  * **Credit Overspending** ($\text{CreditOutflows} > \text{Funded}$): Biến thành nợ thẻ tín dụng tồn đọng (Unfunded Debt) $\rightarrow$ Không trừ vào RTA tháng sau.

### 2.3 Phân bổ nợ thẻ tín dụng (Credit Card Payment Flow)
Trích xuất từ dòng 22220–22420:
* Khi một giao dịch chi tiêu thẻ tín dụng xảy ra ở danh mục chi tiêu (ví dụ: *Groceries*):
  1. Hệ thống kiểm tra số dư khả dụng (`Available`) trong *Groceries*.
  2. Số tiền khả dụng (tối đa bằng số tiền giao dịch) được tự động chuyển từ *Groceries* sang danh mục **Credit Card Payment** tương ứng.
  3. Tiền trong tài khoản ngân hàng chuyển đổi mục đích: từ "Mua đồ ăn" thành "Sẵn sàng trả nợ thẻ tín dụng".

---

## 3. Danh bạ Module SLIK & KMP Entities trích xuất được

| Module KMP / Namespace | Trách nhiệm trong hệ thống |
| :--- | :--- |
| `slik.domain.entities.web.CategoryMonth.BudgetCategoryMonth` | Đại diện cho 1 dòng ngân sách hàng tháng (Assigned, Available, Activity, Target). |
| `slik.domain.entities.web.CategoryMonth.ReadyToAssignMonth` | Thực thể quản lý RTA và dòng tiền chưa gán của tháng. |
| `slik.domain.payees.usecases.web.PayeeSetAutoCategorizeUseCase` | Machine learning / Heuristic tự động gán category dựa trên lịch sử payee. |
| `slik.domain.payees.usecases.web.CombinePayeesUseCase` | Hợp nhất các Payee trùng lặp và cập nhật toàn bộ ledger giao dịch. |
| `slik.domain.filebasedimport.web.ParseFileUseCase` | Parse file sao kê ngân hàng (OFX, QFX, CSV) ở phía client. |
| `slik.domain.filebasedimport.web.EnrichTransactionsUseCase` | Làm sạch tên đối tác (Payee cleaning) và gợi ý phân loại trước khi import. |

---

## 4. Các điểm lưu ý cho việc hiện thực hóa trong `ynabx` (INVARIANTS Matching)

1. **Đơn vị tiền tệ Milliunits**: Toàn bộ class KMP đều dùng kiểu số nguyên 64-bit (`BigInt` / `0n` trong JS, tương đương `long` trong Java). Tuyệt đối không dùng số thực `float`/`double`.
2. **Khấu trừ tương lai (Future Stealing)**: RTA không chỉ nhìn về quá khứ mà luôn khấu trừ tổng tiền đã gán ở các tháng tương lai.
3. **Delta Sync Protocol**: Lưu giữ chỉ số `server_knowledge_of_device` và `starting_device_knowledge` để chỉ đồng bộ các entity thay đổi từ lần sync trước.

---

## 5. Reverse Engineering Goals & Auto-Assign Engine (v26.160.1 Slik Core)

### 5.1 Goals / Target Calculation Engine (`calc/goals_calc.rs`)
Trích xuất từ `wrapper.renamed.js` dòng 22008–22138 (`CreditCategoryDetailsData`), dòng 22210–22425 (`SubcategoryCalculations`), và dòng 85912–86072:

* **5 loại Target chuẩn YNAB**:
  1. **Monthly Funding (`MF`)**:
     $$\text{Underfunded} = \max(0, \text{TargetAmount} - \text{Budgeted})$$
  2. **Target Balance (`TB`)**:
     $$\text{Underfunded} = \max(0, \text{TargetAmount} - \text{Balance})$$
  3. **Target Balance by Date (`TBD`)**:
     $$\text{MonthlyShare} = \left\lceil \frac{\max(0, \text{TargetAmount} - \text{Balance})}{\text{MonthsRemaining} + 1} \right\rceil$$
     $$\text{Underfunded} = \max(0, \text{MonthlyShare} - \text{Budgeted})$$
  4. **Custom Needed for Spending (`NEED`)**:
     - *Set Aside* (`goal_needs_whole_amount = true`): $\max(0, \text{TargetAmount} - \text{Budgeted})$
     - *Refill Up To* (`goal_needs_whole_amount = false`): $\max(0, \text{TargetAmount} - \text{Balance})$
     - *Weekly Cadence* (`cadence = 2`): Nhân target tuần với số lượng ngày chỉ định trong tháng (4 hoặc 5 tuần).
  5. **Debt Payoff Target (`DEBT`)** & **CCPC Underfunded**:
     $$\text{DebtOwed} = |\min(0, \text{CCAccountBalance})|$$
     $$\text{CCPC Underfunded} = \max(0, \text{DebtOwed} - \max(0, \text{AvailableBalance}))$$

### 5.2 Smart Auto-Assign & Quick Budget Engine (`calc/auto_assign.rs`)
Trích xuất từ `wrapper.renamed.js` dòng 148360–148739 (classes `YK`, `KK`, `GK`):

* **6 bậc ưu tiên khi RTA bị giới hạn (Partial Funding Order)**:
  1. `!is_overspent`: Danh mục bị âm tiền (`balance < 0`) được ưu tiên bù đắp hàng đầu.
  2. `is_credit_card_payment_category`: Các danh mục chi tiêu thông thường trước danh mục trả nợ thẻ tín dụng (`CCPC`).
  3. `!first_needed_by_date.equals_by_month(current_month)`: Các mục tiêu đến hạn trong tháng hiện tại.
  4. `first_needed_by_date < context_date`: Các mục tiêu đã quá hạn hoặc sát hạn.
  5. `first_needed_by_date` tăng dần.
  6. Thứ tự hiển thị UI: `master.sortable_index`, sau đó `sub.sortable_index`.

* **10 chế độ Quick Budget**:
  `Underfunded`, `BudgetedLastMonth`, `SpentLastMonth`, `PaidLastMonth`, `AverageBudgeted`, `AverageSpent`, `AveragePaid`, `GoalTarget`, `RemoveSurplus`, `SetAvailableAmountToZero`, `ResetBudgetedAmounts`.
