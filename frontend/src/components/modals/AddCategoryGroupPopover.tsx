import React, { useState, useEffect, useRef } from "react";

export interface AddCategoryGroupPopoverProps {
  isOpen: boolean;
  anchorPosition?: {
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null;
  onClose: () => void;
  onCreateGroup: (name: string) => Promise<void>;
}

export const AddCategoryGroupPopover: React.FC<AddCategoryGroupPopoverProps> = ({
  isOpen,
  anchorPosition,
  onClose,
  onCreateGroup,
}) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateGroup(name.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalWidth = 224; // 14em
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const anchorTop =
    anchorPosition?.bottom ?? (anchorPosition ? anchorPosition.top + 28 : 180);
  const anchorLeft = anchorPosition?.left ?? 225;
  const anchorWidth = anchorPosition?.width ?? 120;

  const topPos = anchorTop + 6;
  const leftPos = Math.max(
    16,
    Math.min(windowWidth - modalWidth - 16, anchorLeft - 40),
  );
  const anchorCenter = anchorLeft + anchorWidth / 2;
  const arrowLeft = Math.max(
    16,
    Math.min(modalWidth - 46, anchorCenter - leftPos - 15),
  );

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-add-master-category popover-anchor-overlay"
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
                    placeholder="New Category Group"
                    className="user-data js-focus-on-start"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button
              className="ynab-button secondary"
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
