import React from "react";

export interface FreshStartModalProps {
  isOpen: boolean;
  planName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export const FreshStartModal: React.FC<FreshStartModalProps> = ({
  isOpen,
  planName,
  onConfirm,
  onClose,
}) => {
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleStart = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

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
        className="modal modal-generic modal-fresh-start"
        style={{
          width: "28rem",
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
            <svg className="ynab-new-icon" width="18" height="18" style={{ color: "var(--actionPrimary, #545bfe)" }}>
              <use href="#icon_sprite_leaf"></use>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Make a Fresh Start
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

        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.4, color: "var(--labelPrimary, #191818)" }}>
            Making a Fresh Start keeps all your accounts, categories, and targets, but archives your current transactions so you can start with a clean slate.
          </p>
          <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4, color: "var(--labelSecondary, #6e7a88)" }}>
            A new plan named <strong>{planName} (Fresh Start)</strong> will be created. Your current plan will remain untouched in your plan list.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "0.75rem 1.25rem",
            borderTop: "1px solid var(--separatorSubdued, #e5e5e5)",
            backgroundColor: "var(--backgroundSecondary, #f8f6f2)",
          }}
        >
          <button
            type="button"
            className="button button-cancel"
            onClick={onClose}
            disabled={loading}
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
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleStart}
            disabled={loading}
            style={{
              padding: "0 1.25rem",
              height: "36px",
              fontSize: "0.85rem",
              fontWeight: 600,
              borderRadius: "4px",
              backgroundColor: "var(--actionPrimary, #545bfe)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading ? "Starting..." : "Continue with Fresh Start"}
          </button>
        </div>
      </div>
    </div>
  );
};
