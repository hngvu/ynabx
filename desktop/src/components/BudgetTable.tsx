import React, { useState } from "react";
import { YnabIcon } from "./YnabIcon.tsx";

export interface SubcategoryData {
  id: string;
  name: string;
  assigned: number; // milliunits
  activity: number; // milliunits
  available: number; // milliunits
  isCreditCardPayment?: boolean;
}

export interface MasterCategoryData {
  id: string;
  name: string;
  isCreditCardPayment?: boolean;
  subcategories: SubcategoryData[];
}

interface BudgetTableProps {
  masterCategories: MasterCategoryData[];
  selectedCategoryId?: string | null;
  onAssignedChange?: (subcategoryId: string, amount: number) => void;
  onSelectCategory?: (categoryId: string) => void;
  onAddMasterCategory?: () => void;
  onAddSubCategory?: (masterCategoryId: string) => void;
  onReorderMasterCategories?: (draggedId: string, targetId: string) => void;
  onReorderSubcategories?: (masterId: string, draggedSubId: string, targetSubId: string) => void;
  onMoveSubcategoryAcrossGroups?: (sourceMasterId: string, targetMasterId: string, subId: string) => void;
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  masterCategories,
  selectedCategoryId,
  onAssignedChange,
  onSelectCategory,
  onAddMasterCategory,
  onAddSubCategory,
  onReorderMasterCategories,
  onReorderSubcategories,
  onMoveSubcategoryAcrossGroups,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<{ id: string; position: "above" | "below" } | null>(null);
  const [draggedSubId, setDraggedSubId] = useState<string | null>(null);
  const [dropTargetSubId, setDropTargetSubId] = useState<{ id: string; position: "above" | "below" } | null>(null);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatCurrency = (milliunits: number) => {
    const dollars = milliunits / 1000;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);
  };

  const handleStartEdit = (subcat: SubcategoryData) => {
    setEditingId(subcat.id);
    setEditValue((subcat.assigned / 1000).toFixed(2));
  };

  const handleFinishEdit = (subcatId: string) => {
    try {
      const sanitized = editValue.replace(/[^0-9+\-*/.]/g, "");
      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${sanitized || "0"})`)();
      const milliunits = Math.round(Number(result) * 1000);
      onAssignedChange?.(subcatId, isNaN(milliunits) ? 0 : milliunits);
    } catch {
      // Keep existing on invalid formula
    }
    setEditingId(null);
  };

  return (
    <div className="budget-table-container" style={{ flex: 1, height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div className="budget-table" role="treegrid">
        {/* 1. Header with Toolbar & Column Titles */}
        <div className="budget-table-header" role="rowgroup" style={{ position: "sticky", top: 0, zIndex: 10 }}>
          {/* Action Toolbar */}
          <div className="budget-toolbar" role="row">
            <div role="cell">
              <button
                className="button budget-toolbar-add-category"
                type="button"
                onClick={onAddMasterCategory}
              >
                <YnabIcon name="plus_circle_fill" width={16} height={16} />
                <span>Category Group</span>
              </button>
            </div>
            <div role="cell" style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <button className="button" type="button" title="Undo">
                <YnabIcon name="undo" width={14} height={14} />
              </button>
              <button className="button" type="button" title="Redo">
                <YnabIcon name="repeat" width={14} height={14} />
              </button>
            </div>
          </div>

          {/* Table Header Labels */}
          <div className="budget-table-header-labels budget-table-row-ul" role="row">
            <div className="budget-table-cell-margin-left budget-table-row-li" aria-hidden="true">&nbsp;</div>
            <div className="budget-table-cell-collapse budget-table-row-li" role="columnheader"></div>
            <div className="budget-table-cell-checkbox budget-table-row-li" role="columnheader">
              <input type="checkbox" aria-label="Select all categories" />
            </div>
            <div className="budget-table-cell-name budget-table-row-li" role="columnheader">
              CATEGORY
            </div>
            <div className="budget-table-cell-budgeted budget-table-row-li" role="columnheader">
              ASSIGNED
            </div>
            <div className="budget-table-cell-activity budget-table-row-li" role="columnheader">
              ACTIVITY
            </div>
            <div className="budget-table-cell-available budget-table-row-li" role="columnheader">
              <strong>AVAILABLE</strong>
            </div>
            <div className="budget-table-cell-margin-right budget-table-row-li" aria-hidden="true">&nbsp;</div>
          </div>
        </div>

        {/* 2. Groups & Rows */}
        <div className={`budget-table-draggable ${draggedGroupId ? "master-category-is-dragging" : ""}`} style={{ flex: 1 }}>
          {masterCategories.map((group) => {
            const isCollapsed = collapsedGroups[group.id] || false;
            const groupAssigned = group.subcategories.reduce((s, c) => s + c.assigned, 0);
            const groupActivity = group.subcategories.reduce((s, c) => s + c.activity, 0);
            const groupAvailable = group.subcategories.reduce((s, c) => s + c.available, 0);

            const isGroupDropAbove = dropTargetGroupId?.id === group.id && dropTargetGroupId?.position === "above";
            const isGroupDropBelow = dropTargetGroupId?.id === group.id && dropTargetGroupId?.position === "below";

            return (
              <React.Fragment key={group.id}>
                {isGroupDropAbove && <div className="drag-placeholder" />}
                <div className="budget-table-group">
                  {/* Master Category Row */}
                  <div
                    className={`budget-table-row js-budget-table-row budget-table-row-ul is-master-category ${
                      draggedGroupId === group.id ? "is-original-dragging" : ""
                    }`}
                    role="row"
                    draggable={!group.isCreditCardPayment}
                    onDragStart={(e) => {
                      if (group.isCreditCardPayment) return;
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", JSON.stringify({ type: "group", groupId: group.id }));
                      setDraggedGroupId(group.id);
                    }}
                    onDragOver={(e) => {
                      if (group.isCreditCardPayment || draggedGroupId === group.id) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "move";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const isTopHalf = e.clientY < rect.top + rect.height / 2;
                      const position = isTopHalf ? "above" : "below";
                      if (dropTargetGroupId?.id !== group.id || dropTargetGroupId?.position !== position) {
                        setDropTargetGroupId({ id: group.id, position });
                      }
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation();
                      if (dropTargetGroupId?.id === group.id) {
                        setDropTargetGroupId(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (group.isCreditCardPayment) return;
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        const raw = e.dataTransfer.getData("text/plain");
                        if (raw) {
                          const data = JSON.parse(raw);
                          if (data.type === "group" && data.groupId && data.groupId !== group.id) {
                            onReorderMasterCategories?.(data.groupId, group.id);
                          }
                        }
                      } catch {
                        // ignore
                      }
                      setDraggedGroupId(null);
                      setDropTargetGroupId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedGroupId(null);
                      setDropTargetGroupId(null);
                    }}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="budget-table-cell-margin-left budget-table-row-li">&nbsp;</div>
                    <div className="budget-table-cell-collapse budget-table-row-li" role="cell">
                      <YnabIcon
                        name={isCollapsed ? "chevron_right" : "chevron_down"}
                        width={12}
                        height={12}
                      />
                    </div>
                    <div className="budget-table-cell-checkbox budget-table-row-li" role="cell">
                      <input
                        type="checkbox"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="budget-table-cell-name budget-table-row-li" role="rowheader">
                      <button className="button budget-table-cell-button user-data" type="button">
                        {group.name}
                      </button>
                      {!group.isCreditCardPayment && (
                        <button
                          className="button budget-table-cell-add-category budget-table-cell-button"
                          type="button"
                          title="Add Category"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddSubCategory?.(group.id);
                          }}
                        >
                          <YnabIcon name="plus_circle_fill" width={14} height={14} />
                        </button>
                      )}
                    </div>
                    <div className="budget-table-cell-budgeted budget-table-row-li" role="cell">
                      <span className="currency">{formatCurrency(groupAssigned)}</span>
                    </div>
                    <div className="budget-table-cell-activity budget-table-row-li" role="cell">
                      <span className="currency">{formatCurrency(groupActivity)}</span>
                    </div>
                    <div className="budget-table-cell-available budget-table-row-li" role="cell">
                      <span className="currency">{formatCurrency(groupAvailable)}</span>
                    </div>
                    <div className="budget-table-cell-margin-right budget-table-row-li">&nbsp;</div>
                  </div>

                  {/* Subcategory Rows */}
                  {!isCollapsed &&
                    group.subcategories.map((subcat) => {
                      const isSelected = selectedCategoryId === subcat.id;
                      const isEditing = editingId === subcat.id;
                      const isPositive = subcat.available > 0;
                      const isNegative = subcat.available < 0;

                      const isSubDropAbove = dropTargetSubId?.id === subcat.id && dropTargetSubId?.position === "above";
                      const isSubDropBelow = dropTargetSubId?.id === subcat.id && dropTargetSubId?.position === "below";

                      return (
                        <React.Fragment key={subcat.id}>
                          {isSubDropAbove && <div className="drag-placeholder" />}
                          <div
                            className={`budget-table-row js-budget-table-row budget-table-row-ul is-sub-category ${
                              isSelected ? "is-checked" : ""
                            } ${draggedSubId === subcat.id ? "is-original-dragging" : ""}`}
                            role="row"
                            draggable="true"
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", JSON.stringify({ type: "subcategory", masterId: group.id, subId: subcat.id }));
                              setDraggedSubId(subcat.id);
                            }}
                            onDragOver={(e) => {
                              if (draggedSubId === subcat.id) return;
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = "move";
                              const rect = e.currentTarget.getBoundingClientRect();
                              const isTopHalf = e.clientY < rect.top + rect.height / 2;
                              const position = isTopHalf ? "above" : "below";
                              if (dropTargetSubId?.id !== subcat.id || dropTargetSubId?.position !== position) {
                                setDropTargetSubId({ id: subcat.id, position });
                              }
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              if (dropTargetSubId?.id === subcat.id) {
                                setDropTargetSubId(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const raw = e.dataTransfer.getData("text/plain");
                                if (raw) {
                                  const data = JSON.parse(raw);
                                  if (data.type === "subcategory" && data.subId) {
                                    if (data.masterId === group.id) {
                                      if (data.subId !== subcat.id) {
                                        onReorderSubcategories?.(group.id, data.subId, subcat.id);
                                      }
                                    } else {
                                      onMoveSubcategoryAcrossGroups?.(data.masterId, group.id, data.subId);
                                    }
                                  }
                                }
                              } catch {
                                // ignore
                              }
                              setDraggedSubId(null);
                              setDropTargetSubId(null);
                            }}
                            onDragEnd={() => {
                              setDraggedSubId(null);
                              setDropTargetSubId(null);
                            }}
                            onClick={() => onSelectCategory?.(subcat.id)}
                          >
                            <div className="budget-table-cell-margin-left budget-table-row-li">&nbsp;</div>
                            <div className="budget-table-cell-collapse budget-table-row-li" role="cell">&nbsp;</div>
                            <div className="budget-table-cell-checkbox budget-table-row-li" role="cell">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onSelectCategory?.(subcat.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="budget-table-cell-name budget-table-row-li" role="rowheader">
                              <button
                                className="button budget-table-cell-button budget-table-cell-edit-category user-data"
                                type="button"
                              >
                                {subcat.name}
                              </button>
                            </div>

                            {/* Assigned Cell */}
                            <div
                              className="budget-table-cell-budgeted budget-table-row-li"
                              role="cell"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(subcat);
                              }}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="ynab-new-currency-input is-editing"
                                  value={editValue}
                                  autoFocus
                                  style={{ width: "100%", textAlign: "right", borderRadius: "0.25rem", padding: "0.2rem 0.4rem" }}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleFinishEdit(subcat.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleFinishEdit(subcat.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                />
                              ) : (
                                <button className="currency" type="button">
                                  {formatCurrency(subcat.assigned)}
                                </button>
                              )}
                            </div>

                            {/* Activity Cell */}
                            <div className="budget-table-cell-activity budget-table-row-li" role="cell">
                              <span className="currency">{formatCurrency(subcat.activity)}</span>
                            </div>

                            {/* Available Cell */}
                            <div className="budget-table-cell-available budget-table-row-li" role="cell">
                              <div
                                className={`ynab-new-budget-available-number ${
                                  isPositive ? "positive" : isNegative ? "negative" : "zero"
                                }`}
                              >
                                <span className="currency">{formatCurrency(subcat.available)}</span>
                              </div>
                            </div>
                            <div className="budget-table-cell-margin-right budget-table-row-li">&nbsp;</div>
                          </div>
                          {isSubDropBelow && <div className="drag-placeholder" />}
                        </React.Fragment>
                      );
                    })}
                </div>
                {isGroupDropBelow && <div className="drag-placeholder" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
