import React, { useEffect, useRef, useState } from "react";
import type {
  CategoryMonthAllocation,
  PlanMonthSummary,
} from "../api/types";
import {
  computeQuickBudgetAssign,
  type QuickBudgetAction,
} from "../state/budgetReducer";
import { formatMilliunits } from "../utils/currency";
import { formatMonthLabel } from "../utils/dates";
import {
  getCategoryTarget,
  isTargetSnoozed,
  saveCategoryTarget,
  setTargetSnooze,
  type CategoryTarget,
  type TargetCadence,
  type TargetType,
} from "../utils/targetUtils";

export interface BudgetInspectorProps {
  month: string;
  monthSummary: PlanMonthSummary | null;
  selectedCategory: CategoryMonthAllocation | null;
  selectedCategories?: CategoryMonthAllocation[];
  onDeselectAll?: () => void;
  onQuickAssign: (
    categoryId: string,
    newAssignedMilliunits: number,
  ) => Promise<void>;
  onSaveCategoryNote: (
    categoryId: string,
    note: string | null,
  ) => Promise<void>;
  planId?: string;
  onTargetChange?: () => void;
  onUpdateCategoryName?: (categoryId: string, name: string) => Promise<void>;
}

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function BudgetInspector({
  month,
  monthSummary,
  selectedCategory,
  selectedCategories,
  onDeselectAll,
  onQuickAssign,
  onSaveCategoryNote,
  planId = "default",
  onTargetChange,
  onUpdateCategoryName,
}: BudgetInspectorProps): React.JSX.Element {
  // Resizer state
  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("ynabx_inspector_width");
      if (saved) return Math.max(300, Math.min(600, Number(saved)));
    } catch {
      // Ignore localStorage access failures (e.g. private browsing or security sandbox)
    }
    return 340;
  });
  const isResizingRef = useRef(false);

  // Month Inspector Collapsible Cards
  const [isMonthSummaryCollapsed, setIsMonthSummaryCollapsed] = useState(false);
  const [isMonthAutoAssignCollapsed, setIsMonthAutoAssignCollapsed] =
    useState(false);
  const [isMonthFutureCollapsed, setIsMonthFutureCollapsed] = useState(false);

  // Category Inspector Collapsible Cards
  const [isAvailableCollapsed, setIsAvailableCollapsed] = useState(false);
  const [isTargetCollapsed, setIsTargetCollapsed] = useState(false);
  const [isCategoryAutoAssignCollapsed, setIsCategoryAutoAssignCollapsed] =
    useState(false);

  // Category Name Inline Edit
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(selectedCategory?.name ?? "");

  // Category Note State
  const [noteDraft, setNoteDraft] = useState<string>(
    selectedCategory?.note ?? "",
  );
  const [savingNote, setSavingNote] = useState(false);

  // Target Editor State
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetAmountInput, setTargetAmountInput] = useState("");
  const [targetCadence, setTargetCadence] = useState<TargetCadence>("MONTHLY");
  const [targetType, setTargetType] = useState<TargetType>("REFILL_UP_TO");
  const [targetDayOfWeek, setTargetDayOfWeek] = useState<number>(0);

  const activeTarget = selectedCategory
    ? getCategoryTarget(planId, selectedCategory.category_id)
    : null;
  const isSnoozed = selectedCategory
    ? isTargetSnoozed(planId, selectedCategory.category_id, month)
    : false;

  useEffect(() => {
    setNameDraft(selectedCategory?.name ?? "");
    setIsEditingName(false);
    setNoteDraft(selectedCategory?.note ?? "");
    setIsEditingTarget(false);
    if (selectedCategory) {
      const existing = getCategoryTarget(planId, selectedCategory.category_id);
      if (existing) {
        setTargetAmountInput((existing.amount_milliunits / 1000).toFixed(2));
        setTargetCadence(existing.cadence);
        setTargetType(existing.target_type);
        setTargetDayOfWeek(existing.day_of_week ?? 0);
      } else {
        setTargetAmountInput("");
        setTargetCadence("MONTHLY");
        setTargetType("REFILL_UP_TO");
        setTargetDayOfWeek(0);
      }
    }
  }, [selectedCategory?.category_id, selectedCategory?.name, selectedCategory?.note, planId]);

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(
        300,
        Math.min(600, window.innerWidth - moveEvent.clientX),
      );
      setInspectorWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      try {
        localStorage.setItem("ynabx_inspector_width", String(inspectorWidth));
      } catch {
        // Ignore localStorage write failures
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const rta = monthSummary?.ready_to_assign_milliunits ?? 0;
  const monthLabel = formatMonthLabel(month);

  const monthParts = month.split("-");
  const monthIdx = Math.max(0, Math.min(11, Number(monthParts[1]) - 1));
  const monthName = FULL_MONTH_NAMES[monthIdx] ?? "Month";
  const nextMonthIdx = (monthIdx + 1) % 12;
  const nextMonthName = FULL_MONTH_NAMES[nextMonthIdx] ?? "Next Month";

  const totalAssigned = monthSummary?.total_assigned_milliunits ?? 0;
  const totalActivity = monthSummary?.total_activity_milliunits ?? 0;
  const totalAvailable = monthSummary?.total_available_milliunits ?? 0;
  const leftOverFromLastMonth =
    totalAvailable - totalAssigned - totalActivity;

  // Month-level targets and quick budget aggregations
  let totalTargetsThisMonth = 0;
  let totalUnderfunded = 0;
  let totalAssignedLastMonth = 0;
  let totalSpentLastMonth = 0;

  if (monthSummary?.categories) {
    for (const cat of monthSummary.categories) {
      if (cat.is_credit_card_payment) continue;
      const t = getCategoryTarget(planId, cat.category_id);
      if (t) {
        let tAmt = t.amount_milliunits;
        if (t.cadence === "WEEKLY") tAmt *= 4;
        totalTargetsThisMonth += tAmt;
        const needed = Math.max(
          0,
          t.target_type === "REFILL_UP_TO"
            ? tAmt - Math.max(0, cat.available_milliunits)
            : tAmt - cat.assigned_milliunits,
        );
        if (needed > 0) totalUnderfunded += needed;
      } else if (cat.available_milliunits < 0) {
        totalUnderfunded += Math.abs(cat.available_milliunits);
      }
      totalAssignedLastMonth += cat.assigned_milliunits;
      if (cat.activity_milliunits < 0) {
        totalSpentLastMonth += Math.abs(cat.activity_milliunits);
      }
    }
  }

  // Category Target Calculations
  let targetAmount = activeTarget ? activeTarget.amount_milliunits : 0;
  if (activeTarget?.cadence === "WEEKLY") {
    targetAmount = activeTarget.amount_milliunits * 4;
  }

  const catSpent = selectedCategory
    ? Math.abs(
        selectedCategory.activity_milliunits < 0
          ? selectedCategory.activity_milliunits
          : 0,
      )
    : 0;
  const catAvailable = selectedCategory
    ? Math.max(0, selectedCategory.available_milliunits)
    : 0;
  const catAssigned = selectedCategory
    ? Math.max(0, selectedCategory.assigned_milliunits)
    : 0;

  let neededThisMonth = 0;
  if (activeTarget) {
    if (activeTarget.target_type === "REFILL_UP_TO") {
      neededThisMonth = Math.max(0, targetAmount - (catAvailable + catSpent));
    } else {
      neededThisMonth = Math.max(0, targetAmount - catAssigned);
    }
  }
  const fundedThisMonth = Math.max(0, targetAmount - neededThisMonth);
  const toGo = neededThisMonth;
  const isTargetMet = activeTarget ? neededThisMonth === 0 : false;
  const targetPercent =
    targetAmount > 0
      ? Math.min(100, Math.round((fundedThisMonth / targetAmount) * 100))
      : 100;

  let targetBehaviorText = "";
  if (activeTarget) {
    if (activeTarget.cadence === "WEEKLY") {
      targetBehaviorText = `Set Aside ${formatMilliunits(activeTarget.amount_milliunits)} Each Week`;
    } else if (activeTarget.cadence === "YEARLY") {
      targetBehaviorText = `Set Aside ${formatMilliunits(activeTarget.amount_milliunits)} Each Year`;
    } else if (activeTarget.target_type === "REFILL_UP_TO") {
      targetBehaviorText = `Refill Up to ${formatMilliunits(activeTarget.amount_milliunits)} Each Month`;
    } else {
      targetBehaviorText = `Set Aside ${formatMilliunits(activeTarget.amount_milliunits)} Each Month`;
    }
  }

  const isMultiSelect = Boolean(
    selectedCategories && selectedCategories.length > 1,
  );

  const handleQuickAction = async (action: QuickBudgetAction) => {
    const targetCats = isMultiSelect
      ? selectedCategories!
      : selectedCategory
        ? [selectedCategory]
        : monthSummary?.categories ?? [];

    for (const cat of targetCats) {
      if (cat.is_credit_card_payment) continue;
      let targetAssigned = cat.assigned_milliunits;
      if (action === "UNDERFUNDED") {
        const catTarget = getCategoryTarget(planId, cat.category_id);
        if (catTarget) {
          let tAmt = catTarget.amount_milliunits;
          if (catTarget.cadence === "WEEKLY") tAmt *= 4;
          const needed = Math.max(
            0,
            catTarget.target_type === "REFILL_UP_TO"
              ? tAmt - Math.max(0, cat.available_milliunits)
              : tAmt - cat.assigned_milliunits,
          );
          if (needed > 0) targetAssigned = cat.assigned_milliunits + needed;
        } else if (cat.available_milliunits < 0) {
          targetAssigned =
            cat.assigned_milliunits - cat.available_milliunits;
        }
      } else {
        targetAssigned = computeQuickBudgetAssign(cat, action, rta);
      }
      if (targetAssigned !== cat.assigned_milliunits) {
        await onQuickAssign(cat.category_id, targetAssigned);
      }
    }
  };

  const handleSaveName = async () => {
    if (!selectedCategory) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === selectedCategory.name) {
      setNameDraft(selectedCategory.name);
      setIsEditingName(false);
      return;
    }
    setIsEditingName(false);
    if (onUpdateCategoryName) {
      await onUpdateCategoryName(selectedCategory.category_id, trimmed);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedCategory) return;
    const trimmed = noteDraft.trim();
    const finalVal = trimmed === "" ? null : trimmed;
    if (finalVal === (selectedCategory.note ?? null)) return;

    setSavingNote(true);
    try {
      await onSaveCategoryNote(selectedCategory.category_id, finalVal);
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveTarget = () => {
    if (!selectedCategory) return;
    const amountNum = parseFloat(targetAmountInput.replace(/,/g, ""));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid target amount greater than 0.");
      return;
    }

    const newTarget: CategoryTarget = {
      amount_milliunits: Math.round(amountNum * 1000),
      cadence: targetCadence,
      target_type: targetType,
      day_of_week: targetCadence === "WEEKLY" ? targetDayOfWeek : undefined,
    };

    saveCategoryTarget(planId, selectedCategory.category_id, newTarget);
    setIsEditingTarget(false);
    onTargetChange?.();
  };

  const handleDeleteTarget = () => {
    if (!selectedCategory) return;
    if (confirm("Are you sure you want to delete this target?")) {
      saveCategoryTarget(planId, selectedCategory.category_id, null);
      setTargetSnooze(planId, selectedCategory.category_id, month, false);
      setIsEditingTarget(false);
      onTargetChange?.();
    }
  };

  const handleToggleSnooze = () => {
    if (!selectedCategory) return;
    setTargetSnooze(
      planId,
      selectedCategory.category_id,
      month,
      !isSnoozed,
    );
    onTargetChange?.();
  };

  const categoryLeftOver = selectedCategory
    ? selectedCategory.available_milliunits -
      selectedCategory.assigned_milliunits -
      selectedCategory.activity_milliunits
    : 0;

  const cashSpending = selectedCategory
    ? selectedCategory.activity_milliunits < 0
      ? selectedCategory.activity_milliunits
      : 0
    : 0;

  const creditSpending = 0;

  const multiAssigned = isMultiSelect
    ? selectedCategories!.reduce((sum, c) => sum + c.assigned_milliunits, 0)
    : 0;
  const multiActivity = isMultiSelect
    ? selectedCategories!.reduce((sum, c) => sum + c.activity_milliunits, 0)
    : 0;
  const multiAvailable = isMultiSelect
    ? selectedCategories!.reduce((sum, c) => sum + c.available_milliunits, 0)
    : 0;

  let multiUnderfunded = 0;
  if (isMultiSelect) {
    for (const cat of selectedCategories!) {
      if (cat.is_credit_card_payment) continue;
      const catTarget = getCategoryTarget(planId, cat.category_id);
      if (catTarget) {
        let tAmt = catTarget.amount_milliunits;
        if (catTarget.cadence === "WEEKLY") tAmt *= 4;
        const needed = Math.max(
          0,
          catTarget.target_type === "REFILL_UP_TO"
            ? tAmt - Math.max(0, cat.available_milliunits)
            : tAmt - cat.assigned_milliunits,
        );
        multiUnderfunded += needed;
      } else if (cat.available_milliunits < 0) {
        multiUnderfunded += Math.abs(cat.available_milliunits);
      }
    }
  }

  const availableClass = selectedCategory
    ? selectedCategory.available_milliunits === 0
      ? "zero"
      : selectedCategory.available_milliunits > 0
        ? "positive"
        : "negative"
    : "zero";

  return (
    <aside
      className="budget-inspector"
      aria-label="Budget Inspector"
      style={{
        width: inspectorWidth,
        flex: `0 0 ${inspectorWidth}px`,
      }}
    >
      {/* Resizer handle */}
      <div
        className="budget-inspector-resizer"
        onMouseDown={handleMouseDownResizer}
        title="Drag to resize inspector"
      >
        <div className="budget-inspector-resizer-indicator" />
      </div>

      <div className="budget-inspector-content">
        <div className="budget-breakdown">
          {isMultiSelect ? (
            // =========================================================================
            // MULTI-CATEGORY SELECTION INSPECTOR
            // =========================================================================
            <div className="budget-inspector-multiple">
              <div
                className="inspector-category-header"
                style={{ textAlign: "center", padding: "1.25rem 1rem 0.75rem" }}
              >
                <h3>
                  {selectedCategories!.length} Categories Selected
                </h3>
                <h1 style={{ margin: "0.5rem 0" }}>
                  <span
                    className={`currency ${
                      multiAvailable === 0
                        ? "zero"
                        : multiAvailable > 0
                          ? "positive"
                          : "negative"
                    }`}
                  >
                    {formatMilliunits(multiAvailable)}
                  </span>
                </h1>
                <div
                  className="inspector-subtitle"
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--labelSecondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Total Available
                </div>
                {onDeselectAll && (
                  <button
                    type="button"
                    className="button button-link deselect-all-btn"
                    onClick={onDeselectAll}
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--actionPrimary)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    Deselect All
                  </button>
                )}
              </div>

              {/* Multi Breakdown Card */}
              <section className="card budget-breakdown">
                <div className="card-roll-up" style={{ padding: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span>Total Assigned</span>
                    <span className="currency">
                      {formatMilliunits(multiAssigned)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span>Total Activity</span>
                    <span className="currency">
                      {formatMilliunits(multiActivity)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      borderTop: "1px solid var(--separatorStandard)",
                      paddingTop: "0.5rem",
                    }}
                  >
                    <span>Total Available</span>
                    <span
                      className={`currency ${
                        multiAvailable === 0
                          ? "zero"
                          : multiAvailable > 0
                            ? "positive"
                            : "negative"
                      }`}
                    >
                      {formatMilliunits(multiAvailable)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Multi Auto-Assign Card */}
              <section className="card auto-assign">
                <div
                  className="card-header"
                  style={{
                    padding: "0.75rem 1rem 0.25rem",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                  }}
                >
                  Auto-Assign
                </div>
                <div className="card-body" style={{ padding: "0.5rem 1rem 1rem" }}>
                  <button
                    type="button"
                    className="button auto-assign-button"
                    onClick={() => handleQuickAction("UNDERFUNDED")}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      margin: "0.25rem 0",
                      background: "var(--backgroundSecondary)",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span>Underfunded</span>
                    <span className="currency">
                      {formatMilliunits(multiUnderfunded)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="button auto-assign-button"
                    onClick={() => handleQuickAction("ASSIGNED_LAST_MONTH")}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      margin: "0.25rem 0",
                      background: "var(--backgroundSecondary)",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span>Assigned Last Month</span>
                  </button>
                  <button
                    type="button"
                    className="button auto-assign-button"
                    onClick={() => handleQuickAction("SPENT_LAST_MONTH")}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      margin: "0.25rem 0",
                      background: "var(--backgroundSecondary)",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span>Spent Last Month</span>
                  </button>
                  <button
                    type="button"
                    className="button auto-assign-button"
                    onClick={() => handleQuickAction("AVERAGE_ASSIGNED")}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      margin: "0.25rem 0",
                      background: "var(--backgroundSecondary)",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span>Average Assigned</span>
                  </button>
                  <button
                    type="button"
                    className="button auto-assign-button"
                    onClick={() => handleQuickAction("AVERAGE_SPENT")}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      margin: "0.25rem 0",
                      background: "var(--backgroundSecondary)",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span>Average Spent</span>
                  </button>
                  <button
                    type="button"
                    className="button auto-assign-button"
                    onClick={() => handleQuickAction("RESET_ASSIGNED")}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      margin: "0.25rem 0",
                      background: "var(--backgroundSecondary)",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span>Reset Assigned to $0.00</span>
                  </button>
                  <button
                    type="button"
                    className="button auto-assign-button"
                    onClick={() => handleQuickAction("RESET_AVAILABLE")}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      margin: "0.25rem 0",
                      background: "var(--backgroundSecondary)",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span>Reset Available Amounts</span>
                  </button>
                </div>
              </section>
            </div>
          ) : selectedCategory === null ? (
            // =========================================================================
            // MONTH-LEVEL SUMMARY INSPECTOR (NO CATEGORY SELECTED)
            // =========================================================================
            <>
              {/* Card 1: Month's Summary */}
              <section
                className={`card budget-breakdown-monthly-totals ${
                  isMonthSummaryCollapsed ? "is-collapsed" : ""
                }`}
              >
                <button
                  className="card-roll-up"
                  aria-expanded={!isMonthSummaryCollapsed}
                  type="button"
                  onClick={() =>
                    setIsMonthSummaryCollapsed(!isMonthSummaryCollapsed)
                  }
                >
                  <h2>
                    {monthLabel} Summary
                    <svg
                      className="ynab-new-icon card-chevron"
                      width="12"
                      height="12"
                    >
                      <use
                        href={
                          isMonthSummaryCollapsed
                            ? "#icon_sprite_chevron_right"
                            : "#icon_sprite_chevron_down"
                        }
                      />
                    </svg>
                  </h2>
                </button>
                <div
                  className="card-body"
                  aria-hidden={isMonthSummaryCollapsed}
                >
                  <div className="ynab-breakdown">
                    <div
                      tabIndex={0}
                      className="ynab-breakdown-leftover-prev-month"
                    >
                      <div>Left Over from Last Month</div>
                      <div className="user-data">
                        <span
                          className={`user-data currency tabular-nums ${
                            leftOverFromLastMonth === 0
                              ? "zero"
                              : leftOverFromLastMonth > 0
                                ? "positive"
                                : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(leftOverFromLastMonth)}</bdi>
                        </span>
                      </div>
                    </div>

                    <div
                      tabIndex={0}
                      className="ynab-breakdown-assigned-in-month"
                    >
                      <div>Assigned in {monthName}</div>
                      <div className="user-data">
                        <span
                          className={`user-data currency tabular-nums ${
                            totalAssigned === 0
                              ? "zero"
                              : totalAssigned > 0
                                ? "positive"
                                : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(totalAssigned)}</bdi>
                        </span>
                      </div>
                    </div>

                    <div tabIndex={0} className="ynab-breakdown-activity">
                      <div>Activity</div>
                      <div className="user-data">
                        <span
                          className={`user-data currency tabular-nums ${
                            totalActivity === 0
                              ? "zero"
                              : totalActivity > 0
                                ? "positive"
                                : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(totalActivity)}</bdi>
                        </span>
                      </div>
                    </div>

                    <div tabIndex={0} className="ynab-breakdown-available">
                      <div>
                        <span className="ynab-breakdown-available-heading">
                          Available
                        </span>
                      </div>
                      <div className="user-data">
                        <span
                          className={`user-data currency tabular-nums ${
                            totalAvailable === 0
                              ? "zero"
                              : totalAvailable > 0
                                ? "positive"
                                : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(totalAvailable)}</bdi>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cost-to-be-me-summary">
                    <div>
                      <div className="cost-to-be-me-separator" />
                      <div tabIndex={0} className="title">
                        Cost to Be Me
                      </div>
                      <div tabIndex={0} className="label">
                        <span className="description">
                          {monthName}’s Targets
                        </span>
                        <span className="amount">
                          {formatMilliunits(totalTargetsThisMonth)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Card 2: Auto-Assign */}
              <section
                className={`card budget-breakdown-auto-assign ${
                  isMonthAutoAssignCollapsed ? "is-collapsed" : ""
                }`}
              >
                <button
                  className="card-roll-up"
                  aria-expanded={!isMonthAutoAssignCollapsed}
                  type="button"
                  onClick={() =>
                    setIsMonthAutoAssignCollapsed(!isMonthAutoAssignCollapsed)
                  }
                >
                  <h2>
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_lightning" />
                    </svg>
                    Auto-Assign
                    <svg
                      className="ynab-new-icon card-chevron"
                      width="12"
                      height="12"
                    >
                      <use
                        href={
                          isMonthAutoAssignCollapsed
                            ? "#icon_sprite_chevron_right"
                            : "#icon_sprite_chevron_down"
                        }
                      />
                    </svg>
                  </h2>
                </button>
                <div
                  className="card-body"
                  aria-hidden={isMonthAutoAssignCollapsed}
                >
                  <div className="inspector-quick-budget">
                    <div className="option-groups">
                      <div>
                        <button
                          className="budget-inspector-button js-focus-on-start underfunded"
                          type="button"
                          onClick={() => void handleQuickAction("UNDERFUNDED")}
                        >
                          <div>Underfunded</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(totalUnderfunded)}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  totalUnderfunded === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>{formatMilliunits(totalUnderfunded)}</bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                      </div>

                      <div>
                        <button
                          className="budget-inspector-button assigned-last month"
                          type="button"
                          onClick={() =>
                            void handleQuickAction("ASSIGNED_LAST_MONTH")
                          }
                        >
                          <div>Assigned Last Month</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(totalAssignedLastMonth)}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  totalAssignedLastMonth === 0
                                    ? "zero"
                                    : "positive"
                                }`}
                              >
                                <bdi>
                                  {formatMilliunits(totalAssignedLastMonth)}
                                </bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                        <button
                          className="budget-inspector-button spent-last month"
                          type="button"
                          onClick={() =>
                            void handleQuickAction("SPENT_LAST_MONTH")
                          }
                        >
                          <div>Spent Last Month</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(totalSpentLastMonth)}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  totalSpentLastMonth === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>
                                  {formatMilliunits(totalSpentLastMonth)}
                                </bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                        <button
                          className="budget-inspector-button average-assigned"
                          title="Feeling average? Fund all of your categories with your historical average assigned."
                          type="button"
                          onClick={() =>
                            void handleQuickAction("AVERAGE_ASSIGNED")
                          }
                        >
                          <div>Average Assigned</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(totalAssignedLastMonth)}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  totalAssignedLastMonth === 0
                                    ? "zero"
                                    : "positive"
                                }`}
                              >
                                <bdi>
                                  {formatMilliunits(totalAssignedLastMonth)}
                                </bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                        <button
                          className="budget-inspector-button average-spent"
                          title="Assign your historical average spent. Though you're above average in my book."
                          type="button"
                          onClick={() =>
                            void handleQuickAction("AVERAGE_SPENT")
                          }
                        >
                          <div>Average Spent</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(totalSpentLastMonth)}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  totalSpentLastMonth === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>
                                  {formatMilliunits(totalSpentLastMonth)}
                                </bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                      </div>

                      <div>
                        <button
                          className="budget-inspector-button set-available amount to zero"
                          title="Want to start from zero? Set the available amounts of all of your categories to $0.00, making the funds ready to assign. It's like a mini Fresh Start!"
                          type="button"
                          onClick={() =>
                            void handleQuickAction("RESET_AVAILABLE")
                          }
                        >
                          <div>Reset Available Amounts</div>
                          <div>
                            <strong className="user-data" title="$0.00">
                              <span className="user-data currency tabular-nums zero">
                                <bdi>$0.00</bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                        <button
                          className="budget-inspector-button reset-assigned amount"
                          title="Reset all assigned amounts for this month, in case you want a do-over."
                          type="button"
                          onClick={() =>
                            void handleQuickAction("RESET_ASSIGNED")
                          }
                        >
                          <div>Reset Assigned Amounts</div>
                          <div>
                            <strong className="user-data" title="$0.00">
                              <span className="user-data currency tabular-nums zero">
                                <bdi>$0.00</bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Card 3: Assigned in Future Months */}
              <section
                className={`card budget-breakdown-future-totals future-assignments-update ${
                  isMonthFutureCollapsed ? "is-collapsed" : ""
                }`}
              >
                <button
                  className="card-roll-up"
                  aria-expanded={!isMonthFutureCollapsed}
                  type="button"
                  onClick={() =>
                    setIsMonthFutureCollapsed(!isMonthFutureCollapsed)
                  }
                >
                  <h2>
                    <span>Assigned in Future Months</span>
                    <svg
                      className="ynab-new-icon card-chevron"
                      width="12"
                      height="12"
                    >
                      <use
                        href={
                          isMonthFutureCollapsed
                            ? "#icon_sprite_chevron_right"
                            : "#icon_sprite_chevron_down"
                        }
                      />
                    </svg>
                    <span className="user-data currency tabular-nums zero">
                      <bdi>$0.00</bdi>
                    </span>
                  </h2>
                </button>
                <div
                  className="card-body"
                  aria-hidden={isMonthFutureCollapsed}
                >
                  <div className="ynab-breakdown">
                    <button className="future-month-button" type="button">
                      <div className="future-month-button-interior">
                        <div className="month-label">
                          <div>{nextMonthName}</div>
                        </div>
                        <div className="user-data">
                          <span className="user-data currency tabular-nums zero">
                            <bdi>$0.00</bdi>
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            // =========================================================================
            // CATEGORY-SPECIFIC INSPECTOR (A CATEGORY IS SELECTED)
            // =========================================================================
            <>
              {/* Category Header with Title & Edit Pencil */}
              <div className="budget-inspector-category-header">
                <div className="budget-inspector-category">
                  <div className="inspector-category-name user-data">
                    <div className="user-entered-text">
                      {isEditingName ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void handleSaveName();
                          }}
                        >
                          <input
                            type="text"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={() => void handleSaveName()}
                            autoFocus
                            className="form-input"
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 700,
                              height: 32,
                              width: "100%",
                            }}
                          />
                        </form>
                      ) : (
                        <h1>{selectedCategory.name}</h1>
                      )}
                    </div>
                  </div>
                  <button
                    className="inspector-category-edit"
                    aria-label={`Edit category: ${selectedCategory.name}`}
                    type="button"
                    onClick={() => setIsEditingName(true)}
                  >
                    <svg
                      className="ynab-new-icon fill-secondary"
                      width="16"
                      height="16"
                    >
                      <use href="#icon_sprite_pencil" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Card 1: Available Balance */}
              <section
                className={`card budget-breakdown-available-balance ${
                  isAvailableCollapsed ? "is-collapsed" : ""
                }`}
              >
                <button
                  className="card-roll-up"
                  aria-expanded={!isAvailableCollapsed}
                  type="button"
                  onClick={() =>
                    setIsAvailableCollapsed(!isAvailableCollapsed)
                  }
                >
                  <h2>
                    Available Balance
                    <svg
                      className="ynab-new-icon card-chevron"
                      width="12"
                      height="12"
                    >
                      <use
                        href={
                          isAvailableCollapsed
                            ? "#icon_sprite_chevron_right"
                            : "#icon_sprite_chevron_down"
                        }
                      />
                    </svg>
                    <button
                      className={`ynab-new-budget-available-number js-budget-available-number user-data ${availableClass}`}
                      aria-disabled="true"
                      disabled
                      type="button"
                    >
                      <span
                        className={`user-data currency tabular-nums ${availableClass}`}
                      >
                        <bdi>
                          {formatMilliunits(
                            selectedCategory.available_milliunits,
                          )}
                        </bdi>
                      </span>
                    </button>
                  </h2>
                </button>
                <div
                  className="card-body"
                  aria-hidden={isAvailableCollapsed}
                >
                  <div className="ynab-breakdown">
                    <div tabIndex={0}>
                      <div>Cash Left Over From Last Month</div>
                      <div
                        className="user-data"
                        title={formatMilliunits(categoryLeftOver)}
                      >
                        <span
                          className={`user-data currency tabular-nums ${
                            categoryLeftOver === 0
                              ? "zero"
                              : categoryLeftOver > 0
                                ? "positive"
                                : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(categoryLeftOver)}</bdi>
                        </span>
                      </div>
                    </div>

                    <div tabIndex={0}>
                      <div>Assigned This Month</div>
                      <div
                        className="user-data"
                        title={formatMilliunits(
                          selectedCategory.assigned_milliunits,
                        )}
                      >
                        <span
                          className={`user-data currency tabular-nums ${
                            selectedCategory.assigned_milliunits === 0
                              ? "zero"
                              : "positive"
                          }`}
                        >
                          <bdi>
                            {formatMilliunits(
                              selectedCategory.assigned_milliunits,
                            )}
                          </bdi>
                        </span>
                      </div>
                    </div>

                    <div tabIndex={0}>
                      <div>Cash Spending</div>
                      <div title={formatMilliunits(cashSpending)}>
                        <span
                          className={`user-data currency tabular-nums ${
                            cashSpending === 0 ? "zero" : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(cashSpending)}</bdi>
                        </span>
                      </div>
                    </div>

                    <div tabIndex={0}>
                      <div>Credit Spending</div>
                      <div title={formatMilliunits(creditSpending)}>
                        <span
                          className={`user-data currency tabular-nums ${
                            creditSpending === 0 ? "zero" : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(creditSpending)}</bdi>
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedCategory.available_milliunits < 0 && (
                    <div className="impact-message negative">
                      <div className="impact-message-content">
                        You&apos;ve overspent this category by{" "}
                        <strong>
                          <bdi>
                            {formatMilliunits(
                              Math.abs(selectedCategory.available_milliunits),
                            )}
                          </bdi>
                        </strong>
                        . Cover this overspending or you can’t trust your plan balances!
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Card 2: Target Card */}
              <section
                className={`card target-inspector-card ${
                  isTargetCollapsed ? "is-collapsed" : ""
                }`}
              >
                <div className="ynab-new-inspector-goals">
                  <button
                    className="card-roll-up"
                    aria-expanded={!isTargetCollapsed}
                    type="button"
                    onClick={() => setIsTargetCollapsed(!isTargetCollapsed)}
                  >
                    <h2>
                      {isTargetMet ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="-1 -1 2 2"
                          className="icon-circle-progress complete"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <defs>
                            <clipPath
                              id={`icon-circle-progress-clip-${selectedCategory.category_id}`}
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
                            clipPath={`url(#icon-circle-progress-clip-${selectedCategory.category_id})`}
                          />
                        </svg>
                      ) : (
                        <svg className="ynab-new-icon" width="16" height="16">
                          <use href="#icon_sprite_target" />
                        </svg>
                      )}
                      Target
                      <svg
                        className="ynab-new-icon card-chevron"
                        width="12"
                        height="12"
                      >
                        <use
                          href={
                            isTargetCollapsed
                              ? "#icon_sprite_chevron_right"
                              : "#icon_sprite_chevron_down"
                          }
                        />
                      </svg>
                    </h2>
                  </button>
                  <div
                    className="card-body"
                    aria-hidden={isTargetCollapsed}
                  >
                    {isEditingTarget ? (
                      // Target Configuration Form
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveTarget();
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.6rem",
                          padding: "0.25rem 0",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "var(--labelSecondary)",
                              marginBottom: 4,
                            }}
                          >
                            Target Amount
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 150.00"
                            value={targetAmountInput}
                            onChange={(e) =>
                              setTargetAmountInput(e.target.value)
                            }
                            autoFocus
                            className="form-input"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              height: 32,
                            }}
                            required
                          />
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.5rem",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: "var(--labelSecondary)",
                                marginBottom: 4,
                              }}
                            >
                              Cadence
                            </label>
                            <select
                              className="form-select"
                              value={targetCadence}
                              onChange={(e) =>
                                setTargetCadence(
                                  e.target.value as TargetCadence,
                                )
                              }
                              style={{ width: "100%", height: 32 }}
                            >
                              <option value="MONTHLY">Monthly</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="YEARLY">Yearly</option>
                            </select>
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: "var(--labelSecondary)",
                                marginBottom: 4,
                              }}
                            >
                              Behavior
                            </label>
                            <select
                              className="form-select"
                              value={targetType}
                              onChange={(e) =>
                                setTargetType(e.target.value as TargetType)
                              }
                              style={{ width: "100%", height: 32 }}
                            >
                              <option value="REFILL_UP_TO">
                                Refill up to...
                              </option>
                              <option value="SET_ASIDE_ANOTHER">
                                Set aside another...
                              </option>
                            </select>
                          </div>
                        </div>

                        {targetCadence === "WEEKLY" && (
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: "var(--labelSecondary)",
                                marginBottom: 4,
                              }}
                            >
                              Repeat Every
                            </label>
                            <select
                              className="form-select"
                              value={targetDayOfWeek}
                              onChange={(e) =>
                                setTargetDayOfWeek(Number(e.target.value))
                              }
                              style={{ width: "100%", height: 32 }}
                            >
                              <option value={0}>Sunday</option>
                              <option value={1}>Monday</option>
                              <option value={2}>Tuesday</option>
                              <option value={3}>Wednesday</option>
                              <option value={4}>Thursday</option>
                              <option value={5}>Friday</option>
                              <option value={6}>Saturday</option>
                            </select>
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            marginTop: "0.4rem",
                          }}
                        >
                          <button
                            type="submit"
                            className="ynab-button primary"
                            style={{ flex: 1, height: 32, fontSize: "0.82rem" }}
                          >
                            Save Target
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingTarget(false)}
                            className="ynab-button secondary"
                            style={{ height: 32, fontSize: "0.82rem" }}
                          >
                            Cancel
                          </button>
                          {activeTarget && (
                            <button
                              type="button"
                              onClick={handleDeleteTarget}
                              className="ynab-button secondary"
                              style={{
                                height: 32,
                                fontSize: "0.82rem",
                                color: "var(--labelNegative)",
                              }}
                              title="Delete Target"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </form>
                    ) : activeTarget ? (
                      // Target Details View
                      <div className="target-inspector">
                        <div className="target-inspector-header">
                          <div className="header-bottom">
                            <h2 className="target-behavior">
                              {targetBehaviorText}
                            </h2>
                            <div className="target-by-date">
                              By the End of the Month
                            </div>
                          </div>
                        </div>

                        <hr />

                        <div className="donut-container">
                          <div className="donut-wrapper">
                            {isTargetMet ? (
                              <svg
                                className="ynab-new-icon progress-complete-icon"
                                width="16"
                                height="16"
                              >
                                <use href="#icon_sprite_check_circle_fill" />
                              </svg>
                            ) : (
                              <span className="label">
                                <span className="percent">{targetPercent}</span>
                                <span>%</span>
                              </span>
                            )}
                            <div
                              className="donut"
                              style={{
                                clip:
                                  targetPercent > 50
                                    ? "rect(auto, auto, auto, auto)"
                                    : "rect(0px, 1em, 1em, 0.5em)",
                              }}
                            >
                              <div
                                className={`left half-circle ${
                                  isTargetMet
                                    ? "positive"
                                    : targetPercent > 0
                                      ? "warning"
                                      : "passive"
                                }`}
                                style={{
                                  transform: `rotate(${Math.min(
                                    360,
                                    Math.round(targetPercent * 3.6),
                                  )}deg)`,
                                }}
                              />
                              <div
                                className={`right half-circle ${
                                  isTargetMet
                                    ? "positive"
                                    : targetPercent > 0
                                      ? "warning"
                                      : "passive"
                                }`}
                                style={{
                                  transform: `rotate(${
                                    targetPercent > 50 ? 180 : 0
                                  }deg)`,
                                }}
                              />
                            </div>
                            <div className="shadow" />
                          </div>
                        </div>

                        {isTargetMet ? (
                          <div className="impact-message positive">
                            <div className="impact-message-content">
                              You&apos;ve met your target!
                            </div>
                          </div>
                        ) : (
                          <div className="impact-message warning">
                            <div className="impact-message-content">
                              Assign{" "}
                              <span className="highlighted">
                                {formatMilliunits(neededThisMonth)}
                              </span>{" "}
                              this month to stay on track
                            </div>
                            {rta > 0 && (
                              <button
                                className="ynab-button warning"
                                type="button"
                                onClick={() =>
                                  void handleQuickAction("UNDERFUNDED")
                                }
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        )}

                        <div className="target-breakdown">
                          <div className="target-breakdown-item">
                            <div className="target-breakdown-item-label">
                              Needed This Month
                            </div>
                            <div className="target-breakdown-item-value">
                              <span
                                className={`user-data currency tabular-nums ${
                                  neededThisMonth === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>{formatMilliunits(neededThisMonth)}</bdi>
                              </span>
                            </div>
                          </div>
                          <div className="target-breakdown-item">
                            <div className="target-breakdown-item-label">
                              Funded
                            </div>
                            <div className="target-breakdown-item-value">
                              <span
                                className={`user-data currency tabular-nums ${
                                  fundedThisMonth === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>{formatMilliunits(fundedThisMonth)}</bdi>
                              </span>
                            </div>
                          </div>
                          <hr />
                          <div className="target-breakdown-item">
                            <div className="target-breakdown-item-label">
                              To Go
                            </div>
                            <div className="target-breakdown-item-value">
                              <span
                                className={`user-data currency tabular-nums ${
                                  toGo === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>{formatMilliunits(toGo)}</bdi>
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="ynab-button secondary"
                          type="button"
                          onClick={() => setIsEditingTarget(true)}
                        >
                          Edit Target
                        </button>

                        <div className="goal-snooze">
                          <button
                            className={`ynab-switch ${
                              isSnoozed ? "on" : "off"
                            }`}
                            role="checkbox"
                            aria-checked={isSnoozed}
                            type="button"
                            onClick={handleToggleSnooze}
                          >
                            <svg
                              className="switch-toggle"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <rect />
                              <circle />
                            </svg>
                            Snooze target for this month
                          </button>
                          <span className="info-icon-tooltip">
                            <a href="#" onClick={(e) => e.preventDefault()}>
                              <svg
                                className="ynab-new-icon"
                                width="16"
                                height="16"
                              >
                                <use href="#icon_sprite_question_mark_circle" />
                              </svg>
                            </a>
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Target Empty State
                      <div className="target-inspector">
                        <div className="view-target-empty-state">
                          <strong>
                            How much do you need for {selectedCategory.name}?
                          </strong>
                          <p>
                            When you create a target, we’ll let you know how
                            much money to set aside to stay on track over time.
                          </p>
                          <button
                            className="ynab-button secondary budget-inspector-goals-create"
                            type="button"
                            onClick={() => setIsEditingTarget(true)}
                          >
                            Create Target
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Card 3: Auto-Assign for Category */}
              <section
                className={`card budget-breakdown-auto-assign ${
                  isCategoryAutoAssignCollapsed ? "is-collapsed" : ""
                }`}
              >
                <button
                  className="card-roll-up"
                  aria-expanded={!isCategoryAutoAssignCollapsed}
                  type="button"
                  onClick={() =>
                    setIsCategoryAutoAssignCollapsed(
                      !isCategoryAutoAssignCollapsed,
                    )
                  }
                >
                  <h2>
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_lightning" />
                    </svg>
                    Auto-Assign
                    <svg
                      className="ynab-new-icon card-chevron"
                      width="12"
                      height="12"
                    >
                      <use
                        href={
                          isCategoryAutoAssignCollapsed
                            ? "#icon_sprite_chevron_right"
                            : "#icon_sprite_chevron_down"
                        }
                      />
                    </svg>
                  </h2>
                </button>
                <div
                  className="card-body"
                  aria-hidden={isCategoryAutoAssignCollapsed}
                >
                  <div className="inspector-quick-budget">
                    <div className="option-groups">
                      <div>
                        {neededThisMonth > 0 && (
                          <button
                            className="budget-inspector-button js-focus-on-start underfunded"
                            type="button"
                            onClick={() =>
                              void handleQuickAction("UNDERFUNDED")
                            }
                          >
                            <div>Underfunded</div>
                            <div>
                              <strong
                                className="user-data"
                                title={formatMilliunits(neededThisMonth)}
                              >
                                <span className="user-data currency tabular-nums positive">
                                  <bdi>
                                    {formatMilliunits(neededThisMonth)}
                                  </bdi>
                                </span>
                              </strong>
                            </div>
                          </button>
                        )}

                        {selectedCategory.available_milliunits < 0 && (
                          <button
                            className="budget-inspector-button cover-overspending"
                            type="button"
                            onClick={() =>
                              void handleQuickAction("COVER_OVERSPENDING")
                            }
                          >
                            <div>Cover Overspending</div>
                            <div>
                              <strong
                                className="user-data"
                                title={formatMilliunits(
                                  Math.abs(
                                    selectedCategory.available_milliunits,
                                  ),
                                )}
                              >
                                <span className="user-data currency tabular-nums negative">
                                  <bdi>
                                    {formatMilliunits(
                                      Math.abs(
                                        selectedCategory.available_milliunits,
                                      ),
                                    )}
                                  </bdi>
                                </span>
                              </strong>
                            </div>
                          </button>
                        )}

                        <button
                          className="budget-inspector-button assigned-last month"
                          type="button"
                          onClick={() =>
                            void handleQuickAction("ASSIGNED_LAST_MONTH")
                          }
                        >
                          <div>Assigned Last Month</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(
                                selectedCategory.assigned_milliunits,
                              )}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  selectedCategory.assigned_milliunits === 0
                                    ? "zero"
                                    : "positive"
                                }`}
                              >
                                <bdi>
                                  {formatMilliunits(
                                    selectedCategory.assigned_milliunits,
                                  )}
                                </bdi>
                              </span>
                            </strong>
                          </div>
                        </button>

                        <button
                          className="budget-inspector-button spent-last month"
                          type="button"
                          onClick={() =>
                            void handleQuickAction("SPENT_LAST_MONTH")
                          }
                        >
                          <div>Spent Last Month</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(catSpent)}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  catSpent === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>{formatMilliunits(catSpent)}</bdi>
                              </span>
                            </strong>
                          </div>
                        </button>

                        <button
                          className="budget-inspector-button average-assigned"
                          title="Feeling average? Fund all of your categories with your historical average assigned."
                          type="button"
                          onClick={() =>
                            void handleQuickAction("AVERAGE_ASSIGNED")
                          }
                        >
                          <div>Average Assigned</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(
                                selectedCategory.assigned_milliunits,
                              )}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  selectedCategory.assigned_milliunits === 0
                                    ? "zero"
                                    : "positive"
                                }`}
                              >
                                <bdi>
                                  {formatMilliunits(
                                    selectedCategory.assigned_milliunits,
                                  )}
                                </bdi>
                              </span>
                            </strong>
                          </div>
                        </button>

                        <button
                          className="budget-inspector-button average-spent"
                          title="Assign your historical average spent. Though you're above average in my book."
                          type="button"
                          onClick={() =>
                            void handleQuickAction("AVERAGE_SPENT")
                          }
                        >
                          <div>Average Spent</div>
                          <div>
                            <strong
                              className="user-data"
                              title={formatMilliunits(catSpent)}
                            >
                              <span
                                className={`user-data currency tabular-nums ${
                                  catSpent === 0 ? "zero" : "positive"
                                }`}
                              >
                                <bdi>{formatMilliunits(catSpent)}</bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                      </div>

                      <div>
                        <button
                          className="budget-inspector-button set-available amount to zero"
                          title="Want to start from zero? Set the available amounts of all of your categories to $0.00, making the funds ready to assign. It's like a mini Fresh Start!"
                          type="button"
                          onClick={() =>
                            void handleQuickAction("RESET_AVAILABLE")
                          }
                        >
                          <div>Reset Available to $0.00</div>
                          <div>
                            <strong className="user-data" title="$0.00">
                              <span className="user-data currency tabular-nums zero">
                                <bdi>$0.00</bdi>
                              </span>
                            </strong>
                          </div>
                        </button>

                        <button
                          className="budget-inspector-button reset-assigned amount"
                          title="Reset Assigned to $0.00"
                          type="button"
                          onClick={() =>
                            void handleQuickAction("RESET_ASSIGNED")
                          }
                        >
                          <div>Reset Assigned to $0.00</div>
                          <div>
                            <strong className="user-data" title="$0.00">
                              <span className="user-data currency tabular-nums zero">
                                <bdi>$0.00</bdi>
                              </span>
                            </strong>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Card 4: Category Notes */}
              <section className="card">
                <div className="inspector-notes">
                  <h2>Notes</h2>
                  <div className="inspector-category-note user-data">
                    <textarea
                      aria-label="Category note"
                      placeholder="Enter a note..."
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onBlur={() => void handleSaveNote()}
                    />
                  </div>
                  {savingNote && (
                    <small
                      style={{
                        color: "var(--labelSecondary)",
                        marginTop: "0.25rem",
                        display: "block",
                      }}
                    >
                      Saving note...
                    </small>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
