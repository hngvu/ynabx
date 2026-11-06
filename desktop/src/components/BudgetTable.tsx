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
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  masterCategories,
  selectedCategoryId,
  onAssignedChange,
  onSelectCategory,
  onAddMasterCategory,
  onAddSubCategory,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

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
        <div className="budget-table-draggable" style={{ flex: 1 }}>
          {masterCategories.map((group) => {
            const isCollapsed = collapsedGroups[group.id] || false;
            const groupAssigned = group.subcategories.reduce((s, c) => s + c.assigned, 0);
            const groupActivity = group.subcategories.reduce((s, c) => s + c.activity, 0);
            const groupAvailable = group.subcategories.reduce((s, c) => s + c.available, 0);

            return (
              <div key={group.id} className="budget-table-group">
                {/* Master Category Row */}
                <div
                  className="budget-table-row js-budget-table-row budget-table-row-ul is-master-category"
                  role="row"
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

                    return (
                      <div
                        key={subcat.id}
                        className={`budget-table-row js-budget-table-row budget-table-row-ul is-sub-category ${
                          isSelected ? "is-checked" : ""
                        }`}
                        role="row"
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
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
