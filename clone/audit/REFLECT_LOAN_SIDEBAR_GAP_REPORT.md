# Reflect, Loan & Sidebar/Core Primitives — Clone Gap Report

> **Audited**: `clone/src/components/reflect/`, `clone/src/components/sidebar/`, `clone/src/components/layout/`, `clone/src/components/menu/`, `clone/src/components/core/`
> **Baseline Spec**: `unminified/ember_app/specs/REFLECT_LOAN_SIDEBAR_SPEC.md`
> **Classifications**: `[COVERED]` | `[PARTIAL]` | `[MISSING]`

---

## Executive Summary

| Area | Covered | Partial | Missing | Notes |
| --- | --- | --- | --- | --- |
| 1. Global Shell, Sidebar & Nav | 2 | 5 | 4 | Core sidebar, navlinks, and 5 account groups exist; drag-resize, favorite/starred group, referral, banners, and dashboard missing |
| 2. Reflect Charts, Tables & Filters | 5 | 4 | 1 | All 5 tabs, billboard.js charts, filter modals, CSV export, and Share Progress modal exist; several views use static/fixture chart series or omit `reports_filters_*` persistence |
| 3. Loan Account & Payoff Simulator | 0 | 0 | 7 | Entire `components/loan-account/` & `services/loan-accounts.js` domain is absent from `clone/src/` |
| 4. Core Reusable UI Primitives | 5 | 1 | 2 | `Icon`, `Button`, `GhostButton`, `Checkbox`, `Menu` covered; `Modal` lacks auto-positioning/focus-trap/shortcuts; `SegmentedControl` & `YnabNewCurrencyInput` missing |

---

## 1. Global Shell, Sidebar & Navigation (`layout/`, `sidebar/`, `menu/`)

| Feature | Status | Clone Reference | Ember Spec / Gap Details |
| --- | --- | --- | --- |
| `TopLayout` shell & logged-in/out classes | `[PARTIAL]` | `clone/src/components/layout/TopLayout.tsx` | Renders `.layout` and `.content-layout.user-logged-in` / `user-logged-out`. **Missing**: `inert={isInert}` when modal is open, `has-support-access-banner` + `<SupportAccessBanner>`, `<TopLayoutBannersGroupReverification>`, `<HideAmountsBanner>`, `<FileIncoming>` drag-drop overlay, and global Undo/Redo/`?` shortcuts (`app/components/top-layout/index.hbs`, `.js`). |
| `TopLayoutBanner` & Group Reverification | `[MISSING]` | — | No top-layout dismissible banner or `group-reverification-*` localStorage persistence (`app/components/top-layout/banner/`, `banners/group-reverification/`). |
| `TopSidebar` collapse/expand | `[PARTIAL]` | `clone/src/components/sidebar/TopSidebar.tsx` | Renders `.ynab-u.sidebar.logged-in`, `.sidebar-resized-collapsed`, `.sidebar-expand`, `.sidebar-collapse`, and `.sidebar-resizer` markup. **Missing**: actual mouse drag-resizing (`onDocumentMouseDown`/`Move`/`Up`), `sidebar-resized-account-value-and-refer-label-collapsed` intermediate breakpoint (`<= 210px`), `Ex.ToggleSidebar` keyboard shortcut, and `<KeyboardShortcutsShortcutTooltip>` (`app/components/top-sidebar/index.hbs`, `.js`). |
| `SidebarContents` & `SidebarDashboard` (`users.budgets`) | `[MISSING]` | — | `TopSidebar.tsx` always renders `<SidebarNav>`; no `users.budgets` route switch or `<SidebarSidebarDashboard>` resource cards (`app/components/sidebar/sidebar-contents/`, `sidebar-dashboard/`). |
| `SidebarNav` | `[PARTIAL]` | `clone/src/components/sidebar/SidebarNav.tsx` | Renders `.sidebar-nav`, `.sidebar-nav-menu-budget` (budget name + email), `.nav-main` with collapsed logo, `budget` (`Plan`), `reflect` (`Reflect`), `accounts` (`All Accounts`) links and `.active` states. **Missing**: `category-set-wizard` collapsed-only state (`app/components/sidebar/sidebar-nav/index.hbs`, `.js`). |
| `PlanMenuPopover` / `Menu` | `[COVERED]` | `clone/src/components/menu/index.tsx`, `clone/src/components/sidebar/PlanMenuPopover.tsx` | Implements `Menu`, `MenuItem` (`.menu-item.js-menu-item`, `leadingIcon`, `subtext`, `disclosure`, `href`/`button`), `MenuHeading`, and `MenuSeparator`. |
| `SidebarReferralBanner` & `SidebarReferralProgram` | `[MISSING]` | — | No referral banner or collapsed/expanded referral program CTA in `TopSidebar.tsx` (`app/components/sidebar/referral-banner/`, `referral-program/`). |
| `AccountsList` 5 standard groups + empty state + buttons | `[PARTIAL]` | `clone/src/components/sidebar/AccountsList.tsx` | Renders `cash`, `credit`, `loan`, `offBudget` (`TRACKING`), `closed` groups, `.nav-accounts-empty-state`, `Add Account`, and `Bank Connections` buttons. **Missing**: `favorite` (`STARRED`) group (`showFavoriteAccounts`), FTUE `.ftue-add-accounts` banner, and `isReadOnly` disabling (`app/components/accounts-list/index.hbs`, `.js`). |
| `NavAccountGroup` collapse & balances | `[PARTIAL]` | `clone/src/components/sidebar/NavAccountGroup.tsx` | Renders `.nav-account.{type}`, `.nav-account-block`, chevron toggle, group balance (hidden when `type === "closed"`), and intra-group drag-reorder (`useEmberSortable`). **Missing**: `localStorage` persistence of collapse state per `${budgetVersionId}_navAccount...` (`app/components/nav-account/index.js`). |
| `NavAccountRow` & `DirectImportStatusIcon` | `[COVERED]` | `clone/src/components/sidebar/NavAccountRow.tsx`, `clone/src/components/sidebar/DirectImportStatusIcon.tsx` | Renders `.nav-account-row`, `.is-selected`, `.is-editing-this-account`, left edit/notification dot icons, account name/balance, `isMissingLoanDetails` gear icon, and `<DirectImportStatusIcon>`. |
| `FileIncoming` drag-drop import overlay | `[MISSING]` | — | Not implemented in `TopLayout.tsx` (`app/components/top-layout/index.hbs`). |

