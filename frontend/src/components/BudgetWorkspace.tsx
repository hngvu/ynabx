import React, { useState } from "react";
import type {
  CategoryGroupWithCategories,
  CategoryMonthAllocation,
  PlanMonthSummary,
} from "../api/types";
import {
  filterCategories,
  type CategoryFilterMode,
} from "../state/budgetReducer";
import { formatMilliunits, parseInputToMilliunits } from "../utils/currency";
import {
  addMonths,
  formatMonthLabel,
  getCurrentMonthIso,
} from "../utils/dates";

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
  onOpenMoveMoney: (sourceCategory: CategoryMonthAllocation) => void;
}

export function BudgetWorkspace({
  month,
  monthSummary,
  categoryGroups,
  selectedCategoryId,
  onSelectCategory,
  onChangeMonth,
  onAssignCategory,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroupRequest,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategoryRequest,
  onOpenMoveMoney,
}: BudgetWorkspaceProps): React.JSX.Element {
  const [filterMode, setFilterMode] = useState<CategoryFilterMode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  );

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

  const rtaBannerBg =
    rta > 0
      ? "var(--rta-positive-bg)"
      : rta < 0
        ? "var(--pill-negative-bg)"
        : "var(--pill-zero-bg)";

  const filteredAllocations = filterCategories(monthSummary?.categories ?? [], {
    mode: filterMode,
    search: searchQuery,
    includeHidden: showHidden,
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
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        backgroundColor: "var(--bg-primary)",
      }}
    >
      {/* Top Budget Header */}
      <header
        style={{
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--separator)",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          {/* Month Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              aria-label="Previous Month"
              onClick={() => onChangeMonth(addMonths(month, -1))}
              style={{
                border: "1px solid var(--separator)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ◀
            </button>
            <h1
              style={{
                margin: 0,
                fontSize: "1.35rem",
                fontWeight: 800,
                minWidth: "7.5rem",
                textAlign: "center",
              }}
            >
              {formatMonthLabel(month)}
            </h1>
            <button
              type="button"
              aria-label="Next Month"
              onClick={() => onChangeMonth(addMonths(month, 1))}
              style={{
                border: "1px solid var(--separator)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => onChangeMonth(getCurrentMonthIso())}
              style={{
                border: "none",
                backgroundColor: "var(--action-secondary-bg)",
                color: "var(--action-secondary-text)",
                borderRadius: "6px",
                padding: "0.35rem 0.65rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Today
            </button>
          </div>

          {/* Ready to Assign Banner */}
          <div
            className="rta-banner"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              backgroundColor: rtaBannerBg,
              color: "#191818",
              padding: "0.6rem 1.15rem",
              borderRadius: "10px",
              minWidth: "240px",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                className="tabular-nums"
                style={{ fontSize: "1.35rem", fontWeight: 800 }}
              >
                {formatMilliunits(rta)}
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                {rta < 0
                  ? "You assigned more than you have"
                  : rta === 0
                    ? "All Money Assigned"
                    : "Ready to Assign"}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Toolbar: Add Category Group, Filter Pills, Search */}
        <div
          style={{
            marginTop: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {!addingGroup ? (
              <button
                type="button"
                onClick={() => setAddingGroup(true)}
                style={{
                  border: "none",
                  backgroundColor: "var(--action-secondary-bg)",
                  color: "var(--action-secondary-text)",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Category Group
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
                style={{ display: "flex", gap: "0.35rem" }}
              >
                <input
                  type="text"
                  placeholder="New Category Group"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  style={{
                    height: "30px",
                    padding: "0 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--action-primary)",
                    fontSize: "0.825rem",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    border: "none",
                    backgroundColor: "var(--action-primary)",
                    color: "#fff",
                    borderRadius: "4px",
                    padding: "0 0.6rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAddingGroup(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Filter Pills */}
            {(
              [
                { id: "ALL", label: "All" },
                { id: "OVERSPENT", label: "Overspent" },
                { id: "AVAILABLE", label: "Money Available" },
              ] as const
            ).map((pill) => {
              const active = filterMode === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilterMode(pill.id)}
                  style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.3rem 0.7rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    backgroundColor: active
                      ? "var(--action-primary)"
                      : "var(--bg-tertiary)",
                    color: active ? "#ffffff" : "var(--text-secondary)",
                  }}
                >
                  {pill.label}
                </button>
              );
            })}

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginLeft: "0.4rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
              Show Hidden
            </label>
          </div>

          <input
            type="search"
            placeholder="Filter categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              height: "32px",
              padding: "0 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--separator)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.825rem",
              width: "210px",
            }}
          />
        </div>

        {cellError && (
          <div
            role="alert"
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "var(--action-destructive-bg)",
              color: "var(--action-destructive-text)",
              fontSize: "0.8rem",
            }}
          >
            {cellError}
          </div>
        )}
      </header>

      {/* Budget Grid Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table
          className="budget-table"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderBottom: "1px solid var(--separator)",
                height: "36px",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <th style={{ textAlign: "left", padding: "0 1rem", width: "46%" }}>
                Category
              </th>
              <th
                style={{ textAlign: "right", padding: "0 1rem", width: "18%" }}
              >
                Assigned
              </th>
              <th
                style={{ textAlign: "right", padding: "0 1rem", width: "18%" }}
              >
                Activity
              </th>
              <th
                style={{ textAlign: "right", padding: "0 1rem", width: "18%" }}
              >
                Available
              </th>
            </tr>
          </thead>
          <tbody>
            {categoryGroups
              .filter((grp) => showHidden || !grp.hidden)
              .map((group) => {
                const groupCats =
                  allocationsByGroupId.get(group.id) ?? [];
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
                    {/* Category Group Header Row */}
                    <tr
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderBottom: "1px solid var(--separator)",
                        height: "38px",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                      }}
                    >
                      <td style={{ padding: "0 1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedGroups((prev) => ({
                                ...prev,
                                [group.id]: !isCollapsed,
                              }))
                            }
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--text-secondary)",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: "0.75rem",
                            }}
                          >
                            {isCollapsed ? "▶" : "▼"}
                          </button>
                          <span>{group.name}</span>

                          {!group.is_system && (
                            <div
                              style={{
                                marginLeft: "auto",
                                display: "flex",
                                gap: "0.35rem",
                              }}
                            >
                              <button
                                type="button"
                                title="Add Category"
                                onClick={() => {
                                  setAddingCategoryForGroup(group.id);
                                  setNewCategoryName("");
                                }}
                                style={{
                                  border: "none",
                                  background: "var(--action-secondary-bg)",
                                  color: "var(--action-secondary-text)",
                                  borderRadius: "4px",
                                  padding: "0.1rem 0.45rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                + Category
                              </button>
                              <button
                                type="button"
                                title="Hide / Unhide Group"
                                onClick={() =>
                                  onUpdateGroup(group.id, {
                                    hidden: !group.hidden,
                                  })
                                }
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "var(--text-muted)",
                                  fontSize: "0.72rem",
                                  cursor: "pointer",
                                }}
                              >
                                {group.hidden ? "Unhide" : "Hide"}
                              </button>
                              <button
                                type="button"
                                title="Delete Group"
                                onClick={() =>
                                  onDeleteGroupRequest(group.id, group.name)
                                }
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "var(--text-negative)",
                                  fontSize: "0.72rem",
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="tabular-nums"
                        style={{ textAlign: "right", padding: "0 1rem" }}
                      >
                        {formatMilliunits(groupAssigned)}
                      </td>
                      <td
                        className="tabular-nums"
                        style={{ textAlign: "right", padding: "0 1rem" }}
                      >
                        {formatMilliunits(groupActivity)}
                      </td>
                      <td
                        className="tabular-nums"
                        style={{ textAlign: "right", padding: "0 1rem" }}
                      >
                        {formatMilliunits(groupAvailable)}
                      </td>
                    </tr>

                    {/* Inline Add Category Row */}
                    {addingCategoryForGroup === group.id && (
                      <tr
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          borderBottom: "1px solid var(--separator)",
                          height: "38px",
                        }}
                      >
                        <td colSpan={4} style={{ padding: "0.35rem 2rem" }}>
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
                            style={{ display: "flex", gap: "0.5rem" }}
                          >
                            <input
                              type="text"
                              placeholder="Category name"
                              value={newCategoryName}
                              onChange={(e) =>
                                setNewCategoryName(e.target.value)
                              }
                              autoFocus
                              style={{
                                height: "28px",
                                padding: "0 0.5rem",
                                borderRadius: "4px",
                                border: "1px solid var(--action-primary)",
                                fontSize: "0.825rem",
                              }}
                            />
                            <button
                              type="submit"
                              style={{
                                border: "none",
                                backgroundColor: "var(--action-primary)",
                                color: "#fff",
                                borderRadius: "4px",
                                padding: "0 0.65rem",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                              }}
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddingCategoryForGroup(null)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "var(--text-muted)",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}

                    {/* Category Rows */}
                    {!isCollapsed &&
                      groupCats.map((cat) => {
                        const isSelected =
                          selectedCategoryId === cat.category_id;
                        const isEditing = editingCategoryId === cat.category_id;

                        // Temporary spec note: All available_milliunits < 0 use red pill
                        const pillClass =
                          cat.available_milliunits > 0
                            ? "pill-positive"
                            : cat.available_milliunits < 0
                              ? "pill-negative"
                              : "pill-zero";

                        const pillBg =
                          cat.available_milliunits > 0
                            ? "var(--pill-positive-bg)"
                            : cat.available_milliunits < 0
                              ? "var(--pill-negative-bg)"
                              : "var(--pill-zero-bg)";

                        const pillText =
                          cat.available_milliunits > 0
                            ? "var(--pill-positive-text)"
                            : cat.available_milliunits < 0
                              ? "var(--pill-negative-text)"
                              : "var(--pill-zero-text)";

                        return (
                          <tr
                            key={cat.category_id}
                            onClick={() => onSelectCategory(cat.category_id)}
                            style={{
                              backgroundColor: isSelected
                                ? "var(--bg-row-selected)"
                                : "var(--bg-primary)",
                              borderBottom: "1px solid var(--separator)",
                              height: "42px",
                              fontSize: "0.875rem",
                              cursor: "pointer",
                            }}
                          >
                            <td style={{ padding: "0.35rem 1rem 0.35rem 2rem" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span style={{ fontWeight: 500 }}>
                                  {cat.is_credit_card_payment ? "💳 " : ""}
                                  {cat.name}
                                </span>
                                {!cat.is_credit_card_payment && (
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "0.35rem",
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateCategory(cat.category_id, {
                                          hidden: !cat.hidden,
                                        })
                                      }
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "var(--text-muted)",
                                        fontSize: "0.72rem",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {cat.hidden ? "Unhide" : "Hide"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onDeleteCategoryRequest(
                                          cat.category_id,
                                          cat.name,
                                        )
                                      }
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "var(--text-negative)",
                                        fontSize: "0.72rem",
                                        cursor: "pointer",
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Assigned Cell with Inline Calculator */}
                            <td
                              className="tabular-nums"
                              style={{ textAlign: "right", padding: "0 1rem" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCategory(cat.category_id);
                                if (!isEditing) {
                                  startEditingAssigned(cat);
                                }
                              }}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  aria-label={`Assign ${cat.name}`}
                                  value={editingInput}
                                  onChange={(e) =>
                                    setEditingInput(e.target.value)
                                  }
                                  onBlur={() => void commitAssignedEdit(cat)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void commitAssignedEdit(cat);
                                    } else if (e.key === "Escape") {
                                      setEditingCategoryId(null);
                                      setCellError(null);
                                    }
                                  }}
                                  autoFocus
                                  style={{
                                    width: "110px",
                                    textAlign: "right",
                                    height: "28px",
                                    padding: "0 0.4rem",
                                    borderRadius: "4px",
                                    border: "2px solid var(--action-primary)",
                                    fontSize: "0.85rem",
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    padding: "0.2rem 0.4rem",
                                    borderRadius: "4px",
                                    border: "1px solid transparent",
                                  }}
                                >
                                  {formatMilliunits(cat.assigned_milliunits)}
                                </span>
                              )}
                            </td>

                            {/* Activity Cell */}
                            <td
                              className="tabular-nums"
                              style={{
                                textAlign: "right",
                                padding: "0 1rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {formatMilliunits(cat.activity_milliunits)}
                            </td>

                            {/* Available Pill Cell */}
                            <td
                              className="tabular-nums"
                              style={{ textAlign: "right", padding: "0 1rem" }}
                            >
                              <button
                                type="button"
                                className={`available-pill ${pillClass}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenMoveMoney(cat);
                                }}
                                style={{
                                  border: "none",
                                  borderRadius: "999px",
                                  padding: "0.2rem 0.65rem",
                                  fontSize: "0.825rem",
                                  fontWeight: 700,
                                  backgroundColor: pillBg,
                                  color: pillText,
                                  cursor: "pointer",
                                }}
                              >
                                {formatMilliunits(cat.available_milliunits)}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
