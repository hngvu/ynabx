import React from 'react';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { NavAccountGroup } from './NavAccountGroup';
import { AccountItem } from './NavAccountRow';

export interface AccountsListProps {
  cashAccounts?: AccountItem[];
  creditAccounts?: AccountItem[];
  loanAccounts?: AccountItem[];
  trackingAccounts?: AccountItem[];
  closedAccounts?: AccountItem[];
  selectedAccountId?: string | null;
  editingAccountId?: string | null;
  onSelectAccount?: (id: string) => void;
  onEditAccount?: (id: string) => void;
  onAddAccount?: () => void;
  onManageConnections?: () => void;
  onReorderAccounts?: (groupType: 'cash' | 'credit' | 'loan' | 'tracking' | 'closed', draggedId: string, targetId: string) => void;
}

/**
 * Exact decompiled from components/accounts-list/index.hbs (WQ class)
 */
export function AccountsList({
  cashAccounts = [],
  creditAccounts = [],
  loanAccounts = [],
  trackingAccounts = [],
  closedAccounts = [],
  selectedAccountId,
  editingAccountId,
  onSelectAccount,
  onEditAccount,
  onAddAccount,
  onManageConnections,
  onReorderAccounts,
}: AccountsListProps) {
  const sumBalance = (list: AccountItem[]) =>
    list.reduce((sum, item) => sum + (item.accountCalculation?.balance ?? 0), 0);

  const cashBalance = sumBalance(cashAccounts);
  const creditBalance = sumBalance(creditAccounts);
  const loanBalance = sumBalance(loanAccounts);
  const trackingBalance = sumBalance(trackingAccounts);
  const closedBalance = sumBalance(closedAccounts);

  const noAccounts =
    cashAccounts.length === 0 &&
    creditAccounts.length === 0 &&
    loanAccounts.length === 0 &&
    trackingAccounts.length === 0 &&
    closedAccounts.length === 0;

  return (
    <>
      <div className="nav-accounts">
        {cashAccounts.length > 0 && (
          <NavAccountGroup
            type="cash"
            name="CASH"
            accounts={cashAccounts}
            value={cashBalance}
            selectedAccountId={selectedAccountId}
            editingAccountId={editingAccountId}
            onSelectAccount={onSelectAccount}
            onEditAccount={onEditAccount}
            onReorderAccounts={(src, tgt) => onReorderAccounts?.('cash', src, tgt)}
          />
        )}
        {creditAccounts.length > 0 && (
          <NavAccountGroup
            type="credit"
            name="CREDIT"
            accounts={creditAccounts}
            value={creditBalance}
            selectedAccountId={selectedAccountId}
            editingAccountId={editingAccountId}
            onSelectAccount={onSelectAccount}
            onEditAccount={onEditAccount}
            onReorderAccounts={(src, tgt) => onReorderAccounts?.('credit', src, tgt)}
          />
        )}
        {loanAccounts.length > 0 && (
          <NavAccountGroup
            type="loan"
            name="LOANS"
            accounts={loanAccounts}
            value={loanBalance}
            selectedAccountId={selectedAccountId}
            editingAccountId={editingAccountId}
            onSelectAccount={onSelectAccount}
            onEditAccount={onEditAccount}
            onReorderAccounts={(src, tgt) => onReorderAccounts?.('loan', src, tgt)}
          />
        )}
        {trackingAccounts.length > 0 && (
          <NavAccountGroup
            type="offBudget"
            name="TRACKING"
            accounts={trackingAccounts}
            value={trackingBalance}
            selectedAccountId={selectedAccountId}
            editingAccountId={editingAccountId}
            onSelectAccount={onSelectAccount}
            onEditAccount={onEditAccount}
            onReorderAccounts={(src, tgt) => onReorderAccounts?.('tracking', src, tgt)}
          />
        )}
        {closedAccounts.length > 0 && (
          <NavAccountGroup
            type="closed"
            name="CLOSED"
            accounts={closedAccounts}
            value={closedBalance}
            selectedAccountId={selectedAccountId}
            editingAccountId={editingAccountId}
            onSelectAccount={onSelectAccount}
            onEditAccount={onEditAccount}
            onReorderAccounts={(src, tgt) => onReorderAccounts?.('closed', src, tgt)}
          />
        )}
      </div>

      <div className="nav-add-accounts">
        {noAccounts && (
          <div className="nav-accounts-empty-state">
            <h5>No Accounts</h5>
            <p>You can't plan without adding accounts to YNAB first. How about adding one now?</p>
          </div>
        )}
        <Button
          className="button-sidebar nav-add-account"
          onClick={onAddAccount}
          variant="contrast"
        >
          <Icon name="plus_circle_fill" width={12} />
          Add Account
        </Button>
        <Button
          className="button-sidebar nav-bank-connections"
          onClick={onManageConnections}
          variant="contrast"
        >
          <Icon name="bank" width={12} />
          <span className="nav-bank-connections-label-full">Bank Connections</span>
          <span className="nav-bank-connections-label-short">Connections</span>
        </Button>
      </div>
    </>
  );
}

export default AccountsList;
