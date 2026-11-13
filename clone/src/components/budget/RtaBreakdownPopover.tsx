import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { calculatePopoverPosition } from '../../utils/popoverPosition';
import { formatCurrency } from './categoryTargetStatus';

export interface RtaBreakdownPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  readyToAssignMilliunits: number;
  monthName: string;
  totalAssignedMilliunits: number;
}

export function RtaBreakdownPopover({
  isOpen,
  onClose,
  triggerRect,
  readyToAssignMilliunits,
  monthName,
  totalAssignedMilliunits,
}: RtaBreakdownPopoverProps) {
  if (!isOpen || !triggerRect) return null;

  const modalWidth = 340;
  const modalHeight = 310;
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'up',
    horizontalAlign: 'center',
  });

  const isNegative = readyToAssignMilliunits < 0;
  // Estimated base inflow for demonstration breakdown
  const inflowEstimated = readyToAssignMilliunits + totalAssignedMilliunits;

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-budget-breakdown-to-be-budgeted"
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
          padding: '1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="budget-breakdown-to-be-budgeted">
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--labelPrimary)' }}>
            Ready to Assign Calculation
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '13px' }}>
            {/* Positive items */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--labelSecondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Icon name="plus_circle_fill" width={14} height={14} className="fill-positive" />
                <span>Inflow: Ready to Assign in {monthName}</span>
              </div>
              <span className="user-data currency tabular-nums">
                {formatCurrency(inflowEstimated > 0 ? inflowEstimated : 0)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--labelSecondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Icon name="plus_circle_fill" width={14} height={14} className="fill-positive" />
                <span>Left Over from Last Month</span>
              </div>
              <span className="user-data currency tabular-nums">$0.00</span>
            </div>

            <hr style={{ margin: '0.25rem 0', borderColor: 'var(--separatorSubdued, #e2e8f0)' }} />

            {/* Negative items */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--labelSecondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Icon name="subtract_circle_fill" width={14} height={14} className="fill-negative" />
                <span>Assigned in {monthName}</span>
              </div>
              <span className="user-data currency tabular-nums">
                -{formatCurrency(totalAssignedMilliunits)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--labelSecondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Icon name="subtract_circle_fill" width={14} height={14} className="fill-negative" />
                <span>Assigned in Future Months</span>
              </div>
              <span className="user-data currency tabular-nums">$0.00</span>
            </div>

            <hr style={{ margin: '0.25rem 0', borderColor: 'var(--separatorSubdued, #e2e8f0)' }} />

            {/* Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 600,
                fontSize: '14px',
                paddingTop: '0.25rem',
              }}
            >
              <span>= Total Ready to Assign</span>
              <span
                className={`user-data currency tabular-nums ${
                  isNegative ? 'negative' : readyToAssignMilliunits > 0 ? 'positive' : 'zero'
                }`}
              >
                {isNegative ? '-' : ''}
                {formatCurrency(readyToAssignMilliunits)}
              </span>
            </div>
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

export default RtaBreakdownPopover;
