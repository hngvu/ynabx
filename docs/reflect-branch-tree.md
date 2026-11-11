# YNAB Reflect / Reports — Cây Nhánh & Bảng Điều Kiện (Branch Tree & Condition Catalog)

Tài liệu này được sinh tự động bởi `scripts/build_reflect_branch_tree.cjs` từ mã nguồn Glimmer wire-format của YNAB Ember (`main.beautified.js` và `wrapper.beautified.js`).

## Danh Sách 37 Template Modules

1. **`components/reflect/navigation-header/index.hbs`** (2 nhánh) — nguồn: `main.beautified.js`
2. **`templates/reflect.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
3. **`components/reflect/page-header/index.hbs`** (3 nhánh) — nguồn: `main.beautified.js`
4. **`components/reflect/loading-state/index.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
5. **`components/reflect/age-of-money/chart/index.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
6. **`components/reflect/age-of-money/chart-tooltip/index.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
7. **`components/reflect/age-of-money/index.hbs`** (5 nhánh) — nguồn: `main.beautified.js`
8. **`components/reflect/filter-button/index.hbs`** (4 nhánh) — nguồn: `main.beautified.js`
9. **`components/reflect/filter-controls/index.hbs`** (3 nhánh) — nguồn: `main.beautified.js`
10. **`components/reports/income-expense/income-expense-rows.hbs`** (12 nhánh) — nguồn: `main.beautified.js`
11. **`components/reflect/income-vs-expense/index.hbs`** (10 nhánh) — nguồn: `main.beautified.js`
12. **`components/reflect/net-worth/chart-tooltip/index.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
13. **`components/reflect/bar-chart-row/index.hbs`** (1 nhánh) — nguồn: `main.beautified.js`
14. **`components/reflect/net-worth/monthly-table/index.hbs`** (5 nhánh) — nguồn: `main.beautified.js`
15. **`components/reflect/net-worth/index.hbs`** (4 nhánh) — nguồn: `main.beautified.js`
16. **`components/reflect/spending-breakdown/donut-chart/index.hbs`** (2 nhánh) — nguồn: `main.beautified.js`
17. **`components/reflect/spending-empty-table-state/index.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
18. **`components/reflect/spending-breakdown/bar-chart/index.hbs`** (4 nhánh) — nguồn: `main.beautified.js`
19. **`components/reflect/spending-breakdown/positive-inflows/index.hbs`** (2 nhánh) — nguồn: `main.beautified.js`
20. **`components/reflect/spending-breakdown/index.hbs`** (6 nhánh) — nguồn: `main.beautified.js`
21. **`components/reports/spending/trends-chart.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
22. **`components/reflect/spending-trends/chart-tooltip/index.hbs`** (2 nhánh) — nguồn: `main.beautified.js`
23. **`components/reflect/spending-trends/monthly-table/index.hbs`** (4 nhánh) — nguồn: `main.beautified.js`
24. **`components/reflect/spending-trends/index.hbs`** (4 nhánh) — nguồn: `main.beautified.js`
25. **`components/reports/control-bar.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
26. **`templates/group/reports/education.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
27. **`templates/group/reports/survey.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
28. **`templates/group/reports/utilization.hbs`** (0 nhánh) — nguồn: `main.beautified.js`
29. **`components/reflect/net-worth/summary/index.hbs`** (2 nhánh) — nguồn: `wrapper.beautified.js`
30. **`components/reports/net-worth.hbs`** (0 nhánh) — nguồn: `wrapper.beautified.js`
31. **`components/modals/reports/filter-items.hbs`** (2 nhánh) — nguồn: `wrapper.beautified.js`
32. **`components/modals/reports/export-reports.hbs`** (0 nhánh) — nguồn: `wrapper.beautified.js`
33. **`components/reports/date-range.hbs`** (5 nhánh) — nguồn: `wrapper.beautified.js`
34. **`components/modals/reports/activity-transactions.hbs`** (1 nhánh) — nguồn: `wrapper.beautified.js`
35. **`components/reflect/spending-breakdown/inflow-warning-modal/index.hbs`** (0 nhánh) — nguồn: `wrapper.beautified.js`
36. **`components/reflect/modals/month-picker-dropdown/index.hbs`** (1 nhánh) — nguồn: `wrapper.beautified.js`
37. **`components/reflect/modals/time-frame-dropdown/index.hbs`** (5 nhánh) — nguồn: `wrapper.beautified.js`

