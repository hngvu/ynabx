import React, { useState } from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';
import { FieldWithError } from '../core/FieldWithError';

export interface FreshStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudgetName?: string;
  onConfirm?: (newBudgetName: string) => void;
}

/**
 * Exact decompiled from components/modals/budget/fresh-start/index.hbs
 */
export function FreshStartModal({
  isOpen,
  onClose,
  currentBudgetName = 'My Personal Budget',
  onConfirm,
}: FreshStartModalProps) {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  });
  const [budgetName, setBudgetName] = useState(`${currentBudgetName} (Fresh Start as of ${todayStr})`);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm?.(budgetName);
    onClose();
  };

  return (
    <Modal className="skinny modal-budget-fresh-start" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Make a Fresh Start</Modal.Header>
      <Modal.Hero>
        <img
          src="images/fresh-start.svg"
          alt="Make a Fresh Start"
          style={{ maxHeight: '120px', margin: '0 auto', display: 'block' }}
        />
      </Modal.Hero>
      <Modal.Body>
        <div className="fresh-start-modal-scroll-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '16px', lineHeight: '1.5', color: '#475569' }}>
            Starting fresh will let you start planning from today without having to set up a brand new plan.
            A copy of this plan will be archived in case you're not happy with the changes.
          </div>
          <div className="fieldset">
            <form onSubmit={handleConfirm}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                New Plan Name
              </label>
              <FieldWithError field="budgetName">
                <input
                  className="js-focus-on-start"
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </FieldWithError>
            </form>
            <em style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Don't worry - you can always edit it later.
            </em>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div className="fresh-start-details" style={{ fontWeight: 600, marginBottom: '8px' }}>
              Here's what you'll see in your Fresh Start:
            </div>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.6', fontSize: '13px', color: '#334155' }}>
              <li>All your accounts. Linked accounts remain linked in the Fresh Start</li>
              <li>Today's balance for your linked accounts. Unlinked accounts will start with a $0 balance for you to update</li>
              <li>Today's transactions in linked accounts</li>
              <li>Scheduled transactions</li>
              <li>Your category groups, categories, and targets</li>
            </ul>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="primary">
          Make a Fresh Start
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FreshStartModal;
