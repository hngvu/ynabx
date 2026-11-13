import React, { useState } from 'react';
import { TimeframePreset, TimeframeState, MONTH_NAMES } from '../reflectDataEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  timeframeState: TimeframeState;
  onSelectPreset: (preset: TimeframePreset) => void;
  onApplyCustom: (startYear: number, startMonth: number, endYear: number, endMonth: number) => void;
}

export const TimeframeDropdownModal: React.FC<Props> = ({
  isOpen,
  onClose,
  timeframeState,
  onSelectPreset,
  onApplyCustom,
}) => {
  const [isCustomMode, setIsCustomMode] = useState<boolean>(timeframeState.preset === 'custom');
  const [fromMonth, setFromMonth] = useState<number>(timeframeState.startMonth);
  const [fromYear, setFromYear] = useState<number>(timeframeState.startYear);
  const [toMonth, setToMonth] = useState<number>(timeframeState.endMonth);
  const [toYear, setToYear] = useState<number>(timeframeState.endYear);

  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [toDropdownOpen, setToDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const presets: { id: TimeframePreset; name: string }[] = [
    { id: 'thisMonth', name: 'This Month' },
    { id: 'latest3Months', name: 'Latest 3 Months' },
    { id: 'latest6Months', name: 'Latest 6 Months' },
    { id: 'latest12Months', name: 'Latest 12 Months' },
    { id: 'thisYear', name: 'This Year' },
    { id: 'lastYear', name: 'Last Year' },
    { id: 'allDates', name: 'All Dates' },
  ];

  const yearsAvailable = [2024, 2025, 2026];

  const handlePresetClick = (preset: TimeframePreset) => {
    setIsCustomMode(false);
    onSelectPreset(preset);
    onClose();
  };

  const handleApplyCustom = () => {
    onApplyCustom(fromYear, fromMonth, toYear, toMonth);
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className="pure-u modal-generic modal-reports-timeframe"
        style={{
          position: 'fixed',
          top: 145,
          left: 360,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          zIndex: 9999,
          width: 320,
          border: '1px solid var(--separatorStandard, #e5e5e5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #eee' }}>
          Timeframe
        </div>

        <div className="modal-content" style={{ padding: '8px 0' }}>
          <div role="menu">
            {presets.map((p) => {
              const isActive = timeframeState.preset === p.id && !isCustomMode;
              return (
                <button
                  key={p.id}
                  className={`timeframe-option ${p.id} ${isActive ? 'active' : ''}`}
                  type="button"
                  onClick={() => handlePresetClick(p.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: isActive ? 'var(--backgroundHover, #f0f4f8)' : 'transparent',
                    color: isActive ? 'var(--labelPrimary, #0070f3)' : 'var(--labelPrimary, #222)',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <span>{p.name}</span>
                  {isActive && (
                    <svg className="ynab-new-icon selected-preset-icon" width="12" height="12">
                      <use href="#icon_sprite_check" />
                    </svg>
                  )}
                </button>
              );
            })}

            <div className="separator" role="separator" style={{ height: 1, background: '#eee', margin: '6px 0' }} />

            <button
              className={`timeframe-option timeframe-option--custom ${isCustomMode ? 'active' : ''}`}
              type="button"
              onClick={() => setIsCustomMode(true)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '8px 16px',
                border: 'none',
                background: isCustomMode ? 'var(--backgroundHover, #f0f4f8)' : 'transparent',
                color: isCustomMode ? 'var(--labelPrimary, #0070f3)' : 'var(--labelPrimary, #222)',
                fontWeight: isCustomMode ? 600 : 400,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <span>Custom</span>
              {isCustomMode && (
                <svg className="ynab-new-icon selected-preset-icon" width="12" height="12">
                  <use href="#icon_sprite_check" />
                </svg>
              )}
            </button>
          </div>

          {/* Custom Time Frame Selection */}
          {isCustomMode && (
            <div className="custom-time-frame-selection" style={{ padding: '12px 16px', background: '#fafafa', borderTop: '1px solid #eee' }}>
              {/* From Row */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>
                  FROM
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(Number(e.target.value))}
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={fromYear}
                    onChange={(e) => setFromYear(Number(e.target.value))}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}
                  >
                    {yearsAvailable.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* To Row */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>
                  TO
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(Number(e.target.value))}
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={toYear}
                    onChange={(e) => setToYear(Number(e.target.value))}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}
                  >
                    {yearsAvailable.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="custom-time-frame-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="ghost-button secondary"
                  onClick={() => setIsCustomMode(false)}
                  style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ynab-button primary"
                  onClick={handleApplyCustom}
                  style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