---

## Cây Nhánh & Điều Kiện Chi Tiết Theo Từng Template

### `components/reflect/navigation-header/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `each` | `(-track-array (-track-array this.buttons))` | `root->each[4]` | Có |
| `ternary_class` | `@arg1.active` | `root->each((-track-array (-track-array this.buttons))):else->class_attr` | Không |

### `templates/reflect.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/page-header/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.shouldShowBreadcrumbs` | `root->if[8]` | Có |
| `if` | `(not @arg4.)` | `root->if[16]` | Không |
| `if` | `@arg5.` | `root->if((not @arg4.)):then->if[0]` | Không |

### `components/reflect/loading-state/index.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/age-of-money/chart/index.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/age-of-money/chart-tooltip/index.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/age-of-money/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.applicationService.isSyncingBackfill` | `root->if[6]` | Có |
| `if` | `this.shouldShowEmptyState` | `root->if(this.applicationService.isSyncingBackfill):else->[32,3][block_0]->if[1]` | Có |
| `if` | `this.shouldShowTimelineOptions` | `root->if(this.applicationService.isSyncingBackfill):else->[32,3][block_0]->if(this.shouldShowEmptyState):else->if[26]` | Không |
| `each` | `(-track-array (-track-array this.chartTimelineOptions))` | `root->if(this.applicationService.isSyncingBackfill):else->[32,3][block_0]->if(this.shouldShowEmptyState):else->if(this.shouldShowTimelineOptions):then->[32,5][block_0]->each[1]` | Có |
| `if` | `this.shouldShowTooltip` | `root->if(this.applicationService.isSyncingBackfill):else->[32,3][block_0]->if(this.shouldShowEmptyState):else->if[32]` | Không |

### `components/reflect/filter-button/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.shouldShowArrows` | `root->if[4]` | Không |
| `if` | `@arg6.` | `root->[32,0][block_0]->if[1]` | Không |
| `if` | `@arg3.` | `root->[32,0][block_0]->if[5]` | Không |
| `if` | `this.shouldShowArrows` | `root->if[8]` | Không |

### `components/reflect/filter-controls/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.activeToolbarButtons.timeframe` | `root->if[4]` | Không |
| `if` | `this.activeToolbarButtons.categories` | `root->if[5]` | Không |
| `if` | `this.activeToolbarButtons.accounts` | `root->if[6]` | Không |

### `components/reports/income-expense/income-expense-rows.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `each` | `(-track-array (-track-array @arg1.))` | `root->each[4]` | Có |
| `if` | `@arg2.childRows` | `root->each((-track-array (-track-array @arg1.))):else->if[5]` | Có |
| `if` | `@arg2.showChildRows` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.childRows):then->if[14]` | Có |
| `if` | `(not @arg2.columns)` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.childRows):then->if[18]` | Không |
| `if` | `@arg2.showChildRows` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.childRows):then->if((not @arg2.columns)):then->if[0]` | Không |
| `each` | `(-track-array (-track-array @arg3.))` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.childRows):then->if((not @arg2.columns)):then->if(@arg2.showChildRows):then->each[0]` | Có |
| `if` | `@arg2.showChildRows` | `root->each((-track-array (-track-array @arg1.))):else->if[6]` | Có |
| `each` | `(-track-array (-track-array @arg2.columns))` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.showChildRows):then->each[0]` | Có |
| `each` | `(-track-array (-track-array @arg2.totals))` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.showChildRows):else->each[0]` | Có |
| `if` | `@arg2.showChildRows` | `root->each((-track-array (-track-array @arg1.))):else->if[10]` | Không |
| `if` | `@arg2.totals` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.showChildRows):then->if[3]` | Không |
| `each` | `(-track-array (-track-array @arg2.totals))` | `root->each((-track-array (-track-array @arg1.))):else->if(@arg2.showChildRows):then->if(@arg2.totals):then->each[13]` | Có |

### `components/reflect/income-vs-expense/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.reportsService.showSyncingBackfillStatus` | `root->if[10]` | Có |
| `each` | `(-track-array (-track-array this.headers))` | `root->if(this.reportsService.showSyncingBackfillStatus):else->each[29]` | Có |
| `if` | `this.showIncome` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[49]` | Có |
| `each` | `(-track-array (-track-array this.headers))` | `root->if(this.reportsService.showSyncingBackfillStatus):else->each[55]` | Có |
| `if` | `this.showIncome` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[59]` | Không |
| `if` | `this.showExpense` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[77]` | Có |
| `each` | `(-track-array (-track-array this.headers))` | `root->if(this.reportsService.showSyncingBackfillStatus):else->each[83]` | Có |
| `if` | `this.showExpense` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[87]` | Không |
| `each` | `(-track-array (-track-array this.headers))` | `root->if(this.reportsService.showSyncingBackfillStatus):else->each[107]` | Có |
| `each` | `(-track-array (-track-array this.netIncome.columns))` | `root->if(this.reportsService.showSyncingBackfillStatus):else->each[121]` | Có |

### `components/reflect/net-worth/chart-tooltip/index.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/bar-chart-row/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `@arg1.` | `root->if[0]` | Có |

