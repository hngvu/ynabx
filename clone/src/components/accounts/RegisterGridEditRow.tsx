import React, { useState, useRef, useMemo } from 'react';
import { TransactionItem, SubTransactionItem } from './accountData';
import { AccountItem } from '../sidebar/NavAccountRow';
import { MasterCategoryGroup, SubCategoryItem } from '../budget/budgetData';
import { Icon } from '../core/Icon';
import { FlagPickerPopover } from './FlagPickerPopover';
import { DatePickerPopover } from './DatePickerPopover';
import { AccountPickerPopover } from './AccountPickerPopover';
import { CategoryPickerPopover } from './CategoryPickerPopover';
import { PayeePickerPopover } from './PayeePickerPopover';
import { evaluateFormula } from '../../utils/calculator';

export interface RegisterGridEditRowProps {
  transaction: TransactionItem;
  showAccountColumn: boolean;
  showRunningBalance?: boolean;
  showFlags?: boolean;
  showImages?: boolean;
  accounts: AccountItem[];
  categoryGroups: MasterCategoryGroup[];
  payees?: string[];
  isAddRow?: boolean;
  onSave: (transaction: TransactionItem) => void;
  onSaveAndAddAnother?: (transaction: TransactionItem) => void;
  onCancel: () => void;
}

