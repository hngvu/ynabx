import React from 'react';
import { Icon } from '../core/Icon';
import { TransactionItem } from './accountData';

export interface RegisterGridRowProps {
  transaction: TransactionItem;
  showAccountColumn: boolean;
  showRunningBalance?: boolean;
  showFlags?: boolean;
  showImages?: boolean;
  runningBalanceMilliunits?: number;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onToggleCleared: () => void;
  onToggleCollapseSplit?: () => void;
  onOpenFlagPicker?: (txId: string, rect: DOMRect) => void;
}

export function RegisterGridRow({
  transaction,
  showAccountColumn,
  showRunningBalance = false,
  showFlags = true,
  showImages = true,
  runningBalanceMilliunits = 0,
  isSelected,
  onSelect,
  onDoubleClick,
  onToggleCleared,
  onToggleCollapseSplit,
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

  const isTransfer = !!transaction.transferAccountId || transaction.payeeName.startsWith('Transfer :');

  return (
    <>
      <div
        className={`ynab-grid-body-row ynab-grid-body-parent ${isSelected ? 'is-checked' : ''} ${transaction.needsApproved ? 'needs-approved' : ''} ${transaction.isRepeating ? 'repeating' : ''}`}
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

        {/* Notification Column (matching Ember grid-row.hbs) */}
        <div className="ynab-grid-cell ynab-grid-cell-notification" role="gridcell">
          {transaction.isPending ? (
            <span aria-label="Imported Pending" title="Pending Bank Transaction">
              <Icon name="clock" width={12} height={12} style={{ opacity: 0.6 }} />
            </span>
          ) : transaction.needsApproved ? (
            <span aria-label="Needs Approval" title="Needs Approval">
              <Icon name="info_circle_fill" width={12} height={12} style={{ color: 'var(--calloutAccent, #daac00)' }} />
            </span>
          ) : null}
        </div>

        {/* Flag */}
        {showFlags && (
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
        )}

        {/* Image Attachment column matching Ember */}
        {showImages && (
          <div className="ynab-grid-cell ynab-grid-cell-image" role="gridcell">
            <Icon name="photo" width={14} height={14} style={{ opacity: 0.25 }} />
          </div>
        )}

        {/* Account name */}
        {showAccountColumn && (
          <div className="ynab-grid-cell ynab-grid-cell-accountName user-data" role="gridcell">
            <span title={transaction.accountName}>{transaction.accountName}</span>
          </div>
        )}

        {/* Date */}
        <div className="ynab-grid-cell ynab-grid-cell-date user-data" role="gridcell">
          <span className="date-string">{formatDate(transaction.date)}</span>
          {transaction.isRepeating && (
            <span className="repeating-icon-container" title="Repeating transaction">
              <Icon name="repeat" width={11} height={11} style={{ opacity: 0.6, marginLeft: '4px' }} />
            </span>
          )}
        </div>

        {/* Payee */}
        <div className="ynab-grid-cell ynab-grid-cell-payeeName user-data" role="gridcell">
          <div className="ynab-grid-cell-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="ynab-grid-cell-inner-payee-name" title={transaction.payeeName}>
              {transaction.payeeName}
            </span>
            {isTransfer && (
              <span className="transfer-jump-icon" title="Transfer transaction" style={{ opacity: 0.5, flexShrink: 0 }}>
                <Icon name="arrow_right_arrow_left" width={11} height={11} />
              </span>
            )}
          </div>
        </div>

        {/* Category */}
        <div className={`ynab-grid-cell ynab-grid-cell-subCategoryName user-data ${transaction.isSplit ? 'is-split' : ''}`} role="gridcell">
          {transaction.isSplit ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className={`collapse-split-button ${transaction.isCollapsed ? 'is-collapsed' : ''}`}
                type="button"
                aria-label={transaction.isCollapsed ? 'Expand splits' : 'Collapse splits'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapseSplit?.();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transform: transaction.isCollapsed ? 'rotate(-90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M0.000187488 10.4996C0.000187488 10.3076 0.0736831 10.1156 0.219924 9.96936L4.18943 5.99986L0.219924 2.03036C-0.0733077 1.73713 -0.0733077 1.26316 0.219924 0.969924C0.513156 0.676692 0.987126 0.676692 1.28036 0.969924L5.78008 5.46964C6.07331 5.76287 6.07331 6.23684 5.78008 6.53008L1.28036 11.0298C0.987126 11.323 0.513156 11.323 0.219924 11.0298C0.0736831 10.8836 0.000187488 10.6916 0.000187488 10.4996Z" fill="currentColor" />
                </svg>
              </button>
              <span className="split-category-text" title="Split (Multiple Categories)..." style={{ fontWeight: 600 }}>
                Split (Multiple Categories)...
              </span>
            </div>
          ) : transaction.subCategoryId === 'needs-category' ? (
            <span
              className="needs-category"
              aria-label="This needs a category"
            >
              <span className="label">This needs a category</span>
            </span>
          ) : isTransfer || transaction.subCategoryId === 'category-not-needed' ? (
            <span className="category-not-needed indent">
              Category not needed
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

        {/* Balance */}
        {showRunningBalance && (
          <div className="ynab-grid-cell ynab-grid-cell-balance user-data" role="gridcell">
            <span
              className={`currency tabular-nums ${runningBalanceMilliunits < 0 ? 'negative' : ''}`}
            >
              {runningBalanceMilliunits < 0 ? '-' : ''}$
              {(Math.abs(runningBalanceMilliunits) / 1000).toFixed(2)}
            </span>
          </div>
        )}

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

      {/* Split sub-rows (components/register/grid-sub.hbs) when expanded */}
      {transaction.isSplit && !transaction.isCollapsed && transaction.subTransactions?.map((sub) => {
        const subOutflow = sub.amount < 0;
        const subInflow = sub.amount > 0;
        const subAbsStr = (Math.abs(sub.amount) / 1000).toFixed(2);

        return (
          <div
            key={sub.entityId}
            className={`ynab-grid-body-row ynab-grid-body-sub ${isSelected ? 'is-checked' : ''}`}
            role="row"
            onClick={onSelect}
          >
            <div className="ynab-grid-cell ynab-grid-cell-checkbox" role="gridcell" />
            <div className="ynab-grid-cell ynab-grid-cell-notification" role="gridcell" />
            {showFlags && <div className="ynab-grid-cell ynab-grid-cell-flag" role="gridcell" />}
            {showImages && <div className="ynab-grid-cell ynab-grid-cell-image" role="gridcell" />}
            {showAccountColumn && <div className="ynab-grid-cell ynab-grid-cell-accountName" role="gridcell" />}
            <div className="ynab-grid-cell ynab-grid-cell-date" role="gridcell" />
            <div className="ynab-grid-cell ynab-grid-cell-payeeName" role="gridcell" />
            <div className="ynab-grid-cell ynab-grid-cell-subCategoryName user-data" role="gridcell" style={{ paddingLeft: '1.5rem' }}>
              <span title={sub.subCategoryName} style={{ opacity: 0.9 }}>
                {sub.subCategoryName}
              </span>
            </div>
            <div className="ynab-grid-cell ynab-grid-cell-memo user-data" role="gridcell">
              <span title={sub.memo} style={{ opacity: 0.85 }}>
                {sub.memo}
              </span>
            </div>
            <div className="ynab-grid-cell ynab-grid-cell-outflow user-data" role="gridcell">
              <span className="currency tabular-nums">
                {subOutflow ? `$${subAbsStr}` : ''}
              </span>
            </div>
            <div className="ynab-grid-cell ynab-grid-cell-inflow user-data" role="gridcell">
              <span className="currency tabular-nums">
                {subInflow ? `$${subAbsStr}` : ''}
              </span>
            </div>
            {showRunningBalance && <div className="ynab-grid-cell ynab-grid-cell-balance" role="gridcell" />}
            <div className="ynab-grid-cell ynab-grid-cell-cleared" role="gridcell" />
          </div>
        );
      })}
    </>
  );
}

export default RegisterGridRow;