### `components/reflect/net-worth/monthly-table/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.chartDataReversed` | `root->if[8]` | Không |
| `if` | `this.shouldShowEmptyState` | `root->if(this.chartDataReversed):then->if[46]` | Có |
| `each` | `(-track-array (-track-array this.chartDataReversed))` | `root->if(this.chartDataReversed):then->if(this.shouldShowEmptyState):else->each[0]` | Có |
| `if` | `@arg1.decreased` | `root->if(this.chartDataReversed):then->if(this.shouldShowEmptyState):else->each((-track-array (-track-array this.chartDataReversed))):else->[32,5][block_0]->if[29]` | Có |
| `if` | `@arg1.increased` | `root->if(this.chartDataReversed):then->if(this.shouldShowEmptyState):else->each((-track-array (-track-array this.chartDataReversed))):else->[32,5][block_0]->if(@arg1.decreased):else->if[0]` | Có |

### `components/reflect/net-worth/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.reportsService.showSyncingBackfillStatus` | `root->if[8]` | Có |
| `if` | `this.chartData` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[5]` | Không |
| `if` | `this.tooltip` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if(this.chartData):then->if[5]` | Không |
| `if` | `this.chartData` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[9]` | Không |

### `components/reflect/spending-breakdown/donut-chart/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.centerLabel.formattedPercentage` | `root->if[19]` | Không |
| `if` | `this.shouldShowInflowWarning` | `root->if[20]` | Không |

### `components/reflect/spending-empty-table-state/index.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/spending-breakdown/bar-chart/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.shouldShowEmptyState` | `root->if[31]` | Có |
| `each` | `(-track-array (-track-array this.barChartData))` | `root->if(this.shouldShowEmptyState):else->each[0]` | Có |
| `if` | `@arg2.data.isHidden` | `root->if(this.shouldShowEmptyState):else->each((-track-array (-track-array this.barChartData))):else->[32,2][block_0]->if[5]` | Có |
| `if` | `(not ([32,6] @arg2.data.amount ))` | `root->if(this.shouldShowEmptyState):else->each((-track-array (-track-array this.barChartData))):else->[32,2][block_0]->if[21]` | Không |

### `components/reflect/spending-breakdown/positive-inflows/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `each` | `(-track-array (-track-array this.chartData))` | `root->[32,0][block_0]->each[33]` | Có |
| `if` | `@arg2.isHidden` | `root->[32,0][block_0]->each((-track-array (-track-array this.chartData))):else->[32,5][block_0]->if[5]` | Có |

