import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { NavAccountRow, AccountItem } from './NavAccountRow';

export interface NavAccountGroupProps {
  type: string;
  name: string;
  accounts: AccountItem[];
  value: number;
  selectedAccountId?: string | null;
  editingAccountId?: string | null;
  onSelectAccount?: (id: string) => void;
  onEditAccount?: (id: string) => void;
}

/**
 * Exact decompiled from components/nav-account/index.hbs (UQ class)
 */
export function NavAccountGroup({
  type,
  name,
  accounts,
  value,
  selectedAccountId,
  editingAccountId,
  onSelectAccount,
  onEditAccount,
}: NavAccountGroupProps) {
  const isClosed = type === 'closed';
  const [isCollapsed, setIsCollapsed] = useState(isClosed);

  const formattedValue = (value / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const ariaLabel = `${isCollapsed ? 'open' : 'collapse'} ${name}`;

  return (
    <div className={`nav-account ${type}`}>
      <div className="nav-account-block" onClick={() => setIsCollapsed(!isCollapsed)}>
        <button
          className="nav-account-name nav-account-name-button user-data"
          aria-label={ariaLabel}
          type="button"
        >
          {isCollapsed ? (
            <Icon name="chevron_right" width={8} />
          ) : (
            <Icon name="chevron_down" width={8} />
          )}
          <div>{name}</div>
        </button>
        <div className="nav-account-value nav-account-block-value user-data">
          {!isClosed && formattedValue}
        </div>
        <div className="nav-account-icons nav-account-icons-right" />
      </div>

      {!isCollapsed &&
        accounts.map((acc) => (
          <NavAccountRow
            key={acc.entityId}
            account={acc}
            isSelected={acc.entityId === selectedAccountId}
            isEditingThisAccount={acc.entityId === editingAccountId}
            onSelect={onSelectAccount}
            onEdit={onEditAccount}
          />
        ))}
    </div>
  );
}

export default NavAccountGroup;
