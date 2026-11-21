import React from 'react';
import { Icon } from '../core/Icon';
import { computeToBeBudgetedState } from '../../services/slikBudgetEngine';
import { formatAmountNumber } from './categoryTargetStatus';

export interface BudgetHeaderProps {
  currentMonthName: string;
  note?: string;
  readyToAssignMilliunits: number;
  cashAvailableMilliunits?: number;
  isFtueOnboardingShown?: boolean;
  isOnFtueAssignOrLater?: boolean;
  isNotViewingCurrentMonth?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday?: () => void;
  onOpenMonthPicker: (triggerRect: DOMRect) => void;
  onOpenNote: (triggerRect?: DOMRect) => void;
  onAddMember?: () => void;
  onOpenBreakdown?: (triggerRect: DOMRect) => void;
  onAutoAssign?: (triggerRect?: DOMRect) => void;
  onOpenOverdraftArticle?: () => void;
  onOpenAddAccount?: () => void;
}

export function BudgetHeader({
  currentMonthName,
  note = '',
  readyToAssignMilliunits,
  cashAvailableMilliunits = Number.MAX_SAFE_INTEGER,
  isFtueOnboardingShown = false,
  isOnFtueAssignOrLater = true,
  isNotViewingCurrentMonth = false,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onOpenMonthPicker,
  onOpenNote,
  onAddMember,
  onOpenBreakdown,
  onAutoAssign,
  onOpenOverdraftArticle,
  onOpenAddAccount,
}: BudgetHeaderProps) {
  const isNegative = readyToAssignMilliunits < 0;
  const isZero = readyToAssignMilliunits === 0;
  const isPositive = readyToAssignMilliunits > 0;
  const isNotYetReadyToAssign = isFtueOnboardingShown && !isOnFtueAssignOrLater;

  const rtaState = computeToBeBudgetedState({
    leftToBudget: readyToAssignMilliunits,
    cashAvailable: cashAvailableMilliunits,
    isFtueOnboardingShown,
    isOnFtueAssignOrLater,
  });

  const handleRtaAction = (rect: DOMRect) => {
    if (!rtaState.action) return;
    if (rtaState.action === 'openAddAccountModal') {
      onOpenAddAccount?.();
    } else if (rtaState.action === 'openOverdraftArticle') {
      if (onOpenOverdraftArticle) {
        onOpenOverdraftArticle();
      } else {
        window.open('https://support.ynab.com/en_us/getting-out-of-overdraft-in-ynab-a-guide-B1blkysC9', '_blank', 'noopener,noreferrer');
      }
    } else {
      onAutoAssign?.(rect);
    }
  };

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
              onClick={(e) => onOpenNote(e.currentTarget.getBoundingClientRect())}
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
          {isNotViewingCurrentMonth && onGoToToday && (
            <button
              className="button budget-header-go-to-today secondary"
              type="button"
              onClick={onGoToToday}
            >
              Today
            </button>
          )}
        </div>

        {/* Ready to Assign (Totals) */}
        <div className={`budget-header-item budget-header-totals ${isNegative ? 'is-negative' : ''}`}>
          <div className={`to-be-budgeted ${isPositive ? 'is-positive' : ''} ${isNegative ? 'is-negative' : ''}`}>
            <div className="to-be-budgeted-heading-wrapper">
              <h1
                id="budget-header-rta-heading"
                className={isNotYetReadyToAssign ? 'is-disabled' : ''}
                style={{ cursor: isNotYetReadyToAssign ? 'default' : 'pointer' }}
                onClick={(e) => {
                  if (!isNotYetReadyToAssign) {
                    onOpenBreakdown?.(e.currentTarget.getBoundingClientRect());
                  }
                }}
              >
                <div className="to-be-budgeted-amount">
                  <span className={`user-data currency tabular-nums ${isZero ? 'zero' : isPositive ? 'positive' : 'negative'}`}>
                    <bdi>{isNegative ? '-' : ''}$</bdi>
                    {formatAmountNumber(readyToAssignMilliunits)}
                  </span>
                  <Icon name="info_circle_fill" width={16} />
                </div>
                <div className="to-be-budgeted-label">
                  {rtaState.label}
                </div>
              </h1>
              <button
                className="to-be-budgeted-view-breakdown"
                disabled={isNotYetReadyToAssign}
                aria-label="View Ready to Assign Breakdown"
                type="button"
                onClick={(e) => {
                  if (!isNotYetReadyToAssign) {
                    onOpenBreakdown?.(e.currentTarget.getBoundingClientRect());
                  }
                }}
              />
            </div>
            {!rtaState.buttonHidden && (
              <button
                className={`to-be-budgeted-auto-assign ${rtaState.buttonClass}`}
                disabled={!rtaState.action}
                aria-label={rtaState.buttonLabel || rtaState.label}
                type="button"
                onClick={(e) => handleRtaAction(e.currentTarget.getBoundingClientRect())}
              >
                <span className="label">{rtaState.buttonLabel}</span>
                {rtaState.icon && (
                  <Icon
                    name={rtaState.icon}
                    width={rtaState.icon === 'caret_down' ? 8 : 16}
                    height={rtaState.icon === 'caret_down' ? 8 : 16}
                    aria-hidden="true"
                  />
                )}
              </button>
            )}
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
