import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface ActionBarMorePopoverProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  selectedCount: number;
  accounts?: AccountItem[];
  canClear?: boolean;
  canUnclear?: boolean;
  onClear?: () => void;
  onUnclear?: () => void;
  onMoveToAccount?: (account: AccountItem) => void;
  onDuplicate?: () => void;
  onMakeRepeating?: () => void;
  onEditMemo?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function ActionBarMorePopover({
  isOpen,
  triggerRect,
  selectedCount,
  accounts = [],
  canClear = false,
  canUnclear = false,
  onClear,
  onUnclear,
  onMoveToAccount,
  onDuplicate,
  onMakeRepeating,
  onEditMemo,
  onExport,
  onDelete,
  onClose,
}: ActionBarMorePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'accounts' | null>(null);

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

  if (!isOpen || !triggerRect) return null;

  const popoverWidth = 232;
  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  const left = Math.max(16, Math.min(triggerCenter - popoverWidth / 2, window.innerWidth - popoverWidth - 16));
  const arrowLeft = Math.max(16, Math.min(triggerCenter - left - 15, popoverWidth - 45));
  const bottom = window.innerHeight - triggerRect.top + 10;

  // Submenu position: default opens to the right if space allows, otherwise opens to the left (matching YNAB shouldOpenLeft logic)
  const submenuWidth = 208; // 13rem
  const shouldOpenLeft = left + popoverWidth + submenuWidth + 16 > window.innerWidth;
  const submenuBottom = bottom;
  const submenuLeft = shouldOpenLeft
    ? Math.max(16, left - submenuWidth)
    : left + popoverWidth;

  const showClearSection = canClear || canUnclear;

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-account-register-action-bar"
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
        className="modal modal-popup active is-rendered"
        role="dialog"
        style={{
          position: 'absolute',
          bottom: `${bottom}px`,
          left: `${left}px`,
          width: '14.5rem',
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          color: 'var(--labelPrimary, #1b1d48)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
          borderRadius: '0.5rem',
          padding: '0.25rem 0',
          zIndex: 10002,
        }}
      >
        <ul
          className="modal-list action-bar-menu"
          role="menu"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0.25rem',
          }}
        >
          {/* Clear Section */}
          {showClearSection && (
            <>
              {canClear && (
                <li role="presentation">
                  <button
                    type="button"
                    className="button-list modal-account-mark-as-cleared"
                    onClick={() => {
                      onClear?.();
                      onClose();
                    }}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: 'none',
                      background: 'none',
                      fontSize: '0.8125rem',
                      color: 'var(--labelPrimary, #1b1d48)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon name="cleared_circle_fill" width={14} height={14} />
                    <span style={{ flex: 1 }}>Mark as Cleared</span>
                    <span
                      className="shortcut-key float-right"
                      style={{
                        fontSize: '0.6875rem',
                        padding: '0.1rem 0.3rem',
                        borderRadius: '0.25rem',
                        backgroundColor: 'var(--fillTertiary, #e9eaf2)',
                        color: 'var(--labelSecondary, #727484)',
                      }}
                    >
                      C
                    </span>
                  </button>
                </li>
              )}
              {canUnclear && (
                <li role="presentation">
                  <button
                    type="button"
                    className="button-list modal-account-mark-as-uncleared"
                    onClick={() => {
                      onUnclear?.();
                      onClose();
                    }}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: 'none',
                      background: 'none',
                      fontSize: '0.8125rem',
                      color: 'var(--labelPrimary, #1b1d48)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon name="cleared_circle" width={14} height={14} />
                    <span style={{ flex: 1 }}>Mark as Uncleared</span>
                    <span
                      className="shortcut-key float-right"
                      style={{
                        fontSize: '0.6875rem',
                        padding: '0.1rem 0.3rem',
                        borderRadius: '0.25rem',
                        backgroundColor: 'var(--fillTertiary, #e9eaf2)',
                        color: 'var(--labelSecondary, #727484)',
                      }}
                    >
                      C
                    </span>
                  </button>
                </li>
              )}
              <li role="presentation" style={{ padding: '0.25rem 0' }}>
                <hr
                  style={{
                    border: 'none',
                    borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                    margin: '0 0.5rem',
                  }}
                />
              </li>
            </>
          )}

          {/* Match (disabled unless matched) */}
          <li role="presentation">
            <button
              type="button"
              className="button-list button-disabled"
              disabled
              title="To match, select two transactions, one you entered and one from your bank."
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                fontSize: '0.8125rem',
                color: 'var(--labelTertiary, #8e90a0)',
                cursor: 'not-allowed',
                textAlign: 'left',
              }}
            >
              <Icon name="link" width={14} height={14} />
              <span style={{ flex: 1 }}>Match</span>
              <span
                className="shortcut-key float-right"
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'var(--fillTertiary, #e9eaf2)',
                  color: 'var(--labelSecondary, #727484)',
                }}
              >
                M
              </span>
            </button>
          </li>

          {/* Unmatch (disabled) */}
          <li role="presentation">
            <button
              type="button"
              className="button-list button-disabled"
              disabled
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                fontSize: '0.8125rem',
                color: 'var(--labelTertiary, #8e90a0)',
                cursor: 'not-allowed',
                textAlign: 'left',
              }}
            >
              <Icon name="link_broken" width={14} height={14} />
              <span style={{ flex: 1 }}>Unmatch</span>
              <span
                className="shortcut-key float-right"
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'var(--fillTertiary, #e9eaf2)',
                  color: 'var(--labelSecondary, #727484)',
                }}
              >
                shift U
              </span>
            </button>
          </li>

          <li role="presentation" style={{ padding: '0.25rem 0' }}>
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                margin: '0 0.5rem',
              }}
            />
          </li>

          {/* Duplicate */}
          <li role="presentation">
            <button
              type="button"
              className="button-list"
              onClick={() => {
                onDuplicate?.();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                fontSize: '0.8125rem',
                color: 'var(--labelPrimary, #1b1d48)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="document_on_document_fill" width={14} height={14} />
              <span style={{ flex: 1 }}>Duplicate</span>
              <span
                className="shortcut-key float-right"
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'var(--fillTertiary, #e9eaf2)',
                  color: 'var(--labelSecondary, #727484)',
                }}
              >
                shift D
              </span>
            </button>
          </li>

          {/* Make Repeating (only if 1 selected) */}
          {selectedCount === 1 && (
            <li role="presentation">
              <button
                type="button"
                className="button-list button-make-repeating"
                onClick={() => {
                  onMakeRepeating?.();
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.8125rem',
                  color: 'var(--labelPrimary, #1b1d48)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Icon name="repeat" width={14} height={14} />
                <span style={{ flex: 1 }}>Make Repeating</span>
                <span
                  className="shortcut-key float-right"
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '0.25rem',
                    backgroundColor: 'var(--fillTertiary, #e9eaf2)',
                    color: 'var(--labelSecondary, #727484)',
                  }}
                >
                  shift T
                </span>
              </button>
            </li>
          )}

          <li role="presentation" style={{ padding: '0.25rem 0' }}>
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                margin: '0 0.5rem',
              }}
            />
          </li>

          {/* Memo... */}
          <li role="presentation">
            <button
              type="button"
              className="button-list modal-memos"
              onClick={() => {
                onEditMemo?.();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                fontSize: '0.8125rem',
                color: 'var(--labelPrimary, #1b1d48)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="memo" width={14} height={14} />
              <span style={{ flex: 1 }}>Memo...</span>
            </button>
          </li>

          <li role="presentation" style={{ padding: '0.25rem 0' }}>
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                margin: '0 0.5rem',
              }}
            />
          </li>

          {/* Move to Account */}
          <li
            role="presentation"
            data-list="accounts"
            className="modal-account-edit-transaction-move"
            onMouseEnter={() => setActiveSubmenu('accounts')}
            style={{ position: 'relative' }}
          >
            <button
              type="button"
              className={`button-list ${activeSubmenu === 'accounts' ? 'is-active' : ''}`}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background:
                  activeSubmenu === 'accounts'
                    ? 'var(--backgroundSecondaryElevated, #edf2fe)'
                    : 'none',
                fontSize: '0.8125rem',
                color: 'var(--labelPrimary, #1b1d48)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="arrow_into_rectangle" width={14} height={14} />
              <span style={{ flex: 1 }}>Move to Account</span>
              <Icon name="chevron_right" width={12} height={12} className="menu-disclosure" />
            </button>
          </li>

          <li role="presentation" style={{ padding: '0.25rem 0' }}>
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                margin: '0 0.5rem',
              }}
            />
          </li>

          {/* Export */}
          <li role="presentation">
            <button
              type="button"
              className="button-list modal-account-edit-transaction-export"
              onClick={() => {
                onExport?.();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                fontSize: '0.8125rem',
                color: 'var(--labelPrimary, #1b1d48)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="document_with_arrow_down" width={14} height={14} />
              <span style={{ flex: 1 }}>
                Export {selectedCount} {selectedCount === 1 ? 'Transaction' : 'Transactions'}
              </span>
            </button>
          </li>

          <li role="presentation" style={{ padding: '0.25rem 0' }}>
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                margin: '0 0.5rem',
              }}
            />
          </li>

          {/* Delete */}
          <li role="presentation">
            <button
              type="button"
              className="button-list modal-account-edit-transaction-delete"
              onClick={() => {
                onDelete?.();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                fontSize: '0.8125rem',
                color: 'var(--labelNegative, #bf2e3b)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="trash_can" width={14} height={14} />
              <span style={{ flex: 1 }}>Delete</span>
              <span
                className="shortcut-key float-right"
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'var(--fillTertiary, #e9eaf2)',
                  color: 'var(--labelSecondary, #727484)',
                }}
              >
                delete
              </span>
            </button>
          </li>
        </ul>

        {/* Downward pointer arrow */}
        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: '100%',
            left: `${arrowLeft}px`,
            width: '1.875rem',
            height: '0.9375rem',
            fill: 'var(--backgroundPrimaryElevated, #ffffff)',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
            pointerEvents: 'none',
          }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" transform="rotate(180 50 50)" />
        </svg>
      </div>

      {/* Flyout Submenu for Accounts, anchored bottom-up */}
      {activeSubmenu === 'accounts' && (
        <div
          className="modal modal-popup active is-rendered"
          onMouseEnter={() => {}}
          onMouseLeave={() => setActiveSubmenu(null)}
          style={{
            position: 'absolute',
            bottom: `${submenuBottom}px`,
            left: `${submenuLeft}px`,
            width: '13rem',
            maxHeight: '300px',
            backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
            borderRadius: '0.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
            zIndex: 10003,
            overflowY: 'auto',
          }}
        >
          <ul
            role="menu"
            className={`submenu action-bar-submenu ${shouldOpenLeft ? 'open-left' : ''}`}
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '0.25rem',
            }}
          >
            {accounts.map((acc) => (
              <li key={acc.entityId} role="presentation">
                <button
                  type="button"
                  className="button-list user-data"
                  onClick={() => {
                    onMoveToAccount?.(acc);
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.75rem',
                    textAlign: 'left',
                    display: 'block',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.8125rem',
                    color: 'var(--labelPrimary, #1b1d48)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {acc.accountName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>,
    document.body
  );
}

export default ActionBarMorePopover;
