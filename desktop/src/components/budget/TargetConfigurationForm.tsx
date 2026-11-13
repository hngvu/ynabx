import React, { useState } from 'react';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { CategoryTarget, TargetCadence, TargetType } from './categoryTargetStatus';

export interface TargetConfigurationFormProps {
  initialTarget?: CategoryTarget;
  onSave: (target: CategoryTarget) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const CADENCE_OPTIONS: { id: TargetCadence; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
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
  const [targetDate, setTargetDate] = useState<string>(
    initialTarget?.targetDate ?? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [repeatInterval, setRepeatInterval] = useState<number>(initialTarget?.repeatInterval ?? 1);
  const [repeatUnit, setRepeatUnit] = useState<'months' | 'years'>(initialTarget?.repeatUnit ?? 'years');
  const [isDueByDateChecked, setIsDueByDateChecked] = useState<boolean>(Boolean(initialTarget?.targetDate));

  const hasExistingTarget = Boolean(initialTarget?.targetAmount && initialTarget.targetAmount > 0);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) return;

    const milliunits = Math.round(cleanAmount * 1000);

    const targetPayload: CategoryTarget = {
      targetAmount: milliunits,
      targetType,
      cadence,
      dayOfMonth: cadence === 'monthly' ? dayOfMonth : undefined,
      dayOfWeek: cadence === 'weekly' ? dayOfWeek : undefined,
      targetDate: (cadence === 'yearly' || (cadence === 'custom' && isDueByDateChecked)) ? targetDate : undefined,
      repeatInterval: cadence === 'custom' ? repeatInterval : undefined,
      repeatUnit: cadence === 'custom' ? repeatUnit : undefined,
    };

    onSave(targetPayload);
  };

  return (
    <div className="ynab-new-inspector-goals-edit-goal" style={{ padding: '0.75rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Frequency Segmented Tabs */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--labelSecondary)', display: 'block', marginBottom: '6px' }}>
            Frequency
          </label>
          <div
            className="segmented-control"
            style={{
              display: 'flex',
              backgroundColor: 'var(--inputBackgroundSubdued, #f1f5f9)',
              borderRadius: '0.375rem',
              padding: '2px',
              border: '1px solid var(--inputBorder, #cbd5e1)',
            }}
          >
            {CADENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`segmented-control-button ${cadence === opt.id ? 'selected' : ''}`}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: '12px',
                  fontWeight: cadence === opt.id ? 700 : 500,
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: cadence === opt.id ? 'var(--modalBackground, #ffffff)' : 'transparent',
                  color: cadence === opt.id ? 'var(--labelPrimary)' : 'var(--labelSecondary)',
                  boxShadow: cadence === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setCadence(opt.id);
                  if (opt.id === 'weekly') setTargetType('NEED');
                  if (opt.id === 'monthly' && targetType === 'TBD') setTargetType('NEED');
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--labelSecondary)', display: 'block', marginBottom: '4px' }}>
            I need
          </label>
          <div className="ynab-new-currency-input" style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--labelSecondary)' }}>
              $
            </span>
            <input
              type="text"
              className="user-data"
              placeholder="0.00"
              autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 1.75rem',
                borderRadius: '0.25rem',
                border: '1px solid var(--inputBorder, #cbd5e1)',
                backgroundColor: 'var(--inputBackground, #ffffff)',
                color: 'var(--labelPrimary)',
                fontSize: '14px',
                fontWeight: 600,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Cadence Specific Option: Monthly Day of Month */}
        {cadence === 'monthly' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--labelSecondary)', display: 'block', marginBottom: '4px' }}>
              By
            </label>
            <select
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid var(--inputBorder, #cbd5e1)',
                backgroundColor: 'var(--inputBackground, #ffffff)',
                color: 'var(--labelPrimary)',
                fontSize: '13px',
              }}
            >
              <option value={0}>By the end of each month</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  By the {day}
                  {day === 1 || day === 21 || day === 31
                    ? 'st'
                    : day === 2 || day === 22
                    ? 'nd'
                    : day === 3 || day === 23
                    ? 'rd'
                    : 'th'} of each month
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cadence Specific Option: Weekly Day of Week */}
        {cadence === 'weekly' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--labelSecondary)', display: 'block', marginBottom: '4px' }}>
              Every
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid var(--inputBorder, #cbd5e1)',
                backgroundColor: 'var(--inputBackground, #ffffff)',
                color: 'var(--labelPrimary)',
                fontSize: '13px',
              }}
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cadence Specific Option: Yearly Target Date */}
        {cadence === 'yearly' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--labelSecondary)', display: 'block', marginBottom: '4px' }}>
              Due on
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid var(--inputBorder, #cbd5e1)',
                backgroundColor: 'var(--inputBackground, #ffffff)',
                color: 'var(--labelPrimary)',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Cadence Specific Option: Custom Due Date & Repeat */}
        {cadence === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isDueByDateChecked}
                onChange={(e) => setIsDueByDateChecked(e.target.checked)}
              />
              <span>Due by date</span>
            </label>

            {isDueByDateChecked && (
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--inputBorder, #cbd5e1)',
                  backgroundColor: 'var(--inputBackground, #ffffff)',
                  color: 'var(--labelPrimary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--labelSecondary)' }}>Repeat every</span>
              <input
                type="number"
                min={1}
                max={36}
                value={repeatInterval}
                onChange={(e) => setRepeatInterval(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: '50px',
                  padding: '4px 6px',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--inputBorder, #cbd5e1)',
                  fontSize: '13px',
                }}
              />
              <select
                value={repeatUnit}
                onChange={(e) => setRepeatUnit(e.target.value as 'months' | 'years')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--inputBorder, #cbd5e1)',
                  fontSize: '13px',
                }}
              >
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>
        )}

        {/* Target Behavior Dropdown (Set aside another vs Refill up to vs Have a balance) */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--labelSecondary)', display: 'block', marginBottom: '4px' }}>
            Next month I want to
          </label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as TargetType)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid var(--inputBorder, #cbd5e1)',
              backgroundColor: 'var(--inputBackground, #ffffff)',
              color: 'var(--labelPrimary)',
              fontSize: '13px',
            }}
          >
            <option value="NEED">Refill up to (Best for groceries, dining out)</option>
            <option value="MF">Set aside another (Best for bills, savings)</option>
            <option value="TB">Have a balance of (Fixed target balance)</option>
            {cadence !== 'monthly' && cadence !== 'weekly' && (
              <option value="TBD">Target Balance by Date (Divide across months)</option>
            )}
          </select>
        </div>

        {/* Action Buttons: Delete / Cancel / Save */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--separatorSubdued, #e2e8f0)' }}>
          <div>
            {hasExistingTarget && onDelete && (
              <Button
                variant="destructive"
                type="button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '0.375rem 0.75rem' }}
                onClick={onDelete}
              >
                <Icon name="trash_can" width={14} height={14} />
                Delete
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Target
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default TargetConfigurationForm;
