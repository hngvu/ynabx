import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface AccountPickerPopoverProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  selectedAccountId: string;
  accounts: AccountItem[];
  onSelectAccount: (accountId: string) => void;
  onClose: () => void;
}

export function AccountPickerPopover({
  isOpen,
  triggerRect,
  selectedAccountId,
  accounts,
  onSelectAccount,
  onClose,
}: AccountPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const filteredAccounts = useMemo(() => {
    if (!filterText.trim()) return accounts;
    const q = filterText.toLowerCase();
    return accounts.filter((a) => a.accountName.toLowerCase().includes(q));
  }, [accounts, filterText]);

  if (!isOpen || !triggerRect) return null;

  const top = triggerRect.bottom + 6;
  const left = Math.max(16, Math.min(triggerRect.left, window.innerWidth - 320));

  return createPortal(
    <div
      className="modal-overlay active"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        pointerEvents: 'auto',
        backgroundColor: 'transparent',
      }}
    >
      <div
        ref={popoverRef}
        className="modal modal-popup modal-account-dropdown modal-account-accounts active is-rendered"
        role="dialog"
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
          width: '18rem',
          maxHeight: '22rem',
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          color: 'var(--labelPrimary, #1b1d48)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
          borderRadius: '0.375rem',
          padding: '0.5rem 0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10002,
        }}
      >
        {/* Search input for accounts */}
        <div style={{ padding: '0.25rem 0.75rem 0.5rem' }}>
          <input
            type="search"
            placeholder="Search accounts..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              width: '100%',
              height: '1.875rem',
              border: '1px solid var(--inputBorder, #c8cad6)',
              borderRadius: '0.25rem',
              padding: '0 0.5rem',
              fontSize: '0.8125rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <ul
          className="modal-list"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {filteredAccounts.map((account) => {
            const isSelected = account.entityId === selectedAccountId;
            return (
              <li
                key={account.entityId}
                className={`user-data ${isSelected ? 'is-selected' : ''}`}
                style={{ listStyle: 'none', margin: 0, padding: 0 }}
              >
                <button
                  type="button"
                  className="button-list"
                  onClick={() => {
                    onSelectAccount(account.entityId);
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: isSelected ? 'var(--backgroundSecondaryElevated, #edf2fe)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--labelPrimary, #1b1d48)',
                  }}
                >
                  <span
                    className="icon-container"
                    style={{ width: '1rem', display: 'flex', alignItems: 'center' }}
                  >
                    {isSelected && (
                      <Icon
                        name="check"
                        width={12}
                        height={12}
                        style={{ color: 'var(--actionPrimary, #545bfe)' }}
                      />
                    )}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {account.accountName}
                  </span>
                </button>
              </li>
            );
          })}

          {filteredAccounts.length === 0 && (
            <li
              style={{
                padding: '1rem',
                textAlign: 'center',
                color: 'var(--labelSecondary, #727484)',
                fontSize: '0.8125rem',
              }}
            >
              No accounts found
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body
  );
}

export default AccountPickerPopover;