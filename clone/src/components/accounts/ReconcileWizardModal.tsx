import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';
import { evaluateFormula } from '../../utils/calculator';

export interface ReconcileWizardModalProps {
  isOpen: boolean;
  selectedAccount: AccountItem;
  clearedBalanceMilliunits: number;
  onFinishReconcile: (statementBalanceMilliunits: number, createAdjustment: boolean) => void;
  onClose: () => void;
  onEnterAdjustmentMode: (statementBalanceMilliunits: number) => void;
}

export function ReconcileWizardModal({
  isOpen,
  selectedAccount,
  clearedBalanceMilliunits,
  onFinishReconcile,
  onClose,
  onEnterAdjustmentMode,
}: ReconcileWizardModalProps) {
  const [step, setStep] = useState<'current' | 'enter-balance' | 'difference' | 'reconciled'>('current');
  const [statementInput, setStatementInput] = useState(
    (Math.abs(clearedBalanceMilliunits) / 1000).toFixed(2)
  );
  const [statementBalanceMilliunits, setStatementBalanceMilliunits] = useState(clearedBalanceMilliunits);
  const [skipExplanation, setSkipExplanation] = useState(false);

  if (!isOpen) return null;

  const clearedDollarsStr = (clearedBalanceMilliunits / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const discrepancyMilliunits = statementBalanceMilliunits - clearedBalanceMilliunits;
  const differenceDollarsStr = (Math.abs(discrepancyMilliunits) / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const handleStepCurrentYes = () => {
    // Exact balance confirmed
    onFinishReconcile(clearedBalanceMilliunits, false);
    setStep('reconciled');
  };

  const handleStepCurrentNo = () => {
    setStep('enter-balance');
  };

  const handleEnterBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const evaluated = evaluateFormula(statementInput.replace(/\$/g, ''));
    const val = evaluated !== null && !isNaN(evaluated) ? Math.round(evaluated * 1000) : clearedBalanceMilliunits;
    setStatementBalanceMilliunits(val);

    if (val === clearedBalanceMilliunits) {
      onFinishReconcile(val, false);
      setStep('reconciled');
    } else {
      setStep('difference');
    }
  };

  const handleCreateAdjustment = () => {
    onFinishReconcile(statementBalanceMilliunits, true);
    setStep('reconciled');
  };

  const handleFinishLater = () => {
    // Keep adjustment mode active in header
    onEnterAdjustmentMode(statementBalanceMilliunits);
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay active"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        backgroundColor: 'rgba(12, 13, 34, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="modal modal-generic modal-account-reconcile is-rendered active"
        role="dialog"
        style={{
          width: '24rem',
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          color: 'var(--labelPrimary, #1b1d48)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          position: 'relative',
        }}
      >
        {/* Close cross */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--labelSecondary, #727484)',
          }}
        >
          <Icon name="close" width={12} height={12} />
        </button>

        {/* 1. Step Current (components/modals/register/reconcile/step-current.hbs) */}
        {step === 'current' && (
          <div className="modal-account-reconcile-current">
            <div className="modal-account-reconcile-cleared-balance" style={{ textAlign: 'center', margin: '1rem 0 1.5rem' }}>
              <div className="modal-account-reconcile-cleared-balance-label" style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Is your current account balance
              </div>
              <div className="modal-account-reconcile-cleared-balance-amount" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--labelPrimary, #1b1d48)' }}>
                {clearedDollarsStr}?
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <a
                href="#help"
                onClick={(e) => {
                  e.preventDefault();
                  alert('To find your current cleared balance, log in to your bank and check your posted (cleared) balance, excluding pending charges.');
                }}
                style={{ fontSize: '0.8125rem', color: 'var(--actionPrimary, #545bfe)', textDecoration: 'none' }}
              >
                How do I find my account balance?
              </a>
            </div>

            <div className="modal-account-reconcile-full-width-buttons" style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleStepCurrentNo}
                style={{ flex: 1, height: '2.5rem', fontWeight: 600 }}
              >
                No
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleStepCurrentYes}
                style={{ flex: 1, height: '2.5rem', fontWeight: 600 }}
              >
                Yes
              </button>
            </div>
          </div>
        )}

        {/* 2. Step Enter Balance (components/modals/register/reconcile/step-enter-balance.hbs) */}
        {step === 'enter-balance' && (
          <form className="modal-account-reconcile-enter-balance" onSubmit={handleEnterBalanceSubmit}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>
              Enter your current balance
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--labelSecondary, #727484)', marginBottom: '1rem' }}>
              Enter the balance shown on your bank statement or in your banking app today:
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="text"
                autoFocus
                value={statementInput}
                onChange={(e) => setStatementInput(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  height: '2.5rem',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  padding: '0 0.75rem',
                  border: '1px solid var(--inputBorder, #c8cad6)',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div className="modal-account-reconcile-right-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="button button-cancel"
                onClick={() => setStep('current')}
                style={{ height: '2.25rem' }}
              >
                Back
              </button>
              <button
                type="submit"
                className="button button-primary"
                style={{ height: '2.25rem', padding: '0 1.25rem', fontWeight: 600 }}
              >
                Next
              </button>
            </div>
          </form>
        )}

        {/* 3. Step Difference (components/modals/register/reconcile/step-difference.hbs) */}
        {step === 'difference' && (
          <div className="modal-account-reconcile-difference">
            <div className="modal-account-reconcile-difference-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div
                className="modal-account-reconcile-cleared-balance-amount"
                style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--labelNegative, #bf2e3b)' }}
              >
                {discrepancyMilliunits < 0 ? `-${differenceDollarsStr}` : `+${differenceDollarsStr}`}
              </div>
              <div className="modal-account-reconcile-cleared-balance-label" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--labelSecondary, #727484)' }}>
                Difference
              </div>
            </div>

            <div style={{ fontSize: '0.8125rem', lineHeight: '1.4', marginBottom: '1rem', color: 'var(--labelPrimary, #1b1d48)' }}>
              <p style={{ margin: '0 0 0.5rem' }}>
                Your bank statement doesn't match your cleared balance. You can continue searching for missing transactions, or create an adjustment transaction right now.
              </p>
            </div>

            <div
              className="modal-account-reconcile-info"
              style={{
                backgroundColor: 'rgba(218, 172, 0, 0.1)',
                border: '1px solid rgba(218, 172, 0, 0.3)',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                fontSize: '0.75rem',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
              }}
            >
              <Icon name="info_circle_fill" width={14} height={14} style={{ color: '#daac00', flexShrink: 0, marginTop: '2px' }} />
              <span>
                Tip: Check that all transactions before today are marked as cleared (green C) if they posted to your bank.
              </span>
            </div>

            <div className="modal-account-reconcile-difference-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="button button-primary"
                onClick={handleCreateAdjustment}
                style={{ width: '100%', height: '2.5rem', fontWeight: 600 }}
              >
                Create Adjustment & Finish
              </button>
              <button
                type="button"
                className="button button-cancel"
                onClick={handleFinishLater}
                style={{ width: '100%', height: '2.25rem' }}
              >
                Finish Later (Keep Difference Banner)
              </button>
            </div>
          </div>
        )}

        {/* 4. Step Reconciled Dance (components/modals/register/reconcile/step-reconciled.hbs) */}
        {step === 'reconciled' && (
          <div className="modal-account-reconcile-reconciled" style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', borderRadius: '50%', backgroundColor: 'rgba(2, 188, 121, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" width={32} height={32} style={{ color: 'var(--labelPositive, #02bc79)' }} />
            </div>
            <h3 className="reconciled-message-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Account Reconciled!
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--labelSecondary, #727484)', margin: '0 0 1.5rem' }}>
              Time to do your reconciliation dance. All cleared transactions are now locked.
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={onClose}
              style={{ padding: '0 2rem', height: '2.5rem', fontWeight: 600 }}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ReconcileWizardModal;
