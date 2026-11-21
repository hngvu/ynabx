# Budget Clone Gap Report

Audit of `clone/src/components/budget/` and `clone/src/components/modals/` against `unminified/ember_app/specs/BUDGET_SPEC.md`.

**Classification Legend:**
- `[COVERED]` — Implemented with parity for core UI, state, and interactions.
- `[PARTIAL]` — UI/structure exists, but key behaviors, states, or wiring are missing.
- `[MISSING]` — Not implemented in `clone/src/components/budget/` or `clone/src/components/modals/`.

---

## Summary Table

| Area | Status | Ember Source Reference | Clone File(s) |
| --- | --- | --- | --- |
| BudgetWorkspace & Route Shell | `[PARTIAL]` | `templates/budget.hbs`, `controllers/budget.js`, `services/budget.js` | `clone/src/components/budget/BudgetWorkspace.tsx` |
| BudgetHeader | `[PARTIAL]` | `components/budget-header/index.hbs/.js` | `clone/src/components/budget/BudgetHeader.tsx` |
| ToBeBudgeted (8 states) | `[PARTIAL]` | `components/to-be-budgeted/index.hbs/.js` | `clone/src/components/budget/BudgetHeader.tsx` |
| BudgetViews (Focused Views) | `[PARTIAL]` | `components/budget-views/` | `clone/src/components/budget/BudgetViewRow.tsx`, `BudgetWorkspace.tsx` |
| BudgetTable | `[PARTIAL]` | `components/budget-table.hbs/.js` | `clone/src/components/budget/BudgetTable.tsx` |
| BudgetTableRow (Group & Sub) | `[PARTIAL]` | `components/budget-table-row.hbs/.js` | `clone/src/components/budget/BudgetCategoryGroupSection.tsx`, `BudgetSubCategoryRow.tsx` |
| BudgetBarV2 | `[PARTIAL]` | `components/budget-bar-v2/` | `clone/src/components/budget/BudgetSubCategoryRow.tsx`, `categoryTargetStatus.ts` |
| BudgetAvailableNumber | `[PARTIAL]` | `components/budget-available-number/` | `clone/src/components/budget/BudgetSubCategoryRow.tsx`, `categoryTargetStatus.ts` |
| BudgetInspector & Breakdown | `[PARTIAL]` | `components/budget/budget-inspector/`, `components/budget-breakdown/` | `clone/src/components/budget/BudgetInspector.tsx` |
| QuickBudget (Auto-Assign) | `[PARTIAL]` | `services/quick-budget.js`, `components/budget/inspector/quick-budget/` | `clone/src/components/budget/BudgetInspector.tsx`, `MoveMoneyModal.tsx` |
| InspectorGoals (Targets) | `[PARTIAL]` | `services/budget-goals.js`, `components/inspector-goals/` | `clone/src/components/budget/BudgetInspector.tsx`, `TargetConfigurationForm.tsx` |
| Credit Card Payment Inspector | `[MISSING]` | `components/budget-breakdown/credit-card-next-payment/` | — |
| Loan Account Overview & Pairing | `[MISSING]` | `components/budget-breakdown/index.hbs`, `inspector-goals/edit-goal/loan-payment/` | — |
| RecentMoves Modal | `[MISSING]` | `BudgetTable` `<RecentMovesOpenModalButton>` | `clone/src/components/budget/BudgetTable.tsx` (button only) |
| Undo / Redo | `[MISSING]` | `BudgetTable` `<UndoRedoButtons>` | `clone/src/components/budget/BudgetTable.tsx` (buttons only) |
| Keyboard Shortcuts | `[PARTIAL]` | `components/budget-table.js` | `clone/src/components/budget/BudgetWorkspace.tsx`, `clone/src/components/modals/KeyboardShortcutsModal.tsx` |
| Modals & Popovers | `[PARTIAL]` | `components/modals/budget/`, `components/budget-views/` | `clone/src/components/budget/*Popover.tsx`, `MoveMoneyModal.tsx`, `clone/src/components/modals/FreshStartModal.tsx` |

