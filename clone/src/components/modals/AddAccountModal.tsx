import React, { useState } from 'react';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';

export interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount?: (account: {
    nickname: string;
    type: string;
    balance: number;
  }) => void;
}

// Exact 13 YNAB account types from vS array in wrapper-DkFKwf1z.js:
export interface AccountTypeOption {
  value: string;
  label: string;
  section: 'Cash' | 'Credit' | 'Loan' | 'Tracking';
  onBudget: boolean;
  asset: boolean;
}

export const YNAB_ACCOUNT_TYPES: AccountTypeOption[] = [
  // Cash (Budget)
  { value: 'Checking', label: 'Checking', section: 'Cash', onBudget: true, asset: true },
  { value: 'Savings', label: 'Savings', section: 'Cash', onBudget: true, asset: true },
  { value: 'Cash', label: 'Cash', section: 'Cash', onBudget: true, asset: true },
  // Credit (Budget)
  { value: 'CreditCard', label: 'Credit Card', section: 'Credit', onBudget: true, asset: false },
  { value: 'LineOfCredit', label: 'Line of Credit', section: 'Credit', onBudget: true, asset: false },
  // Mortgages and Loans
  { value: 'Mortgage', label: 'Mortgage', section: 'Loan', onBudget: false, asset: false },
  { value: 'AutoLoan', label: 'Auto Loan', section: 'Loan', onBudget: false, asset: false },
  { value: 'StudentLoan', label: 'Student Loan', section: 'Loan', onBudget: false, asset: false },
  { value: 'PersonalLoan', label: 'Personal Loan', section: 'Loan', onBudget: false, asset: false },
  { value: 'MedicalDebt', label: 'Medical Debt', section: 'Loan', onBudget: false, asset: false },
  { value: 'OtherDebt', label: 'Other Debt', section: 'Loan', onBudget: false, asset: false },
  // Tracking
  { value: 'OtherAsset', label: 'Asset (e.g. Investment)', section: 'Tracking', onBudget: false, asset: true },
  { value: 'OtherLiability', label: 'Liability', section: 'Tracking', onBudget: false, asset: false },
];

// Popular institutions for US/Global fallback:
const POPULAR_INSTITUTIONS = [
  { id: 'chase', name: 'Chase', friendly_url: 'chase.com' },
  { id: 'bofa', name: 'Bank of America', friendly_url: 'bankofamerica.com' },
  { id: 'wells', name: 'Wells Fargo', friendly_url: 'wellsfargo.com' },
  { id: 'capone', name: 'Capital One', friendly_url: 'capitalone.com' },
  { id: 'citi', name: 'Citi', friendly_url: 'citi.com' },
  { id: 'amex', name: 'American Express', friendly_url: 'americanexpress.com' },
];

type Screen = 'search-institutions' | 'add-unlinked-account' | 'select-account-type' | 'unlinked-account-success';

/**
 * Exact decompiled from components/modals/account-widget/index.hbs:
 * Modal container:
 * <div class="modal-overlay active ynab-u modal-generic self-centered account-widget-modal">
 *   <div class="modal" style="width: 360px; height: 700px; max-height: 100%;">
 *     <div class="account-widget">
 *       ...
 *     </div>
 *   </div>
 * </div>
 */
