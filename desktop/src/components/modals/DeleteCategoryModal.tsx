import { useState, type FormEvent } from "react";

export function validateDeleteReassign(
  needsReassign: boolean,
  targetCategoryId: string | undefined,
  deletedIds: string[],
): string | undefined {
  if (!needsReassign) {
    return undefined;
  }
  const trimmed = targetCategoryId?.trim() ?? "";
  if (!trimmed) {
    throw new Error(
      "Please select a category to reassign existing transactions and funds.",
    );
  }
  if (deletedIds.includes(trimmed)) {
    throw new Error(
      "Cannot reassign to a category that is being deleted.",
    );
  }
  return trimmed;
}

export interface ReassignOption {
  id: string;
  name: string;
  groupName: string;
}

export interface DeleteCategoryModalProps {
  isOpen: boolean;
  targetName: string;
  deletedCategoryIds: string[];
  needsReassign: boolean;
  availableCategories: ReassignOption[];
  onClose: () => void;
  onConfirmDelete: (reassignToCategoryId?: string) => Promise<void>;
}

export function DeleteCategoryModal({
  isOpen,
  targetName,
  deletedCategoryIds,
  needsReassign,
  availableCategories,
  onClose,
  onConfirmDelete,
}: DeleteCategoryModalProps) {
  const validCandidates = availableCategories.filter(
    (c) => !deletedCategoryIds.includes(c.id),
  );
  const [reassignId, setReassignId] = useState(validCandidates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const validated = validateDeleteReassign(
        needsReassign,
        reassignId,
        deletedCategoryIds,
      );
      setSubmitting(true);
      await onConfirmDelete(validated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Delete {targetName}</h3>
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

            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              Are you sure you want to delete <strong>{targetName}</strong>?
            </p>

            {needsReassign && (
              <div className="form-group">
                <label className="form-label" htmlFor="delete-reassign-select">
                  Reassign activity and allocations to:
                </label>
                <select
                  id="delete-reassign-select"
                  className="form-select"
                  value={reassignId}
                  onChange={(e) => setReassignId(e.target.value)}
                  required
                >
                  <option value="">Select target category...</option>
                  {validCandidates.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.groupName}: {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-danger" disabled={submitting}>
              {submitting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
