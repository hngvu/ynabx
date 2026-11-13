import React from 'react';
import { Icon } from '../core/Icon';

export interface BudgetHeaderProps {
  currentMonthName: string;
  note?: string;
  readyToAssignMilliunits: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker: (triggerRect: DOMRect) => void;
  onOpenNote: () => void;
  onAddMember?: () => void;
  onOpenBreakdown?: (triggerRect: DOMRect) => void;
  onAutoAssign?: (triggerRect?: DOMRect) => void;
}

export function BudgetHeader({
  currentMonthName,
  note = '',
  readyToAssignMilliunits,
  onPrevMonth,
  onNextMonth,
  onOpenMonthPicker,
  onOpenNote,
  onAddMember,
  onOpenBreakdown,
  onAutoAssign,
}: BudgetHeaderProps) {
  const isNegative = readyToAssignMilliunits < 0;
  const isZero = readyToAssignMilliunits === 0;
  const isPositive = readyToAssignMilliunits > 0;

  // Determine rtaState matching Ember class Sz & bz dictionary:
  // - readyToAssign (RTA > 0): label "Ready to Assign", buttonLabel "Assign", icon "caret_down", buttonClass "to-be-budgeted-button"
  // - allMoneyAssigned (RTA == 0): label "All Money Assigned", icon "check_circle_fill", buttonLabel null, buttonClass "to-be-budgeted-icon", disabled
  // - overassigned (RTA < 0): label "You assigned more than you have", buttonLabel "Fix This", buttonClass "to-be-budgeted-button"
  const rtaLabel = isNegative
    ? 'You assigned more than you have'
    : isZero
    ? 'All Money Assigned'
    : 'Ready to Assign';

  const buttonLabel = isNegative ? 'Fix This' : isZero ? null : 'Assign';
  const buttonClass = isZero ? 'to-be-budgeted-icon' : 'to-be-budgeted-button';
  const buttonIcon = isNegative ? null : isZero ? 'check_circle_fill' : 'caret_down';

  return (
    <header className={`budget-header ${isNegative ? 'left-to-budget-is-negative' : 'left-to-budget-is-positive'}`}>
      <div className="budget-header-flexbox">
        {/* Calendar Nav */}
        <div className="budget-header-item budget-header-calendar">
          <button
            className="budget-header-calendar-prev"
            aria-label="previous month budget"
            type="button"
            onClick={onPrevMonth}
          >
            <Icon name="chevron_left_circle" width={30} />
          </button>
          <div className="budget-header-calendar-date">
            <button
              className="budget-header-calendar-date-button"
              type="button"
              onClick={(e) => onOpenMonthPicker(e.currentTarget.getBoundingClientRect())}
            >
              {currentMonthName}
              <Icon name="caret_down" width={12} />
            </button>
            <button
              className="budget-header-calendar-note user-data"
              title={note}
              type="button"
              onClick={onOpenNote}
            >
              {note || 'Enter a note...'}
            </button>
          </div>
          <button
            className="budget-header-calendar-next"
            aria-label="next month budget"
            type="button"
            onClick={onNextMonth}
          >
            <Icon name="chevron_right_circle" width={30} />
          </button>
        </div>

        {/* Ready to Assign (Totals) */}
        <div className={`budget-header-item budget-header-totals ${isNegative ? 'is-negative' : ''}`}>
          <div className={`to-be-budgeted ${isPositive ? 'is-positive' : ''} ${isNegative ? 'is-negative' : ''}`}>
            <div className="to-be-budgeted-heading-wrapper">
              <h1 id="budget-header-rta-heading" style={{ cursor: 'pointer' }} onClick={(e) => onOpenBreakdown?.(e.currentTarget.getBoundingClientRect())}>
                <div className="to-be-budgeted-amount">
                  <span className={`user-data currency tabular-nums ${isZero ? 'zero' : isPositive ? 'positive' : 'negative'}`}>
                    <bdi>{isNegative ? '-' : ''}$</bdi>
                    {(Math.abs(readyToAssignMilliunits) / 1000).toFixed(2)}
                  </span>
                  <Icon name="info_circle_fill" width={16} />
                </div>
                <div className="to-be-budgeted-label">
                  {rtaLabel}
                </div>
              </h1>
              <button
                className="to-be-budgeted-view-breakdown"
                aria-label="View Ready to Assign Breakdown"
                type="button"
                onClick={(e) => onOpenBreakdown?.(e.currentTarget.getBoundingClientRect())}
              />
            </div>
            <button
              className={`to-be-budgeted-auto-assign ${buttonClass}`}
              disabled={isZero}
              aria-label={buttonLabel || rtaLabel}
              type="button"
              onClick={(e) => onAutoAssign?.(e.currentTarget.getBoundingClientRect())}
            >
              <span className="label">{buttonLabel}</span>
              {buttonIcon && (
                <Icon
                  name={buttonIcon}
                  width={isZero ? 16 : 8}
                  height={isZero ? 16 : 8}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        {/* Share Button */}
        <div className="budget-header-item budget-header-share">
          <button
            className="ynab-button budget-header-share-button"
            type="button"
            onClick={onAddMember}
          >
            <Icon name="add_user" width={16} />
            Add Member
          </button>
        </div>
      </div>
    </header>
  );
}

export default BudgetHeader;
