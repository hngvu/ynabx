# Accounts & RegisterGrid Gap Report (`clone/` vs `unminified/ember_app/`)

> **Baseline Spec**: `unminified/ember_app/specs/ACCOUNTS_REGISTER_SPEC.md` (Ember source root: `unminified/ember_app/app/`)  
> **Audited Target**: `clone/src/components/accounts/`, `clone/src/components/modals/`, `clone/src/services/keyboardShortcuts.ts`

---

## Summary Scorecard

| Status | Count | Scope |
|---|---|---|
| `[COVERED]` | 4 | Core balances math, column resize/sort persistence, FlagPickerPopover shortcuts, KeyboardShortcutsModal & service |
| `[PARTIAL]` | 15 | AccountHeader, AccountToolbar, RegisterGrid, GridAdd/GridEdit/GridSplit, ActionBar & Popovers, ReconcileWizard, Add/Edit/Close Account, ManagePayees, EditFlags |
| `[MISSING]` | 11 | Direct Import / Bank Link / ManageConnections / Troubleshoot flows, Scheduled & Pending row actions, File-based import, Image attachments, Reconciled/Closed edit guards, Context menu, Loan migration |

---

## 1. Account Header & Toolbar

### 1.1 `AccountHeader` — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/AccountsHeader.tsx` (`AccountsHeader`, `AccountsHeaderProps`)
- **Ember**: `components/accounts/account-header/index.hbs`, `index.js` (`AccountsAccountHeader`), `account-header-balances/index.js` (`AccountsAccountHeaderAccountHeaderBalances`)
- **Covered**:
  - Account name, favorite star toggle, account type badge, last-reconciled lock label, Edit Account & Reconcile buttons.
  - Cleared + Uncleared = Working balance strip (`clearedBalanceMilliunits`, `unclearedBalanceMilliunits`, `workingBalanceMilliunits`) and `selectedCount` / `selectedTotalMilliunits` summary.
  - Adjustment mode banner (`isAdjustmentMode`, `onCreateAdjustmentAndFinish`, `onCancelAdjustmentMode`).
  - Credit card payment available strip (`isCreditCard`).
- **Gaps**:
  - `isFavorite` is local component state (`useState(false)`) instead of persisting via `accountUseCasesService.saveAccountFavoriteStatus`.
  - `"Reconciled today"` is hardcoded regardless of `selectedAccount.lastReconciledDate`.
  - Credit card header omits overspending indicator (`<AccountsOverspendingAndPayment>`), payment balance state coloring, and `Payment Available` click uses `window.alert()` instead of `modals/accounts/payment-warning`.
  - Direct Import status icon (`DirectImportStatusIcon`) and DI user-action notification (`AccountsNotificationsDiAccountAction`) are absent.
  - `NeedApprovalOrCategorizationCount` notification banner (`TopAccounts` -> `AccountsNotificationsNeedApprovalOrCategory`) is absent.
  - Loan account header delegation (`<LoanAccount @account>` when `selectedAccount.isLoanAccount`) and `viewMigratedLoanAccount` link are absent.

### 1.2 `AccountToolbar` — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/AccountsToolbar.tsx` (`AccountsToolbar`, `AccountsToolbarProps`)
- **Ember**: `components/accounts/account-toolbar/index.hbs`, `index.js` (`AccountsAccountToolbar`)
- **Covered**:
  - `Add Transaction`, `Record Payment` (for credit cards), `File Import`, `Undo`/`Redo` buttons, `View` options trigger, and `TransactionSearch`.
- **Gaps**:
  - `File Import` is a stub calling `window.alert('File Import: Supports OFX, QFX, QIF, and CSV bank export files.')` (`AccountsToolbar.tsx:77`); no `FilePicker` or `choose-file` modal.
  - `Undo` / `Redo` have no `onUndo` / `onRedo` handlers wired in `AccountsWorkspace.tsx` (`Redo` is hardcoded `disabled`).
  - No responsive `ResizeObserver` overflow collapsing into `More` (`overflow-menu.js`).
  - No `Link Account` button (`showLinkAccountButton` / `openLinkAccountToDIModal`).

