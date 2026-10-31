import React, { useState, useEffect } from "react";

export interface EditFlagsModalProps {
  isOpen: boolean;
  planId: string;
  onClose: () => void;
}

const DEFAULT_FLAGS = [
  { color: "RED", defaultName: "Red", hex: "#ff3b30" },
  { color: "ORANGE", defaultName: "Orange", hex: "#ff9500" },
  { color: "YELLOW", defaultName: "Yellow", hex: "#ffcc00" },
  { color: "GREEN", defaultName: "Green", hex: "#34c759" },
  { color: "BLUE", defaultName: "Blue", hex: "#5ac8fa" },
  { color: "PURPLE", defaultName: "Purple", hex: "#af52de" },
];

export const EditFlagsModal: React.FC<EditFlagsModalProps> = ({
  isOpen,
  planId,
  onClose,
}) => {
  const [flagNames, setFlagNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && planId) {
      try {
        const saved = localStorage.getItem(`ynabx_flag_names_${planId}`);
        if (saved) {
          setFlagNames(JSON.parse(saved));
        } else {
          setFlagNames({});
        }
      } catch {
        setFlagNames({});
      }
    }
  }, [isOpen, planId]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (planId) {
      try {
        localStorage.setItem(
          `ynabx_flag_names_${planId}`,
          JSON.stringify(flagNames)
        );
      } catch {
        // Ignore storage error
      }
    }
    onClose();
  };

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-account-flags popover-anchor-overlay"
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
        className="modal modal-generic modal-manage-flags"
        style={{
          width: "26rem",
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
              <use href="#icon_sprite_flag_fill"></use>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Edit Flag Names
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

        <form onSubmit={handleSave}>
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {DEFAULT_FLAGS.map(({ color, defaultName, hex }) => (
              <div key={color} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: hex,
                    flexShrink: 0,
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                  }}
                />
                <input
                  type="text"
                  placeholder={defaultName}
                  value={flagNames[color] ?? ""}
                  onChange={(e) =>
                    setFlagNames((prev) => ({
                      ...prev,
                      [color]: e.target.value,
                    }))
                  }
                  style={{
                    flex: 1,
                    height: "36px",
                    padding: "0 0.75rem",
                    borderRadius: "4px",
                    border: "1px solid var(--inputBorder, #d2d8de)",
                    backgroundColor: "var(--inputBackground, #ffffff)",
                    color: "var(--labelPrimary, #191818)",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            ))}
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
              type="submit"
              className="button button-primary"
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
              Save Flags
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
