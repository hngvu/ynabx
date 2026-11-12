import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import {
  KeyboardShortcut,
  keyboardShortcutsService,
  KBShortcutResult,
} from '../../services/keyboardShortcuts';

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

  // Click outside handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Ember-faithful DatePicker Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const target = {};

    const formatIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const getCurrentOrSelectedDate = () => {
      const d = selectedDate ? new Date(selectedDate) : new Date();
      return isNaN(d.getTime()) ? new Date() : d;
    };

    const adjustDays = (days: number) => {
      const cur = getCurrentOrSelectedDate();
      cur.setDate(cur.getDate() + days);
      onSelectDate(formatIso(cur));
      return KBShortcutResult.Success;
    };

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.CloseModal,
      target,
      (e) => {
        e.stopOtherShortcuts();
        onClose();
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerOneDayForward,
      target,
      (e) => {
        e.stopOtherShortcuts();
        return adjustDays(1);
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerOneDayBackward,
      target,
      (e) => {
        e.stopOtherShortcuts();
        return adjustDays(-1);
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerOneWeekForward,
      target,
      (e) => {
        e.stopOtherShortcuts();
        return adjustDays(7);
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerOneWeekBackward,
      target,
      (e) => {
        e.stopOtherShortcuts();
        return adjustDays(-7);
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerToday,
      target,
      (e) => {
        e.stopOtherShortcuts();
        onSelectDate(formatIso(new Date()));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerFirstDayOfMonth,
      target,
      (e) => {
        e.stopOtherShortcuts();
        const d = new Date(viewYear, viewMonth, 1);
        onSelectDate(formatIso(d));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerLastDayOfMonth,
      target,
      (e) => {
        e.stopOtherShortcuts();
        const d = new Date(viewYear, viewMonth + 1, 0);
        onSelectDate(formatIso(d));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerFirstDayOfYear,
      target,
      (e) => {
        e.stopOtherShortcuts();
        const d = new Date(viewYear, 0, 1);
        onSelectDate(formatIso(d));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DatePickerLastDayOfYear,
      target,
      (e) => {
        e.stopOtherShortcuts();
        const d = new Date(viewYear, 11, 31);
        onSelectDate(formatIso(d));
        return KBShortcutResult.Success;
      }
    );

    return () => {
      keyboardShortcutsService.removeAllShortcutsForTarget(target);
    };
  }, [isOpen, selectedDate, viewYear, viewMonth, onSelectDate, onClose]);

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
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const days: { day: number; currentMonth: boolean; dateIso: string }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    days.push({
      day: d,
      currentMonth: false,
      dateIso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const m = viewMonth + 1;
    days.push({
      day: i,
      currentMonth: true,
      dateIso: `${viewYear}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }

  // Next month leading days to complete full weeks
  const totalSlots = Math.ceil(days.length / 7) * 7;
  const remaining = totalSlots - days.length;
  for (let i = 1; i <= remaining; i++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    days.push({
      day: i,
      currentMonth: false,
      dateIso: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }

  const todayIso = new Date().toISOString().split('T')[0];

  return createPortal(
    <div
      ref={popoverRef}
      className="ynab-date-picker-popover"
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 10050,
      }}
    >
      <div className="date-picker-header">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={handlePrevMonth}
          title="Previous Month"
        >
          <Icon name="arrow_left" width={14} height={14} />
        </button>
        <span className="month-year-label">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={handleNextMonth}
          title="Next Month"
        >
          <Icon name="arrow_right" width={14} height={14} />
        </button>
      </div>

      <div className="date-picker-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w} className="weekday-header">
            {w}
          </span>
        ))}
      </div>

      <div className="date-picker-days-grid">
        {days.map((item, idx) => {
          const isSelected = item.dateIso === selectedDate;
          const isToday = item.dateIso === todayIso;

          return (
            <button
              key={idx}
              type="button"
              className={`calendar-day-btn ${!item.currentMonth ? 'other-month' : ''} ${
                isSelected ? 'selected' : ''
              } ${isToday ? 'today' : ''}`}
              onClick={() => {
                onSelectDate(item.dateIso);
                onClose();
              }}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      <div className="date-picker-footer">
        <button
          type="button"
          className="button-link date-picker-today-btn"
          onClick={() => {
            onSelectDate(todayIso);
            onClose();
          }}
        >
          Today
        </button>
      </div>
    </div>,
    document.body
  );
}
