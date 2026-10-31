import React, { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import type { Payee } from "../../api/types";

export interface ManagePayeesModalProps {
  isOpen: boolean;
  planId: string;
  onClose: () => void;
}

export const ManagePayeesModal: React.FC<ManagePayeesModalProps> = ({
  isOpen,
  planId,
  onClose,
}) => {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newPayeeName, setNewPayeeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null);
  const [editingPayeeName, setEditingPayeeName] = useState("");

  const loadPayees = async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listPayees(planId);
      setPayees(data);
    } catch {
      setError("Failed to load payees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPayees();
      setSearchTerm("");
      setNewPayeeName("");
      setEditingPayeeId(null);
    }
  }, [isOpen, planId]);

  if (!isOpen) return null;

  const handleAddPayee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayeeName.trim() || !planId) return;
    try {
      const created = await apiClient.createPayee(planId, {
        name: newPayeeName.trim(),
      });
      setPayees((prev) => [...prev, created]);
      setNewPayeeName("");
    } catch {
      setError("Failed to add payee.");
    }
  };

  const handleSaveEdit = async (payeeId: string) => {
    if (!editingPayeeName.trim() || !planId) return;
    try {
      const updated = await apiClient.updatePayee(planId, payeeId, {
        name: editingPayeeName.trim(),
      });
      setPayees((prev) =>
        prev.map((p) => (p.id === payeeId ? updated : p))
      );
      setEditingPayeeId(null);
    } catch {
      setError("Failed to update payee.");
    }
  };

  const handleDelete = async (payeeId: string) => {
    if (!planId) return;
    try {
      await apiClient.deletePayee(planId, payeeId);
      setPayees((prev) => prev.filter((p) => p.id !== payeeId));
    } catch {
      setError("Failed to delete payee. It may be used in transactions.");
    }
  };

  const filtered = payees.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-payees popover-anchor-overlay"
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
        className="modal modal-generic modal-manage-payees"
        style={{
          width: "32rem",
          maxWidth: "94vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
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
              <use href="#icon_sprite_arrows_circle_fill"></use>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Manage Payees
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

        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, overflow: "hidden" }}>
          {error && (
            <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "var(--calloutNegativeSubtleBackground, #fee)", color: "var(--labelNegative, #bf2e3b)", borderRadius: "4px", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          {/* Add Payee form */}
          <form onSubmit={handleAddPayee} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Add new payee..."
              value={newPayeeName}
              onChange={(e) => setNewPayeeName(e.target.value)}
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
            <button
              type="submit"
              disabled={!newPayeeName.trim()}
              className="button button-primary"
              style={{
                height: "36px",
                padding: "0 1rem",
                borderRadius: "4px",
                backgroundColor: "var(--actionPrimary, #545bfe)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              Add
            </button>
          </form>

          {/* Search */}
          <input
            type="text"
            placeholder="Search payees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              height: "34px",
              padding: "0 0.75rem",
              borderRadius: "4px",
              border: "1px solid var(--inputBorder, #d2d8de)",
              backgroundColor: "var(--backgroundSecondary, #f8f6f2)",
              color: "var(--labelPrimary, #191818)",
              fontSize: "0.85rem",
            }}
          />

          {/* Payees list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              border: "1px solid var(--separatorSubdued, #e5e5e5)",
              borderRadius: "4px",
              maxHeight: "320px",
            }}
          >
            {loading ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--labelSecondary, #6e7a88)", fontSize: "0.85rem" }}>
                Loading payees...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--labelSecondary, #6e7a88)", fontSize: "0.85rem" }}>
                {searchTerm ? "No payees found matching your search." : "No payees yet."}
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {filtered.map((payee) => {
                  const isEditing = editingPayeeId === payee.id;
                  return (
                    <li
                      key={payee.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        borderBottom: "1px solid var(--separatorSubdued, #f0f0f0)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "6px", flex: 1, marginRight: "8px" }}>
                          <input
                            type="text"
                            value={editingPayeeName}
                            onChange={(e) => setEditingPayeeName(e.target.value)}
                            style={{
                              flex: 1,
                              height: "28px",
                              padding: "0 6px",
                              borderRadius: "4px",
                              border: "1px solid var(--inputBorderActive, #545bfe)",
                              fontSize: "0.85rem",
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(payee.id);
                              if (e.key === "Escape") setEditingPayeeId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(payee.id)}
                            style={{
                              padding: "0 8px",
                              height: "28px",
                              backgroundColor: "var(--actionPrimary, #545bfe)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPayeeId(null)}
                            style={{
                              padding: "0 8px",
                              height: "28px",
                              background: "transparent",
                              border: "1px solid var(--inputBorder, #d2d8de)",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {payee.name}
                          </span>
                          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPayeeId(payee.id);
                                setEditingPayeeName(payee.name);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--actionPrimary, #545bfe)",
                                fontSize: "0.8rem",
                                padding: "2px 6px",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(payee.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--labelNegative, #bf2e3b)",
                                fontSize: "0.8rem",
                                padding: "2px 6px",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