### `components/reflect/spending-breakdown/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.reportsService.showSyncingBackfillStatus` | `root->if[11]` | Có |
| `if` | `(not this.selectedChartItem)` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[36]` | Không |
| `if` | `this.shouldShowEmptyStateMessage` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[42]` | Không |
| `if` | `this.mostFrequentCategory.count` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[112]` | Không |
| `if` | `this.largestOutflow.amount` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[132]` | Không |
| `if` | `this.netInflowChartDataItems.length` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[148]` | Không |

### `components/reports/spending/trends-chart.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/spending-trends/chart-tooltip/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.isChartDisplayItem` | `root->if[9]` | Có |
| `if` | `@arg1.hasNetInflows` | `root->if(this.isChartDisplayItem):else->if[16]` | Không |

### `components/reflect/spending-trends/monthly-table/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.shouldShowEmptyState` | `root->if[53]` | Có |
| `each` | `(-track-array (-track-array this.spendingSummary))` | `root->if(this.shouldShowEmptyState):else->each[0]` | Có |
| `if` | `@arg1.didDecrease` | `root->if(this.shouldShowEmptyState):else->each((-track-array (-track-array this.spendingSummary))):else->[32,6][block_0]->if[30]` | Có |
| `if` | `@arg1.didIncrease` | `root->if(this.shouldShowEmptyState):else->each((-track-array (-track-array this.spendingSummary))):else->[32,6][block_0]->if(@arg1.didDecrease):else->if[0]` | Có |

### `components/reflect/spending-trends/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.reportsService.showSyncingBackfillStatus` | `root->if[8]` | Có |
| `if` | `this.spendingReportData` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[0]` | Không |
| `if` | `this.tooltip` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[1]` | Không |
| `if` | `this.spendingReportData` | `root->if(this.reportsService.showSyncingBackfillStatus):else->if[3]` | Không |

### `components/reports/control-bar.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `templates/group/reports/education.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `templates/group/reports/survey.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `templates/group/reports/utilization.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/net-worth/summary/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.didIncrease` | `root->if[77]` | Có |
| `if` | `this.didDecrease` | `root->if(this.didIncrease):else->if[0]` | Có |

### `components/reports/net-worth.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/modals/reports/filter-items.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.showClearButton` | `root->[32,0][block_0]->if[13]` | Không |
| `each` | `(-track-array (-track-array this.filteredItems))` | `root->[32,0][block_0]->each[31]` | Có |

### `components/modals/reports/export-reports.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reports/date-range.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `each` | `(-track-array (-track-array this.presetDateRanges))` | `root->[32,0][block_0]->each[17]` | Có |
| `each` | `(-track-array (-track-array this.fromMonthsAvailable))` | `root->[32,0][block_0]->[32,4][block_0]->each[1]` | Có |
| `each` | `(-track-array (-track-array this.yearsAvailable))` | `root->[32,0][block_0]->[32,4][block_0]->each[1]` | Có |
| `each` | `(-track-array (-track-array this.toMonthsAvailable))` | `root->[32,0][block_0]->[32,4][block_0]->each[1]` | Có |
| `each` | `(-track-array (-track-array this.yearsAvailable))` | `root->[32,0][block_0]->[32,4][block_0]->each[1]` | Có |

### `components/modals/reports/activity-transactions.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `each` | `(-track-array (-track-array this.sortedTransactions))` | `root->[32,0][block_0]->[32,1][block_0]->[32,6][block_0]->each[1]` | Có |

### `components/reflect/spending-breakdown/inflow-warning-modal/index.hbs`

_Không có nhánh điều kiện động (Static Template)._

### `components/reflect/modals/month-picker-dropdown/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `if` | `this.isMonthPickerModalOpen` | `root->if[37]` | Không |

### `components/reflect/modals/time-frame-dropdown/index.hbs`

| Loại Nhánh | Điều Kiện Glimmer / Biểu Thức | Đường Dẫn AST | Có Else? |
| :--- | :--- | :--- | :--- |
| `each` | `(-track-array (-track-array this.presetDateRanges))` | `root->[32,0][block_0]->@arg1.body[block_0]->each[6]` | Có |
| `if` | `@arg2.active` | `root->[32,0][block_0]->@arg1.body[block_0]->each((-track-array (-track-array this.presetDateRanges))):else->if[10]` | Không |
| `if` | `this.isCustomTimeFrameSelected` | `root->[32,0][block_0]->@arg1.body[block_0]->if[28]` | Không |
| `if` | `this.isCustomTimeFrameSelected` | `root->[32,0][block_0]->@arg1.body[block_0]->if[34]` | Không |
| `each` | `(-track-array (-track-array this.customTimeFrameOptions))` | `root->[32,0][block_0]->@arg1.body[block_0]->if(this.isCustomTimeFrameSelected):then->each[5]` | Có |

