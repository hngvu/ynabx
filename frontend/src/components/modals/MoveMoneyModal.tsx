import { useState, useEffect, type FormEvent } from "react";
import type {
  AllocationUpdate,
  CategoryMonthAllocation,
  PlanMonthSummary,
} from "../../api/types";
import {
  formatMilliunits,
  parseInputToMilliunits,
} from "../../utils/currency";

export function buildMoveMoneyAllocations(
  summary: PlanMonthSummary,
  sourceCategoryId: string,
  targetCategoryId: string,
  amountMilliunits: number,
): AllocationUpdate[] {
  if (!Number.isSafeInteger(amountMilliunits) || amountMilliunits <= 0) {
    throw new Error("Move amount must be a positive integer milliunits value.");
  }
  if (!sourceCategoryId || !targetCategoryId) {
    throw new Error("Both source and target categories are required.");
  }
  if (sourceCategoryId === targetCategoryId) {
    throw new Error("Source and target categories must be different.");
  }

  let sourceCat: CategoryMonthAllocation | undefined;
  let targetCat: CategoryMonthAllocation | undefined;

  for (const cat of summary.categories) {
    if (cat.category_id === sourceCategoryId) {
      sourceCat = cat;
    }
    if (cat.category_id === targetCategoryId) {
      targetCat = cat;
    }
  }

  if (!sourceCat || !targetCat) {
    throw new Error("Selected categories not found in the active month summary.");
  }

  return [
    {
      category_id: sourceCategoryId,
      assigned_milliunits: sourceCat.assigned_milliunits - amountMilliunits,
    },
    {
      category_id: targetCategoryId,
      assigned_milliunits: targetCat.assigned_milliunits + amountMilliunits,
    },
  ];
}

export interface MoveMoneyModalProps {
  isOpen: boolean;
  summary: PlanMonthSummary | null;
  initialSourceCategoryId?: string | null;
  currencySymbol?: string;
  onClose: () => void;
  onMoveMoney: (allocations: AllocationUpdate[]) => Promise<void>;
  anchorPosition?: {
    top: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null;
}

export function MoveMoneyModal({
  isOpen,
  summary,
  initialSourceCategoryId,
  currencySymbol,
  onClose,
  onMoveMoney,
  anchorPosition,
}: MoveMoneyModalProps) {
  const categories =
    summary?.categories.filter((c) => !c.hidden) ?? [];

  const defaultSource =
    initialSourceCategoryId ?? categories[0]?.category_id ?? "";
  const defaultTarget =
    categories.find((c) => c.category_id !== defaultSource)?.category_id ?? "";

  const [sourceId, setSourceId] = useState(defaultSource);
  const [targetId, setTargetId] = useState(defaultTarget);
  const [amountInput, setAmountInput] = useState("10.00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialSourceCategoryId) {
      setSourceId(initialSourceCategoryId);
      const cat = categories.find((c) => c.category_id === initialSourceCategoryId);
      if (cat && cat.available_milliunits > 0) {
        setAmountInput((cat.available_milliunits / 1000).toFixed(2));
      }
    }
  }, [initialSourceCategoryId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !summary) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const amountMilliunits = parseInputToMilliunits(amountInput);
      const updates = buildMoveMoneyAllocations(
        summary,
        sourceId,
        targetId,
        amountMilliunits,
      );
      setSubmitting(true);
      await onMoveMoney(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move money");
    } finally {
      setSubmitting(false);
    }
  };

  let popoverStyle: React.CSSProperties;
  if (anchorPosition) {
    const isNearBottom =
      typeof window !== "undefined" &&
      anchorPosition.top > window.innerHeight - 240;
    const computedTop = isNearBottom
      ? Math.max(10, anchorPosition.top - 210)
      : (anchorPosition.bottom ?? anchorPosition.top + 6);

    const rightOffset =
      anchorPosition.right !== undefined && typeof window !== "undefined"
        ? Math.max(16, window.innerWidth - anchorPosition.right)
        : undefined;

    popoverStyle = {
      position: "fixed",
      top: `${computedTop}px`,
      ...(rightOffset !== undefined
        ? { right: `${rightOffset}px` }
        : {
            left: `${Math.max(
              16,
              Math.min(
                (typeof window !== "undefined" ? window.innerWidth : 1000) -
                  320,
                anchorPosition.left ?? 16,
              ),
            )}px`,
          }),
      zIndex: 10006,
    };
  } else {
    popoverStyle = {
      position: "fixed",
      top: "35%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 10006,
    };
  }

  return (
    <div
      className={`modal-overlay active modal-budget-move-money ${anchorPosition ? "popover-anchor-overlay" : ""}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        backgroundColor: anchorPosition ? "transparent" : "rgba(0,0,0,0.3)",
        pointerEvents: "auto",
        display: anchorPosition ? "block" : "flex",
      }}
    >
      <div
        className="modal modal-popup"
        style={{
          ...popoverStyle,
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 12px 36px rgba(0,0,0,0.24)",
          border: "1px solid var(--separatorStandard, #d2d8de)",
          padding: "1rem",
          color: "var(--text-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: "none" }}>Move Money</div>
        <div className="modal-content">
          <form onSubmit={(e) => void handleSubmit(e)}>
            {error && (
              <div
                className="auth-error"
                style={{ marginBottom: "0.75rem", fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  marginBottom: "0.3rem",
                }}
              >
                Move
              </label>
              <input
                type="text"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                autoFocus
                className="ember-text-field"
                style={{
                  width: "100%",
                  height: "34px",
                  padding: "0 0.65rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  marginBottom: "0.3rem",
                }}
              >
                To
              </label>
              <select
                className="form-select"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                style={{
                  width: "100%",
                  height: "34px",
                  padding: "0 0.5rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                }}
              >
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name} ({formatMilliunits(cat.available_milliunits, currencySymbol ? { currencySymbol } : undefined)})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="button button-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={submitting || !sourceId || !targetId}
              >
                {submitting ? "..." : "OK"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