---

## Detailed Findings

### 1. BudgetWorkspace & Route Shell — `[PARTIAL]`
- **Implemented** (`clone/src/components/budget/BudgetWorkspace.tsx`):
  - Renders `BudgetHeader`, `BudgetViewRow`, `BudgetTable`, `BudgetInspector`, hidden categories footer (`totalHiddenCount > 0`), and all budget popovers/modals.
  - Enforces zero-sum `readyToAssign` updates on `handleUpdateAssigned` and `handleMoveMoney`.
  - Supports group reordering (`handleReorderGroups`) and cross-group subcategory drag-and-drop (`handleMoveSubCategory`).
- **Missing** (vs `templates/budget.hbs`, `controllers/budget.js`, `services/budget.js`):
  - Multi-month ledger state: `handlePrevMonth` / `handleNextMonth` only update `currentDate` without switching per-month `budgeted` / `activity` / `available` rollovers.
  - `isSyncingBackfillForCurrentMonth` loading state and `showSyncingBackfillStatus` banner (`templates/budget.hbs`).
  - `areBudgetViewsAvailable` FTUE/syncing guard and `queryParams = ["import"]` / `categoryTemplateService.openImportModal()` (`controllers/budget.js`, `components/budget-table.js`).

### 2. BudgetHeader — `[PARTIAL]`
- **Implemented** (`clone/src/components/budget/BudgetHeader.tsx`):
  - Month prev/next buttons, month picker trigger, note button, RTA totals section, Add Member button.
- **Missing** (vs `components/budget-header/index.hbs/.js`):
  - `isViewingFirstAllowedBudgetMonth` / `isViewingLastAllowedBudgetMonth` disabled states on prev/next arrows.
  - `Today` button (`isNotViewingCurrentMonth` / `goToToday`).
  - `isBudgetShared` toggle (`Shared` vs `Add Member`) and `shouldShowShareButton` (`hideAmountsService`).
  - `onOpenNote` and `onAddMember` in `BudgetWorkspace.tsx` (lines 608–609) are stubbed with `console.log`.

### 3. ToBeBudgeted (8 States) — `[PARTIAL]`
- **Implemented** (`clone/src/components/budget/BudgetHeader.tsx` lines 33–45, 89–128):
  - 3 of 8 states: `readyToAssign` (`RTA > 0`), `allMoneyAssigned` (`RTA === 0`), `overassigned` (`RTA < 0`).
- **Missing** (vs `components/to-be-budgeted/index.hbs/.js` `bz`):
  - 5 of 8 states: `overdraft` (`isNegative && Math.abs(leftToBudget) > cashAvailable`), `ftueZero`, `ftueAccountsAdded`, `ftueAssign`, `ftueOverdraft`.
  - `openAutoAssign` routing to `CoverOverspendingPopover` (`modals/budget/overspending`) when `leftToBudget < 0`; `BudgetWorkspace.tsx` (lines 611–619) always opens `MoveMoneyModal`.

### 4. BudgetViews (Focused Views) — `[PARTIAL]`
- **Implemented** (`clone/src/components/budget/BudgetViewRow.tsx`, `BudgetWorkspace.tsx` lines 505–596):
  - Preset views: `all`, `overspent` (`overspent-cash` / `overspent-credit`), `underfunded`, `overfunded`, `money-available`, `snoozed`.
  - Active view toggle-off back to `all`, empty state (`BudgetTable.tsx` lines 242–263), and `clear-budget-filter` footer (`BudgetTable.tsx` lines 308–320).
- **Missing** (vs `components/budget-views/`):
  - `modals/budget-views-menu` (`onOpenViewsMenu` in `BudgetWorkspace.tsx` line 628 only calls `console.log('Manage Views')`).
  - `modals/budget-views-create-edit` (custom view creation/editing and `Edit` toolbar button).
  - `modals/budget-views-manage` (reorder/delete custom views).
  - Dynamic `areButtonsCondensed` calculation (`BudgetViewRow.tsx` line 55 hardcodes `condensed`).
  - Empty state illustrations (`boxing-glove-empty-state.svg`, `empty-state-mug.svg`) and "No targets" help link.

