import React, { useRef } from 'react';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';
import { MasterCategoryGroup } from '../budget/budgetData';
import { TransactionSearch } from './TransactionSearch';

export interface AccountsToolbarProps {
  onAddTransaction: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  accounts?: AccountItem[];
  categoryGroups?: MasterCategoryGroup[];
  payees?: string[];
  placeholder?: string;
  onOpenViewOptions?: (rect: DOMRect) => void;
  isViewOptionsOpen?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function AccountsToolbar({
  onAddTransaction,
  searchText,
  onSearchChange,
  accounts = [],
  categoryGroups = [],
  payees = [],
  placeholder = 'Search All Accounts',
  onOpenViewOptions,
  isViewOptionsOpen = false,
  onUndo,
  onRedo,
}: AccountsToolbarProps) {
  const viewButtonRef = useRef<HTMLButtonElement>(null);

  const handleViewClick = () => {
    if (viewButtonRef.current) {
      const rect = viewButtonRef.current.getBoundingClientRect();
      onOpenViewOptions?.(rect);
    }
  };

  return (
    <div className="accounts-toolbar">
      <div className="accounts-toolbar-left">
        {/* + Add Transaction */}
        <button
          className="button add-transaction"
          type="button"
          onClick={onAddTransaction}
        >
          <Icon name="plus_circle_fill" width={16} height={16} />
          <span>Add Transaction</span>
        </button>

        {/* File Import */}
        <button
          className="button accounts-toolbar-file-import-transactions js-accounts-toolbar-file-import-transactions"
          type="button"
        >
          <Icon name="document_with_arrow_up" width={16} height={16} />
          <span>File Import</span>
        </button>

        <hr />

        {/* Undo / Redo */}
        <div className="undo-redo-container">
          <button
            className="ghost-button primary type-body undo-button"
            type="button"
            onClick={onUndo}
          >
            <Icon name="undo" width={12} height={12} />
            <span>Undo</span>
          </button>
          <button
            disabled
            className="ghost-button primary type-body redo-button"
            type="button"
            onClick={onRedo}
          >
            <Icon name="redo" width={12} height={12} />
            <span>Redo</span>
          </button>
        </div>
      </div>

      <div className="accounts-toolbar-right">
        {/* View Options Button */}
        <button
          ref={viewButtonRef}
          className={`button accounts-toolbar-view-options ${isViewOptionsOpen ? 'active' : ''}`}
          type="button"
          title="View Options"
          onClick={handleViewClick}
        >
          <span>View</span>
          <Icon name="caret_down" width={8} height={8} />
        </button>

        {/* Search Input with Autocomplete Recommendations */}
        <TransactionSearch
          searchText={searchText}
          onSearchChange={onSearchChange}
          accounts={accounts}
          categoryGroups={categoryGroups}
          payees={payees}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export default AccountsToolbar;