import React from 'react';
import { Icon } from '../core/Icon';
import { DirectImportStatusIcon } from './DirectImportStatusIcon';

export interface AccountItem {
  entityId: string;
  accountName: string;
  accountType?: string;
  note?: string;
  isClosed?: boolean;
  isDeletable?: boolean;
  isMissingLoanDetails?: boolean;
  isDirectImportLinked?: boolean;
  directImportStatus?: 'good' | 'warning' | 'error' | 'syncing';
  accountCalculation?: {
    balance: number;
    notificationCount?: number;
  };
}

export interface NavAccountRowProps {
  account: AccountItem;
  isSelected?: boolean;
  isEditingThisAccount?: boolean;
  onSelect?: (accountId: string) => void;
  onEdit?: (accountId: string) => void;
  /** Ember-style sortable class names (is-original-dragging / is-original-hover). */
  dragClassName?: string;
  /** Drag & drop handlers from useEmberSortable().getItemProps. */
  dndProps?: React.HTMLAttributes<HTMLAnchorElement> & { draggable?: boolean };
}

/**
 * Exact decompiled from components/sidebar/nav-account-row.hbs (OQ class)
 * and components/nav-account/index.hbs (UQ class)
 */
export function NavAccountRow({
  account,
  isSelected = false,
  isEditingThisAccount = false,
  onSelect,
  onEdit,
  dragClassName = '',
  dndProps,
}: NavAccountRowProps) {
  const showNotificationIcon = (account.accountCalculation?.notificationCount ?? 0) > 0;
  const balance = account.accountCalculation?.balance ?? 0;
  const isZero = balance === 0;
  const isNegative = balance < 0;
  const absDollars = Math.abs(balance / 1000);
  const formattedAbs = absDollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <a
      className={`nav-account-row ${isSelected ? 'is-selected' : ''} ${
        isEditingThisAccount ? 'is-editing-this-account' : ''
      } ${dragClassName}`}
      draggable="true"
      {...dndProps}
      href={`/accounts/${account.entityId}`}
      data-account-id={account.entityId}
      onClick={(e) => {
        e.preventDefault();
        onSelect?.(account.entityId);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onEdit?.(account.entityId);
      }}
    >
      <div
        className="nav-account-icons nav-account-icons-left js-nav-account-icons-left"
        title="Edit Account"
        
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onEdit?.(account.entityId);
        }}
      >
        {showNotificationIcon && <Icon className="dot" name="circle_fill" width={8} />}
        <Icon className="edit" name="pencil" width={12} />
      </div>
      <div
        className="nav-account-name user-data"
        title={account.accountName}
        
      >
        {account.accountName}
      </div>
      <div
        className="nav-account-value user-data"
        
      >
        <span
          className={`user-data currency tabular-nums ${
            isZero ? 'zero' : isNegative ? 'negative' : 'positive'
          }`}
        >
          <bdi>{isNegative ? '-' : ''}$</bdi>
          {formattedAbs}
        </span>
      </div>
      {account.isMissingLoanDetails ? (
        <div className="nav-account-icons nav-account-icons-right">
          <Icon name="gear" width={16} />
        </div>
      ) : (
        <DirectImportStatusIcon
          status={account.directImportStatus || 'good'}
          showIcon={account.isDirectImportLinked && account.directImportStatus !== 'good'}
        />
      )}
    </a>
  );
}

export default NavAccountRow;