export function RegisterGridEditRow({
  transaction,
  showAccountColumn,
  showRunningBalance = false,
  showFlags = true,
  showImages = true,
  accounts,
  categoryGroups,
  payees = [],
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

  // Split transaction state
  const [isSplit, setIsSplit] = useState(transaction.isSplit || false);
  const [subTransactions, setSubTransactions] = useState<SubTransactionItem[]>(() => {
    if (transaction.subTransactions && transaction.subTransactions.length > 0) {
      return [...transaction.subTransactions];
    }
    return [
      {
        entityId: `sub-${Date.now()}-1`,
        parentTransactionId: transaction.entityId,
        subCategoryId: '',
        subCategoryName: '',
        memo: '',
        amount: 0,
      },
      {
        entityId: `sub-${Date.now()}-2`,
        parentTransactionId: transaction.entityId,
        subCategoryId: '',
        subCategoryName: '',
        memo: '',
        amount: 0,
      },
    ];
  });

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

  // Active sub-transaction index when opening CategoryPicker for a split row
  const [activeSubIndex, setActiveSubIndex] = useState<number | null>(null);

  const [payeePickerOpen, setPayeePickerOpen] = useState(false);
  const [payeeTriggerRect, setPayeeTriggerRect] = useState<DOMRect | null>(null);
  const payeeTriggerRef = useRef<HTMLDivElement>(null);

  const accountTriggerRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLDivElement>(null);
  const categoryTriggerRef = useRef<HTMLDivElement>(null);

  const flatCategories = categoryGroups.flatMap((g) =>
    g.categories.map((c: SubCategoryItem) => ({
      id: c.entityId,
      name: `${g.name}: ${c.name}`,
    }))
  );

  // Math calculator evaluation on blur
  const handleAmountBlur = (field: 'outflow' | 'inflow') => {
    const rawVal = field === 'outflow' ? outflowStr : inflowStr;
    if (!rawVal.trim()) return;
    const evaluated = evaluateFormula(rawVal.replace(/\$/g, ''));
    if (evaluated !== null && !isNaN(evaluated)) {
      const formatted = (Math.abs(evaluated)).toFixed(2);
      if (field === 'outflow') {
        setOutflowStr(formatted);
      } else {
        setInflowStr(formatted);
      }
    }
  };

  // Evaluate math for sub-transaction amount
  const handleSubAmountBlur = (index: number, rawVal: string, isOut: boolean) => {
    if (!rawVal.trim()) return;
    const evaluated = evaluateFormula(rawVal.replace(/\$/g, ''));
    if (evaluated !== null && !isNaN(evaluated)) {
      const milli = Math.round(evaluated * 1000);
      setSubTransactions((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, amount: isOut ? -milli : milli } : s))
      );
    }
  };

  // Date shortcut adjustments (+, -, t)
  const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      const current = new Date(parseToIsoDate(dateStr));
      current.setDate(current.getDate() + 1);
      setDateStr(formatToDisplayDate(current.toISOString().slice(0, 10)));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      const current = new Date(parseToIsoDate(dateStr));
      current.setDate(current.getDate() - 1);
      setDateStr(formatToDisplayDate(current.toISOString().slice(0, 10)));
    } else if (e.key.toLowerCase() === 't') {
      e.preventDefault();
      setDateStr(formatToDisplayDate(new Date().toISOString().slice(0, 10)));
    }
  };

  // Calculate remaining unassigned split amount
  const parentTotalMilliunits = useMemo(() => {
    const outVal = parseFloat(outflowStr.replace(/[^0-9.]/g, ''));
    const inVal = parseFloat(inflowStr.replace(/[^0-9.]/g, ''));
    if (!isNaN(outVal) && outVal > 0) return -Math.round(outVal * 1000);
    if (!isNaN(inVal) && inVal > 0) return Math.round(inVal * 1000);
    return 0;
  }, [outflowStr, inflowStr]);

  const assignedSplitMilliunits = useMemo(() => {
    return subTransactions.reduce((acc, sub) => acc + (sub.amount || 0), 0);
  }, [subTransactions]);

  const remainingSplitMilliunits = parentTotalMilliunits - assignedSplitMilliunits;

  const buildTransaction = (): TransactionItem => {
    let amount = parentTotalMilliunits;

    const selectedAcc = accounts.find((a) => a.entityId === accountId);
    const selectedCat = flatCategories.find((c) => c.id === subCategoryId);
    const isTransfer = payeeName.startsWith('Transfer :');

    return {
      ...transaction,
      accountId,
      accountName: selectedAcc?.accountName || transaction.accountName,
      date: parseToIsoDate(dateStr),
      payeeName,
      subCategoryId: isSplit ? 'split' : isTransfer ? 'category-not-needed' : subCategoryId,
      subCategoryName: isSplit
        ? 'Split (Multiple Categories)...'
        : isTransfer
        ? 'Category not needed'
        : subCategoryName || selectedCat?.name || (subCategoryId ? transaction.subCategoryName : ''),
      memo,
      amount,
      cleared,
      flag,
      isSplit,
      subTransactions: isSplit ? subTransactions : undefined,
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
      setIsSplit(false);
      setSubTransactions([]);
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

  const isTransfer = payeeName.startsWith('Transfer :');
  const selectedCategoryDisplayName = isSplit
    ? 'Split (Multiple Categories)...'
    : isTransfer
    ? 'Category not needed'
    : subCategoryName ||
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

        {/* Notification Column spacer */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-notification" role="gridcell" />

        {/* Flag */}
        {showFlags && (
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
        )}

        {/* Image Attachment */}
        {showImages && (
          <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-image" role="gridcell">
            <Icon name="photo" width={14} height={14} style={{ opacity: 0.25 }} />
          </div>
        )}

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

        {/* Date input with keyboard + / - shortcuts */}
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
              onKeyDown={handleDateKeyDown}
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
          <div ref={payeeTriggerRef} className="accounts-text-field-dropdown-trigger">
            <input
              type="text"
              className="accounts-text-field dropdown-text-field ember-text-field"
              value={payeeName}
              onChange={(e) => {
                setPayeeName(e.target.value);
                if (payeeTriggerRef.current) {
                  setPayeeTriggerRect(payeeTriggerRef.current.getBoundingClientRect());
                  setPayeePickerOpen(true);
                }
              }}
              onFocus={() => {
                if (payeeTriggerRef.current) {
                  setPayeeTriggerRect(payeeTriggerRef.current.getBoundingClientRect());
                  setPayeePickerOpen(true);
                }
              }}
              placeholder="Payee"
            />
            <button
              type="button"
              onClick={() => {
                if (payeeTriggerRef.current) {
                  setPayeeTriggerRect(payeeTriggerRef.current.getBoundingClientRect());
                  setPayeePickerOpen((prev) => !prev);
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
              aria-label="Open Payees"
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

        {/* Category popover trigger */}
        <div className={`ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-subCategoryName user-data ${isSplit ? 'is-split' : ''}`} role="gridcell">
          <div
            ref={categoryTriggerRef}
            onClick={() => {
              if (!isTransfer && categoryTriggerRef.current) {
                setActiveSubIndex(null);
                setCategoryTriggerRect(categoryTriggerRef.current.getBoundingClientRect());
                setCategoryPickerOpen(true);
              }
            }}
            className={`accounts-text-field-dropdown-trigger ${isTransfer ? 'is-disabled' : ''}`}
            style={isTransfer ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            <div
              className="accounts-text-field dropdown-text-field ember-text-field"
              style={{
                cursor: isTransfer ? 'not-allowed' : 'pointer',
                userSelect: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '1.25rem',
                color: isTransfer ? 'var(--labelSecondary, #727484)' : subCategoryId || isSplit ? 'inherit' : 'var(--labelSecondary, #727484)',
                fontStyle: isTransfer ? 'italic' : 'normal',
              }}
            >
              {selectedCategoryDisplayName}
            </div>
            {!isTransfer && (
              <Icon
                name="caret_down"
                width={8}
                height={8}
                className="accounts-text-field-dropdown-icon"
              />
            )}
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

        {/* Outflow (with math calculator on blur) */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-outflow user-data" role="gridcell">
          <input
            type="text"
            className="accounts-text-field ember-text-field"
            value={outflowStr}
            onChange={(e) => {
              setOutflowStr(e.target.value);
              if (e.target.value && inflowStr) setInflowStr('');
            }}
            onBlur={() => handleAmountBlur('outflow')}
            placeholder="0.00"
            style={{ textAlign: 'right' }}
          />
        </div>

        {/* Inflow (with math calculator on blur) */}
        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-inflow user-data" role="gridcell">
          <input
            type="text"
            className="accounts-text-field ember-text-field"
            value={inflowStr}
            onChange={(e) => {
              setInflowStr(e.target.value);
              if (e.target.value && outflowStr) setOutflowStr('');
            }}
            onBlur={() => handleAmountBlur('inflow')}
            placeholder="0.00"
            style={{ textAlign: 'right' }}
          />
        </div>

        {/* Balance (display placeholder matching Ember) */}
        {showRunningBalance && (
          <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-balance" role="gridcell">
            &nbsp;
          </div>
        )}

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

      {/* 2. Split Rows (Sub-transactions Editor) if isSplit is true */}
      {isSplit && (
        <>
          {subTransactions.map((sub, idx) => {
            const subOutStr = sub.amount < 0 ? (Math.abs(sub.amount) / 1000).toFixed(2) : '';
            const subInStr = sub.amount > 0 ? (sub.amount / 1000).toFixed(2) : '';

            return (
              <div
                key={sub.entityId}
                className="ynab-grid-body-row is-editing is-checked ynab-grid-body-sub"
                role="row"
              >
                <div className="ynab-grid-cell ynab-grid-cell-checkbox">&nbsp;</div>
                <div className="ynab-grid-cell ynab-grid-cell-notification">&nbsp;</div>
                {showFlags && <div className="ynab-grid-cell ynab-grid-cell-flag">&nbsp;</div>}
                {showImages && <div className="ynab-grid-cell ynab-grid-cell-image">&nbsp;</div>}
                {showAccountColumn && <div className="ynab-grid-cell ynab-grid-cell-accountName">&nbsp;</div>}
                
                {/* Delete Sub-row button in Date cell matching Ember grid-sub-edit.hbs */}
                <div className="ynab-grid-cell ynab-grid-cell-date" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    title="Delete split row"
                    onClick={() => {
                      if (subTransactions.length > 2) {
                        setSubTransactions((prev) => prev.filter((_, i) => i !== idx));
                      } else {
                        // revert to normal transaction if splits cleared
                        setIsSplit(false);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--labelSecondary, #727484)',
                      padding: 0,
                    }}
                  >
                    <Icon name="trash_can" width={12} height={12} />
                  </button>
                </div>

                <div className="ynab-grid-cell ynab-grid-cell-payeeName">&nbsp;</div>

                {/* Sub-Category Picker */}
                <div className="ynab-grid-cell ynab-grid-cell-subCategoryName user-data">
                  <div
                    onClick={(e) => {
                      setActiveSubIndex(idx);
                      setCategoryTriggerRect(e.currentTarget.getBoundingClientRect());
                      setCategoryPickerOpen(true);
                    }}
                    className="accounts-text-field-dropdown-trigger"
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      className="accounts-text-field dropdown-text-field ember-text-field"
                      style={{
                        userSelect: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.25rem',
                        color: sub.subCategoryId ? 'inherit' : 'var(--labelSecondary, #727484)',
                      }}
                    >
                      {sub.subCategoryName || 'Category'}
                    </div>
                    <Icon name="caret_down" width={8} height={8} className="accounts-text-field-dropdown-icon" />
                  </div>
                </div>

                {/* Sub Memo */}
                <div className="ynab-grid-cell ynab-grid-cell-memo user-data">
                  <input
                    type="text"
                    className="accounts-text-field ember-text-field"
                    value={sub.memo || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubTransactions((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, memo: val } : s))
                      );
                    }}
                    placeholder="Memo"
                  />
                </div>

                {/* Sub Outflow */}
                <div className="ynab-grid-cell ynab-grid-cell-outflow user-data">
                  <input
                    type="text"
                    className="accounts-text-field ember-text-field"
                    defaultValue={subOutStr}
                    key={`sub-out-${sub.entityId}-${sub.amount}`}
                    onBlur={(e) => handleSubAmountBlur(idx, e.target.value, true)}
                    placeholder="0.00"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                {/* Sub Inflow */}
                <div className="ynab-grid-cell ynab-grid-cell-inflow user-data">
                  <input
                    type="text"
                    className="accounts-text-field ember-text-field"
                    defaultValue={subInStr}
                    key={`sub-in-${sub.entityId}-${sub.amount}`}
                    onBlur={(e) => handleSubAmountBlur(idx, e.target.value, false)}
                    placeholder="0.00"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                {showRunningBalance && <div className="ynab-grid-cell ynab-grid-cell-balance">&nbsp;</div>}
                <div className="ynab-grid-cell ynab-grid-cell-cleared">&nbsp;</div>
              </div>
            );
          })}

          {/* Add Another Split row (components/register/grid-add-rows.hbs) */}
          <div className="ynab-grid-body-row is-editing is-checked ynab-grid-body-sub" role="row">
            <div className="ynab-grid-cell ynab-grid-cell-checkbox">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-notification">&nbsp;</div>
            {showFlags && <div className="ynab-grid-cell ynab-grid-cell-flag">&nbsp;</div>}
            {showImages && <div className="ynab-grid-cell ynab-grid-cell-image">&nbsp;</div>}
            {showAccountColumn && <div className="ynab-grid-cell ynab-grid-cell-accountName">&nbsp;</div>}
            <div className="ynab-grid-cell ynab-grid-cell-date">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-payeeName">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-subCategoryName user-data" style={{ paddingLeft: '0.5rem' }}>
              <button
                type="button"
                className="button-link"
                onClick={() => {
                  setSubTransactions((prev) => [
                    ...prev,
                    {
                      entityId: `sub-${Date.now()}-${prev.length + 1}`,
                      parentTransactionId: transaction.entityId,
                      subCategoryId: '',
                      subCategoryName: '',
                      memo: '',
                      amount: 0,
                    },
                  ]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--actionPrimary, #545bfe)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <Icon name="plus" width={11} height={11} />
                <span>+ Add another split</span>
              </button>
            </div>
            <div className="ynab-grid-cell ynab-grid-cell-memo">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-outflow">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-inflow">&nbsp;</div>
            {showRunningBalance && <div className="ynab-grid-cell ynab-grid-cell-balance">&nbsp;</div>}
            <div className="ynab-grid-cell ynab-grid-cell-cleared">&nbsp;</div>
          </div>

          {/* Split Remaining Calculator row (components/register/grid-split.hbs) */}
          <div className="ynab-grid-body-row ynab-grid-body-split is-editing is-checked" role="row">
            <div className="ynab-grid-cell ynab-grid-cell-checkbox">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-notification">&nbsp;</div>
            {showFlags && <div className="ynab-grid-cell ynab-grid-cell-flag">&nbsp;</div>}
            {showImages && <div className="ynab-grid-cell ynab-grid-cell-image">&nbsp;</div>}
            {showAccountColumn && <div className="ynab-grid-cell ynab-grid-cell-accountName">&nbsp;</div>}
            <div className="ynab-grid-cell ynab-grid-cell-date">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-payeeName">&nbsp;</div>
            <div className="ynab-grid-cell ynab-grid-cell-subCategoryName">&nbsp;</div>
            <div
              className="ynab-grid-cell ynab-grid-cell-memo"
              style={{
                fontWeight: 600,
                color: remainingSplitMilliunits !== 0 ? 'var(--labelNegative, #bf2e3b)' : 'var(--labelSecondary, #727484)',
                textAlign: 'right',
                paddingRight: '0.5rem',
              }}
            >
              Amount remaining to assign:
            </div>
            <div
              className="ynab-grid-cell ynab-grid-cell-outflow user-data"
              style={{
                textAlign: 'right',
                fontWeight: 600,
                color: remainingSplitMilliunits < 0 ? 'var(--labelNegative, #bf2e3b)' : 'inherit',
              }}
            >
              <span className="currency tabular-nums">
                {remainingSplitMilliunits < 0 ? `$${(Math.abs(remainingSplitMilliunits) / 1000).toFixed(2)}` : '$0.00'}
              </span>
            </div>
            <div
              className="ynab-grid-cell ynab-grid-cell-inflow user-data"
              style={{
                textAlign: 'right',
                fontWeight: 600,
                color: remainingSplitMilliunits > 0 ? 'var(--labelPositive, #02bc79)' : 'inherit',
              }}
            >
              <span className="currency tabular-nums">
                {remainingSplitMilliunits > 0 ? `$${(remainingSplitMilliunits / 1000).toFixed(2)}` : '$0.00'}
              </span>
            </div>
            {showRunningBalance && <div className="ynab-grid-cell ynab-grid-cell-balance">&nbsp;</div>}
            <div className="ynab-grid-cell ynab-grid-cell-cleared">&nbsp;</div>
          </div>
        </>
      )}

      {/* 3. Actions Row (Cancel / Save / Save and Add Another) */}
      <div
        className={`ynab-grid-body-row ynab-grid-actions is-editing ${isAddRow ? 'is-adding is-add-row' : ''}`}
        role="row"
      >
        <div className="ynab-grid-cell ynab-grid-cell-checkbox">&nbsp;</div>
        <div className="ynab-grid-cell ynab-grid-cell-notification">&nbsp;</div>
        {showFlags && <div className="ynab-grid-cell ynab-grid-cell-flag">&nbsp;</div>}
        {showImages && <div className="ynab-grid-cell ynab-grid-cell-image">&nbsp;</div>}
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
              disabled={isSplit && remainingSplitMilliunits !== 0}
              onClick={handleSave}
            >
              Save
            </button>
            {isAddRow && (
              <button
                className="button button-primary-small button-another"
                type="button"
                disabled={isSplit && remainingSplitMilliunits !== 0}
                onClick={handleSaveAndAdd}
              >
                Save and Add Another
              </button>
            )}
          </div>
        </div>
        {showRunningBalance && <div className="ynab-grid-cell ynab-grid-cell-balance">&nbsp;</div>}
        <div className="ynab-grid-cell ynab-grid-cell-cleared">&nbsp;</div>
      </div>

      {/* Flag picker popover if opened from edit row */}
      {flagPickerOpen && (
        <FlagPickerPopover
          isOpen={flagPickerOpen}
          triggerRect={flagTriggerRect}
          currentFlag={flag}
          onSelectFlag={(newFlag) => setFlag(newFlag)}
          onClose={() => setFlagPickerOpen(false)}
        />
      )}

      {/* Date picker popover */}
      {datePickerOpen && (
        <DatePickerPopover
          isOpen={datePickerOpen}
          triggerRect={dateTriggerRect}
          selectedDate={parseToIsoDate(dateStr)}
          onSelectDate={(iso) => {
            setDateStr(formatToDisplayDate(iso));
            setDatePickerOpen(false);
          }}
          onClose={() => setDatePickerOpen(false)}
        />
      )}

      {/* Account picker popover (if All Accounts) */}
      {accountPickerOpen && (
        <AccountPickerPopover
          isOpen={accountPickerOpen}
          triggerRect={accountTriggerRect}
          selectedAccountId={accountId}
          accounts={accounts}
          onSelectAccount={(acc) => {
            setAccountId(acc);
            setAccountPickerOpen(false);
          }}
          onClose={() => setAccountPickerOpen(false)}
        />
      )}

      {/* Category picker popover (Main or Sub-row) */}
      {categoryPickerOpen && (
        <CategoryPickerPopover
          isOpen={categoryPickerOpen}
          triggerRect={categoryTriggerRect}
          selectedCategoryId={activeSubIndex !== null ? subTransactions[activeSubIndex]?.subCategoryId || '' : subCategoryId}
          categoryGroups={categoryGroups}
          canSplit={activeSubIndex === null}
          onSelectSplit={() => {
            setIsSplit(true);
            setSubCategoryId('split');
            setSubCategoryName('Split (Multiple Categories)...');
            setCategoryPickerOpen(false);
          }}
          onSelectCategory={(catId, fullName) => {
            if (activeSubIndex !== null) {
              setSubTransactions((prev) =>
                prev.map((s, i) =>
                  i === activeSubIndex
                    ? { ...s, subCategoryId: catId, subCategoryName: fullName }
                    : s
                )
              );
              setActiveSubIndex(null);
            } else {
              setSubCategoryId(catId);
              setSubCategoryName(fullName);
            }
            setCategoryPickerOpen(false);
          }}
          onClose={() => {
            setCategoryPickerOpen(false);
            setActiveSubIndex(null);
          }}
        />
      )}

      {/* Payee picker popover */}
      {payeePickerOpen && (
        <PayeePickerPopover
          isOpen={payeePickerOpen}
          triggerRect={payeeTriggerRect}
          currentPayeeName={payeeName}
          accounts={accounts}
          payees={payees}
          onSelectPayee={(pName, targetAccId) => {
            setPayeeName(pName);
            if (targetAccId || pName.startsWith('Transfer :')) {
              setSubCategoryId('category-not-needed');
              setSubCategoryName('Category not needed');
              setIsSplit(false);
            }
            setPayeePickerOpen(false);
          }}
          onClose={() => setPayeePickerOpen(false)}
        />
      )}
    </>
  );
}

export default RegisterGridEditRow;
