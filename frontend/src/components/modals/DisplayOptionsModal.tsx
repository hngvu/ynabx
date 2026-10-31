import React from "react";

export interface DisplayOptionsModalProps {
  isOpen: boolean;
  theme: "theme-light" | "theme-dark";
  onToggleTheme: () => void;
  hideAmounts: boolean;
  onToggleHideAmounts: () => void;
  onClose: () => void;
}

export const DisplayOptionsModal: React.FC<DisplayOptionsModalProps> = ({
  isOpen,
  theme,
  onToggleTheme,
  hideAmounts,
  onToggleHideAmounts,
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
        className="modal modal-generic modal-display-options"
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
            <svg className="ynab-new-icon" width="18" height="18" style={{ color: "var(--iconFillPrimary, #696763)" }}>
              <use href="#icon_sprite_paint_roller"></use>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Display Options
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

        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Theme setting */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.5rem" }}>
              Theme
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => {
                  if (theme !== "theme-light") onToggleTheme();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: `2px solid ${
                    theme === "theme-light"
                      ? "var(--actionPrimary, #545bfe)"
                      : "var(--separatorStandard, #d2d8de)"
                  }`,
                  backgroundColor: "var(--backgroundPrimary, #ffffff)",
                  color: "var(--labelPrimary, #191818)",
                  cursor: "pointer",
                  fontWeight: theme === "theme-light" ? 700 : 500,
                  fontSize: "0.9rem",
                }}
              >
                <svg className="ynab-new-icon" width="16" height="16">
                  <use href="#icon_sprite_sun"></use>
                </svg>
                Light
              </button>
              <button
                type="button"
                onClick={() => {
                  if (theme !== "theme-dark") onToggleTheme();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: `2px solid ${
                    theme === "theme-dark"
                      ? "var(--actionPrimary, #545bfe)"
                      : "var(--separatorStandard, #d2d8de)"
                  }`,
                  backgroundColor: "var(--backgroundSecondaryElevated, #1c1f58)",
                  color: theme === "theme-dark" ? "#ffffff" : "var(--labelPrimary, #191818)",
                  cursor: "pointer",
                  fontWeight: theme === "theme-dark" ? 700 : 500,
                  fontSize: "0.9rem",
                }}
              >
                <svg className="ynab-new-icon" width="16" height="16">
                  <use href="#icon_sprite_moon"></use>
                </svg>
                Dark
              </button>
            </div>
          </div>

          {/* Privacy setting: Hide Amounts */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem",
              borderRadius: "6px",
              backgroundColor: "var(--backgroundSecondary, #f8f6f2)",
              border: "1px solid var(--separatorStandard, #d2d8de)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--labelPrimary, #191818)" }}>
                Hide Monetary Amounts
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--labelSecondary, #6e7a88)", marginTop: "2px" }}>
                Mask balances and numbers with •••••• for privacy in public spaces
              </div>
            </div>
            <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
              <input
                type="checkbox"
                checked={hideAmounts}
                onChange={onToggleHideAmounts}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "pointer",
                  inset: 0,
                  backgroundColor: hideAmounts ? "var(--actionPrimary, #545bfe)" : "var(--separatorStrong, #acaaa5)",
                  borderRadius: "24px",
                  transition: "0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    content: "",
                    height: "18px",
                    width: "18px",
                    left: hideAmounts ? "23px" : "3px",
                    bottom: "3px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: "0.2s",
                  }}
                />
              </span>
            </label>
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
            className="button button-primary"
            onClick={onClose}
            style={{
              padding: "0 1rem",
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
