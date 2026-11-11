import React from 'react';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface AccountsHeaderProps {
  selectedAccount?: AccountItem;
  clearedBalanceMilliunits: number;
  unclearedBalanceMilliunits: number;
  workingBalanceMilliunits: number;
  selectedCount?: number;
  selectedTotalMilliunits?: number;
  onEditAccount?: () => void;
  onReconcile?: () => void;
}

export function AccountsHeader({
  selectedAccount,
  clearedBalanceMilliunits,
  unclearedBalanceMilliunits,
  workingBalanceMilliunits,
  selectedCount = 0,
  selectedTotalMilliunits = 0,
  onEditAccount,
  onReconcile,
}: AccountsHeaderProps) {
  const accountName = selectedAccount?.accountName || 'All Accounts';
  const isAllAccounts = !selectedAccount;

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

  return (
    <header className="accounts-header">
      <div className="accounts-header-top">
        <div className="accounts-header-total user-data">
          <span className="js-accounts-header-account-name" title={accountName}>
            {accountName}
          </span>
          {!isAllAccounts && (
            <div className="account-info-small-text-container">
              <small className="js-account-type-small-text">
                <Icon name="check_circle" width={12} height={12} />
                <span>{(selectedAccount.accountType || '').toUpperCase()}</span>
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
