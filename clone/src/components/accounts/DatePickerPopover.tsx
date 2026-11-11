import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';

export interface DatePickerPopoverProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  selectedDate: string; // ISO format: YYYY-MM-DD
  onSelectDate: (dateIso: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function DatePickerPopover({
  isOpen,
  triggerRect,
  selectedDate,
  onSelectDate,
  onClose,
}: DatePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState<number>(validInitialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validInitialDate.getMonth());

  useEffect(() => {
    if (isOpen && selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [isOpen, selectedDate]);

  // Click outside and Escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !triggerRect) return null;

  // Position below trigger
  const top = triggerRect.bottom + 6;
  const left = Math.max(16, Math.min(triggerRect.left, window.innerWidth - 280));

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build grid calendar days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonthToday =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDateNum = today.getDate();

  let selectedDayNum: number | null = null;
  if (selectedDate) {
    const s = new Date(selectedDate);
    if (s.getFullYear() === viewYear && s.getMonth() === viewMonth) {
      selectedDayNum = s.getDate();
    }
  }

  const handleDayClick = (dayNum: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const iso = `${viewYear}-${mm}-${dd}`;
    onSelectDate(iso);
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay active js-ynab-new-calendar-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        pointerEvents: 'auto',
        backgroundColor: 'transparent',
      }}
    >
      <div
        ref={popoverRef}
        className="modal modal-generic modal-account-calendar active is-rendered"
        role="dialog"
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
          width: '16.5rem',
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          color: 'var(--labelPrimary, #1b1d48)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          zIndex: 10002,
        }}
      >
        <div className="accounts-calendar">
          {/* Header with Month/Year and Prev/Next buttons */}
          <ul className="accounts-calendar-date">
            <li className="accounts-calendar-prev">
              <button
                type="button"
                className="button"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
              >
                <Icon name="chevron_left_circle" width={22} height={22} />
              </button>
            </li>
            <li
              className="accounts-calendar-selected-date"
              style={{ fontWeight: 600, fontSize: '0.9375rem' }}
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </li>
            <li className="accounts-calendar-next">
              <button
                type="button"
                className="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
              >
                <Icon name="chevron_right_circle" width={22} height={22} />
              </button>
            </li>
          </ul>

          {/* Weekday headers */}
          <ul className="accounts-calendar-weekdays">
            {WEEKDAYS.map((wd) => (
              <li key={wd} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {wd}
              </li>
            ))}
          </ul>

          {/* Dates Grid */}
          <ul className="accounts-calendar-grid">
            {/* Blank offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <li key={`empty-${i}`} className="accounts-calendar-empty" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = dayNum === selectedDayNum;
              const isToday = isCurrentMonthToday && dayNum === todayDateNum;

              return (
                <li
                  key={`day-${dayNum}`}
                  className={`accounts-calendar-day ${
                    isSelected ? 'accounts-calendar-day-selected' : ''
                  } ${isToday && !isSelected ? 'accounts-calendar-day-today' : ''}`}
                  onClick={() => handleDayClick(dayNum)}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: isSelected || isToday ? 600 : 400,
                  }}
                >
                  {dayNum}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DatePickerPopover;