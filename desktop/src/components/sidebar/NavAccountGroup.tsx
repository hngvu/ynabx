import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { NavAccountRow, AccountItem } from './NavAccountRow';
import { useEmberSortable, gapToIndex } from '../../hooks/useEmberSortable';

export interface NavAccountGroupProps {
  type: string;
  name: string;
  accounts: AccountItem[];
  value: number;
  selectedAccountId?: string | null;
  editingAccountId?: string | null;
  onSelectAccount?: (id: string) => void;
  onEditAccount?: (id: string) => void;
  /** New ordering of this group's account ids. */
  onReorderAccounts?: (orderedIds: string[]) => void;
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
  onReorderAccounts,
}: NavAccountGroupProps) {
  const isClosed = type === 'closed';
  const [isCollapsed, setIsCollapsed] = useState(isClosed);
  // Ember-style sortable (YNAB NQ/OQ classes): accounts reorder only within this account type.
  const sort = useEmberSortable({
    placeholderClassName: 'nav-account-drag-placeholder',
    canDrop: (d, gap) => d.listId === gap.listId,
    onDrop: (d, gap) => {
      const ids = accounts.map((a) => a.entityId);
      const [moved] = ids.splice(d.index, 1);
      ids.splice(gapToIndex(d.index, gap.index), 0, moved);
      onReorderAccounts?.(ids);
    },
  });

  const formattedValue = (value / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const ariaLabel = `${isCollapsed ? 'open' : 'collapse'} ${name}`;

  return (
    <div className={`nav-account ${type} ${sort.isDragging ? 'account-is-dragging' : ''}`}>
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

      {!isCollapsed && (
        <>
          {accounts.map((acc, index) => (
            <React.Fragment key={acc.entityId}>
              {sort.renderPlaceholder(type, index)}
              <NavAccountRow
                account={acc}
                isSelected={acc.entityId === selectedAccountId}
                isEditingThisAccount={acc.entityId === editingAccountId}
                onSelect={onSelectAccount}
                onEdit={onEditAccount}
                dragClassName={sort.itemClassName({ id: acc.entityId })}
                dndProps={sort.getItemProps({ listId: type, id: acc.entityId, index })}
              />
            </React.Fragment>
          ))}
          {sort.renderPlaceholder(type, accounts.length)}
        </>
      )}
    </div>  );
}

export default NavAccountGroup;