export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAddAccount,
}) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('search-institutions');
  const [searchText, setSearchText] = useState('');
  
  // Form fields for Add Unlinked Account
  const [nickname, setNickname] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<AccountTypeOption>(YNAB_ACCOUNT_TYPES[0]);
  const [balance, setBalance] = useState('0');

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setCurrentScreen('search-institutions');
    setSearchText('');
    setNickname('');
    setSelectedAccountType(YNAB_ACCOUNT_TYPES[0]);
    setBalance('0');
    onClose();
  };

  const handleCreateUnlinkedAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    const cleanBalance = parseFloat(balance.replace(/[^0-9.-]+/g, '')) || 0;
    const milliunits = Math.round(cleanBalance * 1000);

    onAddAccount?.({
      nickname: nickname.trim(),
      type: selectedAccountType.value,
      balance: milliunits,
    });

    setCurrentScreen('unlinked-account-success');
  };

  const cashTypes = YNAB_ACCOUNT_TYPES.filter((t) => t.section === 'Cash');
  const creditTypes = YNAB_ACCOUNT_TYPES.filter((t) => t.section === 'Credit');
  const loanTypes = YNAB_ACCOUNT_TYPES.filter((t) => t.section === 'Loan');
  const trackingTypes = YNAB_ACCOUNT_TYPES.filter((t) => t.section === 'Tracking');

  return (
    <div
      className="modal-overlay active ynab-u modal-generic self-centered account-widget-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 10012,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResetAndClose();
      }}
    >
      <div
        className="modal"
        style={{
          width: '360px',
          height: '700px',
          maxHeight: '100%',
          backgroundColor: 'var(--backgroundPrimaryElevated)',
          borderRadius: '0.5rem',
          boxShadow: '0 16px 64px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div className="account-widget" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* ============================================================== */}
          {/* SCREEN 1: Search Institutions ($7)                             */}
          {/* ============================================================== */}
          {currentScreen === 'search-institutions' && (
            <div
              className="account-widget-screen account-widget-search-institutions"
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {/* Header */}
              <div className="account-widget-header">
                <div className="hidden-header-button" />
                <div className="account-widget-header-title">
                  <h1 className="account-widget-header-title-single">Add Accounts</h1>
                </div>
                <button
                  className="button-close"
                  aria-label="Close"
                  title="Close"
                  type="button"
                  onClick={handleResetAndClose}
                >
                  <Icon name="close" width={24} height={24} className="icon-close" />
                </button>
              </div>

              {/* Body */}
              <div className="account-widget-body user-data" style={{ flex: 1, overflowY: 'auto' }}>
                <div className="account-widget-search-input">
                  <label htmlFor="search-institutions-input" className="type-body-bold">
                    Search for your bank
                  </label>
                  <input
                    id="search-institutions-input"
                    type="text"
                    className="user-data"
                    placeholder="Search by institution name or web address (URL)"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    autoFocus
                  />
                  <div className="y-form-note">
                    Search by institution name or web address (URL)
                  </div>
                </div>

                {/* Popular Options List */}
                <h3 className="type-body-large-bold" style={{ marginBottom: '0.5rem' }}>
                  Popular Options
                </h3>
                <div className="account-widget-api-popular-list">
                  {POPULAR_INSTITUTIONS.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      className={inst.id}
                      onClick={() => {
                        setNickname(inst.name);
                        setCurrentScreen('add-unlinked-account');
                      }}
                    >
                      <div className="grid-item fallback">
                        <div className="bank-name">{inst.name}</div>
                        <div className="bank-url">{inst.friendly_url}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="divider">
                  <span>or</span>
                </div>

                {/* Button Group */}
                <div className="button-group">
                  <Button
                    variant="secondary"
                    isLarge={true}
                    onClick={() => setCurrentScreen('add-unlinked-account')}
                  >
                    Add Unlinked Account
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SCREEN 2: Add Unlinked Account Form (est)                      */}
          {/* ============================================================== */}
          {currentScreen === 'add-unlinked-account' && (
            <div
              className="account-widget-screen account-widget-step account-widget-add-unlinked-account"
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {/* Header */}
              <div className="account-widget-header">
                <button
                  className="button-back"
                  aria-label="Back"
                  title="Back"
                  type="button"
                  onClick={() => setCurrentScreen('search-institutions')}
                >
                  <Icon name="chevron_left" width={24} height={24} className="icon-back" />
                </button>
                <div className="account-widget-header-title">
                  <h1 className="account-widget-header-title-single">Add Unlinked Account</h1>
                </div>
                <button
                  className="button-close"
                  aria-label="Close"
                  title="Close"
                  type="button"
                  onClick={handleResetAndClose}
                >
                  <Icon name="close" width={24} height={24} className="icon-close" />
                </button>
              </div>

              {/* Body Form */}
              <form
                id="add-unlinked-account-form"
                onSubmit={handleCreateUnlinkedAccount}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
              >
                <div className="account-widget-body user-data" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <span className="header-strong" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                      Let's go!
                    </span>
                    <p style={{ color: 'var(--labelSecondary)', margin: 0, fontSize: '0.875rem' }}>
                      And don't worry, you can always link this account later.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="unlinked-account-nickname" className="type-body-bold" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Give it a nickname
                    </label>
                    <input
                      id="unlinked-account-nickname"
                      type="text"
                      className="name-input user-data"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      autoCapitalize="words"
                      autoFocus
                      required
                    />
                  </div>

                  <div>
                    <label className="type-body-bold" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      What type of account are you adding?
                    </label>
                    <button
                      type="button"
                      className="account-type-select-button"
                      onClick={() => setCurrentScreen('select-account-type')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        height: '3rem',
                        padding: '0 1rem',
                        backgroundColor: 'var(--inputBackground)',
                        border: '1px solid var(--inputBorder)',
                        borderRadius: 'var(--accountWidgetInputRadius)',
                        fontSize: '0.875rem',
                        color: 'var(--labelPrimary)',
                        textAlign: 'left',
                      }}
                    >
                      <span>{selectedAccountType.label}</span>
                      <Icon name="caret_right" width={16} height={16} />
                    </button>
                  </div>

                  <div className="currency-input-group">
                    <label htmlFor="unlinked-account-balance" className="type-body-bold" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      What is your current balance?
                    </label>
                    <input
                      id="unlinked-account-balance"
                      type="text"
                      inputMode="decimal"
                      className="balance-input user-data"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      style={{
                        width: '100%',
                        height: '3rem',
                        padding: '0 1rem',
                        backgroundColor: 'var(--inputBackground)',
                        border: '1px solid var(--inputBorder)',
                        borderRadius: 'var(--accountWidgetInputRadius)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="account-widget-footer" style={{ padding: '1rem', borderTop: '1px solid var(--separatorSubdued)' }}>
                  <Button
                    variant="primary"
                    isLarge={true}
                    type="submit"
                    disabled={!nickname.trim()}
                    style={{ width: '100%' }}
                  >
                    Next
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-SCREEN: Select Budget Account Type                         */}
          {/* ============================================================== */}
          {currentScreen === 'select-account-type' && (
            <div
              className="account-widget-screen account-type-select"
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {/* Header */}
              <div className="account-widget-header">
                <button
                  className="button-back"
                  aria-label="Back"
                  title="Back"
                  type="button"
                  onClick={() => setCurrentScreen('add-unlinked-account')}
                >
                  <Icon name="chevron_left" width={24} height={24} className="icon-back" />
                </button>
                <div className="account-widget-header-title">
                  <h1 className="account-widget-header-title-single">Select Account Type</h1>
                </div>
                <button
                  className="button-close"
                  aria-label="Close"
                  title="Close"
                  type="button"
                  onClick={handleResetAndClose}
                >
                  <Icon name="close" width={24} height={24} className="icon-close" />
                </button>
              </div>

              {/* Body */}
              <div className="account-widget-body user-data" style={{ flex: 1, overflowY: 'auto' }}>
                {/* Cash Accounts */}
                <div className="account-type-select-group">
                  <h3>Cash Accounts</h3>
                  <p>A cash account holds funds you already own and can spend immediately.</p>
                  {cashTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className="account-widget-list-button"
                      data-account-type={t.value}
                      onClick={() => {
                        setSelectedAccountType(t);
                        setCurrentScreen('add-unlinked-account');
                      }}
                    >
                      <span>{t.label}</span>
                      {selectedAccountType.value === t.value && (
                        <Icon name="check" width={20} height={20} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Credit Accounts */}
                <div className="account-type-select-group">
                  <h3>Credit Accounts</h3>
                  <p>A credit account lets you spend borrowed money that you'll need to repay later, often with interest.</p>
                  {creditTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className="account-widget-list-button"
                      data-account-type={t.value}
                      onClick={() => {
                        setSelectedAccountType(t);
                        setCurrentScreen('add-unlinked-account');
                      }}
                    >
                      <span>{t.label}</span>
                      {selectedAccountType.value === t.value && (
                        <Icon name="check" width={20} height={20} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Mortgages and Loans */}
                <div className="account-type-select-group">
                  <h3>Mortgages and Loans</h3>
                  <p>Accounts that have an outstanding balance you're currently paying off, and aren't spending from.</p>
                  {loanTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className="account-widget-list-button"
                      data-account-type={t.value}
                      onClick={() => {
                        setSelectedAccountType(t);
                        setCurrentScreen('add-unlinked-account');
                      }}
                    >
                      <span>{t.label}</span>
                      {selectedAccountType.value === t.value && (
                        <Icon name="check" width={20} height={20} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tracking Accounts */}
                <div className="account-type-select-group">
                  <h3>Tracking Accounts</h3>
                  <p>Accounts that hold money you don't plan to spend soon, such as investments or loans.</p>
                  {trackingTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className="account-widget-list-button"
                      data-account-type={t.value}
                      onClick={() => {
                        setSelectedAccountType(t);
                        setCurrentScreen('add-unlinked-account');
                      }}
                    >
                      <span>{t.label}</span>
                      {selectedAccountType.value === t.value && (
                        <Icon name="check" width={20} height={20} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SCREEN 3: Unlinked Account Success (nst)                       */}
          {/* ============================================================== */}
          {currentScreen === 'unlinked-account-success' && (
            <div
              className="account-widget-step account-widget-unlinked-account-success-screen"
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {/* Header */}
              <div className="account-widget-header">
                <div className="hidden-header-button" />
                <div className="account-widget-header-title">
                  <h1 className="account-widget-header-title-single">Add Unlinked Account</h1>
                </div>
                <button
                  className="button-close"
                  aria-label="Close"
                  title="Close"
                  type="button"
                  onClick={handleResetAndClose}
                >
                  <Icon name="close" width={24} height={24} className="icon-close" />
                </button>
              </div>

              {/* Body */}
              <div className="account-widget-body user-data" style={{ flex: 1, textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ marginBottom: '1rem', color: 'var(--actionPrimary)' }}>
                  <Icon name="check_circle_fill" width={56} height={56} className="icon-checkmark-circle" />
                </div>
                <h3 className="type-title-xs" style={{ marginBottom: '0.5rem' }}>
                  Success!
                </h3>
                <p style={{ color: 'var(--labelSecondary)', fontSize: '0.875rem' }}>
                  Add transactions on the web or in our mobile apps.
                </p>
              </div>

              {/* Footer */}
              <div className="account-widget-footer" style={{ padding: '1rem', borderTop: '1px solid var(--separatorSubdued)', display: 'flex', gap: '0.5rem' }}>
                <Button
                  variant="secondary"
                  isLarge={true}
                  onClick={() => {
                    setNickname('');
                    setBalance('0');
                    setCurrentScreen('search-institutions');
                  }}
                  style={{ flex: 1 }}
                >
                  Add Another Account
                </Button>
                <Button
                  variant="primary"
                  isLarge={true}
                  onClick={handleResetAndClose}
                  style={{ flex: 1 }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
