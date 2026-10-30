import React, { useState, useEffect, useMemo } from "react";
import type {
  CategoryGroupWithCategories,
  CategoryMonthAllocation,
  PlanMonthSummary,
} from "../api/types";
export type ExtendedFilterMode =
  | "ALL"
  | "OVERSPENT"
  | "UNDERFUNDED"
  | "OVERFUNDED"
  | "AVAILABLE"
  | "SNOOZED";
import { formatMilliunits, parseInputToMilliunits } from "../utils/currency";
import {
  addMonths,
  formatMonthLabel,
  getCurrentMonthIso,
} from "../utils/dates";
import { MonthPickerPopover } from "./modals/MonthPickerPopover";
import { CategoryEditModal } from "./modals/CategoryEditModal";
import { CategoryMenuPopover } from "./modals/CategoryMenuPopover";
import { AddCategoryGroupPopover } from "./modals/AddCategoryGroupPopover";
import { AddCategoryPopover } from "./modals/AddCategoryPopover";
import { EditCategoryGroupPopover } from "./modals/EditCategoryGroupPopover";
import { YnabIcon } from "./common/YnabIcon";
import {
  buildCircleProgressArcPath,
  computeCategoryVisualState,
} from "../utils/targetUtils";

export function resolveAssignedCellCommit(
  rawInput: string,
  currentAssignedMilliunits: number,
): number {
  return parseInputToMilliunits(rawInput, currentAssignedMilliunits);
}

export interface BudgetWorkspaceProps {
  planId?: string;
  month: string;
  monthSummary: PlanMonthSummary | null;
  categoryGroups: CategoryGroupWithCategories[];
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
  selectedCategoryIds?: string[];
  onSelectCategoryIds?: (categoryIds: string[]) => void;
  onChangeMonth: (nextMonth: string) => void;
  onAssignCategory: (
    categoryId: string,
    newAssignedMilliunits: number,
  ) => Promise<void>;
  onCreateGroup: (name: string) => Promise<void>;
  onUpdateGroup: (
    groupId: string,
    updates: { name?: string; hidden?: boolean },
  ) => Promise<void>;
  onDeleteGroupRequest: (groupId: string, groupName: string) => void;
  onCreateCategory: (groupId: string, name: string) => Promise<void>;
  onUpdateCategory: (
    categoryId: string,
    updates: { name?: string; hidden?: boolean },
  ) => Promise<void>;
  onDeleteCategoryRequest: (categoryId: string, categoryName: string) => void;
  onOpenMoveMoney: (
    sourceCategory: CategoryMonthAllocation,
    anchorPosition?: { top: number; left?: number; right?: number; bottom?: number },
  ) => void;
  inspector?: React.ReactNode;
}

const isInternalGroupName = (name: string) => {
  const lower = name.toLowerCase();
  return (
    lower.includes("internal master category") ||
    lower.includes("inflow: ready to assign") ||
    lower.includes("deferred income")
  );
};

const isInternalCategoryName = (name: string) => {
  const lower = name.toLowerCase();
  return (
    lower.includes("inflow: ready to assign") ||
    lower.includes("deferred income subcategory") ||
    lower.includes("unallocated")
  );
};

