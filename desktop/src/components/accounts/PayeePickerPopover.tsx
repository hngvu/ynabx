import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface PayeeItem {
  id: string;
  name: string;
  isTransfer?: boolean;
  targetAccountId?: string;
}

export interface PayeePickerPopoverProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  currentPayeeName: string;
  payees: string[];
  accounts: AccountItem[];
  currentAccountId?: string;
  placement?: 'up' | 'down';
  onSelectPayee: (payeeName: string, targetAccountId?: string) => void;
  onClose: () => void;
  onOpenManagePayees?: () => void;
}

export function PayeePickerPopover({
  isOpen,
  triggerRect,
  currentPayeeName,
  payees,
  accounts,
  currentAccountId,
  placement = 'down',
  onSelectPayee,
  onClose,
  onOpenManagePayees,
}: PayeePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [filterText, setFilterText] = useState(currentPayeeName || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Sync initial search term when opening
  useEffect(() => {
    if (isOpen) {
      setFilterText(currentPayeeName || '');
      setHighlightedIndex(0);
    }
  }, [isOpen, currentPayeeName]);

  // Click outside and escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
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

  // 1. Transfer options to other accounts
  const transferPayees = useMemo(() => {
    return accounts
      .filter((a) => a.entityId !== currentAccountId)
      .map((a) => ({
        id: `transfer-${a.entityId}`,
        name: `Transfer : ${a.accountName}`,
        isTransfer: true,
        targetAccountId: a.entityId,
      }));
  }, [accounts, currentAccountId]);

  // 2. Regular user payees
  const regularPayees = useMemo(() => {
    const list = Array.from(new Set(payees.filter((p) => p && p.trim().length > 0)));
    return list.map((name) => ({
      id: `payee-${name}`,
      name,
      isTransfer: false,
    }));
  }, [payees]);

  // 3. Filtered lists based on filterText
  const q = filterText.trim().toLowerCase();

  const filteredTransfers = useMemo(() => {
    if (!q) return transferPayees;
    return transferPayees.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.name.replace(/^Transfer\s*:\s*/i, '').toLowerCase().includes(q)
    );
  }, [transferPayees, q]);

  const filteredRegular = useMemo(() => {
    if (!q) return regularPayees;
    return regularPayees.filter((p) => p.name.toLowerCase().includes(q));
  }, [regularPayees, q]);

  // Exact match check for "Create Payee" header action
  const exactMatchExists = useMemo(() => {
    if (!q) return true;
    const inTransfers = transferPayees.some((t) =>
      t.name.toLowerCase() === q ||
      t.name.replace(/^Transfer\s*:\s*/i, '').toLowerCase() === q
    );
    const inRegular = regularPayees.some((p) => p.name.toLowerCase() === q);
    return inTransfers || inRegular;
  }, [q, transferPayees, regularPayees]);

  // All actionable items for keyboard navigation
  const allSelectableItems = useMemo(() => {
    const items: Array<{
      type: 'create' | 'transfer' | 'payee';
      name: string;
      id: string;
      targetAccountId?: string;
    }> = [];

    if (!exactMatchExists && filterText.trim()) {
      items.push({
        type: 'create',
        name: filterText.trim(),
        id: 'create-payee',
      });
    }

    filteredTransfers.forEach((t) => {
      items.push({
        type: 'transfer',
        name: t.name,
        id: t.id,
        targetAccountId: t.targetAccountId,
      });
    });

    filteredRegular.forEach((p) => {
      items.push({
        type: 'payee',
        name: p.name,
        id: p.id,
      });
    });

    return items;
  }, [exactMatchExists, filterText, filteredTransfers, filteredRegular]);

  // Keyboard navigation up / down / enter
  useEffect(() => {
    if (!isOpen) return;

    const handleListKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allSelectableItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : allSelectableItems.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allSelectableItems[highlightedIndex]) {
          const item = allSelectableItems[highlightedIndex];
          onSelectPayee(item.name, item.targetAccountId);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleListKeyDown);
    return () => window.removeEventListener('keydown', handleListKeyDown);
  }, [isOpen, allSelectableItems, highlightedIndex, onSelectPayee, onClose]);

  if (!isOpen || !triggerRect) return null;

  // Positioning
  const isUp = placement === 'up';
  const width = Math.max(triggerRect.width, 320); // matching Ember 20rem (320px)
  let top = isUp ? triggerRect.top - 12 : triggerRect.bottom + 12;
  let left = triggerRect.left;

  // Viewport bounds check
  if (left + width > window.innerWidth - 16) {
    left = window.innerWidth - width - 16;
  }
  if (left < 16) {
    left = 16;
  }

  const arrowLeft = Math.max(16, Math.min(width - 32, triggerRect.left - left + triggerRect.width / 2 - 12));

  return createPortal(
    <div
      className="modal-overlay active modal-account-dropdown modal-account-payees"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        pointerEvents: 'auto',
      }}
    >
      <div
        ref={popoverRef}
        className="modal"
        style={{
          position: 'absolute',
          top: isUp ? 'auto' : `${top}px`,
          bottom: isUp ? `${window.innerHeight - triggerRect.top + 12}px` : 'auto',
          left: `${left}px`,
          width: `${width}px`,
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          borderRadius: '0.25rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid var(--separatorStandard, #e5e5eb)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'visible',
          opacity: 1,
          transform: 'scale(1)',
        }}
      >
        {/* Pointer Arrow */}
        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            ...(isUp ? { top: '100%' } : { bottom: '100%' }),
            left: `${arrowLeft}px`,
            width: '1.875rem',
            height: '0.9375rem',
            fill: 'var(--backgroundPrimaryElevated, #ffffff)',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
            pointerEvents: 'none',
          }}
        >
          <path
            d="M 0 100 L 50 0 L 100 100 L 0 100 Z"
            transform={isUp ? 'rotate(180 50 50)' : undefined}
          />
        </svg>

        {/* 1. Header Action: Create New Payee if not exact match */}
        {!exactMatchExists && filterText.trim() ? (
          <div className="modal-action-header" style={{ padding: '0.75rem 1rem' }}>
            <button
              className={`button create-new-payee-button ${
                highlightedIndex === 0 ? 'is-highlighted' : ''
              }`}
              type="button"
              onClick={() => {
                onSelectPayee(filterText.trim());
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--actionPrimary, #545bfe)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textAlign: 'left',
                padding: 0,
              }}
            >
              <Icon name="plus_circle_fill" width={14} height={14} />
              <span>Create &ldquo;{filterText.trim()}&rdquo;</span>
            </button>
          </div>
        ) : (
          <div className="modal-empty-header" style={{ height: '0.5rem' }} />
        )}

        {/* 2. Scrollable Payees List */}
        <ul
          className="modal-list"
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            maxHeight: '15rem',
            overflowY: 'auto',
            borderTop: '1px solid var(--separatorSubdued, #f0f1f5)',
            borderBottom: '1px solid var(--separatorSubdued, #f0f1f5)',
          }}
        >
          {/* Section: Payments and Transfers */}
          {filteredTransfers.length > 0 && (
            <>
              <li
                className="user-data section-item"
                style={{
                  padding: '0.375rem 1rem 0.125rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--labelSecondary, #696763)',
                }}
              >
                Payments and Transfers
              </li>
              {filteredTransfers.map((item) => {
                const itemIndex = allSelectableItems.findIndex((it) => it.id === item.id);
                const isHighlighted = itemIndex === highlightedIndex;
                const isSelected = item.name === currentPayeeName;

                return (
                  <li
                    key={item.id}
                    className={`user-data ${isHighlighted ? 'is-highlighted' : ''} ${
                      isSelected ? 'is-selected' : ''
                    }`}
                    style={{
                      padding: '0.125rem 1rem',
                      backgroundColor: isHighlighted ? 'var(--backgroundSecondaryElevated, #f0f1f5)' : 'transparent',
                    }}
                    onMouseEnter={() => setHighlightedIndex(itemIndex)}
                  >
                    <button
                      className="button-list user-payee"
                      type="button"
                      onClick={() => {
                        onSelectPayee(item.name, item.targetAccountId);
                        onClose();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '0.3125rem 0',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'var(--labelPrimary, #1b1d48)',
                      }}
                    >
                      <div className="button-content" style={{ display: 'flex', alignItems: 'center' }}>
                        <span
                          className="icon-container"
                          style={{
                            width: '1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            marginRight: '0.375rem',
                          }}
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
                        <span>{item.name}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </>
          )}

          {/* Section: Payees */}
          {filteredRegular.length > 0 && (
            <>
              <li
                className="user-data section-item"
                style={{
                  padding: '0.5rem 1rem 0.125rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--labelSecondary, #696763)',
                }}
              >
                Payees
              </li>
              {filteredRegular.map((item) => {
                const itemIndex = allSelectableItems.findIndex((it) => it.id === item.id);
                const isHighlighted = itemIndex === highlightedIndex;
                const isSelected = item.name === currentPayeeName;

                return (
                  <li
                    key={item.id}
                    className={`user-data ${isHighlighted ? 'is-highlighted' : ''} ${
                      isSelected ? 'is-selected' : ''
                    }`}
                    style={{
                      padding: '0.125rem 1rem',
                      backgroundColor: isHighlighted ? 'var(--backgroundSecondaryElevated, #f0f1f5)' : 'transparent',
                    }}
                    onMouseEnter={() => setHighlightedIndex(itemIndex)}
                  >
                    <button
                      className="button-list user-payee"
                      type="button"
                      onClick={() => {
                        onSelectPayee(item.name);
                        onClose();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '0.3125rem 0',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'var(--labelPrimary, #1b1d48)',
                      }}
                    >
                      <div className="button-content" style={{ display: 'flex', alignItems: 'center' }}>
                        <span
                          className="icon-container"
                          style={{
                            width: '1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            marginRight: '0.375rem',
                          }}
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
                        <span>{item.name}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </>
          )}

          {allSelectableItems.length === 0 && (
            <li
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                color: 'var(--labelSecondary, #696763)',
                fontSize: '0.8125rem',
              }}
            >
              No matching payees
            </li>
          )}
        </ul>

        {/* 3. Footer Action: Manage Payees */}
        <div
          className="modal-account-payees-main-footer"
          style={{ padding: '0.5rem 0.75rem' }}
        >
          <button
            className="button button-manage-payees"
            type="button"
            onClick={() => {
              onClose();
              onOpenManagePayees?.();
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: 'var(--actionPrimary, #545bfe)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              padding: '0.375rem 0.25rem',
              borderRadius: '0.25rem',
            }}
          >
            Manage Payees
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PayeePickerPopover;
