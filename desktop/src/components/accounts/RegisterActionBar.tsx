import React, { useRef, useState } from 'react';
import { Icon } from '../core/Icon';
import { ActionBarMorePopover } from './ActionBarMorePopover';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface RegisterActionBarProps {
  selectedCount: number;
  accounts?: AccountItem[];
  canClear?: boolean;
  canUnclear?: boolean;
  onClear: () => void;
  onUnclear?: () => void;
  onDelete?: () => void;
  onCategorize?: (rect: DOMRect) => void;
  onFlag?: (rect: DOMRect) => void;
  onMoveToAccount?: (account: AccountItem) => void;
  onDuplicate?: () => void;
  onMakeRepeating?: () => void;
  onEditMemo?: () => void;
  onExport?: () => void;
  onUncheckAll: () => void;
}

export function RegisterActionBar({
  selectedCount,
  accounts = [],
  canClear = false,
  canUnclear = false,
  onClear,
  onUnclear,
  onDelete,
  onCategorize,
  onFlag,
  onMoveToAccount,
  onDuplicate,
  onMakeRepeating,
  onEditMemo,
  onExport,
  onUncheckAll,
}: RegisterActionBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreTriggerRect, setMoreTriggerRect] = useState<DOMRect | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  if (selectedCount === 0) return null;

  const countLabel =
    selectedCount === 1 ? '1 Transaction' : `${selectedCount} Transactions`;

  const handleMoreClick = () => {
    if (moreButtonRef.current) {
      setMoreTriggerRect(moreButtonRef.current.getBoundingClientRect());
      setMoreOpen((prev) => !prev);
    }
  };

  return (
    <>
      <div className="register-action-bar-container show">
        <div className="register-action-bar-inner show">
          {/* Close / Uncheck Button */}
          <button
            className="ghost-button contrast action-bar-uncheck-button"
            type="button"
            onClick={onUncheckAll}
            aria-label="Close"
          >
            <Icon name="close" className="close-action-bar-icon" width={8} height={8} />
            {countLabel}
          </button>

          <hr />

          {/* Categorize Button */}
          <button
            className="ghost-button contrast js-action-bar-categories-menu-button"
            type="button"
            onClick={(e) => onCategorize?.(e.currentTarget.getBoundingClientRect())}
          >
            <Icon name="checkmark_inbox" width={12} height={12} />
            Categorize
          </button>

          {/* Flag Button */}
          <button
            className="ghost-button contrast js-action-bar-flags-menu-button"
            type="button"
            onClick={(e) => onFlag?.(e.currentTarget.getBoundingClientRect())}
          >
            <Icon name="flag_fill" width={12} height={12} />
            Flag
          </button>

          {/* Clear Button (only shown when selected transactions can be cleared, matching YNAB) */}
          {canClear && (
            <button
              className="ghost-button contrast js-action-bar-clear-button"
              type="button"
              onClick={onClear}
            >
              <Icon name="cleared_circle" width={12} height={12} />
              Clear
            </button>
          )}

          <hr />

          {/* More Button */}
          <button
            ref={moreButtonRef}
            className="ghost-button contrast js-action-bar-more-menu-button"
            type="button"
            onClick={handleMoreClick}
          >
            <Icon name="more_horizontal" width={12} height={12} />
            More
          </button>
        </div>
      </div>

      {/* More Options Popover */}
      {moreOpen && (
        <ActionBarMorePopover
          isOpen={moreOpen}
          triggerRect={moreTriggerRect}
          selectedCount={selectedCount}
          accounts={accounts}
          canClear={canClear}
          canUnclear={canUnclear}
          onClear={onClear}
          onUnclear={onUnclear}
          onMoveToAccount={onMoveToAccount}
          onDuplicate={onDuplicate}
          onMakeRepeating={onMakeRepeating}
          onEditMemo={onEditMemo}
          onExport={onExport}
          onDelete={onDelete}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </>
  );
}

export default RegisterActionBar;
