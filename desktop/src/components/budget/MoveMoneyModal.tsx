import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { calculatePopoverPosition } from '../../utils/popoverPosition';
import { MasterCategoryGroup } from './budgetData';

export interface MoveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  groups: MasterCategoryGroup[];
  readyToAssignMilliunits: number;
  initialAmountMilliunits?: number;
  initialToCategoryId?: string;
  sourceCategory?: {
    id: string;
    name: string;
    available?: number;
    isToBeBudgeted?: boolean;
  } | null;
  onMoveMoney: (fromCatId: string | null, toCatId: string, milliunits: number) => void;
  onAutoAssignOption?: (optionKey: string) => void;
}

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

  // Ember CSS .modal-budget-move-money .modal width is 20rem (320px at 16px base font), height ~350px
  const modalWidth = 320;
  const modalHeight = 350;

  const pos = calculatePopoverPosition({
    triggerRect,
    modalWidth,
    modalHeight,
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
                      <div className="user-data currency tabular-nums zero">
                        <bdi>$</bdi>0.00
                      </div>
                    </button>
                  </div>
                  <div>
                    <button
                      className="budget-inspector-button budgeted-last-month"
                      type="button"
                      onClick={() => {
                        onAutoAssignOption?.('assignedLastMonth');
                        onClose();
                      }}
                    >
                      <div>Assigned Last Month</div>
                      <div className="user-data currency tabular-nums zero">
                        <bdi>$</bdi>0.00
                      </div>
                    </button>
                  </div>
                  <div>
                    <button
                      className="budget-inspector-button spent-last-month"
                      type="button"
                      onClick={() => {
                        onAutoAssignOption?.('spentLastMonth');
                        onClose();
                      }}
                    >
                      <div>Spent Last Month</div>
                      <div className="user-data currency tabular-nums zero">
                        <bdi>$</bdi>0.00
                      </div>
                    </button>
                  </div>
                  <div>
                    <button
                      className="budget-inspector-button reset-budgeted-amounts"
                      type="button"
                      onClick={() => {
                        onAutoAssignOption?.('resetAssigned');
                        onClose();
                      }}
                    >
                      <div>Reset Assigned Amounts</div>
                      <div className="user-data currency tabular-nums zero">
                        <bdi>$</bdi>0.00
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Manual Move Money Form */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleManualMove();
                }}
              >
                <div className="fieldset">
                  <div className="field-with-error">
                    <label htmlFor="move-money-amount">Move</label>
                    <div className="ynab-new-currency-input">
                      <input
                        id="move-money-amount"
                        ref={inputRef}
                        type="text"
                        className="user-data"
                        placeholder="0.00"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-with-error">
                    <label htmlFor="move-money-to">To Category</label>
                    <div className="dropdown-container">
                      <select
                        id="move-money-to"
                        className="user-data"
                        value={targetCategoryId}
                        onChange={(e) => setTargetCategoryId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          border: '1px solid var(--inputBorder)',
                          backgroundColor: 'var(--inputBackground)',
                          color: 'var(--labelPrimary)',
                        }}
                      >
                        {flatCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.groupName} &gt; {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '1rem' }}>
                  <Button variant="secondary" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    OK
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

export default MoveMoneyModal;
