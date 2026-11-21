import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../core/Button';
import { calculatePopoverPosition } from '../../utils/popoverPosition';

export interface BudgetNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  monthName: string;
  initialNote: string;
  onSave: (note: string) => void;
}

export function BudgetNoteModal({
  isOpen,
  onClose,
  triggerRect,
  monthName,
  initialNote,
  onSave,
}: BudgetNoteModalProps) {
  const [noteText, setNoteText] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNoteText(initialNote);
    setTimeout(() => textareaRef.current?.focus(), 40);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initialNote, onClose]);

  if (!isOpen) return null;

  const modalWidth = 320;
  const modalHeight = 190;
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'up',
    horizontalAlign: 'center',
  });

  const handleSave = () => {
    onSave(noteText.trim());
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-budget-note"
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
          width: `${modalWidth}px`,
          backgroundColor: 'var(--modalBackground, #ffffff)',
          boxShadow: 'var(--modalShadow, 0 8px 24px rgba(0,0,0,0.18))',
          borderRadius: '0.5rem',
          padding: '1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <label
            htmlFor="budget-month-note-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--labelPrimary)' }}
          >
            {monthName} Note
          </label>
          <textarea
            id="budget-month-note-input"
            ref={textareaRef}
            className="user-data js-focus-on-start"
            rows={4}
            placeholder="Enter a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
            }}
            style={{
              width: '100%',
              resize: 'vertical',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid var(--inputBorder, #cbd5e1)',
              backgroundColor: 'var(--inputBackground, #ffffff)',
              color: 'var(--labelPrimary)',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BudgetNoteModal;
