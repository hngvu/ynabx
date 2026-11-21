import React, { useState } from 'react';
import { Button } from '../core/Button';
import { GhostButton } from '../core/GhostButton';
import { Icon } from '../core/Icon';
import { Switch } from '../core/Switch';
import { CategoryTarget, TargetCadence, TargetType, formatCurrency } from './categoryTargetStatus';

export interface TargetConfigurationFormProps {
  initialTarget?: CategoryTarget;
  onSave: (target: CategoryTarget) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

interface CadenceOption {
  id: TargetCadence;
  label: string;
}

const CADENCE_OPTIONS: CadenceOption[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function TargetConfigurationForm({
  initialTarget,
  onSave,
  onCancel,
  onDelete,
}: TargetConfigurationFormProps) {
  const [cadence, setCadence] = useState<TargetCadence>(initialTarget?.cadence ?? 'monthly');
  const [amountStr, setAmountStr] = useState<string>(
    initialTarget?.targetAmount ? (initialTarget.targetAmount / 1000).toFixed(2) : ''
  );
  const [targetType, setTargetType] = useState<TargetType>(initialTarget?.targetType ?? 'NEED');
  const [dayOfMonth, setDayOfMonth] = useState<number>(initialTarget?.dayOfMonth ?? 0); // 0 = end of month
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialTarget?.dayOfWeek ?? 5); // Default Friday

  // Date parsing for Due on: Month / Year / Calendar
  const initialDate = initialTarget?.targetDate ? new Date(initialTarget.targetDate) : new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(initialDate.getFullYear());
  const [targetDateStr, setTargetDateStr] = useState<string>(
    initialTarget?.targetDate ?? initialDate.toISOString().slice(0, 10)
  );

  const [isRepeatsChecked, setIsRepeatsChecked] = useState<boolean>(Boolean(initialTarget?.repeatInterval));
  const [repeatInterval, setRepeatInterval] = useState<number>(initialTarget?.repeatInterval ?? 1);
  const [repeatUnit, setRepeatUnit] = useState<'months' | 'years'>(initialTarget?.repeatUnit ?? 'years');
  const [isDueByDateChecked, setIsDueByDateChecked] = useState<boolean>(Boolean(initialTarget?.targetDate));
  const [isBehaviorDropdownShowing, setIsBehaviorDropdownShowing] = useState<boolean>(false);

  const hasExistingTarget = Boolean(initialTarget?.targetAmount && initialTarget.targetAmount > 0);

  // Years list (current year to +10 years)
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 11 }, (_, i) => currentYear + i);

  // Exact Ember computed properties:
  const isCustomFrequency = cadence === 'custom';
  const isWeeklyFrequency = cadence === 'weekly';
  const isMonthlyFrequency = cadence === 'monthly';

  // Amount label: 'Amount' when Custom, 'I need' otherwise
  const amountLabel = isCustomFrequency ? 'Amount' : 'I need';

  // Behavior label:
  const behaviorLabel = (() => {
    switch (cadence) {
      case 'weekly':
      case 'monthly':
        return 'Next month I want to';
      case 'yearly':
        return 'Next year I want to';
      default:
        return 'I want to';
    }
  })();

  // Showing states matching Ember target-configuration:
  // isShowingDueByDateCheckbox: only when custom AND have balance (TB)
  const isShowingDueByDateCheckbox = isCustomFrequency && targetType === 'TB';

  // isShowingDateSelect:
  // (isDueByDateChecked && targetType === 'TB') || cadence === 'yearly' || (isCustomFrequency && targetType !== 'TB')
  const isShowingDateSelect =
    (isDueByDateChecked && targetType === 'TB') ||
    cadence === 'yearly' ||
    (isCustomFrequency && targetType !== 'TB');

  // isUsingCalendar:
  // targetType !== 'TB' && (cadence === 'yearly' || cadence === 'custom')
  const isUsingCalendar = targetType !== 'TB' && (cadence === 'yearly' || cadence === 'custom');

  // calendarLabel:
  const calendarLabel = isCustomFrequency ? 'Due on' : 'By';

  // isShowingRepeatsCheckbox: Custom frequency and not HaveBalance
  const isShowingRepeatsCheckbox = isCustomFrequency && targetType !== 'TB';
  const isShowingRepeatsSelects = isShowingRepeatsCheckbox && isRepeatsChecked;

  // isShowingEveryDayOfMonth: Monthly cadence
  const isShowingEveryDayOfMonth = isMonthlyFrequency;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) return;

    const milliunits = Math.round(cleanAmount * 1000);

    let finalTargetDate: string | undefined = undefined;
    if (isShowingDateSelect) {
      if (isUsingCalendar) {
        finalTargetDate = targetDateStr;
      } else {
        // month / year select
        const d = new Date(selectedYear, selectedMonth, 1);
        finalTargetDate = d.toISOString().slice(0, 10);
      }
    }

    const targetPayload: CategoryTarget = {
      targetAmount: milliunits,
      targetType,
      cadence,
      dayOfMonth: cadence === 'monthly' ? dayOfMonth : undefined,
      dayOfWeek: cadence === 'weekly' ? dayOfWeek : undefined,
      targetDate: finalTargetDate,
      repeatInterval: isShowingRepeatsSelects ? repeatInterval : undefined,
      repeatUnit: isShowingRepeatsSelects ? repeatUnit : undefined,
    };

    onSave(targetPayload);
  };

  const parsedAmountMillis = (() => {
    const val = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    return isNaN(val) ? 0 : Math.round(val * 1000);
  })();

  const formattedAmount = formatCurrency(parsedAmountMillis);

  // Exact Ember behaviorOptions
  const behaviorOptions = [
    {
      type: 'NEED' as TargetType,
      label: cadence === 'weekly'
        ? `Refill up to ${formattedAmount}/week`
        : isCustomFrequency
        ? `Refill up to ${formattedAmount}`
        : `Refill up to ${formattedAmount}`,
      subtext: 'Carry over unspent funds and top off next period',
      tagline: 'Best for day-to-day spending (e.g. groceries, dining out)',
      callout: !isCustomFrequency,
    },
    {
      type: 'MF' as TargetType,
      label: cadence === 'weekly'
        ? `Set aside another ${formattedAmount}/week`
        : isCustomFrequency
        ? `Set aside ${formattedAmount}`
        : `Set aside another ${formattedAmount}`,
      subtext: 'Assign this amount anew each period regardless of prior balance',
      tagline: 'Best for fixed bills and recurring monthly expenses',
      callout: !isCustomFrequency,
    },
    ...(isCustomFrequency
      ? [
          {
            type: 'TB' as TargetType,
            label: `Have a balance of ${formattedAmount}`,
            subtext: 'Maintain this balance without ongoing monthly additions',
            tagline: 'Best for emergency funds or fixed savings buffers',
            callout: false,
          },
        ]
      : []),
  ];

  const currentBehavior = behaviorOptions.find((b) => b.type === targetType) || behaviorOptions[0];

  return (
    <div className="ynab-new-inspector-goals-edit-goal">
      <div className="budget-inspector-goals-edit-section">
        <div className="goal-body">
          <form onSubmit={handleSubmit}>
            <dl>
              <dd>
                {/* 1. Cadence Frequency Group */}
                <div className="segmented-control frequency-group textOnlyOption" role="tablist">
                  {CADENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      id={`frequency_${opt.id}`}
                      role="tab"
                      aria-selected={cadence === opt.id}
                      className={`segmented-control-button frequency-group-button ${cadence === opt.id ? 'selected' : ''}`}
                      onClick={() => {
                        setCadence(opt.id);
                        if (opt.id === 'weekly') setTargetType('NEED');
                        if (opt.id !== 'custom' && targetType === 'TB') setTargetType('NEED');
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* 2. Amount Input (Ember 100% Authentic YnabNewCurrencyInput) */}
                <dl>
                  <dt>{amountLabel}</dt>
                  <dd className="user-data">
                    <div className="ynab-new-currency-input text-input mod-left-aligned is-editing">
                      <div className="input-wrapper">
                        <input
                          type="text"
                          className="user-data"
                          placeholder="0.00"
                          autoFocus
                          value={amountStr}
                          onChange={(e) => setAmountStr(e.target.value)}
                        />
                        <button type="button" className="currency" tabIndex={-1}>
                          ${amountStr || '0.00'}
                        </button>
                      </div>
                    </div>
                  </dd>
                </dl>

                {/* 3. In Custom Frequency: Target Behavior is rendered directly after Amount */}
                {isCustomFrequency && (
                  <dl>
                    <dt>{behaviorLabel}</dt>
                    <dd>
                      <div className="type-dropdown target-behavior-dropdown">
                        <div className={`ynab-new-dropdown ${isBehaviorDropdownShowing ? 'is-dropdown-showing' : ''}`} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className="ynab-new-dropdown-container user-data"
                            aria-haspopup="true"
                            aria-expanded={isBehaviorDropdownShowing}
                            onClick={() => setIsBehaviorDropdownShowing(!isBehaviorDropdownShowing)}
                          >
                            <span>{currentBehavior.label}</span>
                            <Icon name="caret_down" width={9} height={9} />
                          </button>

                          {isBehaviorDropdownShowing && (
                            <div
                              className="ynab-new-dropdown-modal"
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                backgroundColor: 'var(--modalBackground, #ffffff)',
                                borderRadius: '0.5rem',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                border: '1px solid var(--separatorSubdued)',
                                overflow: 'hidden',
                              }}
                            >
                              <div className="js-ynab-modal-scrollable-area" role="listbox">
                                {behaviorOptions.map((opt) => {
                                  const isSelected = opt.type === targetType;
                                  return (
                                    <React.Fragment key={opt.type}>
                                      <button
                                        type="button"
                                        className={`type-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                          setTargetType(opt.type);
                                          setIsBehaviorDropdownShowing(false);
                                        }}
                                      >
                                        <div className="type-dropdown-label">
                                          <div className="type-dropdown-label-title">
                                            {isSelected && (
                                              <Icon name="check_circle_fill" width={16} height={16} className="type-dropdown-icon" />
                                            )}
                                            <strong>{opt.label}</strong>
                                          </div>
                                          {opt.subtext && <em>{opt.subtext}</em>}
                                          {opt.tagline && (
                                            <div className={`type-dropdown-label-tagline ${opt.callout ? 'callout' : ''}`}>
                                              {opt.tagline}
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                      <hr className="dropdown-divider" />
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </dd>
                  </dl>
                )}

                {/* 4. Due by date Switch (Ember: isShowingDueByDateCheckbox) */}
                {isShowingDueByDateCheckbox && (
                  <dd>
                    <div className="goal-due-by-date-switch">
                      <Switch
                        isOn={isDueByDateChecked}
                        onClick={() => setIsDueByDateChecked(!isDueByDateChecked)}
                      >
                        Due by date
                      </Switch>
                    </div>
                  </dd>
                )}

                {/* 5. Date Select (Ember: isShowingDateSelect) */}
                {isShowingDateSelect && (
                  isUsingCalendar ? (
                    <dl>
                      <dt aria-label={calendarLabel}>{calendarLabel}</dt>
                      <dd className="ynab-new-inspector-goals-calendar-select user-data">
                        <input
                          type="date"
                          value={targetDateStr}
                          onChange={(e) => setTargetDateStr(e.target.value)}
                          style={{
                            width: '100%',
                            height: '2rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid var(--inputBorder)',
                            backgroundColor: 'var(--inputBackground)',
                            color: 'var(--labelPrimary)',
                            boxSizing: 'border-box',
                          }}
                        />
                      </dd>
                    </dl>
                  ) : (
                    <>
                      <dt aria-label="Due on">Due on</dt>
                      <dd>
                        <div className="ynab-new-inspector-goals-month-year user-data">
                          <div className="x-select-container goal-target-month">
                            <select
                              className="js-x-select"
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                            >
                              {MONTHS.map((m, idx) => (
                                <option key={m} value={idx}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div className="x-select-container goal-target-year">
                            <select
                              className="js-x-select"
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                            >
                              {yearsList.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </dd>
                    </>
                  )
                )}

                {/* 6. Repeat Switch (Ember: isShowingRepeatsCheckbox) */}
                {isShowingRepeatsCheckbox && (
                  <div className="frequency-repeat">
                    <Switch
                      isOn={isRepeatsChecked}
                      onClick={() => setIsRepeatsChecked(!isRepeatsChecked)}
                    >
                      Repeat
                    </Switch>
                  </div>
                )}

                {/* 7. Monthly: Every Day of Month (Ember: isShowingEveryDayOfMonth) */}
                {isShowingEveryDayOfMonth && (
                  <dl>
                    <dt>By</dt>
                    <dd className="ynab-new-inspector-goals-day-of-month goal-options-select user-data">
                      <div className="x-select-container">
                        <select
                          className="js-x-select"
                          value={dayOfMonth}
                          onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                        >
                          <option value={0}>End of the month</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                            const mod100 = day % 100;
                            const suffix =
                              mod100 >= 11 && mod100 <= 13
                                ? 'th'
                                : day % 10 === 1
                                ? 'st'
                                : day % 10 === 2
                                ? 'nd'
                                : day % 10 === 3
                                ? 'rd'
                                : 'th';
                            return (
                              <option key={day} value={day}>
                                {day}{suffix} of the month
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </dd>
                  </dl>
                )}

                {/* 8. Weekly: Day of Week (Ember: isWeeklyFrequency) */}
                {isWeeklyFrequency && (
                  <dl>
                    <dt>Every</dt>
                    <dd className="ynab-new-inspector-goals-day-of-week goal-options-select user-data">
                      <div className="x-select-container">
                        <select
                          className="js-x-select"
                          value={dayOfWeek}
                          onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                        >
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </dd>
                  </dl>
                )}

                {/* 9. Custom: Repeat interval & unit selects (Ember: isShowingRepeatsSelects) */}
                {isShowingRepeatsSelects && (
                  <dl>
                    <dt>Repeat every</dt>
                    <dd className="ynab-new-inspector-goals-repeats-options user-data">
                      <div className="x-select-container cadence-frequency-selector" style={{ flex: 1 }}>
                        <select
                          className="js-x-select"
                          value={repeatInterval}
                          onChange={(e) => setRepeatInterval(parseInt(e.target.value, 10) || 1)}
                        >
                          {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="x-select-container cadence-selector" style={{ flex: 1.5 }}>
                        <select
                          className="js-x-select"
                          value={repeatUnit}
                          onChange={(e) => setRepeatUnit(e.target.value as 'months' | 'years')}
                        >
                          <option value="months">{repeatInterval === 1 ? 'Month' : 'Months'}</option>
                          <option value="years">{repeatInterval === 1 ? 'Year' : 'Years'}</option>
                        </select>
                      </div>
                    </dd>
                  </dl>
                )}

                {/* 10. Non-Custom: Target Behavior Dropdown is rendered at the bottom */}
                {!isCustomFrequency && (
                  <dl>
                    <dt>{behaviorLabel}</dt>
                    <dd>
                      <div className="type-dropdown target-behavior-dropdown">
                        <div className={`ynab-new-dropdown ${isBehaviorDropdownShowing ? 'is-dropdown-showing' : ''}`} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className="ynab-new-dropdown-container user-data"
                            aria-haspopup="true"
                            aria-expanded={isBehaviorDropdownShowing}
                            onClick={() => setIsBehaviorDropdownShowing(!isBehaviorDropdownShowing)}
                          >
                            <span>{currentBehavior.label}</span>
                            <Icon name="caret_down" width={9} height={9} />
                          </button>

                          {isBehaviorDropdownShowing && (
                            <div
                              className="ynab-new-dropdown-modal"
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                backgroundColor: 'var(--modalBackground, #ffffff)',
                                borderRadius: '0.5rem',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                border: '1px solid var(--separatorSubdued)',
                                overflow: 'hidden',
                              }}
                            >
                              <div className="js-ynab-modal-scrollable-area" role="listbox">
                                {behaviorOptions.map((opt) => {
                                  const isSelected = opt.type === targetType;
                                  return (
                                    <React.Fragment key={opt.type}>
                                      <button
                                        type="button"
                                        className={`type-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                          setTargetType(opt.type);
                                          setIsBehaviorDropdownShowing(false);
                                        }}
                                      >
                                        <div className="type-dropdown-label">
                                          <div className="type-dropdown-label-title">
                                            {isSelected && (
                                              <Icon name="check_circle_fill" width={16} height={16} className="type-dropdown-icon" />
                                            )}
                                            <strong>{opt.label}</strong>
                                          </div>
                                          {opt.subtext && <em>{opt.subtext}</em>}
                                          {opt.tagline && (
                                            <div className={`type-dropdown-label-tagline ${opt.callout ? 'callout' : ''}`}>
                                              {opt.tagline}
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                      <hr className="dropdown-divider" />
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </dd>
                  </dl>
                )}
              </dd>
            </dl>

            {/* 11. Action Buttons (Ember exact: .goal-actions > .actions > .actions-left / .actions-right) */}
            <div className="goal-actions">
              <div className="actions">
                <div className="actions-left">
                  {hasExistingTarget && onDelete && (
                    <GhostButton
                      type="button"
                      typeSize="large"
                      variant="destructive"
                      onClick={onDelete}
                    >
                      <Icon name="trash_can" width={16} height={16} />
                      Delete
                    </GhostButton>
                  )}
                </div>
                <div className="actions-right">
                  <GhostButton
                    type="button"
                    typeSize="large"
                    variant="primary"
                    onClick={onCancel}
                  >
                    Cancel
                  </GhostButton>
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    Save Target
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TargetConfigurationForm;
