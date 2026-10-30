import React, { useState, useEffect, useRef } from "react";
import { YnabIcon } from "../common/YnabIcon";

export interface MonthPickerPopoverProps {
  isOpen: boolean;
  activeMonth: string; // "YYYY-MM" or "YYYY-MM-01"
  onSelectMonth: (month: string) => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
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

export const MonthPickerPopover: React.FC<MonthPickerPopoverProps> = ({
  isOpen,
  activeMonth,
  onSelectMonth,
  onClose,
  triggerRef,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const parts = activeMonth.split("-");
  const initialYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const [displayedYear, setDisplayedYear] = useState<number>(initialYear);

  useEffect(() => {
    const p = activeMonth.split("-");
    const y = parseInt(p[0], 10);
    if (!isNaN(y)) {
      setDisplayedYear(y);
    }
  }, [activeMonth]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const now = new Date();
  const currentRealYear = now.getFullYear();
  const currentRealMonth = now.getMonth(); // 0-based

  const selectedYear = parseInt(parts[0], 10);
  const selectedMonthIdx = parseInt(parts[1], 10) - 1; // 0-based

  return (
    <div
      ref={popoverRef}
      className="month-picker-popover-card"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10005,
        width: "16.5rem",
        height: "auto",
        backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
        borderRadius: "10px",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.22)",
        border: "1px solid var(--separatorStandard, #d2d8de)",
        padding: "0.75rem",
        color: "var(--labelPrimary, #191818)",
        boxSizing: "border-box",
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ynab-calendar" style={{ width: "100%", height: "auto" }}>
        <div className="month-picker" style={{ width: "100%", height: "auto" }}>
          <div
            className="month-picker-years"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "0 0 0.6rem 0",
              padding: "0 0 0.45rem 0",
              borderBottom: "1px solid var(--separatorStandard, #edf1f5)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              className="ghost-button primary is-icon-only type-body month-picker-nav-button"
              onClick={() => setDisplayedYear((y) => y - 1)}
              aria-label="Previous Year"
              title="Previous Year"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <YnabIcon name="chevron_left_circle" size={20} />
            </button>
            <span
              className="month-picker-selected-year"
              style={{ fontWeight: 700, fontSize: "1.05rem" }}
            >
              {displayedYear}
            </span>
            <button
              type="button"
              className="ghost-button primary is-icon-only type-body month-picker-nav-button"
              onClick={() => setDisplayedYear((y) => y + 1)}
              aria-label="Next Year"
              title="Next Year"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <YnabIcon name="chevron_right_circle" size={20} />
            </button>
          </div>

          <div
            className="month-picker-months"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "6px",
              width: "100%",
              height: "auto",
              margin: 0,
              padding: 0,
              boxSizing: "border-box",
            }}
          >
            {MONTH_NAMES.map((name, idx) => {
              const isSelected =
                displayedYear === selectedYear && idx === selectedMonthIdx;
              const isCurrent =
                displayedYear === currentRealYear && idx === currentRealMonth;

              const monthIso = `${displayedYear}-${String(idx + 1).padStart(2, "0")}-01`;

              return (
                <button
                  type="button"
                  key={name}
                  className={`month-picker-months-item ${
                    isSelected ? "is-selected" : ""
                  } ${isCurrent ? "is-current-month" : ""}`.trim()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMonth(monthIso);
                    onClose();
                  }}
                  style={{
                    width: "100%",
                    height: "36px",
                    margin: 0,
                    padding: 0,
                    float: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: isSelected
                      ? "2px solid #545bfe"
                      : isCurrent
                        ? "1px solid #545bfe"
                        : "1px solid var(--separatorLight, #edf1f5)",
                    borderRadius: "6px",
                    backgroundColor: isSelected
                      ? "#545bfe"
                      : isCurrent
                        ? "var(--alphaSPBlurple40015, #f1f1ff)"
                        : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : isCurrent
                        ? "#545bfe"
                        : "var(--labelPrimary, #191818)",
                    fontWeight: isSelected || isCurrent ? 700 : 500,
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    transition: "all 0.1s ease",
                    boxSizing: "border-box",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
