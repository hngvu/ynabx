import React, { useState } from "react";
import { YnabIcon } from "./YnabIcon.tsx";

interface ThemeSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme?: "light" | "dark" | "system";
  onSelectTheme: (theme: "light" | "dark" | "system") => void;
}

export const ThemeSwitcherModal: React.FC<ThemeSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentTheme = "dark",
  onSelectTheme,
}) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectTheme(selectedTheme);
    onClose();
  };

  return (
    <div
      className="ynab-u modal-overlay modal-popup"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10011,
        backgroundColor: "var(--scrimDefault)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="dialog ynab-new-theme-switcher"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "480px",
          backgroundColor: "var(--backgroundPrimaryElevated)",
          borderRadius: "0.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--separatorSubdued)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid var(--separatorSubdued)" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--labelPrimary)" }}>
            Display Options
          </h2>
          <button
            type="button"
            className="button-icon"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labelSecondary)", display: "flex", alignItems: "center" }}
          >
            <YnabIcon name="close" width={16} height={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem" }}>
          <div className="ynab-new-theme-switcher-option">
            <h3>THEME</h3>
            <div className="ynab-new-theme-switcher-grid">
              {/* Dark */}
              <button
                type="button"
                className={selectedTheme === "dark" ? "active" : ""}
                onClick={() => setSelectedTheme("dark")}
              >
                <div
                  className="example"
                  style={{
                    backgroundColor: "#1c1c28",
                    padding: "0.75rem",
                    border: selectedTheme === "dark" ? "2px solid var(--actionPrimary)" : "1px solid var(--separatorSubdued)",
                  }}
                >
                  <div style={{ height: "40px", backgroundColor: "#2c2c3e", borderRadius: "4px", marginBottom: "0.5rem" }} />
                  <div className="ynab-new-theme-switcher-radio-selection" style={{ borderTop: "none", padding: 0 }}>
                    <input
                      type="radio"
                      name="theme"
                      checked={selectedTheme === "dark"}
                      onChange={() => setSelectedTheme("dark")}
                    />
                    <span className="ynab-new-theme-switcher-label">Dark</span>
                  </div>
                </div>
              </button>

              {/* Light */}
              <button
                type="button"
                className={selectedTheme === "light" ? "active" : ""}
                onClick={() => setSelectedTheme("light")}
              >
                <div
                  className="example"
                  style={{
                    backgroundColor: "#f4f5f7",
                    padding: "0.75rem",
                    border: selectedTheme === "light" ? "2px solid var(--actionPrimary)" : "1px solid var(--separatorSubdued)",
                  }}
                >
                  <div style={{ height: "40px", backgroundColor: "#e2e4e9", borderRadius: "4px", marginBottom: "0.5rem" }} />
                  <div className="ynab-new-theme-switcher-radio-selection" style={{ borderTop: "none", padding: 0 }}>
                    <input
                      type="radio"
                      name="theme"
                      checked={selectedTheme === "light"}
                      onChange={() => setSelectedTheme("light")}
                    />
                    <span className="ynab-new-theme-switcher-label" style={{ color: "#111" }}>Light</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--separatorSubdued)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            className="button button-cancel"
            onClick={onClose}
            style={{
              height: "2.25rem",
              padding: "0 1rem",
              borderRadius: "0.25rem",
              border: "1px solid var(--separatorSubdued)",
              backgroundColor: "transparent",
              color: "var(--labelPrimary)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleApply}
            style={{
              height: "2.25rem",
              padding: "0 1.25rem",
              borderRadius: "0.25rem",
              border: "none",
              backgroundColor: "var(--actionPrimary)",
              color: "var(--labelDarkBackgroundPrimary)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
