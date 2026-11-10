import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { Button } from '../core/Button';
import { MasterCategoryGroup } from './budgetData';
import { calculatePopoverPosition } from '../../utils/popoverPosition';

export interface MoveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  groups: MasterCategoryGroup[];
  readyToAssignMilliunits: number;
  initialAmountMilliunits?: number;
  initialToCategoryId?: string;
  sourceCategory?: { id: string; name: string; isToBeBudgeted?: boolean } | null;
  onMoveMoney: (fromCatId: string | null, toCatId: string, amountMilliunits: number) => void;
  onAutoAssignOption?: (optionType: string) => void;
}

/**
 * Exact implementation corresponding to Ember YNAB:
 * - /app/components/modals/budget/move-money.hbs (class L4)
 * - /app/components/budget-breakdown/assign-money/index.hbs (class E4)
 * - Support both tabs: "Auto" (lightning) & "Manually"
 * - Select dropdown for target category
 * - Input currency for amount
 */
export function MoveMoneyModal({
  isOpen,
  onClose,
  triggerRect,
  groups,
  readyToAssignMilliunits,
  initialAmountMilliunits = 0,
  initialToCategoryId,
  sourceCategory,
  onMoveMoney,
  onAutoAssignOption,
}: MoveMoneyModalProps) {
  const isFromRta = !sourceCategory || Boolean(sourceCategory.isToBeBudgeted);
  const [isAutoAssigning, setIsAutoAssigning] = useState<boolean>(Boolean(isFromRta));
  const [amountStr, setAmountStr] = useState<string>('');
  const [targetCategoryId, setTargetCategoryId] = useState<string>(initialToCategoryId || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Flat list of subcategories
  const flatCategories = groups.flatMap((g) =>
    g.categories.map((c) => ({
      id: c.entityId,
      name: c.name,
      groupName: g.name,
      isDebtPayment: c.isDebtPayment,
    }))
  );

  useEffect(() => {
    if (isOpen) {
      const initAmount = initialAmountMilliunits > 0 
        ? (initialAmountMilliunits / 1000).toFixed(2)
        : readyToAssignMilliunits > 0 
        ? (readyToAssignMilliunits / 1000).toFixed(2)
        : '';
      setAmountStr(initAmount);
      setTargetCategoryId(initialToCategoryId || (flatCategories[0]?.id ?? ''));
      setIsAutoAssigning(Boolean(isFromRta && !initialToCategoryId));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialAmountMilliunits, initialToCategoryId, readyToAssignMilliunits, isFromRta]);

  if (!isOpen) return null;

  // Move Money Modal dimensions in YNAB: ~320px width (20rem), ~350px height
  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth: 320,
    modalHeight: 350,
    arrowDirection: 'up',
    horizontalAlign: 'center',
  });

  const handleManualMove = () => {
    const val = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0 || !targetCategoryId) return;
    const milliunits = Math.round(val * 1000);
    onMoveMoney(sourceCategory?.id ?? null, targetCategoryId, milliunits);
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay active ynab-u modal-popup modal-budget modal-budget-move-money"
      style={{ position: 'fixed', inset: 0, zIndex: 10001 }}
      onClick={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ top: `${pos.top}px`, left: `${pos.left}px`, width: '20rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="budget-breakdown-assign-money">
          <div className="modal-content">
            {/* Tab switch between Auto and Manually if from RTA */}
            {isFromRta && (
              <div className="budget-breakdown-assign-money-controls">
                <button
                  type="button"
                  className={isAutoAssigning ? 'active' : ''}
                  onClick={() => setIsAutoAssigning(true)}
                >
                  <Icon name="lightning" width={16} height={16} />
                  Auto
                </button>
                <button
                  type="button"
                  className={!isAutoAssigning ? 'active' : ''}
                  onClick={() => setIsAutoAssigning(false)}
                >
                  Manually
                </button>
              </div>
            )}

            {isAutoAssigning ? (
              /* Auto-Assign Quick Budget List */
              <div className="inspector-quick-budget" style={{ padding: '0.5rem 0' }}>
                <div className="option-groups">
                  <div>
                    <button
                      className="budget-inspector-button js-focus-on-start underfunded"
                      type="button"
                      onClick={() => {
                        onAutoAssignOption?.('underfunded');
                        onClose();
                      }}
                    >
                      <div>Underfunded</div>
                      <div>
                        <strong className="user-data">
                          <span className="user-data currency tabular-nums zero">
                            <bdi>$</bdi>0.00
                          </span>
                        </strong>
                      </div>
                    </button>
                  </div>
                  <div>
                    <button
                      className="budget-inspector-button assigned-last month"
                      type="button"
                      onClick={() => {
                        onAutoAssignOption?.('assigned-last-month');
                        onClose();
                      }}
                    >
                      <div>Assigned Last Month</div>
                      <div>
                        <strong className="user-data">
                          <span className="user-data currency tabular-nums zero">
                            <bdi>$</bdi>0.00
                          </span>
                        </strong>
                      </div>
                    </button>
                    <button
                      className="budget-inspector-button spent-last month"
                      type="button"
                      onClick={() => {
                        onAutoAssignOption?.('spent-last-month');
                        onClose();
                      }}
                    >
                      <div>Spent Last Month</div>
                      <div>
                        <strong className="user-data">
                          <span className="user-data currency tabular-nums zero">
                            <bdi>$</bdi>0.00
                          </span>
                        </strong>
                      </div>
                    </button>
                  </div>
                  <div>
                    <button
                      className="budget-inspector-button reset-assigned amount"
                      type="button"
                      onClick={() => {
                        onAutoAssignOption?.('reset-assigned');
                        onClose();
                      }}
                    >
                      <div>Reset Assigned Amounts</div>
                      <div>
                        <strong className="user-data">
                          <span className="user-data currency tabular-nums zero">
                            <bdi>$</bdi>0.00
                          </span>
                        </strong>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Manual Move Form */
              <form onSubmit={(e) => { e.preventDefault(); handleManualMove(); }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '13px' }}>
                  Assign:
                </label>
                <div className="ynab-new-currency-input" style={{ marginBottom: '1rem' }}>
                  <input
                    ref={inputRef}
                    className="legacy-currency-input"
                    placeholder="enter an amount"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleManualMove();
                      if (e.key === 'Escape') onClose();
                    }}
                  />
                </div>

                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '13px' }}>
                  To:
                </label>
                <div className="dropdown-container" style={{ marginBottom: '1rem' }}>
                  <select
                    className="user-data"
                    value={targetCategoryId}
                    onChange={(e) => setTargetCategoryId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '2.25rem',
                      borderRadius: '0.25rem',
                      border: '0.0625rem solid var(--inputBorder)',
                      backgroundColor: 'var(--inputBackground)',
                      padding: '0 0.5rem',
                    }}
                  >
                    {groups.map((g) => (
                      <optgroup key={g.entityId} label={g.name}>
                        {g.categories.map((c) => (
                          <option key={c.entityId} value={c.entityId}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <Button variant="secondary" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={!amountStr || parseFloat(amountStr) <= 0 || !targetCategoryId}
                    onClick={handleManualMove}
                  >
                    Assign
                  </Button>
                </div>
              </form>
            )}
          </div>
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

export default MoveMoneyModal;
