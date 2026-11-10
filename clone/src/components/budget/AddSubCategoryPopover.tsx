import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../core/Button';
import { calculatePopoverPosition } from '../../utils/popoverPosition';

export interface AddSubCategoryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  groupId: string | null;
  onAdd: (groupId: string, name: string) => void;
}

export function AddSubCategoryPopover({
  isOpen,
  onClose,
  triggerRect,
  groupId,
  onAdd,
}: AddSubCategoryPopoverProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen || !triggerRect || !groupId) return null;

  // Add Sub Category modal dimensions in YNAB: ~280px width, ~130px height, arrowOffset { x: 3, y: 0 }
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth: 280,
    modalHeight: 130,
    arrowDirection: 'up',
    arrowOffset: { x: 3, y: 0 },
    horizontalAlign: 'center',
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    onAdd(groupId, name.trim());
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-add-sub-category"
      style={{ position: 'fixed', inset: 0, zIndex: 10001 }}
      onClick={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ top: `${pos.top}px`, left: `${pos.left}px`, width: '17.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="fieldset">
              <div className="field-with-error">
                <div>
                  <input
                    ref={inputRef}
                    placeholder="New Category"
                    className="user-data js-focus-on-start"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit(e);
                      if (e.key === 'Escape') onClose();
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={() => handleSubmit()}>
            OK
          </Button>
        </div>

        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ left: pos.arrowLeft, bottom: '100%', height: '0.9375rem', width: '1.875rem' }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" />
        </svg>
      </div>
    </div>,
    document.body
  );
}

export default AddSubCategoryPopover;
