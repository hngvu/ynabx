import React, { useState, useEffect, useRef } from "react";
import type { CategoryGroupWithCategories } from "../../api/types";

export interface EditCategoryGroupPopoverProps {
  isOpen: boolean;
  group: CategoryGroupWithCategories | null;
  anchorPosition?: {
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null;
  onClose: () => void;
  onSaveName: (groupId: string, newName: string) => Promise<void>;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onToggleHide: (groupId: string, hidden: boolean) => Promise<void>;
}

export const EditCategoryGroupPopover: React.FC<EditCategoryGroupPopoverProps> = ({
  isOpen,
  group,
  anchorPosition,
  onClose,
  onSaveName,
  onDeleteGroup,
  onToggleHide,
}) => {
  const [name, setName] = useState(group?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [group]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !group) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (name.trim() !== group.name) {
        await onSaveName(group.id, name.trim());
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    onDeleteGroup(group.id, group.name);
    onClose();
  };

  const handleToggleHide = async () => {
    await onToggleHide(group.id, !group.hidden);
    onClose();
  };

  const modalWidth = 400; // 25em
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const anchorTop =
    anchorPosition?.bottom ?? (anchorPosition ? anchorPosition.top + 28 : 200);
  const anchorLeft = anchorPosition?.left ?? 150;
  const anchorWidth = anchorPosition?.width ?? 120;

  const topPos = anchorTop + 6;
  const leftPos = Math.max(
    16,
    Math.min(windowWidth - modalWidth - 16, anchorLeft - 20),
  );
  const anchorCenter = anchorLeft + anchorWidth / 2;
  const arrowLeft = Math.max(
    16,
    Math.min(modalWidth - 46, anchorCenter - leftPos - 15),
  );

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-budget-edit-category popover-anchor-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        backgroundColor: "transparent",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        pointerEvents: "auto",
        display: "block",
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: `${topPos}px`,
          left: `${leftPos}px`,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="fieldset">
              <div className="field-with-error">
                <div>
                  <input
                    ref={inputRef}
                    placeholder="Enter category group name"
                    className="modal-budget-edit-category-name user-data js-focus-on-start"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <div className="modal-actions-left">
              <button
                className="ynab-button secondary button-hide"
                type="button"
                onClick={handleToggleHide}
              >
                {group.hidden ? "Unhide" : "Hide"}
              </button>
              <button
                className="ynab-button destructive button-delete"
                type="button"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
            <div className="modal-actions-right">
              <button
                className="ynab-button secondary button-cancel"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="ynab-button primary"
                type="submit"
                disabled={!name.trim() || isSubmitting}
              >
                OK
              </button>
            </div>
          </div>
        </form>

        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            left: `${arrowLeft}px`,
            bottom: "100%",
            height: "0.9375rem",
            width: "1.875rem",
          }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" />
        </svg>
      </div>
    </div>
  );
};
