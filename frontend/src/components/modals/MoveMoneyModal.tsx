import { useState, type FormEvent } from "react";
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
}

export function MoveMoneyModal({
  isOpen,
  summary,
  initialSourceCategoryId,
  currencySymbol = "$",
  onClose,
  onMoveMoney,
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

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Move Money</h3>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-body">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="move-amount">
                Move Amount
              </label>
              <input
                id="move-amount"
                className="form-input"
                type="text"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="move-source">
                From Category
              </label>
              <select
                id="move-source"
                className="form-select"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name} (Available:{" "}
                    {formatMilliunits(cat.available_milliunits, {
                      currencySymbol,
                    })}
                    )
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="move-target">
                To Category
              </label>
              <select
                id="move-target"
                className="form-select"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name} (Available:{" "}
                    {formatMilliunits(cat.available_milliunits, {
                      currencySymbol,
                    })}
                    )
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Moving..." : "Apply Move"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
