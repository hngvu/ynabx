import React, { useState, useRef } from 'react';
import { TransactionItem } from './accountData';
import { AccountItem } from '../sidebar/NavAccountRow';
import { MasterCategoryGroup, SubCategoryItem } from '../budget/budgetData';
import { Icon } from '../core/Icon';
import { FlagPickerPopover } from './FlagPickerPopover';
import { DatePickerPopover } from './DatePickerPopover';
import { AccountPickerPopover } from './AccountPickerPopover';
import { CategoryPickerPopover } from './CategoryPickerPopover';

export interface RegisterGridEditRowProps {
  transaction: TransactionItem;
  showAccountColumn: boolean;
  accounts: AccountItem[];
  categoryGroups: MasterCategoryGroup[];
  isAddRow?: boolean;
  onSave: (transaction: TransactionItem) => void;
  onSaveAndAddAnother?: (transaction: TransactionItem) => void;
  onCancel: () => void;
}

export function RegisterGridEditRow({
  transaction,
  showAccountColumn,
  accounts,
  categoryGroups,
  isAddRow = false,
  onSave,
  onSaveAndAddAnother,
  onCancel,
}: RegisterGridEditRowProps) {
  // Convert ISO YYYY-MM-DD to MM/DD/YYYY for display
  const formatToDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dStr;
  };

  // Convert MM/DD/YYYY back to YYYY-MM-DD
  const parseToIsoDate = (dStr: string) => {
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const mm = parts[0].padStart(2, '0');
      const dd = parts[1].padStart(2, '0');
      const yyyy = parts[2];
      return `${yyyy}-${mm}-${dd}`;
    }
    return dStr || new Date().toISOString().slice(0, 10);
  };

  const [accountId, setAccountId] = useState(
    transaction.accountId || accounts[0]?.entityId || ''
  );
  const [dateStr, setDateStr] = useState(formatToDisplayDate(transaction.date));
  const [payeeName, setPayeeName] = useState(transaction.payeeName || '');
  const [subCategoryId, setSubCategoryId] = useState(transaction.subCategoryId || '');
  const [subCategoryName, setSubCategoryName] = useState(transaction.subCategoryName || '');
  const [memo, setMemo] = useState(transaction.memo || '');
  const [flag, setFlag] = useState<string | null>(transaction.flag || null);
  const [cleared, setCleared] = useState<'cleared' | 'uncleared' | 'reconciled'>(
    transaction.cleared || 'cleared'
  );

  const initialOutflow =
    transaction.amount < 0 ? (Math.abs(transaction.amount) / 1000).toFixed(2) : '';
  const initialInflow =
    transaction.amount > 0 ? (transaction.amount / 1000).toFixed(2) : '';

  const [outflowStr, setOutflowStr] = useState(initialOutflow);
  const [inflowStr, setInflowStr] = useState(initialInflow);

  // Popover state
  const [flagPickerOpen, setFlagPickerOpen] = useState(false);
  const [flagTriggerRect, setFlagTriggerRect] = useState<DOMRect | null>(null);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateTriggerRect, setDateTriggerRect] = useState<DOMRect | null>(null);

  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [accountTriggerRect, setAccountTriggerRect] = useState<DOMRect | null>(null);

  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryTriggerRect, setCategoryTriggerRect] = useState<DOMRect | null>(null);

  const accountTriggerRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLDivElement>(null);
  const categoryTriggerRef = useRef<HTMLDivElement>(null);

  const flatCategories = categoryGroups.flatMap((g) =>
    g.categories.map((c: SubCategoryItem) => ({
      id: c.entityId,
      name: `${g.name}: ${c.name}`,
    }))
  );

  const buildTransaction = (): TransactionItem => {
    let amount = 0;
    const outVal = parseFloat(outflowStr.replace(/[^0-9.]/g, ''));
    const inVal = parseFloat(inflowStr.replace(/[^0-9.]/g, ''));

    if (!isNaN(outVal) && outVal > 0) {
      amount = -Math.round(outVal * 1000);
    } else if (!isNaN(inVal) && inVal > 0) {
      amount = Math.round(inVal * 1000);
    }

    const selectedAcc = accounts.find((a) => a.entityId === accountId);
    const selectedCat = flatCategories.find((c) => c.id === subCategoryId);

    return {
      ...transaction,
      accountId,
      accountName: selectedAcc?.accountName || transaction.accountName,
      date: parseToIsoDate(dateStr),
      payeeName,
      subCategoryId,
      subCategoryName: subCategoryName || selectedCat?.name || (subCategoryId ? transaction.subCategoryName : ''),
      memo,
      amount,
      cleared,
      flag,
    };
  };

  const handleSave = () => {
    onSave(buildTransaction());
  };

  const handleSaveAndAdd = () => {
    if (onSaveAndAddAnother) {
      onSaveAndAddAnother(buildTransaction());
      // Reset draft for next transaction
      setDateStr(formatToDisplayDate(new Date().toISOString().slice(0, 10)));
      setPayeeName('');
      setSubCategoryId('');
      setSubCategoryName('');
      setMemo('');
      setOutflowStr('');
      setInflowStr('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const selectedAccountName =
    accounts.find((a) => a.entityId === accountId)?.accountName || 'Select Account';

  const selectedCategoryDisplayName =
    subCategoryName ||
    flatCategories.find((c) => c.id === subCategoryId)?.name ||
    'Category';

  return (
    <>
      {/* 1. Main Edit Inputs Row */}
      <div
        className={`ynab-grid-body-row is-editing is-checked ${isAddRow ? 'is-adding is-add-row' : ''}`}
        role="row"
        onKeyDown={handleKeyDown}
      >
        {/* Checkbox */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-checkbox" role="gridcell">
          <button
            className="ynab-checkbox ynab-checkbox-button is-checked"
            type="button"
            disabled
          >
            <Icon
              className="ynab-checkbox-button-square is-checked"
              name="check"
              width={13}
              height={13}
              style={{ color: '#ffffff', fill: '#ffffff' }}
            />
          </button>
        </div>

        {/* Flag */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-flag" role="gridcell">
          <button
            className={`ynab-flag-pill ynab-flag-pill-${flag || 'none'} ynab-flag-icon-only`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFlagPickerOpen(true);
              setFlagTriggerRect(e.currentTarget.getBoundingClientRect());
            }}
            aria-label={flag || 'Clear'}
          >
            <span className="flag-pill-icon-container">
              <Icon
                className={`flag-pill-icon-${flag || 'none'}`}
                name={flag ? 'flag_fill' : 'flag'}
                width={16}
                height={16}
              />
            </span>
          </button>
        </div>

        {/* Image Attachment */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-image" role="gridcell">
          <Icon name="photo" width={14} height={14} style={{ opacity: 0.25 }} />
        </div>

        {/* Account popover trigger (if All Accounts) */}
        {showAccountColumn && (
          <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-accountName user-data" role="gridcell">
            <div
              ref={accountTriggerRef}
              onClick={() => {
                if (accountTriggerRef.current) {
                  setAccountTriggerRect(accountTriggerRef.current.getBoundingClientRect());
                  setAccountPickerOpen(true);
                }
              }}
              className="accounts-text-field-dropdown-trigger"
            >
              <div
                className="accounts-text-field dropdown-text-field ember-text-field"
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.25rem',
                }}
              >
                {selectedAccountName}
              </div>
              <Icon
                name="caret_down"
                width={8}
                height={8}
                className="accounts-text-field-dropdown-icon"
              />
            </div>
          </div>
        )}

        {/* Date popover trigger */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-date user-data" role="gridcell">
          <div
            ref={dateTriggerRef}
            className="accounts-text-field-dropdown-trigger"
          >
            <input
              type="text"
              className="accounts-text-field dropdown-text-field ember-text-field"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              placeholder="MM/DD/YYYY"
            />
            <button
              type="button"
              onClick={() => {
                if (dateTriggerRef.current) {
                  setDateTriggerRect(dateTriggerRef.current.getBoundingClientRect());
                  setDatePickerOpen(true);
                }
              }}
              style={{
                position: 'absolute',
                right: '0.375rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                zIndex: 2,
              }}
              aria-label="Open Calendar"
            >
              <Icon
                name="caret_down"
                width={8}
                height={8}
                style={{ color: 'var(--inputBorderActive, #545bfe)' }}
              />
            </button>
          </div>
        </div>

        {/* Payee */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-payeeName user-data" role="gridcell">
          <input
            type="text"
            className="accounts-text-field ember-text-field"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            placeholder="Payee"
          />
        </div>

        {/* Category popover trigger */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-subCategoryName user-data" role="gridcell">
          <div
            ref={categoryTriggerRef}
            onClick={() => {
              if (categoryTriggerRef.current) {
                setCategoryTriggerRect(categoryTriggerRef.current.getBoundingClientRect());
                setCategoryPickerOpen(true);
              }
            }}
            className="accounts-text-field-dropdown-trigger"
          >
            <div
              className="accounts-text-field dropdown-text-field ember-text-field"
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '1.25rem',
                color: subCategoryId ? 'inherit' : 'var(--labelSecondary, #727484)',
              }}
            >
              {selectedCategoryDisplayName}
            </div>
            <Icon
              name="caret_down"
              width={8}
              height={8}
              className="accounts-text-field-dropdown-icon"
            />
          </div>
        </div>

        {/* Memo */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-memo user-data" role="gridcell">
          <input
            type="text"
            className="accounts-text-field ember-text-field"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Memo"
          />
        </div>

        {/* Outflow */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-outflow user-data" role="gridcell">
          <input
            type="text"
            className="accounts-text-field ember-text-field"
            value={outflowStr}
            onChange={(e) => {
              setOutflowStr(e.target.value);
              if (e.target.value && inflowStr) setInflowStr('');
            }}
            placeholder="0.00"
            style={{ textAlign: 'right' }}
          />
        </div>

        {/* Inflow */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-inflow user-data" role="gridcell">
          <input
            type="text"
            className="accounts-text-field ember-text-field"
            value={inflowStr}
            onChange={(e) => {
              setInflowStr(e.target.value);
              if (e.target.value && outflowStr) setOutflowStr('');
            }}
            placeholder="0.00"
            style={{ textAlign: 'right' }}
          />
        </div>

        {/* Cleared */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-cleared" role="gridcell">
          <button
            type="button"
            className="ynab-cleared"
            onClick={() => setCleared(cleared === 'cleared' ? 'uncleared' : 'cleared')}
            aria-label={cleared === 'cleared' ? 'Cleared' : 'Uncleared'}
          >
            {cleared === 'cleared' ? (
              <Icon className="is-cleared-icon" name="cleared_circle_fill" width={12} height={12} />
            ) : (
              <Icon className="is-uncleared-icon" name="cleared_circle" width={12} height={12} />
            )}
          </button>
        </div>
      </div>

      {/* 2. Actions Row (Cancel / Save / Save and Add Another) */}
      <div
        className={`ynab-grid-body-row ynab-grid-actions is-editing ${isAddRow ? 'is-adding is-add-row' : ''}`}
        role="row"
      >
        <div className="ynab-grid-cell ynab-grid-cell-checkbox">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-flag">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-image">&nbsp;</div>
        {showAccountColumn && <div className="ynab-grid-cell ynab-grid-cell-accountName">&nbsp;</div>}
        <div className="ynab-grid-cell ynab-grid-cell-date">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-payeeName">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-subCategoryName">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-memo">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-outflow">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-inflow user-data buttons-container">
          <div className="ynab-grid-actions-buttons">
            <button
              className="button button-cancel-small"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="button button-primary-small button-save"
              type="button"
              onClick={handleSave}
            >
              Save
            </button>
            {isAddRow && (
              <button
                className="button button-primary-small button-another"
                type="button"
                onClick={handleSaveAndAdd}
              >
                Save and Add Another
              </button>
            )}
          </div>
        </div>
        <div className="ynab-grid-cell ynab-grid-cell-cleared">&nbsp;</div>
      </div>

      {/* Flag picker popover if opened from edit row */}
      {flagPickerOpen && (
        <FlagPickerPopover
          isOpen={flagPickerOpen}
          triggerRect={flagTriggerRect}
          currentFlag={flag}
          onSelectFlag={(color) => setFlag(color)}
          onClose={() => setFlagPickerOpen(false)}
        />
      )}

      {/* Date Picker Popover */}
      {datePickerOpen && (
        <DatePickerPopover
          isOpen={datePickerOpen}
          triggerRect={dateTriggerRect}
          selectedDate={parseToIsoDate(dateStr)}
          onSelectDate={(iso) => setDateStr(formatToDisplayDate(iso))}
          onClose={() => setDatePickerOpen(false)}
        />
      )}

      {/* Account Picker Popover */}
      {accountPickerOpen && (
        <AccountPickerPopover
          isOpen={accountPickerOpen}
          triggerRect={accountTriggerRect}
          selectedAccountId={accountId}
          accounts={accounts}
          onSelectAccount={(accId) => setAccountId(accId)}
          onClose={() => setAccountPickerOpen(false)}
        />
      )}

      {/* Category Picker Popover */}
      {categoryPickerOpen && (
        <CategoryPickerPopover
          isOpen={categoryPickerOpen}
          triggerRect={categoryTriggerRect}
          selectedCategoryId={subCategoryId}
          categoryGroups={categoryGroups}
          onSelectCategory={(catId, fullCatName) => {
            setSubCategoryId(catId);
            setSubCategoryName(fullCatName);
          }}
          onClose={() => setCategoryPickerOpen(false)}
        />
      )}
    </>
  );
}

export default RegisterGridEditRow;