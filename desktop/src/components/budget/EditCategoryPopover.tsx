import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../core/Button';
import { calculatePopoverPosition } from '../../utils/popoverPosition';

export interface EditCategoryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  category: {
    id: string;
    name: string;
    isMasterCategory?: boolean;
    canDelete?: boolean;
    canRename?: boolean;
    isCreditCardPaymentCategory?: boolean;
  } | null;
  onRename: (id: string, newName: string, isMaster?: boolean) => void;
  onDelete?: (id: string, isMaster?: boolean) => void;
  onHide?: (id: string, isMaster?: boolean) => void;
}

export function EditCategoryPopover({
  isOpen,
  onClose,
  triggerRect,
  category,
  onRename,
  onDelete,
  onHide,
}: EditCategoryPopoverProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [category, isOpen]);

  if (!isOpen || !triggerRect || !category) return null;

  // Ember CSS .modal-budget-edit-category .modal width is 25em (400px at 16px base font), height ~140px
  const modalWidth = 400;
  const modalHeight = 140;

  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'up',
    horizontalAlign: 'center',
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    onRename(category.id, name.trim(), category.isMasterCategory);
    onClose();
  };

  const isCreditCard = category.isCreditCardPaymentCategory;
  const canDelete = category.canDelete ?? !isCreditCard;
  const canRename = category.canRename ?? !isCreditCard;

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-budget-edit-category"
      style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'block' }}
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
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <form onSubmit={handleSave}>
            <div className="fieldset">
              {canRename ? (
                <div className="field-with-error">
                  <div>
                    <input
                      ref={inputRef}
                      placeholder="Enter category name"
                      className="modal-budget-edit-category-name user-data js-focus-on-start"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(e);
                        if (e.key === 'Escape') onClose();
                      }}
                    />
                  </div>
                </div>
              ) : (
                <span className="modal-budget-edit-category-label user-data">
                  {category.name}
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="modal-actions">
          <div className="modal-actions-left">
            <Button
              variant="secondary"
              className="button-hide"
              type="button"
              onClick={() => {
                onHide?.(category.id, category.isMasterCategory);
                onClose();
              }}
            >
              Hide
            </Button>
            {canDelete && (
              <Button
                variant="destructive"
                className="button-delete"
                type="button"
                onClick={() => {
                  onDelete?.(category.id, category.isMasterCategory);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
          </div>

          <div className="modal-actions-right">
            {!isCreditCard && (
              <Button
                variant="secondary"
                className="button-cancel"
                type="button"
                onClick={onClose}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              className="button-primary"
              type="button"
              onClick={() => handleSave()}
            >
              OK
            </Button>
          </div>
        </div>

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

export default EditCategoryPopover;
