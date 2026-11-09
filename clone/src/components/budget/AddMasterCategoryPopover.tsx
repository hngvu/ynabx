import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../core/Button';

export interface AddMasterCategoryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  onAdd: (name: string) => void;
}

export function AddMasterCategoryPopover({
  isOpen,
  onClose,
  triggerRect,
  onAdd,
}: AddMasterCategoryPopoverProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen || !triggerRect) return null;

  const top = triggerRect.bottom + 8;
  const left = triggerRect.left;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    onClose();
  };

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-add-master-category"
      onClick={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ top: `${top}px`, left: `${left}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="fieldset">
              <div className="field-with-error">
                <div>
                  <input
                    ref={inputRef}
                    placeholder="New Category Group"
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
          style={{ left: '97px', bottom: '100%', height: '0.9375rem', width: '1.875rem' }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" />
        </svg>
      </div>
    </div>
  );
}

export default AddMasterCategoryPopover;
