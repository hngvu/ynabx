import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { MasterCategoryGroup } from '../budget/budgetData';

export interface ActionBarCategorizePopoverProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  categoryGroups: MasterCategoryGroup[];
  onSelectCategory: (catId: string, fullCategoryName: string) => void;
  onClose: () => void;
}

export function ActionBarCategorizePopover({
  isOpen,
  triggerRect,
  categoryGroups,
  onSelectCategory,
  onClose,
}: ActionBarCategorizePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupItemRect, setGroupItemRect] = useState<DOMRect | null>(null);

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

  const popoverWidth = 232; // 14.5rem
  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  const left = Math.max(16, Math.min(triggerCenter - popoverWidth / 2, window.innerWidth - popoverWidth - 16));
  const arrowLeft = Math.max(16, Math.min(triggerCenter - left - 15, popoverWidth - 45));
  const bottom = window.innerHeight - triggerRect.top + 10;

  const activeGroup = categoryGroups.find((g) => g.entityId === activeGroupId);
  const hasSubcategories = activeGroup && activeGroup.categories && activeGroup.categories.length > 0;

  // Submenu position: align submenu bottom with root popover bottom, so it ALWAYS expands UPWARDS above the Action Bar
  const submenuBottom = bottom;
  const submenuLeft = left + popoverWidth + 260 > window.innerWidth ? Math.max(16, left - 256) : left + popoverWidth;

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
      {/* Root Category Groups Popover */}
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
          {categoryGroups.map((group) => {
            const hasSubs = group.categories && group.categories.length > 0;
            const isActive = activeGroupId === group.entityId;

            return (
              <li
                key={group.entityId}
                role="presentation"
                data-list={`subcategories-menu-${group.entityId}`}
                onMouseEnter={(e) => {
                  setActiveGroupId(group.entityId);
                  setGroupItemRect(e.currentTarget.getBoundingClientRect());
                }}
                style={{ listStyle: 'none', margin: 0, padding: 0 }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className={`button-list ${isActive ? 'is-active' : ''}`}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.75rem',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: isActive
                      ? 'var(--backgroundSecondaryElevated, #edf2fe)'
                      : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--labelPrimary, #1b1d48)',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {group.name}
                  </span>
                  {hasSubs && (
                    <Icon
                      name="chevron_right"
                      width={12}
                      height={12}
                      className="menu-disclosure"
                      style={{ color: 'var(--iconFillPrimary, #727484)' }}
                    />
                  )}
                </button>
              </li>
            );
          })}
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

      {/* Flyout Submenu for Subcategories, anchored bottom-up */}
      {hasSubcategories && (
        <div
          className="modal modal-popup active is-rendered"
          onMouseEnter={() => {}}
          onMouseLeave={() => {
            setActiveGroupId(null);
            setGroupItemRect(null);
          }}
          style={{
            position: 'absolute',
            bottom: `${submenuBottom}px`,
            left: `${submenuLeft}px`,
            width: '16rem',
            maxHeight: '350px',
            backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
            borderRadius: '0.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
            zIndex: 10003,
            overflowY: 'auto',
          }}
        >
          <ul
            role="menu"
            className="submenu action-bar-submenu"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '0.25rem',
            }}
          >
            {activeGroup.categories.map((sub) => (
              <li key={sub.entityId} role="presentation">
                <button
                  type="button"
                  role="menuitem"
                  className="button-list"
                  onClick={() => {
                    onSelectCategory(sub.entityId, `${activeGroup.name}: ${sub.name}`);
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
                  <span>{sub.name}</span>
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

export default ActionBarCategorizePopover;
