import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface AccountsHeaderProps {
  selectedAccount?: AccountItem;
  clearedBalanceMilliunits: number;
  unclearedBalanceMilliunits: number;
  workingBalanceMilliunits: number;
  selectedCount?: number;
  selectedTotalMilliunits?: number;
  isAdjustmentMode?: boolean;
  adjustmentStatementBalanceMilliunits?: number;
  onEditAccount?: () => void;
  onReconcile?: () => void;
  onCreateAdjustmentAndFinish?: () => void;
  onCancelAdjustmentMode?: () => void;
}

export function AccountsHeader({
  selectedAccount,
  clearedBalanceMilliunits,
  unclearedBalanceMilliunits,
  workingBalanceMilliunits,
  selectedCount = 0,
  selectedTotalMilliunits = 0,
  isAdjustmentMode = false,
  adjustmentStatementBalanceMilliunits = 0,
  onEditAccount,
  onReconcile,
  onCreateAdjustmentAndFinish,
  onCancelAdjustmentMode,
}: AccountsHeaderProps) {
  const accountName = selectedAccount?.accountName || 'All Accounts';
  const isAllAccounts = !selectedAccount;
  const isCreditCard = selectedAccount?.accountType === 'credit';
  const [isFavorite, setIsFavorite] = useState(false);

  const formatAmount = (milliunits: number) => {
    const isNegative = milliunits < 0;
    const absStr = (Math.abs(milliunits) / 1000).toFixed(2);
    return `${isNegative ? '-' : ''}$${absStr}`;
  };

  const getAmountColorClass = (milliunits: number) => {
    if (milliunits > 0) return 'accounts-header-balances-amount-positive';
    if (milliunits < 0) return 'accounts-header-balances-amount-negative';
    return '';
  };

  const adjustmentDifference = adjustmentStatementBalanceMilliunits - clearedBalanceMilliunits;

  return (
    <header className={`accounts-header ${isAdjustmentMode ? 'adjustment-mode' : ''}`}>
      <div className="accounts-header-top">
        <div className="accounts-header-total user-data">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="js-accounts-header-account-name" title={accountName} style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {accountName}
            </span>
            {!isAllAccounts && (
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                aria-label="Star account"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  color: isFavorite ? '#fbbc04' : 'var(--labelSecondary, #727484)',
                }}
              >
                <Icon name={isFavorite ? 'star_fill' : 'star'} width={16} height={16} />
              </button>
            )}
          </div>

          {!isAllAccounts && (
            <div className="account-info-small-text-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
              <small className="js-account-type-small-text" style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.75 }}>
                <Icon name="check_circle" width={11} height={11} />
                <span>{(selectedAccount.accountType || '').toUpperCase()}</span>
              </small>
              <small className="js-reconciled-small-text" style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.75 }}>
                <Icon name="lock" width={10} height={10} />
                <span>Reconciled today</span>
              </small>
            </div>
          )}
        </div>

        <div className="accounts-header-actions">
          {!isAllAccounts && (
            <div className="reconcile-button-and-label">
              <button
                className="button button-secondary accounts-header-edit-account"
                type="button"
                title="Edit Account"
                onClick={onEditAccount}
              >
                <Icon name="pencil" width={16} height={16} />
              </button>
              <button
                className="button button-primary accounts-header-reconcile"
                type="button"
                onClick={onReconcile}
              >
                Reconcile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Credit Card Overspending & Payment Header section (components/accounts/overspending-and-payment/index.hbs) */}
      {isCreditCard && (
        <div className="overspending-and-payment" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '0.5rem 0' }}>
          <div className="accounts-header-payment" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="user-data header-currency-label" style={{ fontWeight: 700, color: 'var(--labelPositive, #02bc79)' }}>
              {formatAmount(Math.abs(clearedBalanceMilliunits))}
            </span>
            <button
              className="accounts-header-label"
              type="button"
              onClick={() => alert('Credit Card Payment: YNAB automatically moves money from funded categories to your Credit Card Payment category as you spend.')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: 'var(--labelSecondary, #727484)',
                padding: 0,
              }}
            >
              <Icon name="question_mark_circle" width={12} height={12} />
              <span>Payment Available</span>
            </button>
          </div>
        </div>
      )}

      {/* Reconciliation Adjustment Mode Banner (components/accounts/account-adjustment/index.hbs) */}
      {isAdjustmentMode && (
        <div
          className="accounts-adjustment account-flash-notification"
          style={{
            backgroundColor: '#fef5e6',
            border: '1px solid #fde0ad',
            color: '#8e5b00',
            borderRadius: '6px',
            padding: '0.625rem 1rem',
            margin: '0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="accounts-adjustment-label user-data" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
            {adjustmentDifference === 0
              ? 'Your cleared balance matches your bank statement!'
              : `There's a difference of ${formatAmount(adjustmentDifference)} between your bank statement and cleared balance.`}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="button button-cancel-small"
              onClick={onCancelAdjustmentMode}
              style={{ height: '1.75rem', fontSize: '0.75rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button-primary-small"
              onClick={onCreateAdjustmentAndFinish}
              style={{ height: '1.75rem', fontSize: '0.75rem' }}
            >
              {adjustmentDifference === 0 ? 'Finish Reconciling' : 'Create Adjustment & Finish'}
            </button>
          </div>
        </div>
      )}

      <hr className="standard" />

      {/* Balances container matching Ember AST */}
      <div className="accounts-header-balances">
        {/* Cleared Balance */}
        <div
          tabIndex={0}
          className={`accounts-header-balances-amount accounts-header-balances-cleared ${getAmountColorClass(
            clearedBalanceMilliunits
          )}`}
        >
          <span className="user-data">
            <span className="currency tabular-nums">
              {formatAmount(clearedBalanceMilliunits)}
            </span>
          </span>
          <div className="accounts-header-label">
            <Icon name="cleared_circle_fill" width={12} height={12} />
            Cleared Balance
          </div>
        </div>

        <i>+</i>

        {/* Uncleared Balance */}
        <div
          tabIndex={0}
          className={`accounts-header-balances-amount accounts-header-balances-uncleared ${getAmountColorClass(
            unclearedBalanceMilliunits
          )}`}
        >
          <span className="user-data">
            <span className="currency tabular-nums">
              {formatAmount(unclearedBalanceMilliunits)}
            </span>
          </span>
          <div className="accounts-header-label">
            <Icon name="cleared_circle" width={12} height={12} />
            Uncleared Balance
          </div>
        </div>

        <i>=</i>

        {/* Working Balance */}
        <div
          tabIndex={0}
          className={`accounts-header-balances-amount accounts-header-balances-working ${getAmountColorClass(
            workingBalanceMilliunits
          )}`}
        >
          <span className="user-data">
            <span className="currency tabular-nums">
              {formatAmount(workingBalanceMilliunits)}
            </span>
          </span>
          <div className="accounts-header-label">
            Working Balance
          </div>
        </div>

        {/* Right side: Selected total when multiple transactions selected */}
        <div className="accounts-header-balances-right">
          {selectedCount > 0 && (
            <div className="accounts-header-balances-amount accounts-header-selected-total">
              <span className="user-data" title={formatAmount(selectedTotalMilliunits)}>
                <span className="currency tabular-nums">
                  {formatAmount(selectedTotalMilliunits)}
                </span>
              </span>
              <div className="accounts-header-label">
                {selectedCount} Selected Total
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AccountsHeader;
