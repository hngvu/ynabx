import React, { useState, useEffect, useRef } from "react";
import { YnabIcon } from "../common/YnabIcon";

export interface TransactionDatePickerPopoverProps {
  isOpen: boolean;
  selectedDate: string; // "YYYY-MM-DD"
  anchorPosition?: {
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null;
  onSelectDate: (dateIso: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const REPEAT_OPTIONS = [
  { value: "Never", label: "Never" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "EveryOtherWeek", label: "Every other week" },
  { value: "TwiceAMonth", label: "Twice a month" },
  { value: "Every4Weeks", label: "Every 4 weeks" },
  { value: "Monthly", label: "Monthly" },
  { value: "EveryOtherMonth", label: "Every other month" },
  { value: "Every3Months", label: "Every 3 months" },
  { value: "Every4Months", label: "Every 4 months" },
  { value: "TwiceAYear", label: "Twice a year" },
  { value: "Yearly", label: "Yearly" },
  { value: "EveryOtherYear", label: "Every other year" },
];

export const TransactionDatePickerPopover: React.FC<TransactionDatePickerPopoverProps> = ({
  isOpen,
  selectedDate,
  anchorPosition,
  onSelectDate,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  // Parse initial year and month from selectedDate
  const parseDate = (dStr: string) => {
    const parts = (dStr || "").split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-based
    return {
      year: isNaN(y) ? now.getFullYear() : y,
      month: isNaN(m) ? now.getMonth() : m,
    };
  };

  const initial = parseDate(selectedDate);
  const [viewYear, setViewYear] = useState<number>(initial.year);
  const [viewMonth, setViewMonth] = useState<number>(initial.month);
  const [repeat, setRepeat] = useState<string>("Never");

  useEffect(() => {
    if (isOpen) {
      const p = parseDate(selectedDate);
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build grid days
  const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const emptyPrefix = Array.from({ length: firstDayWeekday });
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return {
      day,
      iso: `${viewYear}-${mm}-${dd}`,
    };
  });

  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Anchor & arrow positioning
  const modalWidth = 240; // 15rem
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const anchorTop =
    anchorPosition?.bottom ?? (anchorPosition ? anchorPosition.top + 28 : 300);
  const anchorLeft = anchorPosition?.left ?? 100;
  const anchorWidth = anchorPosition?.width ?? 100;

  const topPos = anchorTop + 6;
  const leftPos = Math.max(
    16,
    Math.min(windowWidth - modalWidth - 16, anchorLeft),
  );
  const anchorCenter = anchorLeft + anchorWidth / 2;
  const arrowLeft = Math.max(
    16,
    Math.min(modalWidth - 46, anchorCenter - leftPos - 15),
  );

  return (
    <div
      className="modal-overlay active modal-account-calendar js-ynab-new-calendar-overlay popover-anchor-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        backgroundColor: "transparent",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        pointerEvents: "auto",
        display: "block",
      }}
      onClick={onClose}
    >
      <div
        ref={popoverRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: `${topPos}px`,
          left: `${leftPos}px`,
          width: "15rem",
          height: "auto",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="js-ynab-modal-scrollable-area" style={{ overflow: "visible" }}>
          <div className="accounts-calendar">
            {/* Header: Prev, Selected Month, Next */}
            <ul className="accounts-calendar-date">
              <li className="accounts-calendar-prev">
                <button
                  className="ghost-button primary is-icon-only type-body"
                  aria-label="Previous month"
                  type="button"
                  onClick={handlePrevMonth}
                >
                  <YnabIcon name="chevron_left_circle" size={24} />
                </button>
              </li>
              <li className="accounts-calendar-selected-date">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </li>
              <li className="accounts-calendar-next">
                <button
                  className="ghost-button primary is-icon-only type-body"
                  aria-label="Next month"
                  type="button"
                  onClick={handleNextMonth}
                >
                  <YnabIcon name="chevron_right_circle" size={24} />
                </button>
              </li>
            </ul>

            {/* Weekdays */}
            <ul className="accounts-calendar-weekdays">
              {WEEKDAYS.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>

            {/* Grid */}
            <ul className="accounts-calendar-grid">
              {emptyPrefix.map((_, i) => (
                <li
                  key={`empty-${i}`}
                  className="accounts-calendar-empty"
                  data-date=""
                >
                  &nbsp;
                </li>
              ))}
              {days.map((d) => {
                const isSelected = d.iso === selectedDate;
                const isToday = d.iso === todayIso;
                return (
                  <li
                    key={d.iso}
                    className={`accounts-calendar-day ${
                      isSelected ? "accounts-calendar-day-selected" : ""
                    } ${isToday ? "accounts-calendar-day-today" : ""}`}
                    data-date={d.iso}
                    onClick={() => {
                      onSelectDate(d.iso);
                      onClose();
                    }}
                  >
                    {d.day}
                  </li>
                );
              })}
            </ul>

            {/* Repeat Select */}
            <div className="modal-actions">
              <label>Repeat:</label>
              <div className="x-select-container">
                <select
                  className="js-x-select"
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                >
                  {REPEAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Arrow */}
        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            left: `${arrowLeft}px`,
            bottom: "100%",
            height: "0.9375rem",
            width: "1.875rem",
          }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z"></path>
        </svg>
      </div>
    </div>
  );
};
