import React from 'react';
import { Icon } from '../core/Icon';

export interface BudgetHeaderProps {
  currentMonthName: string;
  note?: string;
  readyToAssignMilliunits: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker: () => void;
  onOpenNote: () => void;
  onAddMember?: () => void;
  onOpenBreakdown?: () => void;
  onAutoAssign?: () => void;
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

  const formattedAmount = (Math.abs(readyToAssignMilliunits) / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

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
              onClick={onOpenMonthPicker}
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
          <div className="to-be-budgeted">
            <div className="to-be-budgeted-heading-wrapper">
              <h1>
                <div className="to-be-budgeted-amount">
                  <span className={`user-data currency tabular-nums ${isZero ? 'zero' : isPositive ? 'positive' : 'negative'}`}>
                    <bdi>{isNegative ? '-' : ''}$</bdi>
                    {(Math.abs(readyToAssignMilliunits) / 1000).toFixed(2)}
                  </span>
                  <Icon name="info_circle_fill" width={16} />
                </div>
                <div className="to-be-budgeted-label">
                  {isNegative ? 'Overbudgeted' : isZero ? 'All Money Assigned' : 'Ready to Assign'}
                </div>
              </h1>
              <button
                className="to-be-budgeted-view-breakdown"
                aria-label="View Ready to Assign Breakdown"
                type="button"
                onClick={onOpenBreakdown}
              />
            </div>
            <button
              className="to-be-budgeted-auto-assign to-be-budgeted-icon"
              disabled={isZero}
              aria-label={isZero ? 'All Money Assigned' : 'Auto-Assign'}
              type="button"
              onClick={onAutoAssign}
            >
              <span className="label" />
              <Icon name={isZero ? 'check_circle_fill' : 'lightning_fill'} width={16} />
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
