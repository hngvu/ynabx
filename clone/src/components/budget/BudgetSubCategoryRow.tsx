import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../core/Icon';
import { SubCategoryItem } from './budgetData';
import { calculateCategoryTargetStatus } from './categoryTargetStatus';
import { calculateAssignedExpression } from '../../utils/calculator';

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
  const [showCalculatorPopup, setShowCalculatorPopup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currencyInputContainerRef = useRef<HTMLDivElement>(null);

  // Sync assigned input when category.assigned changes outside
  useEffect(() => {
    if (!isEditingAssigned) {
      setAssignedInput(((category.assigned ?? 0) / 1000).toFixed(2));
    }
  }, [category.assigned, isEditingAssigned]);

  // Close calculator popup on click outside
  useEffect(() => {
    if (!showCalculatorPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        currencyInputContainerRef.current &&
        !currencyInputContainerRef.current.contains(e.target as Node)
      ) {
        setShowCalculatorPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalculatorPopup]);

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

  const currentAssignedDollars = (category.assigned ?? 0) / 1000;

  const handleCommitAssigned = () => {
    setIsEditingAssigned(false);
    setShowCalculatorPopup(false);
    const calculated = calculateAssignedExpression(assignedInput, currentAssignedDollars);
    if (calculated !== null && !isNaN(calculated)) {
      const milliunits = Math.round(calculated * 1000);
      onUpdateAssigned?.(category.entityId, milliunits);
      setAssignedInput((calculated).toFixed(2));
    } else {
      setAssignedInput(currentAssignedDollars.toFixed(2));
    }
  };

  const handleCalculatorOperatorClick = (op: string) => {
    setIsEditingAssigned(true);
    setAssignedInput((prev) => {
      const trimmed = prev.trim();
      // Replace last operator if already ending in operator
      if (/[+\-*/%^]$/.test(trimmed)) {
        return trimmed.slice(0, -1) + op;
      }
      return trimmed + op;
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
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
          <Icon
            className={`ynab-checkbox-button-square ${isSelected ? 'is-checked' : ''}`}
            name="check"
            width={13}
            height={13}
            style={isSelected ? { color: '#ffffff', fill: '#ffffff' } : undefined}
          />
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
        <div
          ref={currencyInputContainerRef}
          className={`ynab-new-currency-input ${isEditingAssigned ? 'is-editing is-focused' : ''}`}
          style={{ position: 'relative' }}
        >
          <button
            tabIndex={-1}
            className="button-calculator"
            aria-hidden="true"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingAssigned(true);
              setShowCalculatorPopup((prev) => !prev);
              setTimeout(() => inputRef.current?.focus(), 10);
            }}
          >
            <svg
              className="icon-calculator"
              viewBox="0 0 16 16"
              focusable="false"
            >
              <title>Open Calculator</title>
              <desc>Clicking this button will open the calculator</desc>
              <path d="M 3.75 0C 4.02612 0 4.25 0.223862 4.25 0.5L 4.25 2.75L 6.5 2.75C 6.77612 2.75 7 2.97386 7 3.25L 7 3.75C 7 4.02614 6.77612 4.25 6.5 4.25L 4.25 4.25L 4.25 6.5C 4.25 6.77614 4.02612 7 3.75 7L 3.25 7C 2.97388 7 2.75 6.77614 2.75 6.5L 2.75 4.25L 0.5 4.25C 0.223877 4.25 0 4.02614 0 3.75L 0 3.25C 0 2.97386 0.223877 2.75 0.5 2.75L 2.75 2.75L 2.75 0.5C 2.75 0.223862 2.97388 0 3.25 0L 3.75 0ZM 9 3.25C 9 2.97386 9.22388 2.75 9.5 2.75L 15.5 2.75C 15.7761 2.75 16 2.97386 16 3.25L 16 3.75C 16 4.02614 15.7761 4.25 15.5 4.25L 9.5 4.25C 9.22388 4.25 9 4.02614 9 3.75L 9 3.25ZM 12.5001 11C 13.0524 11 13.5001 10.5523 13.5001 10C 13.5001 9.44771 13.0524 9 12.5001 9C 11.9478 9 11.5001 9.44771 11.5001 10C 11.5001 10.5523 11.9478 11 12.5001 11ZM 12.5001 16C 13.0524 16 13.5001 15.5523 13.5001 15C 13.5001 14.4477 13.0524 14 12.5001 14C 11.9478 14 11.5001 14.4477 11.5001 15C 11.5001 15.5523 11.9478 16 12.5001 16ZM 9.00006 12.25C 9.00006 11.9739 9.22394 11.75 9.50006 11.75L 15.5001 11.75C 15.7762 11.75 16.0001 11.9739 16.0001 12.25L 16.0001 12.75C 16.0001 13.0261 15.7762 13.25 15.5001 13.25L 9.50006 13.25C 9.22394 13.25 9.00006 13.0261 9.00006 12.75L 9.00006 12.25ZM 6.15167 10.2019C 6.34698 10.3972 6.34698 10.7137 6.15167 10.909L 4.56073 12.5L 6.15173 14.091C 6.34698 14.2863 6.34698 14.6028 6.15173 14.7981L 5.79816 15.1517C 5.60291 15.3469 5.28632 15.3469 5.09106 15.1517L 3.50006 13.5606L 1.90906 15.1516C 1.71381 15.3469 1.39722 15.3469 1.20197 15.1516L 0.848389 14.7981C 0.653137 14.6028 0.653137 14.2862 0.848389 14.091L 2.43939 12.5L 0.84845 10.909C 0.653198 10.7137 0.653198 10.3972 0.84845 10.2019L 1.20197 9.84834C 1.39728 9.65309 1.71381 9.65309 1.90912 9.84834L 3.50006 11.4393L 5.09106 9.84834C 5.28632 9.65308 5.60291 9.65308 5.79816 9.84834L 6.15167 10.2019Z" />
            </svg>
          </button>
          <div className="input-wrapper">
            {isEditingAssigned ? (
              <input
                ref={inputRef}
                className="ember-text-field ember-view"
                type="text"
                autoFocus
                value={assignedInput}
                onChange={(e) => setAssignedInput(e.target.value)}
                onBlur={handleCommitAssigned}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitAssigned();
                  if (e.key === 'Escape') {
                    setIsEditingAssigned(false);
                    setShowCalculatorPopup(false);
                    setAssignedInput(currentAssignedDollars.toFixed(2));
                  }
                }}
              />
            ) : (
              <button
                className={`user-data currency tabular-nums ${category.assigned === 0 ? 'zero' : ''}`}
                type="button"
                onClick={() => {
                  setIsEditingAssigned(true);
                  setTimeout(() => inputRef.current?.select(), 10);
                }}
              >
                ${formattedAssigned}
              </button>
            )}
          </div>

          {/* Calculator Popover (Buttons: +, -, *, /) */}
          {showCalculatorPopup && (
            <div
              className="ynab-u modal-popup modal-calculator"
              style={{
                position: 'absolute',
                top: 'calc(100% + 5px)',
                left: 0,
                zIndex: 100,
              }}
            >
              <div className="ynab-new-calculator" style={{ position: 'relative' }}>
                <button
                  type="button"
                  data-operator="+"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCalculatorOperatorClick('+');
                  }}
                >
                  <svg viewBox="0 0 10 10">
                    <title>plus</title>
                    <path d="M 5.8408 0L 5.8408 4.0796L 9.71144 4.0796L 9.71144 5.9005L 5.8408 5.9005L 5.8408 10L 3.85075 10L 3.85075 5.9005L 0 5.9005L 0 4.0796L 3.85075 4.0796L 3.85075 0L 5.8408 0Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  data-operator="-"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCalculatorOperatorClick('-');
                  }}
                >
                  <svg viewBox="0 0 10 3">
                    <title>minus</title>
                    <path d="M 0 0L 10 0L 10 2.15783L 0 2.15783L 0 0Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  data-operator="*"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCalculatorOperatorClick('*');
                  }}
                >
                  <svg viewBox="0 0 10 10">
                    <title>multiply</title>
                    <path d="M 9.83033 1.39979L 6.38388 4.84624L 10 8.45175L 8.61082 9.81973L 5.0053 6.22481L 1.38918 9.84093L 0 8.47296L 3.62672 4.84624L 0.159067 1.37858L 1.53765 0L 5.0053 3.46766L 8.44114 0.0212091L 9.83033 1.39979Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  data-operator="/"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCalculatorOperatorClick('/');
                  }}
                >
                  <svg viewBox="0 0 10 10">
                    <title>divide</title>
                    <path d="M 0 4.09674L 9.63475 4.09674L 9.63475 5.90326L 0 5.90326L 0 4.09674ZM 3.31688 1.49062C 3.31688 1.28661 3.35308 1.09246 3.42547 0.908194C 3.50444 0.723922 3.60974 0.565976 3.74136 0.434353C 3.87298 0.302731 4.03093 0.197433 4.2152 0.11846C 4.39947 0.0394867 4.59691 0 4.8075 0C 5.01152 0 5.20566 0.0394867 5.38993 0.11846C 5.5742 0.197433 5.73215 0.302731 5.86377 0.434353C 6.00197 0.565976 6.11056 0.723922 6.18954 0.908194C 6.26851 1.09246 6.308 1.28661 6.308 1.49062C 6.308 1.70122 6.26851 1.89865 6.18954 2.08292C 6.11056 2.26061 6.00197 2.41527 5.86377 2.54689C 5.73215 2.67851 5.5742 2.78381 5.38993 2.86278C 5.20566 2.93518 5.01152 2.97137 4.8075 2.97137C 4.59691 2.97137 4.39947 2.93518 4.2152 2.86278C 4.03093 2.78381 3.87298 2.67851 3.74136 2.54689C 3.60974 2.41527 3.50444 2.26061 3.42547 2.08292C 3.35308 1.89865 3.31688 1.70122 3.31688 1.49062ZM 3.31688 8.51925C 3.31688 8.31523 3.35308 8.12109 3.42547 7.93682C 3.50444 7.75255 3.60974 7.5946 3.74136 7.46298C 3.87298 7.33136 4.03093 7.22606 4.2152 7.14709C 4.39947 7.06811 4.59691 7.02863 4.8075 7.02863C 5.01152 7.02863 5.20566 7.06811 5.38993 7.14709C 5.5742 7.22606 5.73215 7.33136 5.86377 7.46298C 6.00197 7.5946 6.11056 7.75255 6.18954 7.93682C 6.26851 8.12109 6.308 8.31523 6.308 8.51925C 6.308 8.72984 6.26851 8.92728 6.18954 9.11155C 6.11056 9.28924 6.00197 9.4439 5.86377 9.57552C 5.73215 9.70714 5.5742 9.81244 5.38993 9.89141C 5.20566 9.9638 5.01152 10 4.8075 10C 4.59691 10 4.39947 9.9638 4.2152 9.89141C 4.03093 9.81244 3.87298 9.70714 3.74136 9.57552C 3.60974 9.4439 3.50444 9.28924 3.42547 9.11155C 3.35308 8.92728 3.31688 8.72984 3.31688 8.51925Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Button */}
      <div className="budget-table-cell-activity budget-table-cell-flexed budget-table-row-li" role="cell" aria-colindex={5}>
        <button
          className="budget-table-cell-category-moves js-budget-toolbar-open-category-moves"
          aria-hidden="true"
          tabIndex={-1}
          type="button"
        >
          <div className="category-moves-moves-icon-wrapper">
            <Icon name="clock_arrow_back" width={14} height={14} />
          </div>
        </button>
        <button
          className={`budget-number user-data ${category.activity === 0 ? 'zero' : ''}`}
          type="button"
          onClick={() => onOpenActivityModal?.(category.entityId)}
        >
          <span className={`user-data currency tabular-nums ${category.activity === 0 ? 'zero' : ''}`}>
            <bdi>{activitySign}$</bdi>
            {formattedActivity}
          </span>
        </button>
      </div>

      {/* Available Pill */}
      <div className="budget-table-cell-available budget-table-row-li" role="cell" aria-colindex={6}>
        <button
          className={`ynab-new-budget-available-number js-budget-available-number user-data ${
            isPositiveAvailable
              ? 'positive'
              : isNegativeAvailable
              ? 'negative'
              : 'zero'
          }`}
          type="button"
          onClick={() => onSelectRow?.(category.entityId)}
        >
          {availableSign}${formattedAvailable}
        </button>
      </div>

      <div className="budget-table-cell-margin-right budget-table-row-li" aria-hidden="true">
        &nbsp;
      </div>
    </div>
  );
}
