import React, { useEffect, useRef } from "react";
import type { Account, Payee } from "../../api/types";
import { YnabIcon } from "../common/YnabIcon";

export interface PayeeDropdownPopoverProps {
  isOpen: boolean;
  currentPayee: string;
  transferAccountId: string | null;
  accounts: Account[];
  currentAccountId: string;
  payees: Payee[];
  searchQuery: string;
  anchorPosition?: {
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null;
  onSelectPayee: (payeeName: string, transferAccountId: string | null) => void;
  onClose: () => void;
  onManagePayees?: () => void;
}

export const PayeeDropdownPopover: React.FC<PayeeDropdownPopoverProps> = ({
  isOpen,
  currentPayee,
  transferAccountId,
  accounts,
  currentAccountId,
  payees,
  searchQuery,
  anchorPosition,
  onSelectPayee,
  onClose,
  onManagePayees,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = (searchQuery || "").trim().toLowerCase();

  // Filter transfer accounts (exclude closed and current source account)
  const transferAccounts = accounts.filter(
    (a) => !a.closed && a.id !== currentAccountId,
  );
  const filteredAccounts = transferAccounts.filter((a) => {
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      `to/from ${a.name}`.toLowerCase().includes(q) ||
      `transfer : ${a.name}`.toLowerCase().includes(q)
    );
  });

  // Filter saved payees (exclude transfer auto-payees)
  const savedPayees = payees.filter((p) => !p.transfer_account_id);
  const filteredPayees = savedPayees.filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q);
  });

  // Check if search query matches an existing item exactly
  const exactMatchAccount = transferAccounts.some(
    (a) =>
      a.name.toLowerCase() === q ||
      `transfer : ${a.name}`.toLowerCase() === q,
  );
  const exactMatchPayee = savedPayees.some(
    (p) => p.name.toLowerCase() === q,
  );
  const showAddCustom = q.length > 0 && !exactMatchAccount && !exactMatchPayee;

  // Positioning
  const modalWidth = 320; // 20rem
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const anchorTop =
    anchorPosition?.bottom ?? (anchorPosition ? anchorPosition.top + 28 : 300);
  const anchorLeft = anchorPosition?.left ?? 200;
  const anchorWidth = anchorPosition?.width ?? 120;

  const topPos = anchorTop + 6;
  const leftPos = Math.max(
    16,
    Math.min(windowWidth - modalWidth - 16, anchorLeft),
  );
  const anchorCenter = anchorLeft + anchorWidth / 2;
  const arrowLeft = Math.max(
    16,
    Math.min(modalWidth - 46, anchorCenter - leftPos - 15),
  );

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-account-dropdown modal-account-payees popover-anchor-overlay"
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
        ref={popoverRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: `${topPos}px`,
          left: `${leftPos}px`,
          width: `${modalWidth}px`,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-account-payees-main">
          <div className="modal-empty-header" style={{ height: "4px" }}></div>

          <ul
            className="modal-list"
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              margin: 0,
              padding: 0,
            }}
          >
            {/* Add new payee option */}
            {showAddCustom && (
              <li className="user-data">
                <button
                  className="button-list user-payee"
                  type="button"
                  onClick={() => {
                    onSelectPayee(searchQuery.trim(), null);
                    onClose();
                  }}
                >
                  <div
                    className="modal-account-payees-payee"
                    title={`Add "${searchQuery.trim()}"`}
                  >
                    <div className="button-content">
                      <span className="icon-container" style={{ width: "20px", display: "inline-block" }}>
                        <YnabIcon name="plus_circle_fill" size={14} />
                      </span>
                      Add "{searchQuery.trim()}"
                    </div>
                  </div>
                </button>
              </li>
            )}

            {/* Payments and Transfers */}
            {filteredAccounts.length > 0 && (
              <>
                <li className="user-data section-item">
                  Payments and Transfers
                </li>
                {filteredAccounts.map((acc) => {
                  const label = `To/From ${acc.name}`;
                  const isSelected = transferAccountId === acc.id;
                  return (
                    <li key={acc.id} className="user-data">
                      <button
                        className="button-list user-payee"
                        type="button"
                        onClick={() => {
                          onSelectPayee(`Transfer : ${acc.name}`, acc.id);
                          onClose();
                        }}
                      >
                        <div
                          className="modal-account-payees-payee"
                          title={label}
                        >
                          <div className="button-content">
                            <span
                              className="icon-container"
                              style={{ width: "20px", display: "inline-block" }}
                            >
                              {isSelected && (
                                <YnabIcon
                                  name="check"
                                  size={14}
                                  className="selected-category-icon"
                                />
                              )}
                            </span>
                            {label}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </>
            )}

            {/* Saved Payees */}
            {filteredPayees.length > 0 && (
              <>
                <li className="user-data section-item">Saved Payees</li>
                {filteredPayees.map((p) => {
                  const isSelected =
                    !transferAccountId &&
                    currentPayee.trim().toLowerCase() ===
                      p.name.trim().toLowerCase();
                  return (
                    <li key={p.id} className="user-data">
                      <button
                        className="button-list user-payee"
                        type="button"
                        onClick={() => {
                          onSelectPayee(p.name, null);
                          onClose();
                        }}
                      >
                        <div
                          className="modal-account-payees-payee"
                          title={p.name}
                        >
                          <div className="button-content">
                            <span
                              className="icon-container"
                              style={{ width: "20px", display: "inline-block" }}
                            >
                              {isSelected && (
                                <YnabIcon
                                  name="check"
                                  size={14}
                                  className="selected-category-icon"
                                />
                              )}
                            </span>
                            {p.name}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </>
            )}

            {filteredAccounts.length === 0 &&
              filteredPayees.length === 0 &&
              !showAddCustom && (
                <li
                  className="user-data"
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "var(--labelSecondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  No payees found.
                </li>
              )}
          </ul>

          <div className="modal-account-payees-main-footer">
            <button
              className="button"
              type="button"
              onClick={() => {
                if (onManagePayees) onManagePayees();
                onClose();
              }}
            >
              Manage Payees
            </button>
          </div>
        </div>

        {/* Modal Arrow */}
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
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z"></path>
        </svg>
      </div>
    </div>
  );
};