### 5. BudgetTable — `[PARTIAL]`
- **Implemented** (`clone/src/components/budget/BudgetTable.tsx`):
  - Toolbar (`Category Group`, `Undo`, `Redo`, `Recent Moves`, `ProgressBarsToggle`), column headers, `useEmberSortable` group/subcategory drag-and-drop, empty state, clear filter footer.
- **Missing** (vs `components/budget-table.hbs/.js`):
  - `Undo` / `Redo` wiring (`BudgetWorkspace.tsx` does not pass `onUndo`/`onRedo`; `Redo` button is hardcoded `disabled` at `BudgetTable.tsx` line 126).
  - `Recent Moves` wiring (`BudgetWorkspace.tsx` does not pass `onRecentMoves`).
  - `Edit View` toolbar button (`isCustomViewActive`).
  - `areSomeButNotAllChecked` indeterminate checkbox state.
  - `Uncategorized Transactions` row (`showUncategorizedTransactionsRow`).
  - `Shift`-click range selection from `multipleSelectOriginItemIndex` and `scrollCheckedIntoView`.

### 6. BudgetTableRow (Group & SubCategory Rows) — `[PARTIAL]`
- **Implemented** (`BudgetCategoryGroupSection.tsx`, `BudgetSubCategoryRow.tsx`):
  - Master & subcategory rows, collapse/expand, checkbox selection, inline `Assigned` input with `calculateAssignedExpression` & calculator popover (`+ - * /`), activity button, available pill, `+` Add Category hover button, right-click context menu.
- **Missing** (vs `components/budget-table-row.hbs/.js`):
  - `PAYMENT` button on `isDebtPaymentGroup` (`BudgetCategoryGroupSection.tsx` line 199) has no `onClick` handler (`openUsingCreditCardOnboarding` missing).
  - `CategoryMovesOpenModalButton` (`budget-table-cell-category-moves`) has no `onClick` or mouse coordinate tracking (`mouseInRow`, `mouseCoordinateX`).
  - `isHideAmountsEnabled` (`data-redacted`) and `ftue-add-category-button`.
  - `.is-hidden` class for collapsed rows (collapsed rows are unmounted instead).

### 7. BudgetBarV2 — `[PARTIAL]`
- **Implemented** (`BudgetSubCategoryRow.tsx` lines 226–246, `categoryTargetStatus.ts`):
  - `.ynab-new-budget-bar-v2`, `.ynab-new-budget-bar-v2-section`, `.ynab-new-budget-bar-v2-segment`, spent/funded/partially-funded/overspent segments, `calculateCategoryTargetStatus` topline & details HTML.
- **Missing** (vs `components/budget-bar-v2/index.hbs/.js`, `section/index.hbs`):
  - `isVisualsRefresh` (`is-visuals-refresh` class).
  - `isOverTargetSpendingAmountSection` (`<span>` vs `<div>`, `ynab-new-budget-bar-v2-section-over-target-spending`, dynamic `flex-basis` from `sectionLength` — `BudgetSubCategoryRow.tsx` line 232 hardcodes `flexBasis: '100%'`).
  - `MIN_PROGRESS_SEGMENT` (`0.01`) segment filtering and `@percent` / `@percentData` mode.

### 8. BudgetAvailableNumber — `[PARTIAL]`
- **Implemented** (`BudgetSubCategoryRow.tsx` lines 441–490, `categoryTargetStatus.ts`):
  - `.ynab-new-budget-available-number.js-budget-available-number`, color classes (`positive`, `negative`, `zero`, `cautious goal`, `cautious credit`), credit-card overspent icon, snooze icon, compact mini progress circle, click-to-open `MoveMoneyModal` / `CoverOverspendingPopover`.
