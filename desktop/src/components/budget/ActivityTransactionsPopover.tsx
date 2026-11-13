import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { calculatePopoverPosition } from '../../utils/popoverPosition';
import { formatCurrency } from './categoryTargetStatus';

export interface ActivityTransaction {
  id: string;
  accountName: string;
  date: string;
  payeeName: string;
  memo?: string;
  amountMilliunits: number;
}

export interface ActivityTransactionsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  categoryName: string;
  activityMilliunits: number;
  transactions?: ActivityTransaction[];
}

export function ActivityTransactionsPopover({
  isOpen,
  onClose,
  triggerRect,
  categoryName,
  activityMilliunits,
  transactions = [],
}: ActivityTransactionsPopoverProps) {
  if (!isOpen || !triggerRect) return null;

  const modalWidth = 420;
  const modalHeight = 280;
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'up',
    horizontalAlign: 'center',
  });

  const formattedTotal = (Math.abs(activityMilliunits) / 1000).toFixed(2);
  const sign = activityMilliunits < 0 ? '-' : activityMilliunits > 0 ? '+' : '';

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-budget modal-budget-activity"
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
          maxHeight: '400px',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="budget-activity-modal-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--labelSecondary)' }}>
                Activity
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--labelPrimary)', margin: 0 }}>
                {categoryName}
              </h2>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: activityMilliunits < 0 ? 'var(--labelPrimary)' : 'var(--positive)' }}>
              {sign}${formattedTotal}
            </div>
          </div>

          <hr style={{ margin: '0.5rem 0', borderColor: 'var(--separatorSubdued, #e2e8f0)' }} />

          {transactions.length === 0 ? (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--labelSecondary)', fontSize: '13px' }}>
              <Icon name="clock_arrow_back" width={28} height={28} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <div>No transactions recorded for this category in this month.</div>
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--labelSecondary)', borderBottom: '1px solid var(--separatorSubdued, #e2e8f0)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Payee</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--separatorSubdued, #f1f5f9)' }}>
                    <td style={{ padding: '6px 0' }}>{tx.date}</td>
                    <td style={{ padding: '6px 0' }}>{tx.payeeName}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>
                      {tx.amountMilliunits < 0 ? '-' : ''}
                      {formatCurrency(tx.amountMilliunits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

export default ActivityTransactionsPopover;
