import React from "react";
import type { Account } from "../../api/types";

export interface BankConnectionsModalProps {
  isOpen: boolean;
  accounts: Account[];
  onClose: () => void;
}

export const BankConnectionsModal: React.FC<BankConnectionsModalProps> = ({
  isOpen,
  accounts,
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
        className="modal modal-generic modal-manage-connections"
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
              <use href="#icon_sprite_bank"></use>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Manage Bank Connections
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
          <div
            style={{
              padding: "0.85rem 1rem",
              backgroundColor: "var(--backgroundSecondary, #f8f6f2)",
              borderRadius: "6px",
              border: "1px solid var(--separatorStandard, #d2d8de)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--labelPrimary, #191818)" }}>
              Direct Import: Manual Entry Mode
            </div>
            <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--labelSecondary, #6e7a88)", lineHeight: 1.4 }}>
              Automatic bank sync is disabled in this self-hosted environment. All accounts operate seamlessly with manual transaction entry or file imports (OFX, QFX, CSV).
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--labelSecondary, #6e7a88)", marginBottom: "0.5rem" }}>
              Active Accounts ({accounts.filter((a) => !a.closed).length})
            </div>
            <div
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                border: "1px solid var(--separatorSubdued, #e5e5e5)",
                borderRadius: "4px",
              }}
            >
              {accounts.filter((a) => !a.closed).length === 0 ? (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--labelSecondary)", fontSize: "0.85rem" }}>
                  No accounts found.
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {accounts
                    .filter((a) => !a.closed)
                    .map((acc) => (
                      <li
                        key={acc.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem 0.75rem",
                          borderBottom: "1px solid var(--separatorSubdued, #f0f0f0)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{acc.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--labelSecondary)", backgroundColor: "var(--fillTertiary, rgba(0,0,0,0.06))", padding: "2px 6px", borderRadius: "3px" }}>
                          Unlinked
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
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
