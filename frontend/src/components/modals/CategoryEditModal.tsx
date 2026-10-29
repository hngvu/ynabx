import React, { useState, useEffect } from "react";
import type { CategoryMonthAllocation } from "../../api/types";
import { YnabIcon } from "../common/YnabIcon";

export interface CategoryEditModalProps {
  isOpen: boolean;
  category: CategoryMonthAllocation | null;
  onClose: () => void;
  onSaveName: (categoryId: string, newName: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => void;
}

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  category,
  onClose,
  onSaveName,
  onDeleteCategory,
}) => {
  const [name, setName] = useState(category?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setError(null);
    }
  }, [category]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name cannot be empty");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSaveName(category.category_id, name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category name");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay active modal-budget-edit-category"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="modal-header">
          <h3 className="modal-title">Edit Category</h3>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <YnabIcon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem" }}>
          {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="form-label" htmlFor="edit-category-name">
              Category Name
            </label>
            <input
              id="edit-category-name"
              type="text"
              className="form-input modal-budget-edit-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="modal-actions">
            <div className="modal-actions-left">
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  onDeleteCategory(category.category_id);
                  onClose();
                }}
                title="Delete this category"
              >
                <YnabIcon name="trash_can" size={14} />
                <span>Delete</span>
              </button>
            </div>
            <div className="modal-actions-right">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
