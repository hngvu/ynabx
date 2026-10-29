import React, { useState, useEffect } from "react";
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
import { YnabIcon } from "./common/YnabIcon";

export function resolveAssignedCellCommit(
  rawInput: string,
  currentAssignedMilliunits: number,
): number {
  return parseInputToMilliunits(rawInput, currentAssignedMilliunits);
}

export interface BudgetWorkspaceProps {
  month: string;
  monthSummary: PlanMonthSummary | null;
  categoryGroups: CategoryGroupWithCategories[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
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
  month,
  monthSummary,
  categoryGroups,
  selectedCategoryId,
  onSelectCategory,
  onChangeMonth,
  onAssignCategory,
  onCreateGroup,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategoryRequest,
  onOpenMoveMoney,
  inspector,
}: BudgetWorkspaceProps): React.JSX.Element {
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
  const [categoryMenuCat, setCategoryMenuCat] =
    useState<CategoryMonthAllocation | null>(null);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Inline Assigned cell editor state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingInput, setEditingInput] = useState<string>("");
  const [cellError, setCellError] = useState<string | null>(null);

  // Inline Group / Category creation state
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingCategoryForGroup, setAddingCategoryForGroup] = useState<
    string | null
  >(null);
  const [newCategoryName, setNewCategoryName] = useState("");

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
    if (filterMode === "OVERSPENT") return cat.available_milliunits < 0;
    if (filterMode === "UNDERFUNDED") return cat.available_milliunits <= 0;
    if (filterMode === "OVERFUNDED") return cat.available_milliunits > cat.assigned_milliunits && cat.assigned_milliunits > 0;
    if (filterMode === "AVAILABLE") return cat.available_milliunits > 0;
    if (filterMode === "SNOOZED") return false;
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
      <section className="budget-view-row">
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
      <div className="budget-table-and-inspector js-budget-table-and-inspector">
        <section className="budget-table-container is-expanded" style={{ overflowY: "auto" }}>
          <div className="budget-table" role="treegrid">
            {/* Table Header Toolbar & Column Labels */}
            <div className="budget-table-header" role="rowgroup">
              <div className="budget-toolbar" role="row">
                <div role="cell">
                  {!addingGroup ? (
                    <button
                      className="ghost-button primary type-body budget-toolbar-add-category"
                      type="button"
                      onClick={() => setAddingGroup(true)}
                    >
                      <YnabIcon name="plus_circle_fill" size={16} />
                      Category Group
                    </button>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newGroupName.trim()) return;
                        await onCreateGroup(newGroupName.trim());
                        setNewGroupName("");
                        setAddingGroup(false);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="New Category Group"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        autoFocus
                        className="form-input"
                        style={{
                          height: "26px",
                          width: "160px",
                          padding: "0 0.5rem",
                          fontSize: "0.82rem",
                        }}
                      />
                      <button
                        type="submit"
                        className="button button-primary"
                        style={{ height: "26px", padding: "0 8px", fontSize: "0.78rem" }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingGroup(false)}
                        className="button button-cancel"
                        style={{ height: "26px", padding: "0 8px", fontSize: "0.78rem" }}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
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
                    aria-checked="false"
                    aria-label="Check all"
                    type="button"
                  >
                    <YnabIcon
                      name="check"
                      size={13}
                      className="ynab-checkbox-button-square"
                    />
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
                            aria-checked="false"
                            aria-label={group.name}
                            type="button"
                          >
                            <YnabIcon
                              name="check"
                              size={13}
                              className="ynab-checkbox-button-square"
                            />
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
                          >
                            {group.name}
                          </button>
                          {!group.is_system && (
                            <button
                              className="button budget-table-cell-add-category budget-table-cell-button"
                              aria-label="Add Category"
                              type="button"
                              onClick={() => setAddingCategoryForGroup(group.id)}
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

                      {/* Inline Add Category Input Row */}
                      {addingCategoryForGroup === group.id && (
                        <div
                          className="budget-table-row js-budget-table-row budget-table-row-ul is-sub-category"
                          role="row"
                          style={{ backgroundColor: "var(--backgroundSecondary)" }}
                        >
                          <div className="budget-table-cell-margin-left">&nbsp;</div>
                          <div className="budget-table-cell-collapse">&nbsp;</div>
                          <div className="budget-table-cell-checkbox">&nbsp;</div>
                          <div
                            className="budget-table-cell-name"
                            style={{ flex: 1, padding: "0.3rem 0.5rem" }}
                          >
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newCategoryName.trim()) return;
                                await onCreateCategory(
                                  group.id,
                                  newCategoryName.trim(),
                                );
                                setNewCategoryName("");
                                setAddingCategoryForGroup(null);
                              }}
                              style={{
                                display: "flex",
                                gap: "0.4rem",
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="text"
                                placeholder="New category name"
                                value={newCategoryName}
                                onChange={(e) =>
                                  setNewCategoryName(e.target.value)
                                }
                                autoFocus
                                className="form-input"
                                style={{
                                  height: "26px",
                                  width: "200px",
                                  fontSize: "0.82rem",
                                }}
                              />
                              <button
                                type="submit"
                                className="button button-primary"
                                style={{
                                  padding: "0 0.6rem",
                                  height: "26px",
                                  fontSize: "0.78rem",
                                }}
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddingCategoryForGroup(null)}
                                className="button button-cancel"
                                style={{
                                  padding: "0 0.6rem",
                                  height: "26px",
                                  fontSize: "0.78rem",
                                }}
                              >
                                Cancel
                              </button>
                            </form>
                          </div>
                          <div className="budget-table-cell-margin-right">&nbsp;</div>
                        </div>
                      )}

                      {/* Sub-Category Rows */}
                      {!isCollapsed &&
                        groupCats.map((cat) => {
                          const isSelected =
                            selectedCategoryId === cat.category_id;
                          const isEditing =
                            editingCategoryId === cat.category_id;

                          const available = cat.available_milliunits;
                          const activity = cat.activity_milliunits;
                          const isOverspent = available < 0;
                          const hasSpent = activity < 0;
                          const spentAmount = Math.abs(activity);

                          let statusLabel: React.ReactNode = null;
                          let barWidth = "0%";
                          let barColor = "var(--categoryBalancePositiveBackground, #aee865)";
                          let barSegmentClass = "is-fully-funded";

                          if (isOverspent) {
                            statusLabel = (
                              <span
                                className="budget-table-cell-goal-status highlighted-message-part"
                                style={{
                                  fontWeight: 600,
                                  color: "var(--labelNegative, #bf2e3b)",
                                }}
                              >
                                Overspent by {formatMilliunits(Math.abs(available))}
                              </span>
                            );
                            barWidth = "100%";
                            barColor = "var(--labelNegative, #bf2e3b)";
                            barSegmentClass = "is-overspent";
                          } else if (hasSpent) {
                            const totalFunds = available + spentAmount;
                            const percentSpent =
                              totalFunds > 0
                                ? Math.min(100, Math.max(0, Math.round((spentAmount / totalFunds) * 100)))
                                : 100;

                            if (available === 0) {
                              statusLabel = (
                                <span
                                  className="budget-table-cell-goal-status highlighted-message-part"
                                  style={{
                                    fontWeight: 600,
                                    color: "var(--labelSecondary, #6e7a88)",
                                  }}
                                >
                                  All spent · {formatMilliunits(spentAmount)}
                                </span>
                              );
                              barWidth = "100%";
                              barColor = "var(--alphaNeutral50070, #6e7a88)";
                              barSegmentClass = "is-fully-spent";
                            } else {
                              statusLabel = (
                                <span
                                  className="budget-table-cell-goal-status highlighted-message-part"
                                  style={{
                                    fontWeight: 500,
                                    color: "var(--labelSecondary, #6e7a88)",
                                  }}
                                >
                                  Spent {formatMilliunits(spentAmount)} of {formatMilliunits(totalFunds)}
                                </span>
                              );
                              barWidth = `${percentSpent}%`;
                              barColor =
                                percentSpent >= 90
                                  ? "var(--categoryBalanceWarningBackground, #f8d655)"
                                  : "var(--brandSPBlurple500, #545bfe)";
                              barSegmentClass = "is-spending";
                            }
                          } else if (available > 0) {
                            statusLabel = (
                              <span
                                className="budget-table-cell-goal-status highlighted-message-part"
                                style={{
                                  fontWeight: 600,
                                  color: "var(--categoryBalancePositiveLabel, #029864)",
                                }}
                              >
                                Funded
                              </span>
                            );
                            barWidth = "100%";
                            barColor = "var(--categoryBalancePositiveBackground, #aee865)";
                            barSegmentClass = "is-fully-funded";
                          } else {
                            statusLabel = (
                              <span
                                className="budget-table-cell-goal-status highlighted-message-part"
                                style={{
                                  fontWeight: 500,
                                  color: "var(--labelSecondary, #6e7a88)",
                                }}
                              >
                                Unfunded
                              </span>
                            );
                            barWidth = "0%";
                            barColor = "transparent";
                            barSegmentClass = "is-unfunded";
                          }

                          return (
                            <div
                              key={cat.category_id}
                              className={`budget-table-row js-budget-table-row budget-table-row-ul is-sub-category ${
                                isSelected ? "is-checked" : ""
                              }`}
                              role="row"
                              aria-level={2}
                              aria-expanded="true"
                              onClick={() => onSelectCategory(cat.category_id)}
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
                                  aria-checked={isSelected}
                                  aria-label={cat.name}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCategory(
                                      isSelected ? null : cat.category_id,
                                    );
                                  }}
                                >
                                  <YnabIcon
                                    name="check"
                                    size={13}
                                    className="ynab-checkbox-button-square"
                                  />
                                </button>
                              </div>
                              <div
                                className="budget-table-cell-name budget-table-row-li"
                                role="rowheader"
                              >
                                <div className="budget-table-cell-button budget-table-cell-edit-category user-data" style={{ display: "flex", flexDirection: "column", width: "100%", justifyContent: "center" }}>
                                  {/* Top Row: Category Name on left, Status Text on right */}
                                  <div
                                    className="budget-table-cell-edit-category-label js-budget-table-cell-edit-category-label"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      width: "100%",
                                      gap: "8px",
                                    }}
                                  >
                                    <div
                                      className="budget-table-cell-goal-nowrap"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        minWidth: 0,
                                        flex: "0 1 auto",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <button
                                        className="budget-table-cell-name-row-label-item user-data"
                                        title={cat.name}
                                        type="button"
                                        onClick={() => onSelectCategory(cat.category_id)}
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setCategoryMenuAnchor({
                                            top: rect.bottom + 4,
                                            left: rect.left,
                                          });
                                          setCategoryMenuCat(cat);
                                        }}
                                        style={{
                                          background: "transparent",
                                          border: "none",
                                          padding: 0,
                                          cursor: "pointer",
                                          textAlign: "left",
                                          fontWeight: isSelected ? 700 : 500,
                                          color: "var(--labelPrimary, #191818)",
                                          fontSize: "0.875rem",
                                          textOverflow: "ellipsis",
                                          overflow: "hidden",
                                          whiteSpace: "nowrap",
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
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setCategoryMenuAnchor({
                                            top: rect.bottom + 4,
                                            left: Math.max(16, rect.left - 40),
                                          });
                                          setCategoryMenuCat(cat);
                                        }}
                                      >
                                        <YnabIcon name="pencil" size={11} />
                                      </button>
                                    </div>

                                    {/* Right Corner: Status Text above the progress bar */}
                                    {showProgressBars && statusLabel && (
                                      <div
                                        className="budget-table-cell-goal-status-container"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          flexShrink: 0,
                                          fontSize: "0.72rem",
                                          color: "var(--labelSecondary, #6e7a88)",
                                          whiteSpace: "nowrap",
                                          marginLeft: "auto",
                                          paddingLeft: "6px",
                                        }}
                                      >
                                        {statusLabel}
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom: Progress bar full width beneath name and status */}
                                  {showProgressBars && (
                                    <figure
                                      className="ynab-new-budget-bar-v2"
                                      role="group"
                                      style={{
                                        width: "100%",
                                        marginTop: "5px",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      <div
                                        className="ynab-new-budget-bar-v2-section ynab-new-budget-bar-v2-section-funded"
                                        style={{
                                          width: "100%",
                                          height: "4px",
                                          backgroundColor: "var(--backgroundTertiary, #f2efe9)",
                                          borderRadius: "2px",
                                          overflow: "hidden",
                                          margin: 0,
                                        }}
                                      >
                                        <div
                                          className={`ynab-new-budget-bar-v2-segment ${barSegmentClass}`}
                                          style={{
                                            height: "100%",
                                            width: barWidth,
                                            backgroundColor: barColor,
                                            borderRadius: "2px",
                                            transition: "width 0.3s ease-out",
                                          }}
                                        />
                                      </div>
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
                                    onSelectCategory(cat.category_id);
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
                                  className={`ynab-new-budget-available-number js-budget-available-number user-data ${
                                    cat.available_milliunits === 0
                                      ? "zero pill-zero"
                                      : cat.available_milliunits > 0
                                        ? "positive pill-positive"
                                        : cat.is_credit_card_payment
                                          ? "cautious pill-warning"
                                          : "negative pill-negative"
                                  }`}
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
                                  <bdi>
                                    {formatMilliunits(cat.available_milliunits)}
                                  </bdi>
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
