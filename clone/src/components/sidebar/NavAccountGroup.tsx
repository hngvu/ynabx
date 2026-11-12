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
  onReorderAccounts?: (draggedId: string, targetId: string) => void;
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
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dropTargetAccount, setDropTargetAccount] = useState<{ accountId: string; position: 'above' | 'below' } | null>(null);

  const formattedValue = (value / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const ariaLabel = `${isCollapsed ? 'open' : 'collapse'} ${name}`;

  return (
    <div className={`nav-account ${type} ${draggedAccountId ? 'account-is-dragging' : ''}`}>
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
        accounts.map((acc) => {
          const isDropAbove = dropTargetAccount?.accountId === acc.entityId && dropTargetAccount?.position === 'above';
          const isDropBelow = dropTargetAccount?.accountId === acc.entityId && dropTargetAccount?.position === 'below';

          return (
            <React.Fragment key={acc.entityId}>
              {isDropAbove && <div className="drag-placeholder" />}
              <NavAccountRow
                account={acc}
                isSelected={acc.entityId === selectedAccountId}
                isEditingThisAccount={acc.entityId === editingAccountId}
                onSelect={onSelectAccount}
                onEdit={onEditAccount}
                isDragging={draggedAccountId === acc.entityId}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', acc.entityId);
                  setDraggedAccountId(acc.entityId);
                }}
                onDragOver={(e) => {
                  if (draggedAccountId === acc.entityId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isTopHalf = e.clientY < rect.top + rect.height / 2;
                  const position = isTopHalf ? 'above' : 'below';
                  if (dropTargetAccount?.accountId !== acc.entityId || dropTargetAccount?.position !== position) {
                    setDropTargetAccount({ accountId: acc.entityId, position });
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dropTargetAccount?.accountId === acc.entityId) {
                    setDropTargetAccount(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const sourceId = e.dataTransfer.getData('text/plain') || draggedAccountId;
                  if (sourceId && sourceId !== acc.entityId) {
                    onReorderAccounts?.(sourceId, acc.entityId);
                  }
                  setDraggedAccountId(null);
                  setDropTargetAccount(null);
                }}
                onDragEnd={() => {
                  setDraggedAccountId(null);
                  setDropTargetAccount(null);
                }}
              />
              {isDropBelow && <div className="drag-placeholder" />}
            </React.Fragment>
          );
        })}
    </div>
  );
}

export default NavAccountGroup;
