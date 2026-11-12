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
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
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
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
}: NavAccountRowProps) {
  const showNotificationIcon = (account.accountCalculation?.notificationCount ?? 0) > 0;
  const balance = account.accountCalculation?.balance ?? 0;
  const formattedBalance = (balance / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <a
      className={`nav-account-row ${isSelected ? 'is-selected' : ''} ${
        isEditingThisAccount ? 'is-editing-this-account' : ''
      } ${isDragging ? 'is-original-dragging' : ''}`}
      draggable="true"
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      href={`#account-${account.entityId}`}
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
      <div className="nav-account-name user-data" title={account.accountName}>
        {account.accountName}
      </div>
      <div className="nav-account-value user-data">
        {formattedBalance}
      </div>
      {account.isMissingLoanDetails ? (
        <div className="nav-account-icons nav-account-icons-right">
          <Icon name="gear" width={16} />
        </div>
      ) : account.isDirectImportLinked ? (
        <DirectImportStatusIcon status={account.directImportStatus || 'good'} />
      ) : (
        <div className="nav-account-icons nav-account-icons-right" />
      )}
    </a>
  );
}

export default NavAccountRow;
