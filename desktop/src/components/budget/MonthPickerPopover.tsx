import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { calculatePopoverPosition } from '../../utils/popoverPosition';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface MonthPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  currentMonth: number; // 0-11
  currentYear: number;
  onSelectMonth: (month: number, year: number) => void;
}

export function MonthPickerPopover({
  isOpen,
  onClose,
  triggerRect,
  currentMonth,
  currentYear,
  onSelectMonth,
}: MonthPickerPopoverProps) {
  const [viewYear, setViewYear] = useState(currentYear);
  const today = new Date();

  if (!isOpen || !triggerRect) return null;

  const modalWidth = 260;
  const modalHeight = 220;
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'up',
    horizontalAlign: 'center',
  });

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-calendar"
      style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'block' }}
      onClick={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          margin: 0,
          opacity: 1,
          width: `${modalWidth}px`,
          backgroundColor: 'var(--modalBackground, #ffffff)',
          boxShadow: 'var(--modalShadow, 0 8px 24px rgba(0,0,0,0.18))',
          borderRadius: '0.5rem',
          padding: '0.75rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          {/* Year Navigation */}
          <div
            className="month-picker-years"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              padding: '0 0.25rem',
            }}
          >
            <button
              type="button"
              className="month-picker-prev-year button button-link"
              style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px' }}
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Previous Year"
            >
              <Icon name="chevron_left_circle" width={22} height={22} />
            </button>
            <span
              className="month-picker-selected-year"
              style={{ fontWeight: 600, fontSize: '15px', color: 'var(--labelPrimary)' }}
            >
              {viewYear}
            </span>
            <button
              type="button"
              className="month-picker-next-year button button-link"
              style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px' }}
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="Next Year"
            >
              <Icon name="chevron_right_circle" width={22} height={22} />
            </button>
          </div>

          {/* 12-Month Grid */}
          <div
            className="month-picker-months"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.375rem',
            }}
          >
            {MONTH_NAMES.map((name, idx) => {
              const isSelected = idx === currentMonth && viewYear === currentYear;
              const isCurrent = idx === today.getMonth() && viewYear === today.getFullYear();
              return (
                <button
                  key={idx}
                  type="button"
                  className={`month-picker-months-item ${isSelected ? 'is-selected' : ''} ${
                    isCurrent ? 'is-current-month' : ''
                  }`}
                  style={{
                    padding: '0.5rem 0',
                    borderRadius: '0.25rem',
                    border: isCurrent && !isSelected ? '1px solid var(--accentColor, #3b82f6)' : 'none',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '13px',
                    backgroundColor: isSelected
                      ? 'var(--buttonPrimaryBackground, #2563eb)'
                      : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--labelPrimary)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={() => {
                    onSelectMonth(idx, viewYear);
                    onClose();
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Arrow */}
        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            left: pos.arrowLeft,
            bottom: '100%',
            height: '0.9375rem',
            width: '1.875rem',
            position: 'absolute',
          }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" fill="var(--modalBackground, #ffffff)" />
        </svg>
      </div>
    </div>,
    document.body
  );
}

export default MonthPickerPopover;