export function BudgetWorkspace({
  planId = "default",
  month,
  monthSummary,
  categoryGroups,
  selectedCategoryId,
  onSelectCategory,
  selectedCategoryIds,
  onSelectCategoryIds,
  onChangeMonth,
  onAssignCategory,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroupRequest,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategoryRequest,
  onOpenMoveMoney,
  inspector,
}: BudgetWorkspaceProps): React.JSX.Element {
  const effectiveSelectedIds = useMemo<string[]>(() => {
    if (selectedCategoryIds !== undefined) return selectedCategoryIds;
    return selectedCategoryId ? [selectedCategoryId] : [];
  }, [selectedCategoryIds, selectedCategoryId]);

  const selectedSet = useMemo(
    () => new Set(effectiveSelectedIds),
    [effectiveSelectedIds],
  );

  const handleSelectionChange = (newIds: string[]) => {
    if (onSelectCategoryIds) {
      onSelectCategoryIds(newIds);
    }
    if (onSelectCategory) {
      onSelectCategory(newIds.length === 1 ? newIds[0] : null);
    }
  };

  const allSelectableCategoryIds = useMemo(() => {
    if (!monthSummary) return [];
    return monthSummary.categories.map((c) => c.category_id);
  }, [monthSummary]);

  const isAllSelected =
    allSelectableCategoryIds.length > 0 &&
    allSelectableCategoryIds.every((id) => selectedSet.has(id));

  const isPartialSelected =
    !isAllSelected &&
    allSelectableCategoryIds.some((id) => selectedSet.has(id));

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAllSelected) {
      handleSelectionChange([]);
    } else {
      handleSelectionChange(allSelectableCategoryIds);
    }
  };

  const handleToggleGroup = (e: React.MouseEvent, gCatIds: string[]) => {
    e.stopPropagation();
    const allInGroup =
      gCatIds.length > 0 && gCatIds.every((id) => selectedSet.has(id));
    if (allInGroup) {
      handleSelectionChange(
        effectiveSelectedIds.filter((id) => !gCatIds.includes(id)),
      );
    } else {
      const next = Array.from(new Set([...effectiveSelectedIds, ...gCatIds]));
      handleSelectionChange(next);
    }
  };

  const handleToggleCategory = (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    if (selectedSet.has(catId)) {
      handleSelectionChange(effectiveSelectedIds.filter((id) => id !== catId));
    } else {
      handleSelectionChange([...effectiveSelectedIds, catId]);
    }
  };

  const handleCategoryRowClick = (e: React.MouseEvent, catId: string) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      handleToggleCategory(e, catId);
    } else {
      if (
        effectiveSelectedIds.length === 1 &&
        effectiveSelectedIds[0] === catId
      ) {
        handleSelectionChange([]);
      } else {
        handleSelectionChange([catId]);
      }
    }
  };

  const [filterMode, setFilterMode] = useState<ExtendedFilterMode>("ALL");
  const [showProgressBars, setShowProgressBars] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ynabx_show_progress_bars");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const handleToggleProgressBars = (show: boolean) => {
    setShowProgressBars(show);
    try {
      localStorage.setItem("ynabx_show_progress_bars", String(show));
    } catch {
      // ignore
    }
  };
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  );

  // Popovers & Modals state
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const dateButtonRef = React.useRef<HTMLButtonElement>(null);
  const [editingCategoryModal, setEditingCategoryModal] =
    useState<CategoryMonthAllocation | null>(null);

  // Edit Category Popover
  const [categoryMenuCat, setCategoryMenuCat] =
    useState<CategoryMonthAllocation | null>(null);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<{
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null>(null);

  // Add Category Group Popover
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [addGroupAnchor, setAddGroupAnchor] = useState<{
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null>(null);

  // Add Category Popover
  const [addCategoryGroupId, setAddCategoryGroupId] = useState<string | null>(
    null,
  );
  const [addCategoryAnchor, setAddCategoryAnchor] = useState<{
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null>(null);

  // Edit Category Group Popover
  const [editingGroup, setEditingGroup] =
    useState<CategoryGroupWithCategories | null>(null);
  const [editGroupAnchor, setEditGroupAnchor] = useState<{
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null>(null);

  // Inline Assigned cell editor state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingInput, setEditingInput] = useState<string>("");
  const [cellError, setCellError] = useState<string | null>(null);

  const rta = monthSummary?.ready_to_assign_milliunits ?? 0;
  const isRtaNegative = rta < 0;
  const isRtaZero = rta === 0;

  const rtaClass = isRtaNegative
    ? "is-negative"
    : isRtaZero
      ? "zero is-zero"
      : "is-positive";

  const rtaLabel = isRtaNegative
    ? "You Need to Assign"
    : isRtaZero
      ? "All Money Assigned"
      : "Ready to Assign";

  const rtaCurrencyClass = isRtaNegative
    ? "negative"
    : isRtaZero
      ? "zero"
      : "positive";

  // Filter out internal system categories
  const userCategories = (monthSummary?.categories ?? []).filter(
    (c) => !isInternalCategoryName(c.name),
  );

  const overspentCount = userCategories.filter(
    (c) => c.available_milliunits < 0,
  ).length;

  useEffect(() => {
    if (filterMode === "OVERSPENT" && overspentCount === 0) {
      setFilterMode("ALL");
    }
  }, [filterMode, overspentCount]);

  const filteredAllocations = userCategories.filter((cat) => {
    const visual = computeCategoryVisualState({
      planId,
      categoryId: cat.category_id,
      availableMilliunits: cat.available_milliunits,
      assignedMilliunits: cat.assigned_milliunits,
      activityMilliunits: cat.activity_milliunits,
      month,
      isCreditCardPayment: cat.is_credit_card_payment,
      formatCurrency: formatMilliunits,
    });

    if (filterMode === "OVERSPENT")
      return visual.status === "CASH_OVERSPENT" || visual.status === "CREDIT_OVERSPENT";
    if (filterMode === "UNDERFUNDED")
      return visual.status === "UNDERFUNDED";
    if (filterMode === "OVERFUNDED")
      return cat.available_milliunits > cat.assigned_milliunits && cat.assigned_milliunits > 0;
    if (filterMode === "AVAILABLE")
      return cat.available_milliunits > 0;
    if (filterMode === "SNOOZED")
      return visual.isSnoozed;
    return true; // "ALL"
  });

  const allocationsByGroupId = new Map<string, CategoryMonthAllocation[]>();
  for (const alloc of filteredAllocations) {
    const list = allocationsByGroupId.get(alloc.group_id) ?? [];
    list.push(alloc);
    allocationsByGroupId.set(alloc.group_id, list);
  }

  const startEditingAssigned = (cat: CategoryMonthAllocation) => {
    setEditingCategoryId(cat.category_id);
    setEditingInput((cat.assigned_milliunits / 1000).toFixed(2));
    setCellError(null);
  };

  const commitAssignedEdit = async (cat: CategoryMonthAllocation) => {
    try {
      const nextMilli = resolveAssignedCellCommit(
        editingInput,
        cat.assigned_milliunits,
      );
      setEditingCategoryId(null);
      setCellError(null);
      if (nextMilli !== cat.assigned_milliunits) {
        await onAssignCategory(cat.category_id, nextMilli);
      }
    } catch (err) {
      setCellError(
        err instanceof Error ? err.message : "Invalid currency expression",
      );
    }
  };

  return (
    <div
      className="content-min-break has-budget-views"
      style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
    >
      {/* Top Budget Header Bar (Exact YNAB Hierarchy) */}
      <header
        className={`budget-header ${
          rta < 0 ? "left-to-budget-is-negative" : "left-to-budget-is-positive"
        }`}
        style={{ flex: "0 0 auto", height: "auto", overflow: "visible" }}
      >
        <div className="budget-header-flexbox">
          {/* Calendar Month Switcher */}
          <div className="budget-header-item budget-header-calendar">
            <button
              className="budget-header-calendar-prev"
              aria-label="previous month budget"
              type="button"
              onClick={() => onChangeMonth(addMonths(month, -1))}
            >
              <YnabIcon name="chevron_left_circle" size={30} />
            </button>

            <div className="budget-header-calendar-date" style={{ position: "relative" }}>
              <button
                ref={dateButtonRef}
                className="budget-header-calendar-date-button"
                type="button"
                onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                title="Select month"
              >
                <span>{formatMonthLabel(month)}</span>
                <YnabIcon name="caret_down" size={12} />
              </button>
              <button
                className="budget-header-calendar-note user-data"
                title=""
                type="button"
                onClick={() => onChangeMonth(getCurrentMonthIso())}
              >
                Enter a note...
              </button>

              <MonthPickerPopover
                isOpen={isMonthPickerOpen}
                activeMonth={month}
                triggerRef={dateButtonRef}
                onSelectMonth={(nextMonth) => {
                  onChangeMonth(nextMonth);
                  setIsMonthPickerOpen(false);
                }}
                onClose={() => setIsMonthPickerOpen(false)}
              />
            </div>

            <button
              className="budget-header-calendar-next"
              aria-label="next month budget"
              type="button"
              onClick={() => onChangeMonth(addMonths(month, 1))}
            >
              <YnabIcon name="chevron_right_circle" size={30} />
            </button>
          </div>

          {/* Lime Green / Red / Grey Ready to Assign Banner */}
          <div className="budget-header-item budget-header-totals">
            <div className={`to-be-budgeted ${rtaClass}`}>
              <div className="to-be-budgeted-heading-wrapper">
                <h1 id="to-be-budgeted-heading">
                  <div className="to-be-budgeted-amount">
                    <span
                      className={`user-data currency ${rtaCurrencyClass}`}
                    >
                      <bdi>{formatMilliunits(rta)}</bdi>
                    </span>
                    <YnabIcon
                      name="info_circle_fill"
                      size={16}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="to-be-budgeted-label">{rtaLabel}</div>
                </h1>
                <button
                  className="to-be-budgeted-view-breakdown"
                  aria-label="View Ready to Assign Breakdown"
                  type="button"
                  onClick={(e) => {
                    const firstCat = userCategories[0];
                    if (firstCat) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onOpenMoveMoney(firstCat, {
                        top: rect.bottom + 4,
                        bottom: rect.bottom + 4,
                        left: rect.left,
                        right: rect.right,
                      });
                    }
                  }}
                />
              </div>

              <button
                className={`to-be-budgeted-auto-assign to-be-budgeted-button ${isRtaZero ? "is-disabled" : ""}`}
                aria-label={isRtaZero ? "All Money Assigned" : "Assign"}
                disabled={isRtaZero}
                type="button"
                onClick={(e) => {
                  if (isRtaZero) return;
                  const firstCat = userCategories[0];
                  if (firstCat) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onOpenMoveMoney(firstCat, {
                      top: rect.bottom + 4,
                      bottom: rect.bottom + 4,
                      left: rect.left,
                      right: rect.right,
                    });
                  }
                }}
              >
                <span className="label">Assign</span>
                <YnabIcon
                  name={isRtaZero ? "check_circle_fill" : "caret_down"}
                  size={16}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Add Member Button */}
          <div className="budget-header-item budget-header-share">
            <button className="ynab-button budget-header-share-button" type="button">
              <YnabIcon name="add_user" size={16} />
              Add Member
            </button>
          </div>
        </div>
      </header>

      {/* YNAB Filter Pills Row */}
      <section className="budget-view-row" style={{ flex: "0 0 auto" }}>
        <ul className="budget-view-buttons">
          <li
            title="All"
            className={`view-button-item index-0 condensed ${
              filterMode === "ALL" ? "selected" : ""
            }`}
          >
            <button
              title="All"
              className={`view-button view-button-all ${
                filterMode === "ALL" ? "selected" : ""
              }`}
              type="button"
              onClick={() => setFilterMode("ALL")}
            >
              All
            </button>
          </li>
          {overspentCount > 0 && (
            <li
              title="Overspent"
              className={`view-button-item index-1 condensed ${
                filterMode === "OVERSPENT" ? "selected" : ""
              }`}
            >
              <button
                title="Overspent"
                className={`view-button view-button-overspent overspent-cash ${
                  filterMode === "OVERSPENT" ? "selected" : ""
                }`}
                type="button"
                onClick={() =>
                  setFilterMode(filterMode === "OVERSPENT" ? "ALL" : "OVERSPENT")
                }
              >
                <YnabIcon
                  name="exclamation_mark_triangle_fill"
                  size={13}
                  className="view-button-icon"
                />
                {`${overspentCount} Overspent`}
              </button>
            </li>
          )}
          <li
            title="Underfunded"
            className={`view-button-item index-2 condensed ${
              filterMode === "UNDERFUNDED" ? "selected" : ""
            }`}
          >
            <button
              title="Underfunded"
              className={`view-button ${
                filterMode === "UNDERFUNDED" ? "selected" : ""
              }`}
              type="button"
              onClick={() =>
                setFilterMode(filterMode === "UNDERFUNDED" ? "ALL" : "UNDERFUNDED")
              }
            >
              Underfunded
            </button>
          </li>
          <li
            title="Overfunded"
            className={`view-button-item index-3 condensed ${
              filterMode === "OVERFUNDED" ? "selected" : ""
            }`}
          >
            <button
              title="Overfunded"
              className={`view-button ${
                filterMode === "OVERFUNDED" ? "selected" : ""
              }`}
              type="button"
              onClick={() =>
                setFilterMode(filterMode === "OVERFUNDED" ? "ALL" : "OVERFUNDED")
              }
            >
              Overfunded
            </button>
          </li>
          <li
            title="Money Available"
            className={`view-button-item index-4 condensed ${
              filterMode === "AVAILABLE" ? "selected" : ""
            }`}
          >
            <button
              title="Money Available"
              className={`view-button ${
                filterMode === "AVAILABLE" ? "selected" : ""
              }`}
              type="button"
              onClick={() =>
                setFilterMode(filterMode === "AVAILABLE" ? "ALL" : "AVAILABLE")
              }
            >
              Money Available
            </button>
          </li>
          <li
            title="Snoozed"
            className={`view-button-item index-5 condensed ${
              filterMode === "SNOOZED" ? "selected" : ""
            }`}
          >
            <button
              title="Snoozed"
              className={`view-button ${
                filterMode === "SNOOZED" ? "selected" : ""
              }`}
              type="button"
              onClick={() =>
                setFilterMode(filterMode === "SNOOZED" ? "ALL" : "SNOOZED")
              }
            >
              Snoozed
            </button>
          </li>
          <li className="view-button views-menu-button">
            <button aria-haspopup="true" aria-label="Views Menu" type="button">
              <YnabIcon name="filter_circle" size={16} className="views-menu-icon" />
            </button>
          </li>
        </ul>
      </section>

      {cellError && (
        <div
          role="alert"
          className="auth-error"
          style={{ margin: "0.4rem 1.5rem", padding: "0.45rem 0.75rem" }}
        >
          {cellError}
        </div>
      )}

      {/* Main Budget Table + Inspector Flex Container */}
      <div className="budget-table-and-inspector js-budget-table-and-inspector" style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0, width: "100%", position: "relative", overflow: "hidden" }}>
        <section className="budget-table-container is-expanded" style={{ flex: "1 1 0%", minWidth: 0, height: "100%", overflowY: "auto" }}>
          <div className="budget-table" role="treegrid">
            {/* Table Header Toolbar & Column Labels */}
            <div className="budget-table-header" role="rowgroup">
              <div className="budget-toolbar" role="row">
                <div role="cell">
                  <button
                    className="ghost-button primary type-body budget-toolbar-add-category"
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setAddGroupAnchor({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        bottom: rect.bottom,
                      });
                      setIsAddGroupOpen(true);
                    }}
                  >
                    <YnabIcon name="plus_circle_fill" size={16} />
                    Category Group
                  </button>
                </div>

                <div role="cell">
                  <span className="undo-redo-container js-undo-redo-container">
                    <button
                      disabled
                      className="ghost-button primary type-body undo-button"
                      type="button"
                    >
                      <YnabIcon name="undo" size={12} />
                      Undo
                    </button>
                    <button
                      disabled
                      className="ghost-button primary type-body redo-button"
                      type="button"
                    >
                      <YnabIcon name="redo" size={12} />
                      Redo
                    </button>
                  </span>
                </div>

                <div role="cell">
                  <span className="recent-moves-open-modal-container">
                    <button
                      className="ghost-button primary type-body budget-toolbar-open-recent-moves"
                      type="button"
                    >
                      <YnabIcon name="clock_arrow_back" size={16} />
                      <div id="js-recent-moves-title">Recent Moves</div>
                    </button>
                  </span>
                </div>

                <div role="cell">
                  <div
                    className="segmented-control iconOnlyOption progress-bars-toggle"
                    role="tablist"
                  >
                    <button
                      className={`segmented-control-button ${showProgressBars ? "selected" : ""}`}
                      title="Progress Bars On"
                      type="button"
                      onClick={() => handleToggleProgressBars(true)}
                    >
                      <YnabIcon name="progress_bars_on" size={12} />
                    </button>
                    <button
                      className={`segmented-control-button ${!showProgressBars ? "selected" : ""}`}
                      title="Progress Bars Off"
                      type="button"
                      onClick={() => handleToggleProgressBars(false)}
                    >
                      <YnabIcon name="progress_bars_off" size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <ul className="budget-table-header-labels budget-table-row-ul" role="row">
                <li
                  className="budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li"
                  aria-hidden="true"
                >
                  &nbsp;
                </li>
                <li
                  className="budget-table-cell-collapse budget-table-row-li"
                  role="columnheader"
                >
                  &nbsp;
                </li>
                <li
                  className="budget-table-cell-checkbox budget-table-row-li"
                  role="columnheader"
                >
                  <button
                    className="ynab-checkbox ynab-checkbox-button"
                    role="checkbox"
                    aria-checked={
                      isAllSelected
                        ? "true"
                        : isPartialSelected
                          ? "mixed"
                          : "false"
                    }
                    aria-label="Check all"
                    type="button"
                    onClick={handleToggleAll}
                  >
                    {isPartialSelected ? (
                      <svg
                        className="ynab-new-icon ynab-checkbox-button-square is-partial"
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                      >
                        <rect
                          x="2.5"
                          y="5.5"
                          width="8"
                          height="2"
                          rx="1"
                          fill="currentColor"
                        />
                      </svg>
                    ) : (
                      <YnabIcon
                        name="check"
                        size={13}
                        className={`ynab-checkbox-button-square ${
                          isAllSelected ? "is-checked" : ""
                        }`}
                      />
                    )}
                  </button>
                </li>
                <li
                  className="budget-table-cell-name budget-table-row-li"
                  role="columnheader"
                >
                  CATEGORY
                </li>
                <li
                  className="budget-table-cell-budgeted budget-table-row-li"
                  role="columnheader"
                >
                  ASSIGNED
                </li>
                <li
                  className="budget-table-cell-activity budget-table-row-li"
                  role="columnheader"
                >
                  ACTIVITY
                </li>
                <li
                  className="budget-table-cell-available budget-table-row-li"
                  role="columnheader"
                >
                  <strong>AVAILABLE</strong>
                </li>
                <li
                  className="budget-table-cell-margin-right budget-table-row-li"
                  aria-hidden="true"
                >
                  &nbsp;
                </li>
              </ul>
            </div>

            {/* Draggable Rows Container */}
            <div className="budget-table-draggable">
              {categoryGroups
                .filter((grp) => !isInternalGroupName(grp.name) && !grp.hidden)
                .map((group) => {
                  const groupCats = allocationsByGroupId.get(group.id) ?? [];
                  if (filterMode !== "ALL" && groupCats.length === 0) {
                    return null;
                  }
                  const isCollapsed = collapsedGroups[group.id] ?? false;

                  const groupAssigned = groupCats.reduce(
                    (s, c) => s + c.assigned_milliunits,
                    0,
                  );
                  const groupActivity = groupCats.reduce(
                    (s, c) => s + c.activity_milliunits,
                    0,
                  );
                  const groupAvailable = groupCats.reduce(
                    (s, c) => s + c.available_milliunits,
                    0,
                  );

                  const groupCatIds = groupCats.map((c) => c.category_id);
                  const isGroupAllSelected =
                    groupCatIds.length > 0 &&
                    groupCatIds.every((id) => selectedSet.has(id));
                  const isGroupPartialSelected =
                    !isGroupAllSelected &&
                    groupCatIds.some((id) => selectedSet.has(id));

                  return (
                    <React.Fragment key={group.id}>
                      {/* Master Category Row */}
                      <div
                        className="budget-table-row js-budget-table-row budget-table-row-ul is-master-category"
                        role="row"
                        aria-level={1}
                        aria-expanded={!isCollapsed}
                      >
                        <div
                          className="budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li"
                          aria-hidden="true"
                        >
                          &nbsp;
                        </div>
                        <div
                          className="budget-table-cell-collapse budget-table-row-li"
                          role="cell"
                        >
                          <button
                            className="js-budget-table-cell-collapse"
                            aria-label={`Collapse ${group.name} categories`}
                            type="button"
                            onClick={() =>
                              setCollapsedGroups((prev) => ({
                                ...prev,
                                [group.id]: !isCollapsed,
                              }))
                            }
                          >
                            <YnabIcon
                              name={isCollapsed ? "chevron_right" : "chevron_down"}
                              size={10}
                            />
                          </button>
                        </div>
                        <div
                          className="budget-table-cell-checkbox budget-table-row-li"
                          role="cell"
                        >
                          <button
                            className="ynab-checkbox ynab-checkbox-button"
                            role="checkbox"
                            aria-checked={
                              isGroupAllSelected
                                ? "true"
                                : isGroupPartialSelected
                                  ? "mixed"
                                  : "false"
                            }
                            aria-label={group.name}
                            type="button"
                            onClick={(e) => handleToggleGroup(e, groupCatIds)}
                          >
                            {isGroupPartialSelected ? (
                              <svg
                                className="ynab-new-icon ynab-checkbox-button-square is-partial"
                                width="13"
                                height="13"
                                viewBox="0 0 13 13"
                              >
                                <rect
                                  x="2.5"
                                  y="5.5"
                                  width="8"
                                  height="2"
                                  rx="1"
                                  fill="currentColor"
                                />
                              </svg>
                            ) : (
                              <YnabIcon
                                name="check"
                                size={13}
                                className={`ynab-checkbox-button-square ${
                                  isGroupAllSelected ? "is-checked" : ""
                                }`}
                              />
                            )}
                          </button>
                        </div>
                        <div
                          className="budget-table-cell-name budget-table-row-li"
                          role="rowheader"
                        >
                          <button
                            className="button budget-table-cell-button budget-table-cell-edit-category user-data"
                            title={group.name}
                            type="button"
                            onClick={(e) => {
                              if (group.is_system) return;
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setEditGroupAnchor({
                                top: rect.top,
                                left: rect.left,
                                width: rect.width,
                                height: rect.height,
                                bottom: rect.bottom,
                              });
                              setEditingGroup(group);
                            }}
                          >
                            {group.name}
                          </button>
                          {!group.is_system && (
                            <button
                              className="button budget-table-cell-add-category budget-table-cell-button"
                              aria-label="Add Category"
                              type="button"
                              onClick={(e) => {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setAddCategoryAnchor({
                                  top: rect.top,
                                  left: rect.left,
                                  width: rect.width,
                                  height: rect.height,
                                  bottom: rect.bottom,
                                });
                                setAddCategoryGroupId(group.id);
                              }}
                            >
                              <YnabIcon name="plus_circle_fill" size={14} />
                            </button>
                          )}
                        </div>
                        <div
                          className="budget-table-cell-budgeted budget-table-row-li"
                          role="cell"
                        >
                          <button
                            aria-disabled="true"
                            tabIndex={-1}
                            className={`user-data currency tabular-nums ${
                              groupAssigned === 0
                                ? "zero"
                                : groupAssigned > 0
                                  ? "positive"
                                  : "negative"
                            }`}
                          >
                            <bdi>{formatMilliunits(groupAssigned)}</bdi>
                          </button>
                        </div>
                        <div
                          className="budget-table-cell-activity budget-table-cell-flexed budget-table-row-li"
                          role="cell"
                        >
                          <button
                            className="budget-table-cell-category-moves js-budget-toolbar-open-category-moves"
                            aria-hidden="true"
                            tabIndex={-1}
                            type="button"
                            style={{ visibility: "hidden" }}
                          >
                            <div className="category-moves-moves-icon-wrapper">
                              <YnabIcon name="clock_arrow_back" size={14} />
                            </div>
                          </button>
                          <button
                            className="budget-number user-data"
                            tabIndex={0}
                            aria-disabled="true"
                            type="button"
                          >
                            <span
                              className={`user-data currency tabular-nums ${
                                groupActivity === 0
                                  ? "zero"
                                  : groupActivity > 0
                                    ? "positive"
                                    : "negative"
                              }`}
                            >
                              <bdi>{formatMilliunits(groupActivity)}</bdi>
                            </span>
                          </button>
                        </div>
                        <div
                          className="budget-table-cell-available budget-table-row-li"
                          role="cell"
                        >
                          <button
                            className="ynab-new-budget-available-number js-budget-available-number user-data"
                            aria-disabled="true"
                            disabled
                            type="button"
                            style={{
                              backgroundColor: "transparent",
                              boxShadow: "none",
                              cursor: "default",
                            }}
                          >
                            <span
                              className={`user-data currency tabular-nums ${
                                groupAvailable === 0
                                  ? "zero"
                                  : groupAvailable > 0
                                    ? "positive"
                                    : "negative"
                              }`}
                            >
                              <bdi>{formatMilliunits(groupAvailable)}</bdi>
                            </span>
                          </button>
                        </div>
                        <div
                          className="budget-table-cell-margin-right budget-table-row-li"
                          aria-hidden="true"
                        >
                          &nbsp;
                        </div>
                      </div>


                      {/* Sub-Category Rows */}
                      {!isCollapsed &&
                        groupCats.map((cat) => {
                          const isSelected = selectedSet.has(cat.category_id);
                          const isEditing =
                            editingCategoryId === cat.category_id;

                          const visualState = computeCategoryVisualState({
                            planId,
                            categoryId: cat.category_id,
                            availableMilliunits: cat.available_milliunits,
                            assignedMilliunits: cat.assigned_milliunits,
                            activityMilliunits: cat.activity_milliunits,
                            month,
                            isCreditCardPayment: cat.is_credit_card_payment,
                            formatCurrency: formatMilliunits,
                          });

                          return (
                            <div
                              key={cat.category_id}
                              className={`budget-table-row js-budget-table-row budget-table-row-ul is-sub-category ${
                                cat.is_credit_card_payment
                                  ? "is-debt-payment-category"
                                  : ""
                              } ${isSelected ? "is-checked" : ""}`}
                              role="row"
                              aria-level={2}
                              aria-expanded="true"
                              onClick={(e) =>
                                handleCategoryRowClick(e, cat.category_id)
                              }
                            >
                              <div
                                className="budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li"
                                aria-hidden="true"
                              >
                                &nbsp;
                              </div>
                              <div
                                className="budget-table-cell-collapse budget-table-row-li"
                                role="cell"
                              >
                                &nbsp;
                              </div>
                              <div
                                className="budget-table-cell-checkbox budget-table-row-li"
                                role="cell"
                              >
                                <button
                                  className="ynab-checkbox ynab-checkbox-button"
                                  role="checkbox"
                                  aria-checked={isSelected ? "true" : "false"}
                                  aria-label={cat.name}
                                  type="button"
                                  onClick={(e) =>
                                    handleToggleCategory(e, cat.category_id)
                                  }
                                >
                                  <YnabIcon
                                    name="check"
                                    size={13}
                                    className={`ynab-checkbox-button-square ${
                                      isSelected ? "is-checked" : ""
                                    }`}
                                  />
                                </button>
                              </div>
                              <div
                                className="budget-table-cell-name budget-table-row-li"
                                role="rowheader"
                              >
                                <div className="budget-table-cell-button budget-table-cell-edit-category user-data">
                                  <div className="budget-table-cell-edit-category-label js-budget-table-cell-edit-category-label">
                                    <div className="budget-table-cell-goal-nowrap">
                                      <button
                                        className="budget-table-cell-name-row-label-item user-data"
                                        title={cat.name}
                                        type="button"
                                        onClick={(e) =>
                                          handleCategoryRowClick(
                                            e,
                                            cat.category_id,
                                          )
                                        }
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          const rect =
                                            e.currentTarget.getBoundingClientRect();
                                          setCategoryMenuAnchor({
                                            top: rect.bottom + 4,
                                            left: rect.left,
                                          });
                                          setCategoryMenuCat(cat);
                                        }}
                                        style={{
                                          fontWeight: isSelected ? 600 : 400,
                                          fontSize: "1rem",
                                        }}
                                      >
                                        {cat.is_credit_card_payment ? "💳 " : ""}
                                        {cat.name}
                                      </button>

                                      <button
                                        className="category-edit-trigger-btn"
                                        type="button"
                                        title="Edit Category Name & Settings"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const rect =
                                            e.currentTarget.getBoundingClientRect();
                                          setCategoryMenuAnchor({
                                            top: rect.bottom + 4,
                                            left: Math.max(16, rect.left - 40),
                                          });
                                          setCategoryMenuCat(cat);
                                        }}
                                      >
                                        <YnabIcon name="pencil" size={11} />
                                      </button>

                                      <div className="budget-table-cell-goal-gap" />

                                      <div className="budget-table-cell-goal-status">
                                        {showProgressBars &&
                                          visualState.statusHighlight && (
                                            <>
                                              <span className="highlighted-message-part">
                                                {visualState.statusHighlight}
                                              </span>
                                              {visualState.statusSuffix ?? ""}
                                            </>
                                          )}
                                      </div>
                                    </div>

                                    <div className="budget-table-cell-goal-status-details">
                                      {showProgressBars &&
                                        visualState.statusDetails && (
                                          <>
                                            {visualState.statusDetailsPrefixDot && (
                                              <span className="highlighted-message-part">
                                                .
                                              </span>
                                            )}
                                            {visualState.statusDetails}
                                          </>
                                        )}
                                    </div>
                                  </div>

                                  {showProgressBars &&
                                    !cat.is_credit_card_payment && (
                                      <figure
                                        className="ynab-new-budget-bar-v2"
                                        role="group"
                                      >
                                        {visualState.sections.map((sec) => (
                                          <div
                                            key={sec.id}
                                            className="ynab-new-budget-bar-v2-section ynab-new-budget-bar-v2-section-funded"
                                            style={{
                                              flexBasis: `${sec.flexBasisPercent}%`,
                                            }}
                                          >
                                            {sec.segments.map((seg, idx) => (
                                              <div
                                                key={idx}
                                                className={`ynab-new-budget-bar-v2-segment ${seg.className}`}
                                                style={{
                                                  width: `${seg.widthPercent}%`,
                                                }}
                                              />
                                            ))}
                                          </div>
                                        ))}
                                      </figure>
                                    )}
                                </div>
                              </div>

                              {/* Assigned Cell */}
                              <div
                                className={`budget-table-cell-budgeted budget-table-row-li ${
                                  isEditing ? "is-editing" : ""
                                }`}
                                role="cell"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEditing) startEditingAssigned(cat);
                                }}
                              >
                                {isEditing ? (
                                  <input
                                    type="text"
                                    autoFocus
                                    className="ember-text-field assigned-cell-input"
                                    value={editingInput}
                                    onChange={(e) =>
                                      setEditingInput(e.target.value)
                                    }
                                    onBlur={() => void commitAssignedEdit(cat)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        void commitAssignedEdit(cat);
                                      if (e.key === "Escape")
                                        setEditingCategoryId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      width: "80px",
                                      textAlign: "right",
                                    }}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className="user-data currency tabular-nums assigned-cell-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingAssigned(cat);
                                    }}
                                  >
                                    <bdi>
                                      {formatMilliunits(cat.assigned_milliunits)}
                                    </bdi>
                                  </button>
                                )}
                              </div>

                              {/* Activity Cell */}
                              <div
                                className="budget-table-cell-activity budget-table-cell-flexed budget-table-row-li"
                                role="cell"
                              >
                                <button
                                  className="budget-table-cell-category-moves js-budget-toolbar-open-category-moves"
                                  aria-hidden="true"
                                  tabIndex={-1}
                                  type="button"
                                >
                                  <div className="category-moves-moves-icon-wrapper">
                                    <YnabIcon name="clock_arrow_back" size={14} />
                                  </div>
                                </button>
                                <button
                                  className="budget-number user-data"
                                  tabIndex={0}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCategory?.(cat.category_id);
                                  }}
                                >
                                  <span
                                    className={`user-data currency tabular-nums ${
                                      cat.activity_milliunits === 0
                                        ? "zero"
                                        : cat.activity_milliunits > 0
                                          ? "positive"
                                          : ""
                                    }`}
                                  >
                                    {formatMilliunits(cat.activity_milliunits)}
                                  </span>
                                </button>
                              </div>

                              {/* Available Cell */}
                              <div
                                className="budget-table-cell-available budget-table-row-li"
                                role="cell"
                              >
                                <button
                                  className={`ynab-new-budget-available-number js-budget-available-number user-data ${visualState.availablePillClass}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    onOpenMoveMoney(cat, {
                                      top: rect.bottom + 4,
                                      bottom: rect.bottom + 4,
                                      left: rect.left,
                                      right: rect.right,
                                    });
                                  }}
                                  title="Click to Move Money"
                                >
                                  {visualState.availableIcon ===
                                    "check_circle_fill" && (
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="-1 -1 2 2"
                                      className="icon-circle-progress complete"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <defs>
                                        <clipPath
                                          id={`icon-circle-progress-clip-${cat.category_id}`}
                                        >
                                          <path
                                            className="checkmark"
                                            transform="scale(.015) rotate(90) translate(-35, -28)"
                                            d="M62.7217 10.8417L30.1078 58.1502C29.4223 59.1438 28.4948 59.977 27.3909 60.5596C26.2858 61.1429 25.0439 61.454 23.773 61.454C22.5022 61.454 21.2603 61.1429 20.1551 60.5596C19.0513 59.977 18.1247 59.1451 17.4392 58.1515L1.27863 34.7095C0.350892 33.4061 -0.0848857 31.8439 0.0136661 30.2872C0.113302 28.7133 0.756408 27.1933 1.8757 26.0008L1.91649 25.9574L1.95863 25.9151C2.66751 25.2047 3.53559 24.6456 4.50937 24.2916C5.484 23.9373 6.53103 23.8009 7.57331 23.8971C8.61533 23.9933 9.61275 24.3184 10.4957 24.838C11.3768 25.3567 12.1179 26.0535 12.6786 26.8673L23.7732 42.9608L51.3201 3.00222C51.8809 2.18833 52.6235 1.48932 53.5048 0.970699C54.3877 0.451064 55.3851 0.126086 56.4272 0.0299405C57.4695 -0.0662309 58.5165 0.0703119 59.4911 0.424682C60.4648 0.778745 61.3328 1.33782 62.0417 2.04835L62.0837 2.09048L62.1244 2.13382C63.2435 3.32618 63.8866 4.84599 63.9863 6.41967C64.0849 7.97627 63.6493 9.53835 62.7217 10.8417Z"
                                          />
                                        </clipPath>
                                      </defs>
                                      <circle
                                        r=".9"
                                        cx="0"
                                        cy="0"
                                        strokeWidth=".2"
                                        className="outer"
                                      />
                                      <circle
                                        r=".65"
                                        cx="0"
                                        cy="0"
                                        className="inner"
                                        clipPath={`url(#icon-circle-progress-clip-${cat.category_id})`}
                                      />
                                    </svg>
                                  )}
                                  {visualState.availableIcon ===
                                    "pie_chart" && (
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="-1 -1 2 2"
                                      className={`icon-circle-progress ${(visualState.fundedProgressRatio ?? 0) === 0 ? "zero" : ""}`}
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <defs>
                                        <clipPath
                                          id={`icon-circle-progress-clip-${cat.category_id}`}
                                        >
                                          <path
                                            d={buildCircleProgressArcPath(
                                              visualState.fundedProgressRatio ??
                                                0,
                                            )}
                                          />
                                        </clipPath>
                                      </defs>
                                      <circle
                                        r=".9"
                                        cx="0"
                                        cy="0"
                                        strokeWidth=".2"
                                        className="outer"
                                      />
                                      <circle
                                        r=".65"
                                        cx="0"
                                        cy="0"
                                        className="inner"
                                        clipPath={`url(#icon-circle-progress-clip-${cat.category_id})`}
                                      />
                                    </svg>
                                  )}
                                  {visualState.availableIcon ===
                                    "credit_card_exclamation_mark" && (
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      className="icon-credt"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M1.5 3C2.32843 3 3 2.32843 3 1.5C3 0.671573 2.32843 0 1.5 0C0.671573 0 0 0.671573 0 1.5C0 2.32843 0.671573 3 1.5 3Z"
                                        transform="translate(8.5 11)"
                                      />
                                      <path
                                        d="M2.5 0H0.5C0.2 0 0 0.2 0 0.5L0.5 9C0.5 9.3 0.7 9.5 1 9.5H2.1C2.3 9.5 2.5 9.3 2.5 9L3 0.5C3 0.2 2.8 0 2.5 0Z"
                                        transform="translate(8.5)"
                                      />
                                      <path
                                        d="M7.3 2.7H1.8C1.4 2.7 1 2.3 1 1.8C1 1.4 1.4 1 1.8 1H7.1V0H1C0.5 0 0 0.5 0 1V7C0 7.5 0.5 8 1 8H7.4C7.5 7.8 7.7 7.5 7.9 7.3C7.7 7 7.5 6.6 7.5 6.1L7.3 2.7Z"
                                        transform="translate(0 3)"
                                      />
                                      <path
                                        d="M1 0H0.9L0.8 1.3C0.9 1.5 1 1.6 1 1.8C1 2 0.9 2.3 0.7 2.4L0.5 6.1C0.5 6.6 0.3 7 0 7.3C0.2 7.5 0.4 7.7 0.6 8H1C1.5 8 2 7.5 2 7V1C2 0.5 1.5 0 1 0Z"
                                        transform="translate(12 3)"
                                      />
                                    </svg>
                                  )}
                                  {visualState.availableIcon === "snooze" && (
                                    <YnabIcon
                                      name="snooze"
                                      size={12}
                                      className="icon-snooze"
                                    />
                                  )}
                                  <span
                                    className={`user-data currency tabular-nums ${visualState.availablePillClass}`}
                                  >
                                    <bdi>
                                      {formatMilliunits(cat.available_milliunits)}
                                    </bdi>
                                  </span>
                                </button>
                              </div>

                              <div
                                className="budget-table-cell-margin-right budget-table-row-li"
                                aria-hidden="true"
                              >
                                &nbsp;
                              </div>
                            </div>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
            </div>
          </div>
        </section>

        {inspector}
      </div>

      <AddCategoryGroupPopover
        isOpen={isAddGroupOpen}
        anchorPosition={addGroupAnchor}
        onClose={() => {
          setIsAddGroupOpen(false);
          setAddGroupAnchor(null);
        }}
        onCreateGroup={onCreateGroup}
      />

      <AddCategoryPopover
        isOpen={addCategoryGroupId !== null}
        groupId={addCategoryGroupId}
        anchorPosition={addCategoryAnchor}
        onClose={() => {
          setAddCategoryGroupId(null);
          setAddCategoryAnchor(null);
        }}
        onCreateCategory={onCreateCategory}
      />

      <EditCategoryGroupPopover
        isOpen={editingGroup !== null}
        group={editingGroup}
        anchorPosition={editGroupAnchor}
        onClose={() => {
          setEditingGroup(null);
          setEditGroupAnchor(null);
        }}
        onSaveName={async (groupId, newName) => {
          await onUpdateGroup(groupId, { name: newName });
        }}
        onDeleteGroup={(groupId, groupName) => {
          onDeleteGroupRequest(groupId, groupName);
        }}
        onToggleHide={async (groupId, hidden) => {
          await onUpdateGroup(groupId, { hidden });
        }}
      />

      <CategoryMenuPopover
        isOpen={categoryMenuCat !== null}
        category={categoryMenuCat}
        anchorPosition={categoryMenuAnchor}
        onClose={() => {
          setCategoryMenuCat(null);
          setCategoryMenuAnchor(null);
        }}
        onSaveName={async (catId, newName) => {
          await onUpdateCategory(catId, { name: newName });
        }}
        onDeleteCategory={(catId) => {
          if (categoryMenuCat) {
            onDeleteCategoryRequest(catId, categoryMenuCat.name);
          }
        }}
        onToggleHide={async (catId, hidden) => {
          await onUpdateCategory(catId, { hidden });
        }}
      />

      <CategoryEditModal
        isOpen={editingCategoryModal !== null}
        category={editingCategoryModal}
        onClose={() => setEditingCategoryModal(null)}
        onSaveName={async (catId, newName) => {
          await onUpdateCategory(catId, { name: newName });
        }}
        onDeleteCategory={(catId) => {
          if (editingCategoryModal) {
            onDeleteCategoryRequest(catId, editingCategoryModal.name);
          }
        }}
      />
    </div>
  );
}