- **Missing** (vs `components/budget-available-number/index.hbs/.js`):
  - `isDifferentiateWithoutColorOn` (`alternative` class — `DisplayOptionsModal.tsx` has the toggle UI, but it is not wired to `BudgetWorkspace` / `BudgetSubCategoryRow`).
  - `cautious-upcoming` icon and tooltip (`tooltip.budget.upcomingTransactions`).
  - Dynamic `title` tooltips (`buildGoalMessage`, `tooltip.budget.positiveBalance`, `negativeBalance`, `creditOverspent`).

### 9. BudgetInspector & BudgetBreakdown — `[PARTIAL]`
- **Implemented** (`clone/src/components/budget/BudgetInspector.tsx`):
  - Single-category header + edit pencil, Available Balance card, 0-category and multi-category Month's Summary card, Auto-Assign card, Future Months card shell, Category Notes card (`textarea`), Target Inspector card.
- **Missing** (vs `components/budget/budget-inspector/`, `components/budget-breakdown/`):
  - Resizable `.budget-inspector-resizer` drag behavior & `localStorage` width persistence (`budget-inspector-width` 25%–50%).
  - `localStorage` persistence for card roll-up states.
  - `BudgetBreakdownThisMonth` ("Cost to Be Me"): static `$0.00` and un-wired `Enter your expected income` button (no `YnabNewCurrencyInput` edit/save, no `.progress.needed`/`.progress.income` bars, no `hasIncomeDeficit`).
  - `BudgetBreakdownFutureMonths`: static `$0.00` + `"Stealing From Future"` (no clickable future month list, no `showNegativeFutureRTAWarning` alert, no `info-box` or `video-modal`).
  - `BudgetBreakdownCreditCardNextPayment` (all 6 states) and CC inspector cards (`TotalUnderfunded`, `CurrentBalance`, `AvailableForPayment`) — **`[MISSING]`**.
  - `LoanAccountOverview` (`LoanAccountTargetProgress`, `LoanAccountInspectorRecordPayment`) & `isPairing` splash — **`[MISSING]`**.
  - `BudgetInspectorActivity`, `BudgetInspectorTradeOffs`, `ForYouFeedCard`, `BudgetInspectorInspectorMessage` — **`[MISSING]`**.
  - `leftOverFromPreviousMonth` hardcoded to `$0.00` in `BudgetInspector.tsx` lines 181 and 250.

### 10. QuickBudget (Auto-Assign) — `[PARTIAL]`
- **Implemented** (`BudgetInspector.tsx` lines 503–600, `MoveMoneyModal.tsx` lines 132–197, `BudgetWorkspace.tsx` lines 811–837):
  - Buttons for `Underfunded`, `Assigned Last Month`, `Spent Last Month`, `Average Assigned`, `Average Spent`, `Reset Available Amounts`, `Reset Assigned Amounts`.
  - `Underfunded` execution in `MoveMoneyModal` (`onAutoAssignOption`).
- **Missing** (vs `services/quick-budget.js`, `components/budget/inspector/quick-budget/`):
  - All QuickBudget amounts in `BudgetInspector` (except single-category `Underfunded`) and `MoveMoneyModal` are hardcoded `$0.00`.
  - `Assigned Last Month`, `Spent Last Month`, `Average Assigned`, `Average Spent`, `Reset Available Amounts`, `Reset Assigned Amounts` have no execution logic in `BudgetWorkspace.tsx` or `onClick` handlers in `BudgetInspector.tsx`.
  - `modals/auto-assign-confirmation` preview modal when `noCategoriesSelected` is **`[MISSING]`**.
  - `isCalcPending` disabled state is **`[MISSING]`**.

### 11. InspectorGoals (Targets) — `[PARTIAL]`
- **Implemented** (`BudgetInspector.tsx` lines 311–498, `TargetConfigurationForm.tsx`):
  - Empty/View/Create/Edit states, Snooze switch, `Monthly`/`Weekly`/`Yearly`/`Custom` cadences, `NEED`/`MF`/`TB`/`TBD` types, day-of-month, day-of-week, due date, repeat interval, Delete/Cancel/Save, `Assign` button.
