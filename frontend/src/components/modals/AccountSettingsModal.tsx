import React from "react";
import type { PlanSummary } from "../../api/types";

export interface AccountSettingsModalProps {
  isOpen: boolean;
  userEmail?: string;
  activePlan: PlanSummary | null;
  totalPlansCount: number;
  onLogout: () => void;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  userEmail,
  activePlan,
  totalPlansCount,
  onLogout,
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
        className="modal modal-generic modal-account-settings"
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
              <use href="#icon_sprite_user"></use>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Account Settings
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

        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--labelSecondary, #6e7a88)", letterSpacing: "0.05em" }}>
              Email Address
            </label>
            <div style={{ marginTop: "0.25rem", fontSize: "0.95rem", fontWeight: 600 }}>
              {userEmail || "vuhse182692@fpt.edu.vn"}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--labelSecondary, #6e7a88)", letterSpacing: "0.05em" }}>
                Active Plan
              </label>
              <div style={{ marginTop: "0.25rem", fontSize: "0.9rem", fontWeight: 500 }}>
                {activePlan?.name ?? "Default Plan"}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--labelSecondary, #6e7a88)", letterSpacing: "0.05em" }}>
                Total Plans
              </label>
              <div style={{ marginTop: "0.25rem", fontSize: "0.9rem", fontWeight: 500 }}>
                {totalPlansCount}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--labelSecondary, #6e7a88)", letterSpacing: "0.05em" }}>
              Currency & Region
            </label>
            <div style={{ marginTop: "0.25rem", fontSize: "0.9rem", fontWeight: 500 }}>
              {activePlan?.currency_code ?? "USD"} ({activePlan?.number_format ?? "#,##0.00"})
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1.25rem",
            borderTop: "1px solid var(--separatorSubdued, #e5e5e5)",
            backgroundColor: "var(--backgroundSecondary, #f8f6f2)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            style={{
              padding: "0 0.75rem",
              height: "36px",
              fontSize: "0.85rem",
              fontWeight: 600,
              borderRadius: "4px",
              backgroundColor: "transparent",
              color: "var(--labelNegative, #bf2e3b)",
              border: "1px solid var(--separatorStandard, #d2d8de)",
              cursor: "pointer",
            }}
          >
            Log Out
          </button>
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