---

## 2. Register Grid, Inline Add/Edit/Split, & Transaction State Machines

### 2.1 `RegisterGridContainer` & `RegisterGridHeader` — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/AccountsWorkspace.tsx`, `RegisterGridHeader.tsx`, `RegisterGridRow.tsx`
- **Ember**: `components/register/grid-index.js`, `grid-container.js` (`R1`), `grid-header.js`, `grid-header-column.js`, `services/register-grid.js`, `services/register-sort.js`
- **Covered**:
  - Column sorting (`sortFields` persisted to `${accountId}_sortFields` in `localStorage`) and drag column resizing (`AQ = 36`, ghost handle, percentage widths persisted to `register_column_size_${accountId}`).
  - Running balance calculation and `MM/DD/YYYY` date formatting.
- **Gaps**:
  - No row virtualization (`displayStart` / `displayEnd` / `RegisterGridRowsTop` / `RegisterGridRowsBottom`); renders all `visibleTransactions` directly.
  - Scroll position is not persisted per account (`scroll_position_${selectedAccountId}`).
  - No `balance-learn-more` info button when sorted by non-balance column (`grid-header-column.js:showBalanceInfo`).
  - No right-click `onContextMenu` handler on rows (`modals/register/action-bar/context-menu`).
  - No `Shift+Click` range multi-select (`multiSelectRange`) or `Ctrl/Cmd+Click` toggle semantics; clicking a row toggles selection, double-clicking edits.
  - No `SyncingBackfill` status or `ApprovedAllTransactions` empty-approval state.

### 2.2 `GridAdd` & `GridEdit` — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/RegisterGridEditRow.tsx` (`RegisterGridEditRow`, `RegisterGridEditRowProps`)
- **Ember**: `components/register/grid-add.js`, `grid-edit.js`, `grid-actions.js`, `services/transaction-editor.js`
- **Covered**:
  - Inline add (`isAddRow`) and edit rows with `Save`, `Save and Add Another`, `Cancel`.
  - Calculator formula evaluation (`evaluateFormula`) on outflow/inflow blur.
  - Date keyboard shortcuts (`+`/`=`, `-`/`_`, `t`).
  - Transfer payee selection sets `subCategoryId = 'category-not-needed'` and `subCategoryName = 'Category not needed'`.
- **Gaps**:
  - **Reconciled / Closed Account Edit Guards**: No confirmation modals when editing reconciled transactions (`modals/accounts/edit-reconciled-transaction`) or closed-account/transfer-closed-account transactions (`modals/accounts/confirm-edit-closed-account-transaction`).
  - **Credit Card Payment Payee Guard**: Does not block/flash Payee when `CreditCardPayment` category is chosen without a payee (`transaction-editor.js:188-194`).
  - **Transfer Dual-Side Sync & Read-Only Amount**: Saving a transfer does not create/update the linked counter-transaction in the target account, and `isAmountReadOnly` for `transferSubTransactionId` / split transfers is absent.
  - **Tab/Enter Field Cycling & Auto-Save**: Missing `TransactionEditor.focusOnNextField`, `UV.AutoSave`/`UV.Blocked`/`UV.WithoutAutoSave` focus-out state machine, and `<Tab>` wrapping between first input and Save button.
  - **Dirty-Editor Flash Guard**: Clicking another row while editing does not flash `.ynab-grid-actions` (`flashEditor()`) or discard clean edits.
  - **Record Payment**: `handleRecordPayment` in `AccountsWorkspace.tsx:629` only opens a blank add row without pre-filling `lastPaymentPayee` or `Math.min(-clearedBalance, payment)`.

