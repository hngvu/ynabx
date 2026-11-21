import React from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { MoneyMoveRecord } from '../../services/slikBudgetEngine';
import { formatCurrency } from './categoryTargetStatus';

export interface RecentMovesModalProps {
  isOpen: boolean;
  onClose: () => void;
  moves: MoneyMoveRecord[];
  monthName: string;
}

export function RecentMovesModal({
  isOpen,
  onClose,
  moves,
  monthName,
}: RecentMovesModalProps) {
  if (!isOpen) return null;

  return (
    <Modal className="ynab-u modal-recent-moves" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Recent Moves ({monthName})</Modal.Header>
      <Modal.Body>
        <div className="recent-moves-modal-content" style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {moves.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--labelSecondary, #64748b)' }}>
              <Icon name="clock_arrow_back" width={28} height={28} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.25rem' }}>
                No Recent Moves
              </div>
              <div style={{ fontSize: '13px' }}>
                When you assign or move money between categories, your recent changes will appear here.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--separatorSubdued, #e2e8f0)', color: 'var(--labelSecondary, #64748b)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>From</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>To</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--separatorSubdued, #f1f5f9)' }}>
                    <td style={{ padding: '0.5rem 0.25rem', color: 'var(--labelPrimary)' }}>
                      {m.fromCategoryName}
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', color: 'var(--labelPrimary)' }}>
                      {m.toCategoryName}
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', textAlign: 'right', fontWeight: 600 }} className="user-data currency tabular-nums">
                      {formatCurrency(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default RecentMovesModal;