---

## 2. Reflect Charts, Tables, Filters & Data Shapes (`components/reflect/`)

| Feature | Status | Clone Reference | Ember Spec / Gap Details |
| --- | --- | --- | --- |
| `ReflectNavigationHeader` (5 tabs) | `[COVERED]` | `clone/src/components/reflect/ReflectNavigationHeader.tsx` | Renders `.ynab-u.reports-header` with all 5 tabs (`spending-breakdown`, `spending-trends`, `net-worth`, `income-expense`, `age-of-money`) and `.active` class. |
| `ReflectPageHeader` (title, breadcrumbs, Export, Share) | `[COVERED]` | `clone/src/components/reflect/ReflectPageHeader.tsx` | Renders `.reflect-page-header-group`, `.reflect-breadcrumbs__selected-group-breadcrumbs` (`All Groups > Group`), `reflect-share-progress-button`, and `reflect-export-button`. |
| `ReflectFilterControls` & Modals (`TimeframeDropdownModal`, `FilterItemsModal`) | `[PARTIAL]` | `clone/src/components/reflect/ReflectFilterControls.tsx`, `clone/src/components/reflect/modals/TimeframeDropdownModal.tsx`, `clone/src/components/reflect/modals/FilterItemsModal.tsx` | Renders timeframe back/forward arrows, preset/custom timeframe dropdown, and category/account filter modals with pill counts. **Missing**: `localStorage` persistence (`reports_filters_${activeRoute}` in `services/reports.js`), `minDate`/`maxDate` clamping from `allBudgetMonthsViewModel.firstMonth`, and `syncingBackfillStatus` gating. |
| `NetWorthView` (billboard.js chart, summary, monthly table, tooltip) | `[PARTIAL]` | `clone/src/components/reflect/NetWorthView.tsx` | Renders billboard.js Debts/Assets bars + Net Worth line, summary card, monthly table, and tooltip. **Gap**: Uses static `NET_WORTH_DATA` fixture (`xLabels` hardcoded to `2024-01-01..2024-06-01`) instead of filtering live transactions/accounts by `timeframeState` and `selectedAccountIds` (`app/components/reflect/net-worth/index.js`). |
| `SpendingBreakdownView` (donut, bar chart, metrics, positive inflows, drill-down) | `[COVERED]` | `clone/src/components/reflect/SpendingBreakdownView.tsx`, `clone/src/components/reflect/reflectDataEngine.ts` | Computes live category/group breakdowns from `REFLECT_HISTORICAL_TRANSACTIONS`, supports `Categories`/`Groups` toggle, group drill-down + breadcrumbs, top-10 + `Everything Else` donut, `ResizeObserver` `single-column` (`< 1004px`), metrics cards, positive inflows card, `InflowWarningModal`, and `ActivityTransactionsModal`. |
| `SpendingTrendsView` (stacked bar + total line, tooltip, monthly table) | `[PARTIAL]` | `clone/src/components/reflect/SpendingTrendsView.tsx` | Renders billboard.js stacked bar + line chart, tooltip, and monthly table. **Gap**: Chart series (`cat1..cat3`, `lineChartData`, `xLabels`) are hardcoded to 6 static 2024 months rather than computed from `currentFilteredTransactions` or supporting category-group drill-down (`app/components/reflect/spending-trends/index.js`). |
| `IncomeExpenseView` (collapsible income/expense/net income table + drill-down) | `[PARTIAL]` | `clone/src/components/reflect/IncomeExpenseView.tsx` | Renders collapsible Income, Expense, and Net Income rows + inspect modal. **Gap**: Uses static `INCOME_EXPENSE_DATA` fixture and mock inspect modal transactions instead of live filtered data and `localStorage` `"incomeExpenseCollapse"` persistence (`app/components/reflect/income-vs-expense/index.js`). |
| `AgeOfMoneyView` (6m/1y/2y timeline, billboard.js area/line chart, info card) | `[COVERED]` | `clone/src/components/reflect/AgeOfMoneyView.tsx` | Renders current AoM, 6 Months / 1 Year / 2 Years timeline toggle, billboard.js area chart, empty state, hover tooltip, and understanding AoM info card. |
| `ExportReportsModal` & CSV export | `[COVERED]` | `clone/src/components/reflect/modals/ExportReportsModal.tsx`, `ReflectWorkspace.tsx` (`handleExportConfirm`) | Renders modal with `"Don't show again"` checkbox and exports CSV for each report type (multi-file zip export from `services/reports.js` not needed/omitted). |
| `ChartImageExporterModal` (Share Progress) | `[COVERED]` | `clone/src/components/reflect/modals/ChartImageExporterModal.tsx` | Renders Net Worth share progress preview modal with hide-amounts toggle and copy-link feedback. |
| `ReflectLoadingState` (backfill syncing state) | `[MISSING]` (unwired) | `clone/src/components/reflect/ReflectLoadingState.tsx` | Component file exists, but `ReflectWorkspace.tsx` never sets/passes `showSyncingBackfillStatus`. |