### 2.3 `GridSplit` & `GridSubEdit` — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/RegisterGridEditRow.tsx` (lines 78-101, 188-200, 700-798)
- **Ember**: `components/register/grid-split.js`, `grid-sub-edit.js`, `grid-sub.js`, `services/transaction-editor.js`
- **Covered**:
  - Split toggle via `CategoryPickerPopover` (`canSplit`), dynamic sub-transaction rows (`+ Add another split`), `Amount remaining to assign:` calculator, and Save disabled when `remainingSplitMilliunits !== 0`.
  - Collapse/expand split chevron on `RegisterGridRow`.
- **Gaps**:
  - No `auto-distribute-split-amounts` modal (`modals/accounts/auto-distribute-split-amounts`) when saving a split with a remainder.
  - No `confirm-categorizing-splits` modal (`modals/accounts/confirm-categorizing-splits`) when bulk-categorizing split transactions.
  - Sub-transaction rows in `RegisterGridEditRow` lack individual Payee pickers (`grid-sub-edit.hbs` has `RegisterDropdownTextField` for `payees`).

### 2.4 Scheduled, Pending, Approve/Reject, Match, & Images — `[MISSING]`
- **Ember**: `grid-scheduled.hbs`, `grid-scheduled-sub.hbs`, `grid-pending.hbs`, `modals/accounts/approve-reject.js`, `modals/register/match-transaction.js`, `modals/register/transaction-image-overlay/index.js`, `modals/register/transaction-image-error/index.js`
- **Gaps**:
  - `RegisterGridRow` renders `clock` / `repeat` / `info_circle_fill` icons if flags are set on `TransactionItem`, but there are **no** interactive `approve-reject` or `match-transaction` popovers, no `Enter Now` execution, no scheduled-transaction recurrence engine (`frequencies`, `nextRepeatingDateRecommendation`), and no `makeRepeating` implementation (`AccountsWorkspace.tsx:1041` is a no-op).
  - Image column renders a static `photo` icon (`RegisterGridRow.tsx:120`) with no upload, thumbnail, `transaction-image-overlay`, or `transaction-image-remove-confirmation`.

---

## 3. Action Bar, Dropdown Popovers, & Search

### 3.1 `RegisterActionBar` & Bulk Menus — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/RegisterActionBar.tsx`, `ActionBarMorePopover.tsx`, `ActionBarCategorizePopover.tsx`
- **Ember**: `services/register-action-bar.js`, `components/modals/register/action-bar/{context-menu,more-menu,category-menu,sub-menu,memos-modal}.js`
- **Covered**:
  - Floating bar with selection count, `Categorize` (hover flyout), `Flag`, `Clear`, and `More` (`Mark as Cleared/Uncleared`, `Duplicate`, `Make Repeating` [UI only], `Memo...`, `Move to Account`, `Export`, `Delete`).
- **Gaps**:
  - `Match` and `Unmatch` in `ActionBarMorePopover` are hardcoded `disabled` stubs.
  - No `Approve`, `Reject`, or `Enter Now` bulk actions.
  - `Edit Memo` uses `window.prompt()` (`AccountsWorkspace.tsx:1046`) instead of `modals/register/action-bar/memos-modal`.
  - `Delete` deletes immediately without `modals/accounts/delete-transactions-warning` (no reconciled/transfer/closed-account warning).
  - `ActionBarCategorizePopover` lacks `Inflow: Ready to Assign`, search, and keyboard navigation.

