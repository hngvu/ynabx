import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { SubCategoryItem } from './budgetData';
import { calculateCategoryTargetStatus } from './categoryTargetStatus';

export interface BudgetSubCategoryRowProps {
  category: SubCategoryItem;
  isSelected?: boolean;
  isLast?: boolean;
  onSelectRow?: (catId: string) => void;
  onUpdateAssigned?: (catId: string, newAssigned: number) => void;
  onOpenActivityModal?: (catId: string) => void;
  onOpenEditCategory?: (category: {
    id: string;
    name: string;
    isMasterCategory?: boolean;
    canDelete?: boolean;
    canRename?: boolean;
    isCreditCardPaymentCategory?: boolean;
  }, triggerRect: DOMRect) => void;
  showProgressBars?: boolean;
}

export function BudgetSubCategoryRow({
  category,
  isSelected = false,
  isLast = false,
  onSelectRow,
  onUpdateAssigned,
  onOpenActivityModal,
  onOpenEditCategory,
  showProgressBars = true,
}: BudgetSubCategoryRowProps) {
  const [isEditingAssigned, setIsEditingAssigned] = useState(false);
  const [assignedInput, setAssignedInput] = useState(
    ((category.assigned ?? 0) / 1000).toFixed(2)
  );

  const available = category.available ?? 0;
  const isZeroAvailable = available === 0;
  const isPositiveAvailable = available > 0;
  const isNegativeAvailable = available < 0;

  const targetStatus = calculateCategoryTargetStatus(
    category.assigned ?? 0,
    category.activity ?? 0,
    available,
    category.target,
    category.isDebtPayment ?? false
  );

  const handleCommitAssigned = () => {
    setIsEditingAssigned(false);
    const parsed = parseFloat(assignedInput || '0');
    const milliunits = Math.round(parsed * 1000);
    onUpdateAssigned?.(category.entityId, milliunits);
  };

  const formattedAssigned = ((category.assigned ?? 0) / 1000).toFixed(2);
  const formattedActivity = ((Math.abs(category.activity ?? 0)) / 1000).toFixed(2);
  const activitySign = (category.activity ?? 0) < 0 ? '-' : (category.activity ?? 0) > 0 ? '+' : '';
  const formattedAvailable = ((Math.abs(available)) / 1000).toFixed(2);
  const availableSign = available < 0 ? '-' : '';

  const triggerEdit = (rect: DOMRect) => {
    onOpenEditCategory?.({
      id: category.entityId,
      name: category.name,
      isMasterCategory: false,
      canDelete: !category.isDebtPayment,
      canRename: !category.isDebtPayment,
      isCreditCardPaymentCategory: category.isDebtPayment,
    }, rect);
  };

  return (
    <div
      className={`budget-table-row js-budget-table-row budget-table-row-ul is-sub-category ${
        category.isDebtPayment ? 'is-debt-payment-category' : ''
      } ${isLast ? 'budget-table-last-row' : ''} ${isSelected ? 'is-checked' : ''}`}
      role="row"
      data-entity-id={category.entityId}
      aria-level={2}
      aria-expanded="true"
      onContextMenu={(e) => {
        e.preventDefault();
        triggerEdit(e.currentTarget.getBoundingClientRect());
      }}
    >
      <div className="budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li" aria-hidden="true">
        &nbsp;
      </div>
      <div className="budget-table-cell-collapse budget-table-row-li" role="cell" aria-colindex={2}>
        &nbsp;
      </div>
      <div className="budget-table-cell-checkbox budget-table-row-li" role="cell" aria-colindex={1}>
        <button
          className={`ynab-checkbox ynab-checkbox-button ${isSelected ? 'is-checked' : ''}`}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={category.name}
          type="button"
          onClick={() => onSelectRow?.(category.entityId)}
        >
          <Icon className="ynab-checkbox-button-square" name="check" width={13} height={13} />
        </button>
      </div>

      {/* Category Name Column */}
      <div className="budget-table-cell-name budget-table-row-li" role="rowheader" aria-colindex={3}>
        {showProgressBars ? (
          /* EXPANDED (with progress bar) */
          <div
            className="budget-table-cell-button budget-table-cell-edit-category user-data"
            onClick={(e) => {
              if (isSelected) {
                triggerEdit(e.currentTarget.getBoundingClientRect());
              } else {
                onSelectRow?.(category.entityId);
              }
            }}
          >
            <div className="budget-table-cell-edit-category-label js-budget-table-cell-edit-category-label">
              <div className="budget-table-cell-goal-nowrap">
                <button
                  title={category.name}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected) {
                      triggerEdit(e.currentTarget.getBoundingClientRect());
                    } else {
                      onSelectRow?.(category.entityId);
                    }
                  }}
                >
                  {category.name}
                </button>
                {targetStatus.hasTarget && !category.isDebtPayment && (
                  <>
                    <div className="budget-table-cell-goal-gap" />
                    <div
                      className="budget-table-cell-goal-status"
                      dangerouslySetInnerHTML={{ __html: targetStatus.toplineHtml }}
                    />
                  </>
                )}
              </div>
              {targetStatus.hasTarget && !category.isDebtPayment && targetStatus.detailsHtml && (
                <div
                  className="budget-table-cell-goal-status-details"
                  dangerouslySetInnerHTML={{ __html: targetStatus.detailsHtml }}
                />
              )}
            </div>

            {targetStatus.barSections.length > 0 && (
              <figure className="ynab-new-budget-bar-v2" role="group">
                {targetStatus.barSections.map((sec, secIdx) => (
                  <div
                    key={secIdx}
                    className={`ynab-new-budget-bar-v2-section ${sec.classNames}`}
                    style={{ flexBasis: '100%' }}
                  >
                    {sec.segments.map((seg, segIdx) => (
                      <div
                        key={segIdx}
                        className={`ynab-new-budget-bar-v2-segment ${seg.classNames}`}
                        style={{
                          width: seg.style.replace('width: ', '').replace(';', ''),
                        }}
                      />
                    ))}
                  </div>
                ))}
              </figure>
            )}
          </div>
        ) : (
          /* COMPACT (Progress Bars Off - exact match from Ember decompiled AST) */
          <button
            className="button budget-table-cell-name-row-label-item budget-table-cell-button budget-table-cell-edit-category user-data"
            title={category.name}
            type="button"
            onClick={(e) => {
              if (isSelected) {
                triggerEdit(e.currentTarget.getBoundingClientRect());
              } else {
                onSelectRow?.(category.entityId);
              }
            }}
          >
            {category.name}
          </button>
        )}
      </div>

      {/* Assigned Input */}
      <div className="budget-table-cell-budgeted budget-table-row-li" role="cell" aria-colindex={4}>
        <div className={`ynab-new-currency-input ${isEditingAssigned ? 'is-editing' : ''}`}>
          <button
            tabIndex={-1}
            className="button-calculator"
            aria-hidden="true"
            type="button"
            onClick={() => setIsEditingAssigned(true)}
          >
            <Icon name="calculator" width={12} height={12} />
          </button>
          <div className="input-wrapper">
            {isEditingAssigned ? (
              <input
                className="ember-text-field ember-view"
                type="text"
                autoFocus
                value={assignedInput}
                onChange={(e) => setAssignedInput(e.target.value)}
                onBlur={handleCommitAssigned}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitAssigned();
                  if (e.key === 'Escape') setIsEditingAssigned(false);
                }}
              />
            ) : (
              <button
                className={`user-data currency tabular-nums ${category.assigned === 0 ? 'zero' : ''}`}
                type="button"
                onClick={() => setIsEditingAssigned(true)}
              >
                ${formattedAssigned}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Button */}
      <div className="budget-table-cell-activity budget-table-cell-flexed budget-table-row-li" role="cell" aria-colindex={5}>
        <button
          className={`user-data currency tabular-nums ${category.activity === 0 ? 'zero' : ''}`}
          type="button"
          onClick={() => onOpenActivityModal?.(category.entityId)}
        >
          {activitySign}${formattedActivity}
        </button>
      </div>

      {/* Available Pill */}
      <div className="budget-table-cell-available budget-table-row-li" role="cell" aria-colindex={6}>
        {category.isDebtPayment && (
          <button
            className="budget-table-cell-available-payment"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Icon name="question_mark_circle" width={12} height={12} />
            &nbsp;Payment
          </button>
        )}
        <span
          className={`ynab-new-budget-available-number user-data ${
            isPositiveAvailable
              ? 'positive'
              : isNegativeAvailable
              ? 'negative'
              : 'zero'
          }`}
        >
          <button
            className="user-data currency tabular-nums"
            type="button"
            onClick={() => onSelectRow?.(category.entityId)}
          >
            {availableSign}${formattedAvailable}
          </button>
        </span>
      </div>

      <div className="budget-table-cell-margin-right budget-table-row-li" aria-hidden="true">
        &nbsp;
      </div>
    </div>
  );
}