---

## 3. Loan Account Payoff Simulator & Paired Category Logic

> **Finding**: No `loan-account` components or `loan-accounts` service exist anywhere in `clone/src/`. Only the sidebar `loan` account group (`AccountsList.tsx`) and `isMissingLoanDetails` gear icon (`NavAccountRow.tsx`) are present.

| Feature | Status | Clone Reference | Ember Spec / Gap Details |
| --- | --- | --- | --- |
| `LoanAccounts` service & `paydownHelper` / `paydownAnalysis` | `[MISSING]` | — | `unminified/ember_app/app/services/loan-accounts.js` — no loan calculation engine, `paydownAnalysis`, or `allMonthsActivity` in `clone/src/`. |
| `LoanAccount` page container & `LoanAccountHeader` | `[MISSING]` | — | `unminified/ember_app/app/components/loan-account/index.hbs`, `.js` — no dedicated loan account view when selecting a loan account in `Accounts`. |
| `LoanAccountPayoffSimulator` & `Inputs` | `[MISSING]` | — | `unminified/ember_app/app/components/loan-account/payoff-simulator/` — no monthly payment / payoff date / one-time extra simulator or `"Copy & Go to My Budget"` actions. |
| `LoanAccountPaydownChart` & `PaydownComparison` | `[MISSING]` | — | `unminified/ember_app/app/components/loan-account/paydown-chart/`, `paydown-comparison/` — no 5-series paydown chart, tooltip pinning, or neutral-series rebasing. |
| `LoanAccountPairedCategory` & `PairedCategoryCard` | `[MISSING]` | — | `unminified/ember_app/app/components/loan-account/paired-category/` — no paired category card, unhide action, target summary, or pair-category banner. |
| `LoanAccountLoanProgress` & `TargetProgress` | `[MISSING]` | — | `unminified/ember_app/app/components/loan-account/loan-progress/`, `target-progress/` — no principal-paid progress card or invalid-initial-balance state. |
| `LoanAccountPayoffSimulatorBanner` & `PayoffCelebrationBanner` | `[MISSING]` | — | `unminified/ember_app/app/components/loan-account/payoff-simulator-banner/`, `payoff-celebration-banner/` — neither banner exists. |

