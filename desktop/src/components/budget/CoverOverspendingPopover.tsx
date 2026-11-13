import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../core/Button';
import { calculatePopoverPosition } from '../../utils/popoverPosition';
import { MasterCategoryGroup } from './budgetData';
import { formatCurrency } from './categoryTargetStatus';

export interface CoverOverspendingPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  overspentCategory: { id: string; name: string; overspentAmount: number } | null;
  groups: MasterCategoryGroup[];
  readyToAssignMilliunits: number;
  onCoverOverspending: (fromCatId: string | null, toCatId: string, amount: number) => void;
}

export function CoverOverspendingPopover({
  isOpen,
  onClose,
  triggerRect,
  overspentCategory,
  groups,
  readyToAssignMilliunits,
  onCoverOverspending,
}: CoverOverspendingPopoverProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('rta');
  const [amountStr, setAmountStr] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Available positive categories
  const positiveCategories = groups.flatMap((g) =>
    g.categories
      .filter((c) => (c.available ?? 0) > 0 && c.entityId !== overspentCategory?.id)
      .map((c) => ({
        id: c.entityId,
        name: c.name,
        groupName: g.name,
        available: c.available ?? 0,
      }))
  );

  useEffect(() => {
    if (isOpen && overspentCategory) {
      setAmountStr((overspentCategory.overspentAmount / 1000).toFixed(2));
      setSelectedSourceId(readyToAssignMilliunits > 0 ? 'rta' : positiveCategories[0]?.id ?? 'rta');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, overspentCategory, readyToAssignMilliunits]);

  if (!isOpen || !triggerRect || !overspentCategory) return null;

  const modalWidth = 320;
  const modalHeight = 280;
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
    arrowDirection: 'up',
    horizontalAlign: 'center',
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0) return;
    const milliunits = Math.round(val * 1000);
    const fromId = selectedSourceId === 'rta' ? null : selectedSourceId;
    onCoverOverspending(fromId, overspentCategory.id, milliunits);
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-budget modal-budget-overspending"
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
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--labelPrimary)' }}>
            Cover Overspending in {overspentCategory.name}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="fieldset" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="field-with-error">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--labelSecondary)', display: 'block', marginBottom: '4px' }}>
                  Cover Amount
                </label>
                <div className="ynab-new-currency-input">
                  <input
                    ref={inputRef}
                    type="text"
                    className="user-data"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--inputBorder, #cbd5e1)',
                      backgroundColor: 'var(--inputBackground, #ffffff)',
                      color: 'var(--labelPrimary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div className="field-with-error">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--labelSecondary)', display: 'block', marginBottom: '4px' }}>
                  Cover this overspending with:
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--inputBorder, #cbd5e1)',
                    backgroundColor: 'var(--inputBackground, #ffffff)',
                    color: 'var(--labelPrimary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="rta">
                    Ready to Assign ({formatCurrency(readyToAssignMilliunits)})
                  </option>
                  {positiveCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatCurrency(c.available)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Cover Overspending
              </Button>
            </div>
          </form>
        </div>

        {/* Modal Arrow */}
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
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" fill="var(--modalBackground, #ffffff)" />
        </svg>
      </div>
    </div>,
    document.body
  );
}

export default CoverOverspendingPopover;