- **Missing** (vs `services/budget-goals.js`, `components/inspector-goals/`):
  - `InspectorGoalsEditGoalCreditCardPayment` (`PaySpecificAmountMonthly` / `PayOffBalanceByDate`).
  - `InspectorGoalsEditGoalLoanPayment` (`LoanAccountMonthPickerDropdown`, `InspectorGoalsLoanPaymentImpact`, `pairWithLoan`).
  - `ProgressDonut` in view mode and `Escape` key to cancel editing.
  - Validation error state (`.is-error`, `error-message`).

### 12. Keyboard Shortcuts — `[PARTIAL]`
- **Implemented** (`BudgetWorkspace.tsx` lines 197–276, `clone/src/components/modals/KeyboardShortcutsModal.tsx`):
  - `SelectAllCategories`, `DeselectAllCategories`, `CollapseAllCategoryGroups`, `ExpandAllCategoryGroups`, `SnoozeSelectedCategories`, and `KeyboardShortcutsModal`.
- **Missing** (vs `components/budget-table.js`):
  - `SelectPreviousCategory`, `SelectNextCategory`, `SelectAllPreviousCategory`, `SelectAllNextCategory` navigation shortcuts.

### 13. Modals & Popovers Triggered from Budget
- `AddMasterCategoryPopover.tsx` (`modals/budget/add-master-category`): **`[COVERED]`** (missing `FieldWithError` validation).
- `AddSubCategoryPopover.tsx` (`modals/budget/add-sub-category`): **`[COVERED]`** (does not auto-expand collapsed group or reset active view to All).
- `EditCategoryPopover.tsx` (`modals/budget/edit-category`): **`[COVERED]`** (missing `category-merge-wizard` confirmation).
- `MonthPickerPopover.tsx` (`modals/budget/calendar`): **`[COVERED]`** (missing `firstAllowedBudgetMonth`/`lastAllowedBudgetMonth` bounds).
- `ActivityTransactionsPopover.tsx` (`modals/budget/activity`): **`[COVERED]`** (`BudgetWorkspace.tsx` does not pass `transactions` prop yet).
- `MoveMoneyModal.tsx` (`modals/budget/move-money`): **`[PARTIAL]`** (missing `localStorage` persistence `IsReadyToAssignMoveMoneyOnAutoAssign` and real QuickBudget values).
- `CoverOverspendingPopover.tsx` (`modals/budget/cover-overspending`): **`[PARTIAL]`** (missing `ModalsBudgetCoverOverspendingMonthDropdown` for future months and `isCreditCardPaymentCategory` warning box).
- `RtaBreakdownPopover.tsx` (`modals/budget/budget-breakdown-to-be-budgeted`): **`[PARTIAL]`** (`Left Over from Last Month` and `Assigned in Future Months` hardcoded `$0.00`; missing `tbbMessage` footer & `ynab-helpbox`).
- `FreshStartModal.tsx` (`modals/budget/fresh-start`): **`[PARTIAL]`** (missing `isCurrentUserTheBudgetOwner` permission check, `unlinkAccountsInArchivedBudget` checkbox, and `budgetNameAlreadyExists` validation).
- `modals/budget/hidden-categories`: **`[MISSING]`** (only inline `Show All Hidden Categories` button exists in `BudgetWorkspace.tsx` lines 695–725).
- `modals/budget/note`: **`[MISSING]`**.
- `modals/using-credit-card`: **`[MISSING]`**.
- `modals/auto-assign-confirmation`: **`[MISSING]`**.
- `modals/budget-views-menu`, `modals/budget-views-create-edit`, `modals/budget-views-manage`: **`[MISSING]`**.
- `modals/budget-breakdown/future-months/video-modal`: **`[MISSING]`**.
- `modals/budget/category-merge-wizard`: **`[MISSING]`**.
- `RecentMoves` modal: **`[MISSING]`**.
