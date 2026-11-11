import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ViewFilterOptions {
  selectedRange: string; // 'latest3months' | 'thismonth' | 'lastmonth' | 'thisyear' | 'lastyear' | 'alldates' | 'custom'
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
  { id: 'latest3months', name: 'Latest 3 Months' },
  { id: 'thismonth', name: 'This Month' },
  { id: 'lastmonth', name: 'Last Month' },
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
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...filters });
    }
  }, [isOpen, filters]);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Delay adding click listener to avoid immediately closing on the trigger click
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

  // Calculate position: right align with trigger, 8px below
  const top = triggerRect.bottom + 8;
  const right = Math.max(16, window.innerWidth - triggerRect.right);

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear - 3,
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  const handlePresetSelect = (id: string) => {
    setDraft((prev) => ({ ...prev, selectedRange: id }));
  };

  const handleApply = () => {
    onApply(draft);
  };

  return createPortal(
    <div
      className="modal-overlay active"
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
        className="modal modal-generic modal-account-view-options is-rendered active"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: `${top}px`,
          right: `${right}px`,
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          color: 'var(--labelPrimary, #1b1d48)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.2), 0 3px 8px rgba(0,0,0,0.12)',
          borderRadius: '0.5rem',
          padding: '1rem',
          width: '26rem',
          maxWidth: '90vw',
          zIndex: 10002,
        }}
      >
        <div
          className="modal-header"
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'var(--labelPrimary, #1b1d48)',
          }}
        >
          View Options
        </div>

        <div className="modal-content" style={{ padding: 0 }}>
          {/* Preset Date Range Pills */}
          <div className="date-range">
            <ul
              className="date-range-dates"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.375rem',
                margin: '0.375rem 0',
                padding: 0,
                listStyle: 'none',
              }}
            >
              {PRESET_RANGES.map((preset) => {
                const isActive = draft.selectedRange === preset.id;
                return (
                  <li
                    key={preset.id}
                    className={`${preset.id} ${isActive ? 'active' : ''}`}
                    style={{ listStyle: 'none', margin: 0, padding: 0 }}
                  >
                    <button
                      type="button"
                      className="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        backgroundColor: isActive
                          ? 'var(--actionPrimary, #545bfe)'
                          : 'var(--backgroundSecondaryElevated, #edf1f5)',
                        color: isActive
                          ? '#ffffff'
                          : 'var(--actionPrimary, #545bfe)',
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                    >
                      {preset.name}
                    </button>
                  </li>
                );
              })}
            </ul>

            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                margin: '0.75rem 0',
              }}
            />

            {/* Custom From / To Date Selectors */}
            <ul
              className="date-range-from-to"
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.375rem',
                margin: 0,
                padding: '0.25rem 0 0.5rem',
                listStyle: 'none',
                fontSize: '0.8125rem',
              }}
            >
              <li className="date-range-from-label label" style={{ fontWeight: 600 }}>
                From:&nbsp;
              </li>
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
                  style={{
                    height: '1.75rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--inputBorder, #c8cad6)',
                    borderRadius: '0.25rem',
                    backgroundColor: 'var(--backgroundPrimary, #ffffff)',
                    padding: '0 0.5rem',
                  }}
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
                  style={{
                    height: '1.75rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--inputBorder, #c8cad6)',
                    borderRadius: '0.25rem',
                    backgroundColor: 'var(--backgroundPrimary, #ffffff)',
                    padding: '0 0.5rem',
                  }}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </li>

              <li
                className="date-range-to-label label"
                style={{ marginLeft: '0.5rem', fontWeight: 600 }}
              >
                To:&nbsp;
              </li>
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
                  style={{
                    height: '1.75rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--inputBorder, #c8cad6)',
                    borderRadius: '0.25rem',
                    backgroundColor: 'var(--backgroundPrimary, #ffffff)',
                    padding: '0 0.5rem',
                  }}
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
                  style={{
                    height: '1.75rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--inputBorder, #c8cad6)',
                    borderRadius: '0.25rem',
                    backgroundColor: 'var(--backgroundPrimary, #ffffff)',
                    padding: '0 0.5rem',
                  }}
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

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
              margin: '0.75rem 0',
            }}
          />

          {/* Visibility Checkboxes */}
          <ul
            className="modal-account-view-options-status"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '0.25rem 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <li>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={draft.showReconciled}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, showReconciled: e.target.checked }))
                  }
                  style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
                />
                <span>Show Reconciled Transactions</span>
              </label>
            </li>

            {canViewRunningBalance && (
              <li>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draft.showRunningBalance}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        showRunningBalance: e.target.checked,
                      }))
                    }
                    style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
                  />
                  <span>Show Running Balance</span>
                </label>
              </li>
            )}

            <li>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={draft.showFlags}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, showFlags: e.target.checked }))
                  }
                  style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
                />
                <span>Show Flags</span>
              </label>
            </li>

            <li>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={draft.showImages}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, showImages: e.target.checked }))
                  }
                  style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
                />
                <span>Show Images</span>
              </label>
            </li>
          </ul>
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
            marginTop: '0.75rem',
          }}
        >
          <button
            className="button button-cancel"
            type="button"
            onClick={onCancel}
            style={{
              height: '1.75rem',
              padding: '0 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: '0.25rem',
              border: '1px solid var(--actionPrimary, #545bfe)',
              backgroundColor: '#ffffff',
              color: 'var(--actionPrimary, #545bfe)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={handleApply}
            style={{
              height: '1.75rem',
              padding: '0 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: '0.25rem',
              border: 'none',
              backgroundColor: 'var(--actionPrimary, #545bfe)',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ViewOptionsPopover;