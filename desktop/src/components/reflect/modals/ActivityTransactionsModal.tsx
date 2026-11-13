import React, { useState } from 'react';
import { TransactionItem } from '../../accounts/accountData';
import { formatMilliunits } from '../reflectDataEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: TransactionItem[];
}

export const ActivityTransactionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  transactions,
}) => {
  const [sortField, setSortField] = useState<'date' | 'payee' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  if (!isOpen) return null;

  const sortedList = [...transactions].sort((a, b) => {
    if (sortField === 'date') {
      const cmp = a.date.localeCompare(b.date);
      return sortAsc ? cmp : -cmp;
    }
    if (sortField === 'payee') {
      const cmp = (a.payeeName || '').localeCompare(b.payeeName || '');
      return sortAsc ? cmp : -cmp;
    }
    if (sortField === 'amount') {
      return sortAsc ? a.amount - b.amount : b.amount - a.amount;
    }
    return 0;
  });

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const toggleSort = (field: 'date' | 'payee' | 'amount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className="pure-u modal-popup modal-budget-activity"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          zIndex: 9999,
          width: 720,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--separatorStandard, #e5e5e5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
            <span style={{ fontSize: 12, color: '#666', marginTop: 2, display: 'block' }}>
              Total Activity: <strong style={{ color: totalAmount < 0 ? '#c92a2a' : '#2b8a3e' }}>{formatMilliunits(totalAmount)}</strong> ({transactions.length} transactions)
            </span>
          </div>
          <button
            type="button"
            className="ghost-button is-icon-only button-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg className="ynab-new-icon" width="12" height="12">
              <use href="#icon_sprite_close" />
            </svg>
          </button>
        </div>

        {/* Transactions Table */}
        <div className="modal-content" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          <table className="ynab-table ynab-table-5-col" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee', textAlign: 'left', color: '#555' }}>
                <th style={{ padding: '8px 16px', fontWeight: 600 }}>Account</th>
                <th
                  style={{ padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => toggleSort('date')}
                >
                  Date {sortField === 'date' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  style={{ padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => toggleSort('payee')}
                >
                  Payee {sortField === 'payee' && (sortAsc ? '↑' : '↓')}
                </th>
                <th style={{ padding: '8px 16px', fontWeight: 600 }}>Category</th>
                <th
                  style={{ padding: '8px 16px', fontWeight: 600, textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => toggleSort('amount')}
                >
                  Amount {sortField === 'amount' && (sortAsc ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                    No transactions found for this selection.
                  </td>
                </tr>
              ) : (
                sortedList.map((tx) => (
                  <tr
                    key={tx.entityId}
                    style={{ borderBottom: '1px solid #f1f3f5', transition: 'background 0.15s ease' }}
                    className="budget-activity-row"
                  >
                    <td style={{ padding: '8px 16px', color: '#666' }}>{tx.accountName}</td>
                    <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>{tx.date}</td>
                    <td style={{ padding: '8px 16px', fontWeight: 500 }}>{tx.payeeName}</td>
                    <td style={{ padding: '8px 16px', color: '#666' }}>{tx.subCategoryName}</td>
                    <td
                      style={{
                        padding: '8px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: tx.amount < 0 ? 'var(--labelPrimary, #222)' : '#2b8a3e',
                      }}
                    >
                      {formatMilliunits(tx.amount, true)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#fafafa',
          }}
        >
          <button
            type="button"
            className="ynab-button primary"
            onClick={onClose}
            style={{ padding: '6px 16px', fontSize: 13, borderRadius: 4, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
