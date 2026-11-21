import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { calculatePopoverPosition } from '../../utils/popoverPosition';
import { MasterCategoryGroup } from './budgetData';

export interface HiddenCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  groups: MasterCategoryGroup[];
  onUnhide: (id: string, isMaster?: boolean) => void;
  onUnhideAll: () => void;
}

export function HiddenCategoriesModal({
  isOpen,
  onClose,
  triggerRect,
  groups,
  onUnhide,
  onUnhideAll,
}: HiddenCategoriesModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hiddenEntries = groups
    .map((g) => ({
      group: g,
      hiddenCats: g.categories.filter((c) => c.isHidden),
    }))
    .filter((entry) => entry.group.isHidden || entry.hiddenCats.length > 0);

  const modalWidth = 300;
  const modalHeight = 280;
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'down',
    horizontalAlign: 'center',
  });

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-budget-hidden-categories"
      style={{ position: 'fixed', inset: 0, zIndex: 10002, display: 'block' }}
      onClick={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          margin: 0,
          opacity: 1,
          visibility: 'visible',
          transform: 'scale(1)',
          display: 'block',
          width: `${modalWidth}px`,
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          boxShadow: 'var(--modalShadow, 0 8px 24px rgba(0,0,0,0.18))',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--labelPrimary)' }}>
          Click a category to show it
        </div>

        {hiddenEntries.length > 0 ? (
          <>
            <ul
              className="modal-content"
              style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem', maxHeight: '220px', overflowY: 'auto' }}
            >
              {hiddenEntries.map(({ group, hiddenCats }) => (
                <React.Fragment key={group.entityId}>
                  {group.isHidden ? (
                    <li className="modal-budget-hidden-categories-master-hidden" style={{ marginTop: '0.25rem' }}>
                      <button
                        title={group.name}
                        className="category-name-text"
                        type="button"
                        onClick={() => {
                          onUnhide(group.entityId, true);
                          onClose();
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '2px 0', color: 'var(--labelAction, #2563eb)' }}
                      >
                        <span className="user-entered-text">{group.name}:</span>
                      </button>
                    </li>
                  ) : (
                    <li className="modal-budget-hidden-categories-master-unhidden category-name-text" title={group.name} style={{ marginTop: '0.375rem', fontWeight: 700, fontSize: '12px', color: 'var(--labelSecondary)' }}>
                      <span className="user-entered-text">{group.name}:</span>
                    </li>
                  )}
                  {hiddenCats.map((cat) => (
                    <li key={cat.entityId} className="modal-budget-hidden-categories-sub-hidden" style={{ paddingLeft: '0.75rem' }}>
                      <button
                        title={cat.name}
                        className="category-name-text"
                        type="button"
                        onClick={() => {
                          onUnhide(cat.entityId, false);
                          onClose();
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', color: 'var(--labelPrimary)', fontSize: '13px' }}
                      >
                        <span className="user-entered-text">{cat.name}</span>
                      </button>
                    </li>
                  ))}
                </React.Fragment>
              ))}
            </ul>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="button button-primary-small"
                type="button"
                onClick={() => {
                  onUnhideAll();
                  onClose();
                }}
              >
                Show All Hidden Categories
              </button>
            </div>
          </>
        ) : (
          <div className="modal-content" style={{ fontSize: '13px', color: 'var(--labelSecondary)' }}>
            No hidden categories.
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default HiddenCategoriesModal;
