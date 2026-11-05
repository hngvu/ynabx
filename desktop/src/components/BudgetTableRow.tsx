import React, { useState, useRef, useEffect } from "react";
import type { Category, CategoryMonthAllocation } from "../api/types";
import { YnabIcon } from "./common/YnabIcon";
import { formatMilliunits, parseInputToMilliunits } from "../utils/currency";

export interface BudgetTableRowProps {
  category: Category;
  allocation?: CategoryMonthAllocation;
  isMasterCategory: boolean;
  canExpand?: boolean;
  isCollapsed?: boolean;
  isChecked?: boolean;
  isPartiallyChecked?: boolean;
  isRowExpanded?: boolean;
  currencyCode?: string;
  fundingMessageTopline?: string;
  fundingMessageDetails?: string;
  onToggleCollapse?: () => void;
  onToggleCheck?: (e: React.MouseEvent) => void;
  onEditCategory?: () => void;
  onOpenAddSubCategory?: () => void;
  onOpenMoveMoney?: (anchorRect: DOMRect) => void;
  onSaveAssigned?: (amountMilliunits: number) => Promise<void>;
  onClickRow?: (e: React.MouseEvent) => void;
}

export const BudgetTableRow: React.FC<BudgetTableRowProps> = ({
  category,
  allocation,
  isMasterCategory,
  canExpand = false,
  isCollapsed = false,
  isChecked = false,
  isPartiallyChecked = false,
  isRowExpanded = true,
  currencyCode = "USD",
  fundingMessageTopline,
  fundingMessageDetails,
  onToggleCollapse,
  onToggleCheck,
  onEditCategory,
  onOpenAddSubCategory,
  onOpenMoveMoney,
  onSaveAssigned,
  onClickRow,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const budgetedMilliunits = allocation?.assigned_milliunits ?? 0;
  const activityMilliunits = allocation?.activity_milliunits ?? 0;
  const availableMilliunits = allocation?.available_milliunits ?? 0;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMasterCategory) return;
    setEditValue((budgetedMilliunits / 1000).toFixed(2));
    setIsEditing(true);
  };

  const handleCommitEdit = async () => {
    if (!isEditing) return;
    setIsEditing(false);
    const parsed = parseInputToMilliunits(editValue, budgetedMilliunits);
    if (parsed !== budgetedMilliunits && onSaveAssigned) {
      await onSaveAssigned(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleCommitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  // Status classes for Available Pill
  const availableClass =
    availableMilliunits > 0
      ? "positive"
      : availableMilliunits < 0
      ? "negative"
      : "zero";

  const rowClasses = [
    "budget-table-row",
    "js-budget-table-row",
    "budget-table-row-ul",
    isMasterCategory ? "is-master-category" : "is-sub-category",
    isChecked ? "is-checked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rowClasses}
      role="row"
      data-entity-id={category.id}
      aria-level={isMasterCategory ? 1 : 2}
      aria-expanded={isMasterCategory ? !isCollapsed : isRowExpanded}
      onClick={onClickRow}
    >
      {/* Margin Left */}
      <div
        className="budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li"
        aria-hidden="true"
      />

      {/* Collapse/Expand chevron */}
      <div
        className="budget-table-cell-collapse budget-table-row-li"
        role="cell"
        aria-colindex={2}
      >
        {canExpand ? (
          <button
            className="js-budget-table-cell-collapse button-none"
            type="button"
            aria-label={isCollapsed ? "Expand category group" : "Collapse category group"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
          >
            <YnabIcon
              name={isCollapsed ? "chevron_right" : "chevron_down"}
              width={10}
              height={10}
            />
          </button>
        ) : (
          <span className="cell-placeholder">&nbsp;</span>
        )}
      </div>

      {/* Checkbox */}
      <div
        className="budget-table-cell-checkbox budget-table-row-li"
        role="cell"
        aria-colindex={1}
      >
        <button
          className={`ynab-checkbox ynab-checkbox-button ${
            isChecked ? "is-checked" : isPartiallyChecked ? "is-partial" : ""
          }`}
          role="checkbox"
          aria-checked={isChecked ? "true" : isPartiallyChecked ? "mixed" : "false"}
          aria-label={category.name}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck?.(e);
          }}
        >
          {isPartiallyChecked ? (
            <svg
              className="ynab-new-icon ynab-checkbox-button-square is-partial"
              width="13"
              height="13"
              viewBox="0 0 13 13"
            >
              <rect x="2.5" y="5.5" width="8" height="2" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <YnabIcon
              name="check"
              width={13}
              height={13}
              className={`ynab-checkbox-button-square ${isChecked ? "is-checked" : ""}`}
            />
          )}
        </button>
      </div>

      {/* Name & Target Details */}
      <div
        className="budget-table-cell-name budget-table-row-li"
        role="rowheader"
        aria-colindex={3}
      >
        {isMasterCategory ? (
          <>
            <button
              className="button budget-table-cell-button budget-table-cell-edit-category user-data"
              title={category.name}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditCategory?.();
              }}
            >
              {category.name}
            </button>
            {onOpenAddSubCategory && (
              <button
                className="button budget-table-cell-add-category budget-table-cell-button"
                aria-label="Add Category"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddSubCategory();
                }}
              >
                <YnabIcon name="plus_circle_fill" width={14} height={14} />
              </button>
            )}
          </>
        ) : isRowExpanded ? (
          <div className="budget-table-cell-button budget-table-cell-edit-category user-data">
            <div className="budget-table-cell-edit-category-label js-budget-table-cell-edit-category-label">
              <div className="budget-table-cell-goal-nowrap">
                <button
                  type="button"
                  title={category.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCategory?.();
                  }}
                >
                  {category.name}
                </button>
                {fundingMessageTopline && (
                  <>
                    <div className="budget-table-cell-goal-gap" />
                    <div className="budget-table-cell-goal-status">
                      {fundingMessageTopline}
                    </div>
                  </>
                )}
              </div>
              {fundingMessageDetails && (
                <div className="budget-table-cell-goal-status-details">
                  {fundingMessageDetails}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            className="button budget-table-cell-name-row-label-item budget-table-cell-button budget-table-cell-edit-category user-data"
            title={category.name}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditCategory?.();
            }}
          >
            {category.name}
          </button>
        )}
      </div>

      {/* Budgeted / Assigned */}
      <div
        className="budget-table-cell-budgeted budget-table-row-li"
        role="cell"
        aria-colindex={4}
      >
        {isMasterCategory ? (
          <button className="button-none user-data currency tabular-nums" disabled>
            {formatMilliunits(budgetedMilliunits, { currencyCode })}
          </button>
        ) : isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="currency-input ynab-new-currency-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => void handleCommitEdit()}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className="button-none ynab-new-budget-available-number user-data currency tabular-nums"
            onClick={handleStartEdit}
          >
            {formatMilliunits(budgetedMilliunits, { currencyCode })}
          </button>
        )}
      </div>

      {/* Activity */}
      <div
        className="budget-table-cell-activity budget-table-cell-flexed budget-table-row-li"
        role="cell"
        aria-colindex={5}
      >
        <button
          type="button"
          className={`button-none user-data currency tabular-nums ${
            activityMilliunits < 0
              ? "negative"
              : activityMilliunits > 0
              ? "positive"
              : "zero"
          }`}
          title="View Activity"
        >
          {formatMilliunits(activityMilliunits, { currencyCode })}
        </button>
      </div>

      {/* Available */}
      <div
        className="budget-table-cell-available budget-table-row-li"
        role="cell"
        aria-colindex={6}
      >
        <button
          type="button"
          className={`ynab-new-budget-available-number js-budget-available-number user-data ${availableClass}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isMasterCategory && onOpenMoveMoney) {
              const rect = e.currentTarget.getBoundingClientRect();
              onOpenMoveMoney(rect);
            }
          }}
        >
          <span className={`user-data currency tabular-nums ${availableClass}`}>
            {formatMilliunits(availableMilliunits, { currencyCode })}
          </span>
        </button>
      </div>

      {/* Margin Right */}
      <div
        className="budget-table-cell-margin-right budget-table-row-li"
        aria-hidden="true"
      />
    </div>
  );
};