### 3.2 Inline Dropdown Popovers — `[PARTIAL]`
- **Payees (`PayeePickerPopover.tsx`)** — `[PARTIAL]`: Has transfer payees (`Transfer : ...`), `"Create ..."`, `ArrowUp`/`ArrowDown`/`Enter`/`Escape`, and `Manage Payees` trigger. Missing internal search input, payee metadata/auto-fill rules, closed-account filtering, and bank-import info popover (`register-payees.js`).
- **Categories (`CategoryPickerPopover.tsx`)** — `[PARTIAL]`: Has group/category filter, `Inflow: Ready to Assign`, and `Split`. Missing `ArrowUp`/`ArrowDown`/`Enter` keyboard navigation, `Available` balance pills, inline category creation (`openCreateCategory`), and Credit Card Interest row (`register-categories.js`).
- **Calendar (`DatePickerPopover.tsx`)** — `[PARTIAL]`: Has month navigation, `Today`, and `keyboardShortcutsService` date shortcuts. Missing repeat-frequency `<select>` / `Make Repeating` button (`register-calendar.js`) and UTC/local date mismatch in `new Date(selectedDate)`.
- **Accounts (`AccountPickerPopover.tsx`)** — `[PARTIAL]`: Flat searchable list. Missing Budget/Tracking/Closed grouping, balances, and `ArrowUp`/`ArrowDown`/`Enter` navigation (`register-accounts.js`).
- **Flags (`FlagPickerPopover.tsx`)** — `[COVERED]` (with minor gap): Supports row & bulk modes, `'0'`–`'6'` + `Escape` shortcuts, and `Edit Flags` trigger; uses hardcoded `FLAG_OPTIONS` labels instead of custom flag names.
- **View Options (`ViewOptionsPopover.tsx`)** — `[PARTIAL]`: Persists `balance`/`flag`/`image` to `view_menu_show_columns_key_<accountId>`, has date presets + custom range + `showReconciled`. Missing `showScheduled` UI checkbox (present in type only) and `filter-warning` modal.

### 3.3 `TransactionSearch` — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/TransactionSearch.tsx`
- **Ember**: `services/register-search.js`
- **Covered**: Expand/collapse search box, up to 8 autocomplete recommendations (`payee:`, `category:`, `memo:`, `outflow:`, `inflow:`, accounts), `ArrowUp`/`ArrowDown`/`Enter`/`Escape`.
- **Gaps**: Plain text instead of structured filter tokens/pills; missing `is:cleared`, `is:uncleared`, `is:reconciled`, `is:unreconciled`, `is:approved`, `is:unapproved`, `is:matched`, `flag:`, and `on:`/`before:`/`after:`/`income:` recommendations and `<`/`>` operators.

---

## 4. Reconcile, File Import, & Account Widget Flows

### 4.1 `ReconcileWizardModal` — `[PARTIAL]`
- **Clone**: `clone/src/components/accounts/ReconcileWizardModal.tsx`
- **Ember**: `services/reconcile.js`, `components/modals/register/reconcile-steps.js`, `reconcile/step-*.js`
- **Covered**: 4-step flow (`current` -> `enter-balance` [with formula evaluation] -> `difference` -> `reconciled`), plus `Finish Later` entering `AccountsHeader` adjustment mode and creating `Reconciliation Balance Adjustment` transaction.
- **Gaps**:
  - Missing Direct Import reconcile steps (`step-direct-import-balance-match`, `step-direct-import-balance-mismatch-pending`, `step-direct-import-balance-mismatch-uncleared`).
  - `skipExplanation` state is declared (`ReconcileWizardModal.tsx:29`) but has no checkbox UI.
  - `How do I find my account balance?` uses `window.alert()` instead of `find-account-balance` link/modal.
  - `step-reconciled` requires manual `Continue` click instead of auto-closing after 2000ms.

### 4.2 `FileBasedImport` — `[MISSING]`
- **Clone**: Stub `alert()` in `AccountsToolbar.tsx:77`.
- **Ember**: `services/file-based-import.js`, `components/modals/accounts/choose-file.js`.
- **Gaps**: No OFX/QFX/QIF/CSV parser, no `choose-file` modal (`dontRemindMe`), no transaction import/matching pipeline.

