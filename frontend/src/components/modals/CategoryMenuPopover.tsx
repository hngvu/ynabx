import React, { useState, useEffect, useRef } from "react";
import type { CategoryMonthAllocation } from "../../api/types";
import { YnabIcon } from "../common/YnabIcon";

export interface CategoryMenuPopoverProps {
  isOpen: boolean;
  category: CategoryMonthAllocation | null;
  anchorPosition?: { top: number; left: number } | null;
  onClose: () => void;
  onSaveName: (categoryId: string, newName: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => void;
  onToggleHide: (categoryId: string, hidden: boolean) => Promise<void>;
}

export const CategoryMenuPopover: React.FC<CategoryMenuPopoverProps> = ({
  isOpen,
  category,
  anchorPosition,
  onClose,
  onSaveName,
  onDeleteCategory,
  onToggleHide,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(category?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      if (name.trim() !== category.name) {
        await onSaveName(category.category_id, name.trim());
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const topPos = anchorPosition
    ? typeof window !== "undefined" && anchorPosition.top > window.innerHeight - 180
      ? anchorPosition.top - 160
      : anchorPosition.top
    : 100;

  const leftPos = anchorPosition
    ? Math.max(
        16,
        Math.min(
          (typeof window !== "undefined" ? window.innerWidth : 1000) - 300,
          anchorPosition.left,
        ),
      )
    : 100;

  return (
    <div
      className="modal-overlay active popover-anchor-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        backgroundColor: "transparent",
        pointerEvents: "auto",
        display: "block",
      }}
    >
      <div
        ref={popoverRef}
        className="modal modal-popup category-menu-popover"
        style={{
          position: "fixed",
          top: `${topPos}px`,
          left: `${leftPos}px`,
          zIndex: 10006,
          width: "280px",
          backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
          borderRadius: "8px",
          boxShadow: "0 12px 36px rgba(0,0,0,0.24)",
          border: "1px solid var(--separatorStandard, #d2d8de)",
          padding: "0.85rem",
          color: "var(--labelPrimary, #191818)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--labelSecondary)", marginBottom: "0.4rem", textTransform: "uppercase" }}>
          Edit Category
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="ember-text-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            style={{
              width: "100%",
              height: "36px",
              padding: "0 0.75rem",
              fontSize: "0.92rem",
              borderRadius: "6px",
              border: "1.5px solid var(--inputBorderActive, #545bfe)",
              marginBottom: "0.75rem",
              outline: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.35rem",
              borderTop: "1px solid var(--separatorLight, #edf1f5)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className="button-list"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  color: "var(--labelSecondary)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  await onToggleHide(category.category_id, !category.hidden);
                  onClose();
                }}
                title={category.hidden ? "Unhide Category" : "Hide Category"}
              >
                <YnabIcon name="eye_slash" size={13} style={{ marginRight: "4px" }} />
                {category.hidden ? "Unhide" : "Hide"}
              </button>

              <button
                type="button"
                className="button-list"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  color: "var(--labelNegative, #bf2e3b)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(category.category_id);
                  onClose();
                }}
                title="Delete Category"
              >
                <YnabIcon name="trash" size={13} style={{ marginRight: "4px" }} />
                Delete
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className="button button-cancel"
                onClick={onClose}
                style={{
                  height: "28px",
                  padding: "0 0.65rem",
                  fontSize: "0.82rem",
                  borderRadius: "4px",
                  border: "1px solid var(--separatorStandard, #d2d8de)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="button button-primary"
                style={{
                  height: "28px",
                  padding: "0 0.85rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: "4px",
                  backgroundColor: "#545bfe",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
