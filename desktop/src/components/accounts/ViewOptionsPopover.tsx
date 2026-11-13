import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';

export interface ViewFilterOptions {
  selectedRange: string; // 'thismonth' | 'lastmonth' | 'latest3months' | 'thisyear' | 'lastyear' | 'alldates' | 'custom'
  fromMonth: number; // 0-11
  fromYear: number;
  toMonth: number;
  toYear: number;
  showReconciled: boolean;
  showScheduled: boolean;
  showRunningBalance: boolean;
  showFlags: boolean;
  showImages: boolean;
}

export interface ViewOptionsPopoverProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  filters: ViewFilterOptions;
  canViewRunningBalance?: boolean;
  onApply: (filters: ViewFilterOptions) => void;
  onCancel: () => void;
}

const PRESET_RANGES = [
  { id: 'thismonth', name: 'This Month' },
  { id: 'lastmonth', name: 'Last Month' },
  { id: 'latest3months', name: 'Latest 3 Months' },
  { id: 'thisyear', name: 'This Year' },
  { id: 'lastyear', name: 'Last Year' },
  { id: 'alldates', name: 'All Dates' },
];

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

export function ViewOptionsPopover({
  isOpen,
  triggerRect,
  filters,
  canViewRunningBalance = true,
  onApply,
  onCancel,
}: ViewOptionsPopoverProps) {
  const [draft, setDraft] = useState<ViewFilterOptions>({ ...filters });
  const [modalPos, setModalPos] = useState<{ left: number; top: number; arrowLeft: number }>({
    left: 0,
    top: 0,
    arrowLeft: 0,
  });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...filters });
    }
  }, [isOpen, filters]);

  // Compute position relative to triggerRect matching Ember B2 Modal positioning
  useEffect(() => {
    if (!isOpen || !triggerRect) return;

    const modalEl = modalRef.current;
    const modalWidth = modalEl ? modalEl.offsetWidth : 540;
    const arrowSize = 15;
    const windowMargin = 10;
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;

    // By default, center modal under trigger: c - e.width / 2
    let x = triggerCenterX - modalWidth / 2;
    const y = triggerRect.bottom + arrowSize;

    // Clamp inside viewport matching Ember B2 positionModal
    const winWidth = window.innerWidth;
    if (x < windowMargin) {
      x = windowMargin;
    } else if (x + modalWidth > winWidth - windowMargin) {
      x = Math.max(windowMargin, winWidth - modalWidth - windowMargin);
    }

    // Arrow position relative to modal: triggerCenterX - modalX - arrowSize
    const arrowLeft = triggerCenterX - x - arrowSize;

    setModalPos({ left: x, top: y, arrowLeft });
  }, [isOpen, triggerRect]);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onCancel();
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
  }, [isOpen, onCancel]);

  if (!isOpen || !triggerRect) return null;

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear - 3,
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  const handlePresetSelect = (presetId: string) => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let fromMonth = curMonth;
    let fromYear = curYear;
    let toMonth = curMonth;
    let toYear = curYear;

    switch (presetId) {
      case 'thismonth':
        fromMonth = curMonth;
        fromYear = curYear;
        toMonth = curMonth;
        toYear = curYear;
        break;
      case 'lastmonth': {
        const lastM = new Date(curYear, curMonth - 1, 1);
        fromMonth = lastM.getMonth();
        fromYear = lastM.getFullYear();
        toMonth = lastM.getMonth();
        toYear = lastM.getFullYear();
        break;
      }
      case 'latest3months': {
        const m3 = new Date(curYear, curMonth - 2, 1);
        fromMonth = m3.getMonth();
        fromYear = m3.getFullYear();
        toMonth = curMonth;
        toYear = curYear;
        break;
      }
      case 'thisyear':
        fromMonth = 0;
        fromYear = curYear;
        toMonth = 11;
        toYear = curYear;
        break;
      case 'lastyear':
        fromMonth = 0;
        fromYear = curYear - 1;
        toMonth = 11;
        toYear = curYear - 1;
        break;
      case 'alldates':
      default:
        fromMonth = 0;
        fromYear = curYear - 3;
        toMonth = 11;
        toYear = curYear + 1;
        break;
    }

    setDraft((prev) => ({
      ...prev,
      selectedRange: presetId,
      fromMonth,
      fromYear,
      toMonth,
      toYear,
    }));
  };

  const handleApply = () => {
    onApply(draft);
  };

  return createPortal(
    <div
      className="ynab-u modal-overlay modal-generic modal-account-view-options active"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        pointerEvents: 'auto',
      }}
    >
      <div
        ref={modalRef}
        className="modal is-rendered active"
        role="dialog"
        aria-modal="true"
        style={{
          left: `${modalPos.left}px`,
          top: `${modalPos.top}px`,
          opacity: 1,
          transform: 'scale(1)',
        }}
      >
        {/* Modal Up Arrow matching Ember B2 Modal */}
        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            bottom: '100%',
            left: `${modalPos.arrowLeft}px`,
            width: '1.875rem',
            height: '0.9375rem',
          }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" />
        </svg>

        {/* Modal Header */}
        <div className="modal-header">View Options</div>

        {/* Modal Content */}
        <div className="modal-content">
          <div className="date-range">
            {/* Preset Date Range Pills */}
            <ul className="date-range-dates">
              {PRESET_RANGES.map((preset) => {
                const isActive = draft.selectedRange === preset.id;
                return (
                  <li key={preset.id} className={`${preset.id} ${isActive ? 'active' : ''}`}>
                    <button
                      type="button"
                      className="button"
                      onClick={() => handlePresetSelect(preset.id)}
                    >
                      {preset.name}
                    </button>
                  </li>
                );
              })}
            </ul>

            <hr />

            {/* Custom From / To Date Selectors */}
            <ul className="date-range-from-to">
              <li className="date-range-from-label label">From:&nbsp;</li>
              <li className="date-range-from-months">
                <select
                  value={draft.fromMonth}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      fromMonth: parseInt(e.target.value, 10),
                      selectedRange: 'custom',
                    }))
                  }
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </li>
              <li className="date-range-from-years">
                <select
                  value={draft.fromYear}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      fromYear: parseInt(e.target.value, 10),
                      selectedRange: 'custom',
                    }))
                  }
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </li>

              <li className="date-range-to-label label">To:&nbsp;</li>
              <li className="date-range-to-months">
                <select
                  value={draft.toMonth}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      toMonth: parseInt(e.target.value, 10),
                      selectedRange: 'custom',
                    }))
                  }
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </li>
              <li className="date-range-to-years">
                <select
                  value={draft.toYear}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      toYear: parseInt(e.target.value, 10),
                      selectedRange: 'custom',
                    }))
                  }
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </li>
            </ul>
          </div>

          <hr />

          {/* Visibility Checkboxes */}
          <ul className="modal-account-view-options-status">
            <li>
              <button
                className={`ynab-checkbox ynab-checkbox-button modal-account-view-options-show-reconciled ${
                  draft.showReconciled ? 'is-checked' : ''
                }`}
                role="checkbox"
                aria-checked={draft.showReconciled ? 'true' : 'false'}
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, showReconciled: !prev.showReconciled }))
                }
              >
                <Icon
                  className={`ynab-checkbox-button-square ${
                    draft.showReconciled ? 'is-checked' : ''
                  }`}
                  name="check"
                  width={13}
                  height={13}
                  style={draft.showReconciled ? { color: '#ffffff', fill: '#ffffff' } : undefined}
                />
                <div className="label-checkbox" title="Show Reconciled Transactions">
                  Show Reconciled Transactions
                </div>
              </button>
            </li>

            {canViewRunningBalance && (
              <li>
                <button
                  className={`ynab-checkbox ynab-checkbox-button modal-account-view-options-show-running-balance ${
                    draft.showRunningBalance ? 'is-checked' : ''
                  }`}
                  role="checkbox"
                  aria-checked={draft.showRunningBalance ? 'true' : 'false'}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      showRunningBalance: !prev.showRunningBalance,
                    }))
                  }
                >
                  <Icon
                    className={`ynab-checkbox-button-square ${
                      draft.showRunningBalance ? 'is-checked' : ''
                    }`}
                    name="check"
                    width={13}
                    height={13}
                    style={
                      draft.showRunningBalance ? { color: '#ffffff', fill: '#ffffff' } : undefined
                    }
                  />
                  <div className="label-checkbox" title="Show Running Balance">
                    Show Running Balance
                  </div>
                </button>
              </li>
            )}

            <li>
              <button
                className={`ynab-checkbox ynab-checkbox-button modal-account-view-options-show-flag ${
                  draft.showFlags ? 'is-checked' : ''
                }`}
                role="checkbox"
                aria-checked={draft.showFlags ? 'true' : 'false'}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, showFlags: !prev.showFlags }))}
              >
                <Icon
                  className={`ynab-checkbox-button-square ${draft.showFlags ? 'is-checked' : ''}`}
                  name="check"
                  width={13}
                  height={13}
                  style={draft.showFlags ? { color: '#ffffff', fill: '#ffffff' } : undefined}
                />
                <div className="label-checkbox" title="Show Flags">
                  Show Flags
                </div>
              </button>
            </li>

            <li>
              <button
                className={`ynab-checkbox ynab-checkbox-button modal-account-view-options-show-image ${
                  draft.showImages ? 'is-checked' : ''
                }`}
                role="checkbox"
                aria-checked={draft.showImages ? 'true' : 'false'}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, showImages: !prev.showImages }))}
              >
                <Icon
                  className={`ynab-checkbox-button-square ${draft.showImages ? 'is-checked' : ''}`}
                  name="check"
                  width={13}
                  height={13}
                  style={draft.showImages ? { color: '#ffffff', fill: '#ffffff' } : undefined}
                />
                <div className="label-checkbox" title="Show Images">
                  Show Images
                </div>
              </button>
            </li>
          </ul>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button className="ynab-button secondary button-cancel" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="ynab-button primary" type="button" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ViewOptionsPopover;
