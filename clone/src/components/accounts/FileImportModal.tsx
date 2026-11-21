import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';
import { TransactionItem } from './accountData';
import {
  buildImportedTransactions,
  ParsedImportRow,
  parseImportFileContent,
} from '../../services/slikAccountEngine';

export interface FileImportModalProps {
  isOpen: boolean;
  accounts: AccountItem[];
  selectedAccountId?: string | null;
  existingTransactions: TransactionItem[];
  onImportTransactions: (transactions: TransactionItem[]) => void;
  onClose: () => void;
}

const SAMPLE_CSV = `Date,Payee,Memo,Outflow,Inflow
2026-11-18,Trader Joe's,Weekly produce,64.50,
2026-11-19,Blue Bottle Coffee,Morning espresso,5.75,
2026-11-20,Employer Payroll,Mid-month bonus,,500.00`;

export function FileImportModal({
  isOpen,
  accounts,
  selectedAccountId,
  existingTransactions,
  onImportTransactions,
  onClose,
}: FileImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openAccounts = accounts.filter((a) => !a.isClosed);
  const [targetAccountId, setTargetAccountId] = useState<string>(
    selectedAccountId || openAccounts[0]?.entityId || ''
  );
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const targetAccount =
    openAccounts.find((a) => a.entityId === targetAccountId) || openAccounts[0];

  const handleFileText = (name: string, text: string) => {
    setErrorMsg('');
    setFileName(name);
    const rows = parseImportFileContent(name, text, existingTransactions, targetAccount?.entityId);
    if (rows.length === 0) {
      setErrorMsg('No transactions could be parsed from this file. Check the format (CSV, OFX, QFX, QIF).');
    }
    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleFileText(file.name, String(reader.result ?? ''));
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const toggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const selectedCount = parsedRows.filter((r) => r.selected).length;

  const handleConfirmImport = () => {
    if (!targetAccount || selectedCount === 0) return;
    const txns = buildImportedTransactions(parsedRows, targetAccount);
    onImportTransactions(txns);
    setParsedRows([]);
    setFileName('');
    onClose();
  };

  const formatAmount = (milliunits: number) => {
    const neg = milliunits < 0;
    return `${neg ? '-' : ''}$${(Math.abs(milliunits) / 1000).toFixed(2)}`;
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal-generic modal-account-file-import is-rendered active"
        role="dialog"
        aria-label="Import Transactions"
        style={{
          width: '36rem',
          maxWidth: '94vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          color: 'var(--labelPrimary, #1b1d48)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
            Import Bank File (CSV, OFX, QFX, QIF)
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--labelSecondary, #727484)' }}
          >
            <Icon name="close" width={12} height={12} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Account:</label>
          <select
            value={targetAccount?.entityId || ''}
            onChange={(e) => setTargetAccountId(e.target.value)}
            style={{
              flex: 1,
              height: '2rem',
              padding: '0 0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--inputBorder, #c8cad6)',
            }}
          >
            {openAccounts.map((acc) => (
              <option key={acc.entityId} value={acc.entityId}>
                {acc.accountName}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            border: '1px dashed var(--inputBorder, #c8cad6)',
            borderRadius: '0.5rem',
            padding: '1rem',
            textAlign: 'center',
            marginBottom: '1rem',
            backgroundColor: 'var(--backgroundSecondary, #f8f9fc)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ofx,.qfx,.qif"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="document_with_arrow_up" width={14} height={14} />
              <span style={{ marginLeft: '6px' }}>Choose File...</span>
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => handleFileText('sample-statement.csv', SAMPLE_CSV)}
            >
              Load Sample CSV
            </button>
          </div>
          {fileName && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--labelSecondary, #727484)' }}>
              Loaded: <strong>{fileName}</strong> ({parsedRows.length} rows)
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--labelNegative, #bf2e3b)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
            {errorMsg}
          </div>
        )}

        {parsedRows.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--separatorStandard, #e5e7ef)', borderRadius: '0.375rem', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--backgroundSecondary, #f5f6fa)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Import</th>
                  <th style={{ padding: '0.5rem' }}>Date</th>
                  <th style={{ padding: '0.5rem' }}>Payee</th>
                  <th style={{ padding: '0.5rem' }}>Memo</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr key={row.id} style={{ borderTop: '1px solid var(--separatorStandard, #e5e7ef)' }}>
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem' }}>{row.date}</td>
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      {row.payeeName}
                      {row.isPotentialDuplicate && (
                        <span
                          style={{
                            marginLeft: '6px',
                            fontSize: '0.6875rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: '#fef5e6',
                            color: '#8e5b00',
                          }}
                        >
                          Possible Duplicate
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem', color: 'var(--labelSecondary, #727484)' }}>{row.memo}</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatAmount(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="button button-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!targetAccount || selectedCount === 0}
            onClick={handleConfirmImport}
          >
            Import {selectedCount} Transaction{selectedCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default FileImportModal;