---

## 4. Core Reusable UI Primitives (`components/core/`)

| Primitive | Status | Clone Reference | Ember Spec / Gap Details |
| --- | --- | --- | --- |
| `Icon` | `[COVERED]` | `clone/src/components/core/Icon.tsx` | Renders `<svg className="ynab-new-icon" width={width} height={height}>` with optional `<title>` and `<use href="#icon_sprite_{name}" />`. |
| `Button` | `[COVERED]` | `clone/src/components/core/Button.tsx` | Matches `ynab-button {variant} is-large is-icon-only` and `<a>` vs `<button>` rendering. |
| `GhostButton` | `[COVERED]` | `clone/src/components/core/GhostButton.tsx` | Matches `ghost-button {variant} is-icon-only is-dropdown type-body|type-body-large` and `<a>` vs `<button>` rendering. |
| `Checkbox` | `[COVERED]` | `clone/src/components/core/Checkbox.tsx` | Matches `ynab-checkbox ynab-checkbox-button is-disabled is-checked`, `role="checkbox"`, `aria-checked="true|false|mixed"`, and `subtract`/`check` icon. |
| `Menu` (`Menu.Item`, `Menu.Heading`, `Menu.Separator`) | `[COVERED]` | `clone/src/components/menu/index.tsx` | Matches `.menu.js-menu`, `.menu-item.js-menu-item`, `.menu-heading`, `.menu-separator`. |
| `Modal` (`Header`, `Hero`, `Body`, `Footer`) | `[PARTIAL]` | `clone/src/components/core/Modal.tsx` | Matches `.modal-overlay.active`, `.modal`, `role="dialog"`, `aria-modal="true"`, `<svg className="modal-arrow">`, and `ModalHeader`/`Hero`/`Body`/`Footer`. **Missing**: automatic `triggerElement` / `contextMenuTriggerPos` positioning, arrow flip (`validateArrowDirection`), overflow scrolling (`makeScrollableIfOverflowed`), `Tab`/`Shift+Tab` focus trap, `Enter` primary-button submit, and `Ex.CloseModal` `Escape` shortcut (`app/components/modal/index.js`). |
| `SegmentedControl` | `[MISSING]` | — | Not in `clone/src/components/core/`. Reflect & Budget views inline `<div className="segmented-control">` markup instead of a shared primitive with `ArrowLeft`/`ArrowRight` keyboard navigation (`app/components/segmented-control/index.hbs`, `.js`). |
| `YnabNewCurrencyInput` | `[MISSING]` | — | Not in `clone/src/components/core/`. Missing shared currency input with inline math calculator (`+`, `-`, `*`, `/`, `%`, `^`), `YnabNewCurrencyInputCalculator` popup, `±10^15` milliunit cap, and `Escape`/`Enter`/`Tab` commit/cancel semantics (`app/components/ynab-new-currency-input/`). |
