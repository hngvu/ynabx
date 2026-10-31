import React from "react";

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "C", description: "Toggle cleared status on selected transactions" },
  { key: "A", description: "Approve selected transactions" },
  { key: "R", description: "Reconcile account" },
  { key: "M", description: "Move money between categories" },
  { key: "Shift + D", description: "Duplicate selected transaction" },
  { key: "Delete / Backspace", description: "Delete selected transactions" },
  { key: "+ / -", description: "Adjust date up or down in datepicker" },
  { key: "T", description: "Set date to Today in datepicker" },
  { key: "Esc", description: "Close any modal or popover" },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay active ynab-u modal-popup popover-anchor-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="modal modal-generic modal-keyboard-shortcuts"
        style={{
          width: "30rem",
          maxWidth: "94vw",
          backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
          borderRadius: "8px",
          boxShadow: "0 18px 54px rgba(0,0,0,0.3)",
          border: "1px solid var(--separatorStandard, #d2d8de)",
          color: "var(--labelPrimary, #191818)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--separatorSubdued, #e5e5e5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg className="ynab-new-icon" width="18" height="18" style={{ color: "var(--iconFillPrimary, #696763)" }}>
              <use href="#icon_sprite_keyboard"></use>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--actionPrimary, #545bfe)",
              padding: "4px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 2.5L13.5 13.5M13.5 2.5L2.5 13.5" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "1rem 1.25rem", maxHeight: "60vh", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {SHORTCUTS.map((s) => (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0",
                  borderBottom: "1px solid var(--separatorSubdued, #f5f5f5)",
                  fontSize: "0.85rem",
                }}
              >
                <span style={{ color: "var(--labelPrimary, #191818)" }}>{s.description}</span>
                <kbd
                  style={{
                    backgroundColor: "var(--backgroundSecondary, #f3eee2)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    fontFamily: "monospace",
                    color: "var(--labelPrimary, #191818)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                  }}
                >
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "0.75rem 1.25rem",
            borderTop: "1px solid var(--separatorSubdued, #e5e5e5)",
            backgroundColor: "var(--backgroundSecondary, #f8f6f2)",
          }}
        >
          <button
            type="button"
            className="button button-cancel"
            onClick={onClose}
            style={{
              padding: "0 1rem",
              height: "36px",
              fontSize: "0.85rem",
              fontWeight: 600,
              borderRadius: "4px",
              backgroundColor: "var(--buttonSecondaryBackground, #f0f1ff)",
              color: "var(--actionPrimary, #545bfe)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
