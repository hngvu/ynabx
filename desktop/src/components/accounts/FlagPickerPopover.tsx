import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { calculatePopoverPosition } from '../../utils/popoverPosition';

export interface FlagPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  currentFlag?: string | null;
  hasActiveFlags?: boolean;
  isBulk?: boolean;
  onSelectFlag: (flagColor: string | null) => void;
  onOpenEditFlags?: () => void;
}

const FLAG_OPTIONS = [
  { id: 'red', label: 'Red', color: '#ea4335', key: '1' },
  { id: 'orange', label: 'Orange', color: '#ff9500', key: '2' },
  { id: 'yellow', label: 'Yellow', color: '#fbbc04', key: '3' },
  { id: 'green', label: 'Green', color: '#34a853', key: '4' },
  { id: 'blue', label: 'Blue', color: '#4285f4', key: '5' },
  { id: 'purple', label: 'Purple', color: '#a142f4', key: '6' },
];

export function FlagPickerPopover({
  isOpen,
  onClose,
  triggerRect,
  currentFlag,
  hasActiveFlags = false,
  isBulk = false,
  onSelectFlag,
  onOpenEditFlags,
}: FlagPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === '0' && (currentFlag || (isBulk && hasActiveFlags))) {
        onSelectFlag(null);
        onClose();
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        const option = FLAG_OPTIONS[num - 1];
        if (option) {
          onSelectFlag(option.id);
          onClose();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, onSelectFlag, currentFlag, isBulk, hasActiveFlags]);

  if (!isOpen || !triggerRect) return null;

  // If opening from the bottom Action Bar (isBulk or trigger near bottom)
  if (isBulk) {
    const popoverWidth = 224; // 14rem
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const left = Math.max(
      16,
      Math.min(triggerCenter - popoverWidth / 2, window.innerWidth - popoverWidth - 16)
    );
    const arrowLeft = Math.max(16, Math.min(triggerCenter - left - 15, popoverWidth - 45));
    const bottom = window.innerHeight - triggerRect.top + 10;

    return createPortal(
      <div
        className="modal-overlay active ynab-u modal-popup modal-account-register-action-bar modal-account-flags"
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
            width: '14rem',
            backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
            color: 'var(--labelPrimary, #1b1d48)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
            borderRadius: '0.5rem',
            padding: '0.25rem 0',
            zIndex: 10002,
          }}
        >
          <ul
            className="flags-list"
            role="menu"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '0.25rem',
            }}
          >
            {hasActiveFlags && (
              <>
                <li role="presentation">
                  <button
                    type="button"
                    className="button-list"
                    onClick={() => {
                      onSelectFlag(null);
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
                    <Icon name="close" width={12} height={12} />
                    <span style={{ flex: 1 }}>Clear</span>
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
                      0
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
              </>
            )}

            {FLAG_OPTIONS.map((f) => (
              <li key={f.id} role="presentation">
                <button
                  type="button"
                  className="button-list user-data"
                  onClick={() => {
                    onSelectFlag(f.id);
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.8125rem',
                    color: 'var(--labelPrimary, #1b1d48)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: f.color,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{f.label}</span>
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
                    {f.key}
                  </span>
                </button>
              </li>
            ))}

            <li role="presentation" style={{ padding: '0.25rem 0' }}>
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--separatorStandard, #e5e5eb)',
                  margin: '0 0.5rem',
                }}
              />
            </li>

            <li role="presentation">
              <button
                type="button"
                className="button edit-flags"
                onClick={() => {
                  onClose();
                  onOpenEditFlags?.();
                }}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.8125rem',
                  color: 'var(--labelLink, #2b71c7)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Edit Flag Names...
              </button>
            </li>
          </ul>

          {/* Downward pointer arrow towards the Action Bar Flag button */}
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
      </div>,
      document.body
    );
  }

  // Row-level flag picker (positioned below the flag icon in the register row)
  const modalWidth = 272; // 17em
  const modalHeight = currentFlag ? 280 : 250;

  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'up',
    horizontalAlign: 'start',
  });

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-account-flags"
      style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'block' }}
      onClick={onClose}
    >
      <div
        ref={popoverRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          width: '17em',
          margin: 0,
          opacity: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="flags-list" style={{ padding: '0.5rem 0', margin: 0, listStyle: 'none' }}>
          {currentFlag && (
            <>
              <li
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.375rem 1rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onSelectFlag(null);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="close" width={14} height={14} style={{ color: 'var(--iconFillPrimary)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--labelPrimary)' }}>Clear Flag</span>
                </div>
              </li>
              <hr style={{ border: 'none', borderTop: '1px solid var(--separatorStandard)', margin: '0.25rem 0' }} />
            </>
          )}

          {FLAG_OPTIONS.map((f) => {
            const isSelected = currentFlag === f.id;
            return (
              <li
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.375rem 1rem',
                  cursor: 'pointer',
                  borderRadius: '0.25rem',
                }}
                className="flag-option-item"
                onClick={() => {
                  onSelectFlag(f.id);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Icon
                    name="flag_fill"
                    width={16}
                    height={16}
                    style={{ color: f.color, fill: f.color }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--labelPrimary)', fontWeight: isSelected ? 600 : 400 }}>
                    {f.label}
                  </span>
                  {isSelected && (
                    <Icon name="check" width={14} height={14} style={{ color: 'var(--actionPrimary)' }} />
                  )}
                </div>
                <span
                  className="shortcut-key"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--labelSecondary)',
                    backgroundColor: 'var(--backgroundSecondaryElevated, #f0f1f5)',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                  }}
                >
                  {f.key}
                </span>
              </li>
            );
          })}

          <hr style={{ border: 'none', borderTop: '1px solid var(--separatorStandard)', margin: '0.375rem 0' }} />

          <li style={{ padding: '0.25rem 1rem' }}>
            <button
              className="button edit-flags"
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--actionPrimary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0',
              }}
              onClick={() => {
                onClose();
                onOpenEditFlags?.();
              }}
            >
              <Icon name="edit" width={14} height={14} />
              <span>Edit Flags</span>
            </button>
          </li>
        </ul>

        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            left: pos.arrowLeft,
            bottom: '100%',
            height: '0.9375rem',
            width: '1.875rem',
            position: 'absolute',
          }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" />
        </svg>
      </div>
    </div>,
    document.body
  );
}

export default FlagPickerPopover;
