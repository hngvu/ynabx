import React, { useState } from 'react';
import { Dialog } from '../core/Dialog';
import { Button } from '../core/Button';
import { FieldWithError } from '../core/FieldWithError';
import { AccountItem } from '../sidebar/NavAccountRow';

export interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountItem | null;
  onSave?: (updated: AccountItem) => void;
  onDelete?: (accountId: string) => void;
  onCloseAccount?: (account: AccountItem) => void;
}

/**
 * Exact decompiled from components/modals/sidebar/edit-account.hbs ($lt class)
 * Matches 100% of YNAB Ember Port 4200:
 * - Dialog overlay with classes: 'dialog-overlay active modal-popup account-modal'
 * - Dialog regular: header, scroll-content, dialog-body, dialog-footer
 * - Left destructive button: "Close Account" with title tooltip
 * - Buttons: "Cancel" (secondary button-cancel) + "Save" (primary js-primary-action save-account-button)
 */
export function EditAccountModal({
  isOpen,
  onClose,
  account,
  onSave,
  onDelete,
  onCloseAccount,
}: EditAccountModalProps) {
  if (!isOpen || !account) return null;

  const [accountName, setAccountName] = useState(account.accountName);
  const [note, setNote] = useState(account.note || '');
  const [balance, setBalance] = useState(
    ((account.accountCalculation?.balance ?? 0) / 1000).toFixed(2)
  );

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const balanceMilliunits = Math.round(parseFloat(balance || '0') * 1000);
    onSave?.({
      ...account,
      accountName,
      note,
      accountCalculation: {
        ...account.accountCalculation,
        balance: balanceMilliunits,
      },
    });
    onClose();
  };

  const handleCloseAccountClick = () => {
    if (onCloseAccount) {
      onCloseAccount(account);
    } else {
      onDelete?.(account.entityId);
      onClose();
    }
  };

  return (
    <Dialog size="regular" onClose={onClose} className="modal-popup account-modal">
      <Dialog.Header close={onClose}>
        Edit Account
      </Dialog.Header>
      <div className="scroll-content">
        <div className="dialog-hero" />
        <Dialog.Body>
          <div className="legacy-form-fields">
            <form id="edit-account-form" onSubmit={handleSave}>
              <div className="fieldset">
                <dl>
                  <dt className="section-header">Account Information</dt>
                </dl>
              </div>

              <div className="fieldset modal-account-settings-name edit-account-name">
                <dl>
                  <dt>Account Nickname</dt>
                  <dd className="user-data">
                    <FieldWithError field="accountName">
                      <div>
                        <input
                          id="edit-account-nickname"
                          type="text"
                          className="user-data"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                    </FieldWithError>
                  </dd>
                </dl>
              </div>

              <div className="fieldset modal-account-settings-name edit-account-note">
                <dl>
                  <dt>Account Notes</dt>
                  <dd className="user-data">
                    <textarea
                      aria-label="Account Notes"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                    />
                  </dd>
                </dl>
              </div>

              <hr />

              <div className="fieldset edit-working-balance">
                <dl>
                  <dt className="section-header">Working Balance</dt>
                  <dd className="user-data">
                    <FieldWithError field="editBalance">
                      <div>
                        <div className="ynab-new-currency-input is-editing legacy-currency-input">
                          <div className="input-wrapper">
                            <input
                              id="edit-account-balance"
                              className="ember-text-field ember-view"
                              placeholder="What is the balance of this account right now?"
                              title="Working Balance"
                              aria-label="Working Balance"
                              type="text"
                              value={balance}
                              onChange={(e) => setBalance(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </FieldWithError>
                    <div className="info space-top">
                      An adjustment transaction will be created automatically if you change this amount.
                    </div>
                  </dd>
                </dl>
              </div>
            </form>
          </div>
        </Dialog.Body>
      </div>
      <Dialog.Footer footerBorder={false}>
        <Button
          variant="destructive"
          className="left-button"
          title="Closing an account retains the transaction history for your plan. If you'd like to delete an account, start by closing the account first."
          type="button"
          onClick={handleCloseAccountClick}
        >
          Close Account
        </Button>
        <Button
          variant="secondary"
          className="button-cancel"
          type="button"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          className="js-primary-action save-account-button"
          type="button"
          onClick={() => handleSave()}
        >
          Save
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export default EditAccountModal;
