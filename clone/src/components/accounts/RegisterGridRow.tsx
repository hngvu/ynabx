import React from 'react';
import { Icon } from '../core/Icon';
import { TransactionItem } from './accountData';

export interface RegisterGridRowProps {
  transaction: TransactionItem;
  showAccountColumn: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onToggleCleared: () => void;
  onOpenFlagPicker?: (txId: string, rect: DOMRect) => void;
}

export function RegisterGridRow({
  transaction,
  showAccountColumn,
  isSelected,
  onSelect,
  onDoubleClick,
  onToggleCleared,
  onOpenFlagPicker,
}: RegisterGridRowProps) {
  const isOutflow = transaction.amount < 0;
  const isInflow = transaction.amount > 0;
  const absAmountStr = (Math.abs(transaction.amount) / 1000).toFixed(2);

  // Format date MM/DD/YYYY matching Ember port 4200 (e.g. 11/01/2026)
  const formatDate = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return isoDate;
  };

  return (
    <div
      className={`ynab-grid-body-row ynab-grid-body-parent ${isSelected ? 'is-checked' : ''}`}
      data-row-id={transaction.entityId}
      role="row"
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      {/* Checkbox */}
      <div className="ynab-grid-cell ynab-grid-cell-checkbox" role="gridcell">
        <button
          className={`ynab-checkbox ynab-checkbox-button ${isSelected ? 'is-checked' : ''}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          aria-label="Check this transaction"
        >
          <Icon
            className={`ynab-checkbox-button-square ${isSelected ? 'is-checked' : ''}`}
            name="check"
            width={13}
            height={13}
            style={isSelected ? { color: '#ffffff', fill: '#ffffff' } : undefined}
          />
        </button>
      </div>

      {/* Flag */}
      <div className="ynab-grid-cell ynab-grid-cell-flag" role="gridcell">
        <button
          className={`ynab-flag-pill ynab-flag-pill-${transaction.flag || 'none'} ynab-flag-icon-only`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFlagPicker?.(transaction.entityId, e.currentTarget.getBoundingClientRect());
          }}
          aria-label={transaction.flag ? transaction.flag : 'Clear'}
        >
          <span className="flag-pill-icon-container">
            <Icon
              className={`flag-pill-icon-${transaction.flag || 'none'}`}
              name={transaction.flag ? 'flag_fill' : 'flag'}
              width={16}
              height={16}
            />
          </span>
        </button>
      </div>

      {/* Image Attachment column matching Ember */}
      <div className="ynab-grid-cell ynab-grid-cell-image" role="gridcell">
        <Icon name="photo" width={14} height={14} style={{ opacity: 0.25 }} />
      </div>

      {/* Account name */}
      {showAccountColumn && (
        <div className="ynab-grid-cell ynab-grid-cell-accountName user-data" role="gridcell">
          <span title={transaction.accountName}>{transaction.accountName}</span>
        </div>
      )}

      {/* Date */}
      <div className="ynab-grid-cell ynab-grid-cell-date user-data" role="gridcell">
        <span className="date-string">{formatDate(transaction.date)}</span>
      </div>

      {/* Payee */}
      <div className="ynab-grid-cell ynab-grid-cell-payeeName user-data" role="gridcell">
        <span className="ynab-grid-cell-inner-payee-name" title={transaction.payeeName}>
          {transaction.payeeName}
        </span>
      </div>

      {/* Category */}
      <div className="ynab-grid-cell ynab-grid-cell-subCategoryName user-data" role="gridcell">
        {transaction.subCategoryId === 'needs-category' ? (
          <span
            className="user-data needs-category"
            style={{
              backgroundColor: '#fed7aa',
              color: '#9a3412',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            This needs a category
          </span>
        ) : (
          <span title={transaction.subCategoryName}>{transaction.subCategoryName}</span>
        )}
      </div>

      {/* Memo */}
      <div className="ynab-grid-cell ynab-grid-cell-memo user-data" role="gridcell">
        <span title={transaction.memo}>{transaction.memo}</span>
      </div>

      {/* Outflow */}
      <div className="ynab-grid-cell ynab-grid-cell-outflow user-data" role="gridcell">
        <span className="currency tabular-nums">
          {isOutflow ? `$${absAmountStr}` : ''}
        </span>
      </div>

      {/* Inflow */}
      <div className="ynab-grid-cell ynab-grid-cell-inflow user-data" role="gridcell">
        <span className="currency tabular-nums">
          {isInflow ? `$${absAmountStr}` : ''}
        </span>
      </div>

      {/* Cleared icon */}
      <div
        className="ynab-grid-cell ynab-grid-cell-cleared"
        role="gridcell"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCleared();
        }}
      >
        <button
          className="ynab-cleared"
          type="button"
          title={`Status: ${transaction.cleared}`}
        >
          {transaction.cleared === 'cleared' ? (
            <Icon className="is-cleared-icon" name="cleared_circle_fill" width={12} height={12} />
          ) : transaction.cleared === 'reconciled' ? (
            <Icon className="is-reconciled-icon" name="lock" width={12} height={12} />
          ) : (
            <Icon className="is-uncleared-icon" name="cleared_circle" width={12} height={12} />
          )}
        </button>
      </div>
    </div>
  );
}

export default RegisterGridRow;
