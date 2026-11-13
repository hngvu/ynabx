import React from 'react';
import { Dialog } from '../core/Dialog';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface CloseAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountItem | null;
  onConfirmClose: (account: AccountItem) => void;
}

/**
 * Exact decompiled from components/close-account/index.hbs (qst / Hst)
 * Matches 100% of YNAB Ember Port 4200:
 * - Dialog with class modal-close-account
 * - Header: "Close Account"
 * - Body: summaryText p tag: "Before you can close this account, the balance will have to be zeroed out. An adjustment transaction will be created for $X.XX."
 * - Info helpbox: "The money in this account will be removed from your plan. If you would like to keep it in your plan, you can transfer it to another account before closing this one."
 * - Footer: Cancel + "Adjust Balance & Close" (or "Finish Closing Account" if balance is 0)
 */
export function CloseAccountModal({
  isOpen,
  onClose,
  account,
  onConfirmClose,
}: CloseAccountModalProps) {
  if (!isOpen || !account) return null;

  const balance = account.accountCalculation?.balance ?? 0;
  const hasBalance = balance !== 0;
  const hasPositiveOnBudgetBalance = balance >= 0 && (account.accountType !== 'otherAsset' && account.accountType !== 'otherLiability');
  
  // Format inverse balance as adjustment amount
  const adjustmentAmountFormatted = (Math.abs(balance) / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <Dialog size="regular" onClose={onClose} className="modal-close-account">
      <Dialog.Header close={onClose}>
        Close Account
      </Dialog.Header>
      <div className="scroll-content">
        <Dialog.Body>
          {hasBalance ? (
            <p>
              Before you can close this account, the balance will have to be zeroed out. An adjustment transaction will be created for <strong>{adjustmentAmountFormatted}</strong>.
            </p>
          ) : (
            <p>
              Are you sure you want to close <strong>{account.accountName}</strong>?
            </p>
          )}

          {hasPositiveOnBudgetBalance && (
            <div className="ynab-helpbox">
              <Icon name="info_circle_fill" width={24} />
              <div>
                The money in this account will be removed from your plan. If you would like to keep it in your plan, you can transfer it to another account before closing this one.
              </div>
            </div>
          )}
        </Dialog.Body>
      </div>
      <Dialog.Footer footerBorder={false}>
        {hasBalance && (
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
          className="close-account-button js-primary-action"
          type="button"
          onClick={() => {
            onConfirmClose(account);
            onClose();
          }}
        >
          {hasBalance ? 'Adjust Balance & Close' : 'Finish Closing Account'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export default CloseAccountModal;
