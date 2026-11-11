import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { MasterCategoryGroup } from '../budget/budgetData';

export interface CategoryPickerPopoverProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  selectedCategoryId: string;
  categoryGroups: MasterCategoryGroup[];
  placement?: 'up' | 'down';
  onSelectCategory: (catId: string, fullCategoryName: string) => void;
  onClose: () => void;
}

export function CategoryPickerPopover({
  isOpen,
  triggerRect,
  selectedCategoryId,
  categoryGroups,
  placement = 'down',
  onSelectCategory,
  onClose,
}: CategoryPickerPopoverProps) {
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

  const filteredGroups = useMemo(() => {
    if (!filterText.trim()) return categoryGroups;
    const q = filterText.toLowerCase();

    return categoryGroups
      .map((group) => {
        const matchingCategories = group.categories.filter(
          (c) =>
            c.name.toLowerCase().includes(q) || group.name.toLowerCase().includes(q)
        );
        return {
          ...group,
          categories: matchingCategories,
        };
      })
      .filter((g) => g.categories.length > 0);
  }, [categoryGroups, filterText]);

  if (!isOpen || !triggerRect) return null;

  const isUp = placement === 'up';
  const popoverWidth = 320; // 20rem = 320px
  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  const left = Math.max(16, Math.min(triggerCenter - popoverWidth / 2, window.innerWidth - popoverWidth - 16));
  const arrowLeft = Math.max(16, Math.min(triggerCenter - left - 15, popoverWidth - 45));

  const positionStyles: React.CSSProperties = isUp
    ? {
        position: 'absolute',
        bottom: `${window.innerHeight - triggerRect.top + 12}px`,
        left: `${left}px`,
      }
    : {
        position: 'absolute',
        top: `${triggerRect.bottom + 12}px`,
        left: `${left}px`,
      };

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
        className="modal modal-popup modal-account-dropdown modal-account-categories active is-rendered"
        role="dialog"
        style={{
          ...positionStyles,
          width: '20rem',
          maxHeight: '24rem',
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          color: 'var(--labelPrimary, #1b1d48)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
          borderRadius: '0.5rem',
          padding: '0.5rem 0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10002,
        }}
      >
        {/* Pointer Arrow pointing to trigger */}
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
        {/* Search Input for categories */}
        <div style={{ padding: '0.25rem 0.75rem 0.5rem' }}>
          <input
            type="search"
            placeholder="Search categories..."
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
          {filteredGroups.map((group) => (
            <React.Fragment key={group.entityId}>
              {/* Group Header */}
              <li
                className="user-data section-item modal-account-categories-section-item"
                style={{
                  padding: '0.5rem 0.75rem 0.25rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--labelSecondary, #727484)',
                  letterSpacing: '0.05em',
                  listStyle: 'none',
                }}
              >
                {group.name}
              </li>

              {/* Subcategories */}
              {group.categories.map((cat) => {
                const isSelected = cat.entityId === selectedCategoryId;
                const fullName = `${group.name}: ${cat.name}`;

                return (
                  <li
                    key={cat.entityId}
                    className={`user-data ${isSelected ? 'is-selected' : ''}`}
                    style={{ listStyle: 'none', margin: 0, padding: 0 }}
                  >
                    <button
                      type="button"
                      className="button-list existing-category"
                      onClick={() => {
                        onSelectCategory(cat.entityId, fullName);
                        onClose();
                      }}
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.75rem',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: isSelected
                          ? 'var(--backgroundSecondaryElevated, #edf2fe)'
                          : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: 'var(--labelPrimary, #1b1d48)',
                      }}
                    >
                      <span
                        className="selected-icon-container"
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
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </React.Fragment>
          ))}

          {filteredGroups.length === 0 && (
            <li
              style={{
                padding: '1rem',
                textAlign: 'center',
                color: 'var(--labelSecondary, #727484)',
                fontSize: '0.8125rem',
              }}
            >
              No categories found
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body
  );
}

export default CategoryPickerPopover;