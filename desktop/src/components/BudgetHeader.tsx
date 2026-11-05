import React from "react";
import { YnabIcon } from "./common/YnabIcon";
import { formatMilliunits } from "../utils/currency";

export interface BudgetHeaderProps {
  currentMonthIso: string; // YYYY-MM-01
  readyToAssignMilliunits: number;
  monthNote?: string;
  isFirstMonth?: boolean;
  isLastMonth?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker: () => void;
  onOpenMonthNote: () => void;
  onOpenReadyToAssignBreakdown: () => void;
  onOpenAutoAssignPopover: () => void;
  onOpenShareModal?: () => void;
  currencyCode?: string;
}

export const BudgetHeader: React.FC<BudgetHeaderProps> = ({
  currentMonthIso,
  readyToAssignMilliunits,
  monthNote,
  isFirstMonth = false,
  isLastMonth = false,
  onPrevMonth,
  onNextMonth,
  onOpenMonthPicker,
  onOpenMonthNote,
  onOpenReadyToAssignBreakdown,
  onOpenAutoAssignPopover,
  onOpenShareModal,
  currencyCode = "USD",
}) => {
  const isPositive = readyToAssignMilliunits > 0;
  const isNegative = readyToAssignMilliunits < 0;

  const formattedMonth = React.useMemo(() => {
    try {
      const parts = currentMonthIso.split("-");
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return currentMonthIso;
    }
  }, [currentMonthIso]);

  const formattedAmount = formatMilliunits(readyToAssignMilliunits, { currencyCode });

  return (
    <header
      className={`budget-header ${
        isNegative ? "left-to-budget-is-negative" : "left-to-budget-is-positive"
      }`}
    >
      <div className="budget-header-flexbox">
        {/* Calendar Prev / Current / Next */}
        <div className="budget-header-item budget-header-calendar">
          <button
            disabled={isFirstMonth}
            className={`budget-header-calendar-prev ${isFirstMonth ? "disabled" : ""}`}
            aria-label="previous month budget"
            type="button"
            onClick={onPrevMonth}
          >
            <YnabIcon name="chevron_left_circle" width={30} height={30} />
          </button>

          <div className="budget-header-calendar-date">
            <button
              className="budget-header-calendar-date-button"
              type="button"
              onClick={onOpenMonthPicker}
            >
              {formattedMonth}
              <YnabIcon name="caret_down" width={12} height={12} />
            </button>

            <button
              className="budget-header-calendar-note user-data"
              title={monthNote || ""}
              type="button"
              onClick={onOpenMonthNote}
            >
              {monthNote && monthNote.trim() ? monthNote : "Enter a note..."}
            </button>
          </div>

          <button
            disabled={isLastMonth}
            className={`budget-header-calendar-next ${isLastMonth ? "disabled" : ""}`}
            aria-label="next month budget"
            type="button"
            onClick={onNextMonth}
          >
            <YnabIcon name="chevron_right_circle" width={30} height={30} />
          </button>
        </div>

        {/* Ready to Assign (Totals) */}
        <div
          className={`budget-header-item budget-header-totals ${
            isNegative ? "is-negative" : ""
          }`}
        >
          <div
            className={`to-be-budgeted ${isPositive ? "is-positive" : ""} ${
              isNegative ? "is-negative" : ""
            }`}
          >
            <div className="to-be-budgeted-heading-wrapper">
              <h1 id="ready-to-assign-heading">
                <button
                  type="button"
                  className="to-be-budgeted-amount-button"
                  onClick={onOpenReadyToAssignBreakdown}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    textAlign: "inherit",
                    color: "inherit",
                  }}
                >
                  <div className="to-be-budgeted-amount">
                    <span
                      className={`user-data currency tabular-nums ${
                        isPositive ? "positive" : isNegative ? "negative" : "zero"
                      }`}
                    >
                      {formattedAmount}
                    </span>
                    <YnabIcon name="info_circle_fill" width={16} height={16} />
                  </div>
                </button>
                <div className="to-be-budgeted-label">
                  Ready to Assign
                </div>
              </h1>
              <button
                className="to-be-budgeted-view-breakdown"
                aria-label="View Ready to Assign Breakdown"
                type="button"
                onClick={onOpenReadyToAssignBreakdown}
              />
            </div>

            <button
              className="to-be-budgeted-auto-assign to-be-budgeted-button"
              aria-label="Assign"
              aria-describedby="ready-to-assign-heading"
              type="button"
              onClick={onOpenAutoAssignPopover}
            >
              <span className="label">Assign</span>
              <YnabIcon name="caret_down" width={16} height={16} />
            </button>
          </div>
        </div>

        {/* Share Budget Button */}
        {onOpenShareModal && (
          <div className="budget-header-item budget-header-share">
            <button
              className="ynab-button budget-header-share-button"
              type="button"
              onClick={onOpenShareModal}
            >
              <YnabIcon name="add_user" width={16} height={16} />
              <span>Share</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
