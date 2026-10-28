import React, { useEffect, useState } from "react";
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

export interface BudgetInspectorProps {
  month: string;
  monthSummary: PlanMonthSummary | null;
  selectedCategory: CategoryMonthAllocation | null;
  onQuickAssign: (
    categoryId: string,
    newAssignedMilliunits: number,
  ) => Promise<void>;
  onSaveCategoryNote: (
    categoryId: string,
    note: string | null,
  ) => Promise<void>;
}

export function BudgetInspector({
  month,
  monthSummary,
  selectedCategory,
  onQuickAssign,
  onSaveCategoryNote,
}: BudgetInspectorProps): React.JSX.Element {
  const [noteDraft, setNoteDraft] = useState<string>(
    selectedCategory?.note ?? "",
  );
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setNoteDraft(selectedCategory?.note ?? "");
  }, [selectedCategory?.category_id, selectedCategory?.note]);

  const rta = monthSummary?.ready_to_assign_milliunits ?? 0;

  const handleQuickAction = async (action: QuickBudgetAction) => {
    if (!selectedCategory) return;
    const targetAssigned = computeQuickBudgetAssign(
      selectedCategory,
      action,
      rta,
    );
    await onQuickAssign(selectedCategory.category_id, targetAssigned);
  };

  return (
    <aside
      style={{
        width: "300px",
        flexShrink: 0,
        backgroundColor: "var(--bg-secondary)",
        borderLeft: "1px solid var(--separator)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        overflowY: "auto",
      }}
    >
      {/* Month Summary Card */}
      <div
        style={{
          backgroundColor: "var(--bg-primary)",
          borderRadius: "10px",
          padding: "1rem",
          border: "1px solid var(--separator)",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "0.95rem",
            fontWeight: 700,
          }}
        >
          {selectedCategory
            ? selectedCategory.name
            : `${formatMonthLabel(month)} Summary`}
        </h3>

        <div
          style={{
            display: "grid",
            gap: "0.45rem",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Assigned</span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>
              {formatMilliunits(
                selectedCategory
                  ? selectedCategory.assigned_milliunits
                  : (monthSummary?.total_assigned_milliunits ?? 0),
              )}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Activity</span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>
              {formatMilliunits(
                selectedCategory
                  ? selectedCategory.activity_milliunits
                  : (monthSummary?.total_activity_milliunits ?? 0),
              )}
            </span>
          </div>
          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--separator)",
              margin: "0.25rem 0",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>Available</span>
            <span className="tabular-nums" style={{ fontWeight: 700 }}>
              {formatMilliunits(
                selectedCategory
                  ? selectedCategory.available_milliunits
                  : (monthSummary?.total_available_milliunits ?? 0),
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-Assign / Quick Budget Card */}
      {selectedCategory && (
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            borderRadius: "10px",
            padding: "1rem",
            border: "1px solid var(--separator)",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <h4
            style={{
              margin: "0 0 0.25rem 0",
              fontSize: "0.82rem",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Auto-Assign
          </h4>

          {selectedCategory.available_milliunits < 0 && (
            <button
              type="button"
              onClick={() => void handleQuickAction("COVER_OVERSPENDING")}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "var(--pill-negative-bg)",
                color: "var(--pill-negative-text)",
                fontSize: "0.825rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Cover Overspending (
              {formatMilliunits(Math.abs(selectedCategory.available_milliunits))}
              )
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleQuickAction("ASSIGN_RTA")}
            disabled={rta <= 0}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--action-secondary-bg)",
              color: "var(--action-secondary-text)",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: rta > 0 ? "pointer" : "not-allowed",
              opacity: rta > 0 ? 1 : 0.5,
              textAlign: "left",
            }}
          >
            Assign Ready to Assign ({formatMilliunits(Math.max(0, rta))})
          </button>

          <button
            type="button"
            onClick={() => void handleQuickAction("RESET_ASSIGNED")}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Reset Assigned to $0.00
          </button>

          <button
            type="button"
            onClick={() => void handleQuickAction("RESET_AVAILABLE")}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Reset Available to $0.00
          </button>
        </div>
      )}

      {/* Category Note Editor (Connected to PATCH /categories/{id}) */}
      {selectedCategory && (
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            borderRadius: "10px",
            padding: "1rem",
            border: "1px solid var(--separator)",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <label
            htmlFor="inspector-category-note"
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Notes
          </label>
          <textarea
            id="inspector-category-note"
            rows={4}
            placeholder="Enter a note for this category..."
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--separator)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
          <button
            type="button"
            disabled={savingNote}
            onClick={async () => {
              setSavingNote(true);
              try {
                await onSaveCategoryNote(
                  selectedCategory.category_id,
                  noteDraft.trim() || null,
                );
              } finally {
                setSavingNote(false);
              }
            }}
            style={{
              justifySelf: "end",
              border: "none",
              borderRadius: "6px",
              padding: "0.35rem 0.75rem",
              backgroundColor: "var(--action-primary)",
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {savingNote ? "Saving..." : "Save Note"}
          </button>
        </div>
      )}
    </aside>
  );
}