### 4.3 `AccountWidget` Add / Link / Manage Flows — `[PARTIAL]` / `[MISSING]`
- **Add Account (`clone/src/components/modals/AddAccountModal.tsx`)** — `[PARTIAL]`:
  - Supports manual unlinked account creation across 13 `YNAB_ACCOUNT_TYPES`.
  - `search-institutions` screen is unreachable by default (`screen` starts at `'add-unlinked-account'`); `POPULAR_INSTITUTIONS` only prefill `nickname`.
  - **Missing vs Ember `components/account-widget/`**: All Direct Import / Bank Link flows (`PlaidHandoff`, `MxHandoff`, `AppleHandoff`, `FakeHandoff`, `FinishAuthorizationSession`, `waitForIngestion`, `SelectAccounts`, `ResolvePotentialDuplicates`, `CurrencyMismatchWarning`), `LinkAccount` (`flows/link-account`), `ManageConnections` (`flows/manage-connections`), `TroubleshootAccount` (`flows/troubleshoot-account`), and Loan setup/migration flows (`AboutLoanAccounts`, `LoanEscrow`, `PairLoanCategory`, `MigrateToLoanAccount`, `PairLoanToSubcategory`, `PairSubcategoryToLoan`).
- **Edit Account (`clone/src/components/modals/EditAccountModal.tsx`)** — `[PARTIAL]`:
  - Edits `accountName`, `note`, `balance` and triggers `onCloseAccount`.
  - Missing `FieldWithError` error wiring, Direct Import connection management, Loan Account fields (`minimumPayment`, `interestRate`, `escrowAmount`, `pairedSubcategoryId`), and actual balance-adjustment transaction creation.
- **Close Account (`clone/src/components/modals/CloseAccountModal.tsx`)** — `[PARTIAL]`:
  - Handles zero vs non-zero balance UI; `hasPositiveOnBudgetBalance` omits loan types / `onBudget` flag; no DI unlink or loan-category unpair handling.
- **Manage Payees (`clone/src/components/modals/ManagePayeesModal.tsx`)** — `[PARTIAL]`:
  - Uses hardcoded `DEFAULT_PAYEES` (5 items); missing real payee store, merge/combine, editable auto-categorize/rename rules, and transaction count modal.
- **Edit Flags (`clone/src/components/modals/EditFlagsModal.tsx`)** — `[PARTIAL]`:
  - Resets to `DEFAULT_FLAGS` on open; `FieldWithError` has no error wiring.

---

## 5. Keyboard Shortcuts (`clone/src/services/keyboardShortcuts.ts` & `AccountsWorkspace.tsx`)

### 5.1 Shortcuts Service & Modal — `[COVERED]`
- `KeyboardShortcutsService` (`clone/src/services/keyboardShortcuts.ts`) and `KeyboardShortcutsModal` (`clone/src/components/modals/KeyboardShortcutsModal.tsx`) port Ember's `SHORTCUT_DEFINITIONS`, `ShortcutSignal`, platform detection (`All` / `Mac`), `isModalClosedAndNoInputEditing` guard, and help modal.

### 5.2 Accounts Workspace Shortcut Handlers — `[PARTIAL]`
- **Registered in `AccountsWorkspace.tsx:671-821`**: `SelectAllTransactions`, `DeselectAllTransactions`, `AddNewTransaction`, `ToggleCleared`, `DeleteTransactions`, `Duplicate`, `ApproveAll`, `Flag`, `StartEditingTransaction`.
- **Missing Handlers (defined in `KeyboardShortcut` enum but not registered in `AccountsWorkspace.tsx`)**:
  - `SelectNextTransaction` / `SelectPreviousTransaction` (Up/Down arrow row navigation)
  - `SelectAllNextTransaction` / `SelectAllPreviousTransaction` (Shift+Up/Down range selection)
  - `Categorize` (`K`)
  - `Split` (`S`)
  - `Reconcile` (`reconcile` shortcut in `AccountsAccountHeader`)
  - `Approve` (`A`), `Reject` (`Shift+R`), `EnterNow` (`E`), `Match` (`M`), `Unmatch` (`Shift+U`), `MakeRepeating` (`Shift+T`), `FocusSearch`
