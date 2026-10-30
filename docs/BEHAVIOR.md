# docs/BEHAVIOR.md — User Interaction & Behavioral Specification

This document details how an end user experiences and interacts with **YNABx**. It serves as the canonical behavioral specification for designers, frontend engineers, backend developers, and AI agents building and extending user-facing features.

---

## 1. Core Philosophy & Mental Model

> **Official YNAB Reference**: [The Four Rules of YNAB](https://www.ynab.com/the-four-rules)

YNABx is built on **Zero-Based Envelope Budgeting** and the **Four Rules of YNAB**:

1. **Rule 1: Give Every Dollar a Job**: When money enters the user's possession, they allocate every single cent into purposeful category envelopes until **Ready to Assign** equals exactly `$0.00`. The user never plans with money they don't yet have in the bank.
2. **Rule 2: Embrace Your True Expenses**: Large, irregular expenses (car insurance, holiday gifts, annual subscriptions) are broken down into predictable monthly savings targets.
3. **Rule 3: Roll With the Punches**: When life happens and a category is overspent, the user addresses it immediately by reallocating money from another envelope. Overspending is treated as a trade-off, not a failure.
4. **Rule 4: Age Your Money**: By consistently spending less than earned, the user gradually builds a buffer until they spend money earned 30+ days ago (breaking the paycheck-to-paycheck cycle).

---

## 2. Onboarding & First-Time Setup (Day 1)

```mermaid
flowchart TD
    A[Create Account & Sign In] --> B[Create Spending Plan: Name, Currency, Date Format]
    B --> C[Add Real Accounts: Checking, Savings, Credit Cards]
    C --> D[Opening Balances populate Ready to Assign & CC debt]
    D --> E[Customize Category Groups & Envelopes]
    E --> F[Allocate Ready to Assign down to $0.00]
```

### 2.1 Creating a Spending Plan (`Plan`)
- The user creates their first Spending Plan by choosing a **Name** (e.g., *"Family Plan 2026"*), **Currency** (e.g., `USD`, `VND`, `EUR`), and **Date Format** (`YYYY-MM-DD`, `DD/MM/YYYY`).
- Currency settings control decimal precision and formatting symbols across the entire UI.

### 2.2 Adding Accounts
The user links or manually adds their real-world financial accounts:
- **Checking / Savings / Cash (On-Plan Accounts)**:
  - The user enters the current actual bank balance as the **Opening Balance**.
  - Positive opening balances from on-plan cash accounts immediately flow into **Ready to Assign** at the top of the plan.
- **Credit Cards**:
  - The user enters their current outstanding credit card balance (e.g., `-$450.00`).
  - YNABx automatically creates a paired **Credit Card Payment** category in the budget grid.
  - *User Choice*: The user can choose to fund this pre-existing debt immediately by assigning cash to the Credit Card Payment category, or pay it off over time.

---

## 3. The Spending Plan Grid (The Heart of YNABx)

> **Official YNAB References**:
> - [Progress Bars: A Guide](https://support.ynab.com/en_us/progress-bars-a-guide-SkDEhot09)
> - [Colors and Icons in Your Plan](https://support.ynab.com/en_us/colors-and-icons-in-your-plan-HJQv_XHko)
> - [How to Use Targets](https://support.ynab.com/en_us/how-to-use-targets-rk5kkI9ks)
> - [Underfunded: A Guide](https://support.ynab.com/en_us/underfunded-a-guide-BJwPhQO09)
> - [Snooze a Target](https://support.ynab.com/en_us/snooze-a-target-HyS4E5rZT)

The plan worksheet is an interactive monthly grid with three core columns per category:

> **Core Envelope Formula**:
> `Available = Prior Month Rollover + Assigned + Activity`

| **[OCTOBER 2026]** — Category Name | Assigned | Activity | Available (`Ready to Assign: $0.00`) |
| :--- | ---: | ---: | ---: |
| **▼ Immediate Obligations** | | | |
| &emsp;├─ Rent / Mortgage | `$1,200.00` | `-$1,200.00` | `$0.00` *(Gray)* |
| &emsp;├─ Groceries | `$450.00` | `-$125.40` | `$324.60` *(Green)* |
| &emsp;└─ Electric & Water | `$110.00` | `$0.00` | `$110.00` *(Green)* |
| **▼ True Expenses** | | | |
| &emsp;├─ Auto Insurance | `$85.00` | `$0.00` | `$255.00` *(Green)* |
| &emsp;└─ Medical Out-of-Pocket | `$50.00` | `$0.00` | `$150.00` *(Green)* |
| **▼ Credit Card Payments** | | | |
| &emsp;└─ Chase Sapphire Visa | `$0.00` | `+$125.40` | `$125.40` *(Green)* |

### 3.1 The "Ready to Assign" Banner
- **Green (`$0.00`)**: Perfection. Every dollar has been assigned a job.
- **Green (`> $0.00`)**: Money waiting to be assigned. The user is prompted to assign it to bills, goals, or savings.
- **Red (`< $0.00`)**: Over-assigned! The user has allocated more money than actually exists in their bank accounts. The user must reduce assigned amounts in envelopes until RTA reaches `$0.00`.

### 3.2 Budget Cell Editing & Inline Calculator
- Clicking any cell in the **Assigned** column transforms it into an inline input.
- **Keyboard Navigation**: Pressing `Enter` saves, `Escape` cancels, and `Tab` moves to the next category cell.
- **Inline Calculator Expressions**: Users can type math expressions directly into the cell:
  - Typing `200 + 45.50` and pressing Enter sets the value to `$245.50`.
  - Typing `+50` adds `$50.00` to the current assigned balance.
  - Typing `-20` subtracts `$20.00` from the current assigned balance.
  - *Precision guarantee*: Expressions are evaluated and converted into integer milliunits without rounding drift.

### 3.3 Visual Status Colors (Category Balances)

| Color | Status Meaning | User Guidance |
|---|---|---|
| **Green** | **Funded & Ready** | Money is in the bank waiting to be spent for this specific purpose (or a no-due-date savings target has a positive balance). |
| **Gray** | **Zero & Not Underfunded** | `Available == $0.00` AND the category is not underfunded (either it has no target/upcoming scheduled transactions, or its target was already met and fully spent down to `$0.00`). |
| **Yellow** | **Underfunded / Upcoming Scheduled / Credit Overspent** | Category is **underfunded** (target goal not yet met, or insufficient funds for an upcoming **scheduled transaction** this month — even if `Available == $0.00` or the target is snoozed), OR category has **credit card overspending**. |
| **Red** | **Cash Overspent** | Immediate hazard! The user spent physical cash/checking money that wasn't budgeted. Must be covered immediately. |

### 3.4 Category Progress Bars & Status Labels (Target Engine)

> **Frontend Styling Reference**: All CSS class names, SVG icon identifiers, and hex color tokens for progress bars and pills are specified in [docs/DESIGN.md §3.3](DESIGN.md#33-cấu-trúc-cell-danh-mục--thanh-tiến-độ-category-progress-bar). This section separates **Documented YNAB Behavior** (from official Help Docs) from **Observed Web UI / YNABx Adaptations**.

YNABx displays an optional toggleable progress bar (`showProgressBars` toggle in the plan toolbar) and contextual status text below each category name:

```text
+----------------------------------------------------------------------+
| Groceries              Funded. Spent $125.40 of $450.00      $324.60 |
| [////////////####################################]                   |
+----------------------------------------------------------------------+
  ("/" = Light Striped Spent Portion, "#" = Solid Available Portion)
```

#### A. Documented YNAB Behavior (Official Help Docs)

1. **Optional Visibility Toggle**: Progress bars can be toggled on or off in the plan view options. YNABx supports this toggle in the budget toolbar.
2. **Multi-Section Bar Structure**:
   - **Monthly / Custom / Yearly Targets (`MONTHLY`, `YEARLY`, `CUSTOM`) & No Target**: Rendered as a single continuous progress bar section spanning 0% to 100%.
   - **Weekly Targets (`WEEKLY`)**: Segmented into **4 or 5 discrete sections** corresponding to the exact number of target weekdays occurring in the active calendar month (e.g., 5 Sundays in a 31-day month).
   - **Rollover Savings (`SET_ASIDE_ANOTHER`)**:
     - For a monthly *"Set aside another..."* target with positive rollover from the prior month (`rollover > 0`), the bar renders **2 sections**: prior month rollover foundation (left section) + current month savings target (right section).
     - For a **Weekly** *"Set aside another..."* target with positive rollover from the prior month, the **first section represents the prior month rollover (or monthly base)** followed by the **4 or 5 weekly sections**, resulting in **up to 6 sections** total.
   - **Rollover Timing for `"Refill Up To"` (`REFILL_UP_TO`)**: Leftover funds from Month `M` do **not** count toward Month `M+1`'s *"Refill up to..."* target progress until the calendar actually rolls over into Month `M+1`.
   - **No-Due-Date Savings Target**: A savings balance target without a due date turns **Green** whenever it has a positive balance (`Available > $0.00`), even if `$0.00` was assigned in the current month.
   - **Overflow / Extra Section (Over-Assigned or Spent Beyond Weekly Target)**: When a category with a Weekly target has total funds (`Rollover + Assigned`) or spending (`Activity`) exceeding the monthly target total, an **extra overflow section** is appended at the right end of the bar to represent the surplus beyond the target.
3. **Dual-Tone Shading Within Sections**:
   - **Light / Striped Shade (Spent Portion)**: Represents money already spent (`Activity`).
   - **Solid Dark Shade (Available Portion)**: Represents money remaining available to spend (`Available`).
   - **Red / Overspent Segment**: When spending exceeds total funded money (`Available < 0`), the funded portion (if any) renders in light shade, and the overspent excess renders in **Red**.
   - **Empty Track**: Represents the remaining unfunded portion (`Needed`) required to meet the target.

#### B. Category Status Table (Documented Behavior vs. Observed Web UI)

In official YNAB Help Docs ([Colors and Icons in Your Plan](https://support.ynab.com/en_us/colors-and-icons-in-your-plan-HJQv_XHko) & [Progress Bars: A Guide](https://support.ynab.com/en_us/progress-bars-a-guide-SkDEhot09)), pill colors, icons, and bar colors are formally specified, whereas the exact inline status wording (`Funded. Spent $X of $Y`, `$X more needed this month`, etc.) is observed from the live YNAB web client:

| State | Condition | Documented Bar & Available Pill Color | Documented Available Icon | Observed Web UI Status Text (Used in YNABx) |
|---|---|---|---|---|
| **Funded (Unspent)** | Target met (`needed == 0`), or no-due-date target with `Available > 0`, or no target with `Available > 0`; `Spent == 0` | **Green** bar (100% solid green) + **Green Pill** | **Checkmark** (if target exists) | **`Funded`** |
| **Funded (Partially Spent)** | Target met (or no target), `Available > 0`, `Spent > 0` | **Green** bar (light/striped green spent + solid green available) + **Green Pill** | **Checkmark** (if target exists) | **`Funded`**`. Spent $X of $Y` |
| **Fully Spent** | Not underfunded (`needed == 0` or no target), `Available == $0.00`, `Spent > 0` | **Green** bar (100% light/striped green spent) + **Gray Pill** | **Checkmark** (if target exists) | **`Fully Spent`**`. Spent $X of $X` |
| **Underfunded Target (Unfunded)** | Target `needed > 0`, `Assigned == 0`, `Available == $0.00`, `Spent == 0` | **Empty Track** (`0%` fill) + **Yellow Pill** *(Note: per YNAB docs, any underfunded category has a Yellow pill even when `Available == $0.00`)* | **Pie Chart** (progress circle) | **`$X`**` needed this month` |
| **Underfunded Target (Partially Funded)** | Target `needed > 0`, `Assigned > 0` or `Available > 0` or `Spent > 0` | **Yellow** bar (light/striped yellow spent + solid yellow available + empty track) + **Yellow Pill** | **Pie Chart** (progress circle) | **`$X`**` more needed this month` |
| **Underfunded Scheduled Transaction** | `Available` is insufficient to cover upcoming **scheduled transaction(s)** in the current month | **Yellow** bar + **Yellow Pill** | **Calendar Icon** (scheduled transaction due) | **`$X`**` needed for scheduled transactions` *(Observed)* |
| **Snoozed Target** | Target snoozed for active month (`SNOOZED`) and no unfunded scheduled transaction | **Green** bar (if `totalFunded > 0`) or **Empty Track** + **Green Pill** (if `Available > 0`) or **Gray Pill** (if `Available == $0.00`) | **Snooze (`Zz`)** | **`Snoozed`** / `Snoozed for this month` |
| **Snoozed Target + Unfunded Scheduled Tx** | Target is snoozed, but an upcoming scheduled transaction this month is still underfunded | **Yellow** bar + **Yellow Pill** | **Snooze (`Zz`)** | **`Snoozed`** (Yellow pill indicates scheduled tx still needs funding) |
| **Cash Overspent** | `Available < $0.00` (cash/checking overspending) | Funded portion (if `totalFunded > 0`) + **Red** overspent segment + **Red Pill** | *(No icon)* | **`Overspent`**`. $Spent of $Funded` |
| **Credit Overspent** | `Available < $0.00` (credit card overspending) | Funded portion (if `totalFunded > 0`) + **Red/Warning** overspent segment + **Yellow Pill** | **Credit Card `!`** | **`Overspent`**`. $Spent of $Funded` |
| **Untouched / Empty** | No target, no scheduled tx, `Assigned == 0`, `Spent == 0`, `Available == $0.00` | **Empty Track** + **Gray Pill** (`$0.00`) | *(No icon)* | *(Blank — no status text shown)* |

---

## 4. Account Register & Transaction Tracking (Daily Life)

> **Official YNAB References**:
> - [Approving and Matching Transactions: A Guide](https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i)
> - [Pending Transactions: An Overview](https://support.ynab.com/en_us/pending-transactions-an-overview-Bk0WoOcA5)
> - [Flags: A Guide](https://support.ynab.com/en_us/flags-a-guide-Skh8Xb4kj)
> - [Split Transactions: A Guide](https://support.ynab.com/en_us/split-transactions-a-guide-SJLEKwY0q)
> - [Transfer Transactions: A Guide](https://support.ynab.com/en_us/transfer-transactions-a-guide-HJOsZz4Jj)

The account register displays transactional ledgers for individual accounts or an aggregated "All Accounts" view.

### 4.1 Recording Daily Transactions
When recording an expenditure:
1. **Date**: Defaults to today.
2. **Payee**: Autocompletes existing payees or creates a new one (e.g., *"Trader Joe's"*).
3. **Category**: Selected from active category envelopes.
4. **Memo**: Optional notes or tags.
5. **Outflow / Inflow**: Entered in currency units and converted to integer milliunits.
6. **Cleared Status**: Toggled between **Uncleared** (entered in register, not yet posted by bank) and **Cleared** (posted to bank).

### 4.2 Recording Income
- When a salary or income transaction is recorded, the category is set to the system category: **`Inflow: Ready to Assign`**.
- The amount immediately increases the top **Ready to Assign** banner in the Spending Plan.

### 4.3 Split Transactions (Multi-Category Receipts)
- When a single receipt covers multiple purposes (e.g., Walmart receipt with `$60` Groceries and `$25` Home Supplies):
  - User clicks **Split Transaction**.
  - Adds subtransaction lines specifying category, amount, and optional memo.
  - YNABx enforces that the sum of subtransaction amounts matches the parent transaction total exactly down to the last milliunit.

### 4.4 Account Transfers (Moving Money Between Accounts)
- Transfers between user accounts (e.g., Checking → Savings, or Checking → Credit Card) use the Payee: **`To/From: [Account Name]`**.
- Transfers between on-plan accounts **do not require a spending category** because the total cash in the spending plan has not changed—only the storage container changed.
- YNABx generates a paired transaction in the destination account with the inverse amount (`+X` and `-X`).

### 4.5 Cleared, Uncleared, and Reconciled Lifecycle (vs. Bank Pending)
Every register transaction has a `cleared` status representing its real-world bank settlement:

| Cleared State | Icon | Behavioral Meaning (YNAB Standard vs. YNABx) |
|---|---|---|
| **`UNCLEARED`** | Hollow gray circle (`○`) | **User-Entered / Unsettled in Bank**: Transaction is recorded in the register (and **immediately** counts toward `Uncleared Balance`, `Working Balance`, and the category's `Activity`/`Available` in the plan), but has not yet posted to the bank statement. |
| **`CLEARED`** | Green circle with `C` (`✓`) | **Settled / Posted**: Transaction has posted to the bank account and appears on official banking records. |
| **`RECONCILED`** | Green padlock icon (`🔒`) | **Reconciled**: Transaction was verified against an official bank statement during Account Reconciliation.<br/>• **YNAB Documented Behavior**: The reconciliation action itself cannot be undone via Undo; editing a reconciled transaction's amount or unlocking its padlock prompts a warning because it alters the reconciled balance.<br/>• **YNABx Implementation Rule**: YNABx enforces strict ledger immutability on `RECONCILED` rows (locking date, payee, category, amount, and account fields until the user explicitly clicks **Unlock**). |

> [!IMPORTANT]
> **`UNCLEARED` is NOT "Bank Pending"**:
> - In YNAB, **`UNCLEARED`** is a state on normal register transactions that you manage; it immediately impacts your Spending Plan (`Available`) and `Working Balance`.
> - **Bank Pending Transactions** (in official YNAB) are bank-reported authorization holds shown in a separate collapsible *"Pending Transactions"* section at the top of the register. In YNAB, Pending transactions do **not** affect the Spending Plan or account balances until the user chooses *"Enter Now"* (or edits the row) to move them into the register, or until the cleared transaction imports from the bank.
> - **YNABx Support Status**: **Bank Pending Transactions are currently not supported in YNABx**. All transactions saved or imported into YNABx enter the main register directly (as `UNCLEARED` or `CLEARED`) and affect the Spending Plan immediately.

#### Register Header Balances
The register header breaks down account balances into 3 figures:
1. **Cleared Balance**: Sum of all `CLEARED` and `RECONCILED` transactions. Must match the user's settled bank balance.
2. **Uncleared Balance**: Sum of all `UNCLEARED` register transactions.
3. **Working Balance**: `Cleared Balance + Uncleared Balance`. Represents the actual financial reality available for the spending plan.

### 4.6 Transaction Approval & Matching Workflow (`approved`)
When transactions enter YNABx automatically via **File Import (OFX/QFX/CSV)**, direct bank synchronization, or auto-generated **Scheduled Recurring Transactions**, they enter an unapproved state (`approved = false`):
- **Review Flag Only (Zero Calculation Impact)**: **`approved` is strictly a user review flag and does NOT affect account balances (`Cleared`, `Uncleared`, `Working`), category `Activity`, or `Available` calculations.** Unapproved transactions (`approved = false`) in the register already count toward the Spending Plan immediately upon creation/import.
- **Orthogonality of `approved` and `cleared`**: `approved` (`true` | `false`) and `cleared` (`UNCLEARED` | `CLEARED` | `RECONCILED`) are **two completely independent flags** that can occur in any combination.
  - *Documented*: Imported bank transactions arrive as `CLEARED` + `approved = false`; scheduled transactions entering the register on their due date require approval (`approved = false`). *(Note: whether a newly spawned scheduled transaction starts as `UNCLEARED` before matching a bank import is an observed/implementation behavior rather than explicitly stated in the YNAB help text).*
- **Transaction Matching (Auto-Match & Manual Match)**:
  - **Auto-Matching Criterion**: When an imported bank transaction has the **exact same amount** as an existing manually-entered (or scheduled) transaction and its date is **within 10 calendar days (±10 days)**, YNAB automatically links them into a single **Matched Transaction** (indicated by a chain link icon).
  - **Field Precedence on Match**: A matched transaction retains the **bank's amount** (`CLEARED`), while preserving the **user-entered Date, Payee, Category, and Memo**.
  - **Manual Match & Auto-Approval**: Users can manually select two transactions with identical amounts and click **Match** (which automatically marks the combined transaction as **Approved**).
  - **1-to-1 & Unmatching**: Matching is strictly **one-to-one** (one imported transaction matches at most one existing transaction) and can be reversed via **Unmatch**.
  - **Rejecting & Deleting Imports**: An unapproved imported transaction can be **Rejected** (only before it is approved). Once an imported transaction is **Rejected or Deleted**, YNAB remembers it and **will not import it again** on future syncs.
  - **Paired Transfer Approval**: Approving a transfer transaction in one account **automatically approves** the paired transfer transaction in the other account.
- **Register Notice & Sidebar Account Indicator**:
  - Unapproved rows are highlighted in the register with an informational icon (`info_circle_fill`) so the user can review and click **Approve** (single or bulk).
  - When an account has one or more unapproved transactions (`approved = false`), a **white notification dot (or badge count)** appears next to that account's name in the left navigation sidebar.

### 4.7 Color Flags (`flag_color`)
Each transaction can carry an optional color flag:
- Available colors: `RED`, `ORANGE`, `YELLOW`, `GREEN`, `BLUE`, `PURPLE` (or `null`).
- User-defined taxonomy for operational tagging (e.g., *Blue* = business expenses for reimbursement, *Yellow* = purchases needing partner discussion, *Purple* = tax-deductible items).
- The register toolbar enables instant 1-click filtering by flag color.

---

## 5. Credit Card Mechanics (Automatic Debt Prevention)

> **Official YNAB References**:
> - [Handling Credit Cards in YNAB: An Overview](https://support.ynab.com/en_us/handling-credit-cards-overview-ry7cNub1s)
> - [Credit Card Overspending: An Overview](https://support.ynab.com/en_us/credit-card-overspending-an-overview-HkMGpSbJs)

YNABx treats credit cards as payment conduits rather than debt instruments.

### 5.1 Funded Credit Card Spending (The "Magic" Shift)
1. User has `$100.00` Available in **Groceries**.
2. User buys `$40.00` of groceries using their **Chase Visa** credit card.
3. User logs the transaction: Account = *Chase Visa*, Category = *Groceries*, Outflow = `$40.00`.
4. **What YNABx does automatically**:
   - **Groceries Available** decreases from `$100.00` to `$60.00`.
   - **Chase Visa Payment Available** automatically increases from `$0.00` to **`+$40.00`** (Green).
5. **End-user result**: The `$40.00` cash that was reserved for groceries is now reserved to pay the credit card bill. The user has created zero new debt.

### 5.2 Credit Overspending (Unfunded Purchases)
- If the user spends `$60.00` at a restaurant using a credit card, but only had `$40.00` available in **Dining Out**:
  - **Dining Out Available** drops to `-$20.00` (highlighted in **Yellow** with a credit card icon).
  - Only `$40.00` of cash moves to the Credit Card Payment category.
  - The `$20.00` difference becomes unbudgeted debt on the card.

### 5.3 Paying the Credit Card Bill
- When the monthly credit card bill arrives, the user pays the amount shown in the green **Credit Card Payment Available** envelope.
- Recorded as a transfer from Checking → Credit Card Account.
- Both the bank checking balance and the credit card debt decrease together, and the Payment envelope resets to `$0.00`.

---

## 6. Month-to-Month Rollover Behavior

> **Official YNAB Reference**: [When the Month Rolls Over: A Guide](https://support.ynab.com/en_us/when-the-month-rolls-over-a-guide-rkyyd6qC9)

When the calendar shifts from Month `M` to Month `M+1`:

```mermaid
flowchart TD
    EndM[Month M ends] --> ResetAssigned[All Categories: Month M+1 Assigned starts at $0.00]
    ResetAssigned --> CheckCat{Month M Ending Available}
    CheckCat -->|Available > $0| RolloverPos[Positive balance rolls into Month M+1 Available]
    CheckCat -->|Cash Overspent < $0| RolloverCash[Envelope Available resets to $0.00<br/>Overspent amount deducted from Month M+1 Ready to Assign]
    CheckCat -->|Credit Overspent < $0| RolloverCredit[Envelope Available resets to $0.00<br/>Overspent amount becomes Credit Debt]
```

1. **`Assigned` Resets to `$0.00`**:
   - In the new month `M+1`, every category's **`Assigned` column resets to `$0.00`** (unless the user had previously flipped ahead to Month `M+1` and assigned money in advance).
2. **Positive Available Rollover**:
   - If *Auto Insurance* had `$255.00` available on October 31, it starts November 1 with `$255.00` starting `Available` balance (even with November `Assigned == $0.00`).
3. **Cash Overspending Rollover**:
   - If *Groceries* was cash overspent by `-$30.00` in October, November 1 resets Groceries `Available` to `$0.00`, and **deducts `$30.00` from November's Ready to Assign**. The user must pay back their cash buffer before assigning new income.
4. **Credit Overspending Rollover**:
   - If *Dining Out* was credit overspent by `-$20.00` in October, November 1 resets Dining Out `Available` to `$0.00`. November's Ready to Assign is **not deducted**. The `$20.00` remains unpaid credit card debt. If the user wants to pay it off, they budget directly into the *Credit Card Payment* envelope in November.
5. **Budgeting in Future Months**:
   - Users can click ahead to Month `M+1` anytime to assign surplus money into future envelopes.

---

## 7. "Roll With the Punches" (Covering Overspending)

> **Official YNAB Reference**: [Moving Money in Your Plan: A Guide](https://support.ynab.com/en_us/moving-money-in-your-plan-ryyCKbBJi)

When an envelope goes into the red or yellow:
1. The user clicks on the overspent category's Available bubble.
2. A **"Cover Overspending With..."** popover appears.
3. The user selects any category that has surplus funds (e.g., *"Dining Out"* or *"Vacation Fund"*).
4. YNABx atomically transfers the needed amount between envelopes, bringing the overspent category back to `$0.00` (Gray) and keeping the plan balanced.

---

## 8. Bank Reconciliation Workflow

> **Official YNAB Reference**: [Reconciling Accounts: A Guide](https://support.ynab.com/en_us/reconciling-accounts-a-guide-BJFE3fHys)

To ensure the spending plan matches reality:
1. User clicks **Reconcile Account** in the account header.
2. App asks: *"Is your current bank balance $1,425.50?"* (comparing against the account's `Cleared Balance`).
3. **If Yes**:
   - All `CLEARED` transactions are marked as **`RECONCILED`** (leaving `UNCLEARED` transactions untouched).
   - **Irreversible Action**: Per YNAB rules, completing a reconciliation **cannot be undone** (the Undo action does not revert a reconciliation batch).
   - **3-Day Import Lookback Filter**: After an account is reconciled, file/bank imports will **only import transactions dated no earlier than 3 calendar days prior to the most recent `RECONCILED` transaction date** to prevent duplicate historical imports.
4. **If No**:
   - User enters the actual statement balance from their banking app.
   - App displays the discrepancy difference (`statement_balance - cleared_balance`).
   - User reviews uncleared transactions to mark newly posted items as `CLEARED` or add missing transactions.
   - If an unexplained discrepancy remains and the user chooses **Create Reconciliation Adjustment**:
     - For **on-plan Cash / Checking / Savings accounts**, YNABx creates a cleared adjustment transaction categorized to **`Inflow: Ready to Assign`** (positive or negative `diff`) so `Ready to Assign` directly reflects the cash adjustment.
     - For **Credit Card or Tracking accounts**, YNABx creates a cleared adjustment transaction with no category (`category_id = null`), adjusting the card debt or tracking balance directly.
