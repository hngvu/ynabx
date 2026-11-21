import React, { useState, useEffect } from 'react';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { INCOME_EXPENSE_DATA } from './reflectFixtures';
import {
  computeIncomeExpenseReportData,
  REFLECT_HISTORICAL_TRANSACTIONS,
} from './reflectDataEngine';
import { INITIAL_CATEGORY_GROUPS } from '../budget/budgetData';

export interface IncomeExpenseProps {
  data?: typeof INCOME_EXPENSE_DATA;
  timeframeLabel?: string;
  categoriesLabel?: string;
  accountsLabel?: string;
  categoriesPill?: string;
  accountsPill?: string;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenCategories?: () => void;
  onOpenAccounts?: () => void;
  onExport?: () => void;
  onOpenInspectModal?: (categoryName: string, month: string, amount: string) => void;
}

interface InspectModalData {
  title: string;
  category: string;
  month: string;
  amount: string;
  transactions: Array<{
    date: string;
    payee: string;
    memo?: string;
    amount: string;
  }>;
}

export const IncomeExpenseView: React.FC<IncomeExpenseProps> = ({
  data: dataProp,
  timeframeLabel,
  categoriesLabel,
  accountsLabel,
  categoriesPill,
  accountsPill,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenCategories,
  onOpenAccounts,
  onExport,
  onOpenInspectModal,
}) => {
  const data = React.useMemo(
    () =>
      dataProp ??
      computeIncomeExpenseReportData(
        REFLECT_HISTORICAL_TRANSACTIONS,
        INITIAL_CATEGORY_GROUPS
      ),
    [dataProp]
  );
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Immediate Income': true,
    'Immediate Obligations': true,
    'True Expenses': true,
    'Quality of Life': false
  });

  const [inspectModal, setInspectModal] = useState<InspectModalData | null>(null);

  useEffect(() => {
    if (!inspectModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inspectModal]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleOpenInspect = (categoryName: string, month: string, amount: string) => {
    const monthMatch = /^([A-Za-z]{3})\s+(\d{4})$/.exec(month.trim());
    const monthIdx = monthMatch
      ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(monthMatch[1])
      : -1;
    const ym = monthMatch && monthIdx !== -1 ? `${monthMatch[2]}-${String(monthIdx + 1).padStart(2, '0')}` : null;

    const realTxs: Array<{ date: string; payee: string; memo?: string; amount: string }> = [];
    for (const tx of REFLECT_HISTORICAL_TRANSACTIONS) {
      if (tx.transferAccountId || tx.entityId.startsWith('tx-sb-')) continue;
      if (ym && !tx.date.startsWith(ym)) continue;
      if (tx.isSplit && tx.subTransactions) {
        for (const sub of tx.subTransactions) {
          if (sub.subCategoryName === categoryName) {
            const sign = sub.amount < 0 ? '-' : '';
            realTxs.push({
              date: tx.date,
              payee: tx.payeeName,
              memo: sub.memo || tx.memo,
              amount: `${sign}$${(Math.abs(sub.amount) / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            });
          }
        }
      } else if (
        tx.subCategoryName === categoryName ||
        (categoryName === 'Total Income' && tx.amount > 0 && tx.subCategoryId === 'inflow-ready-to-assign')
      ) {
        const sign = tx.amount < 0 ? '-' : '';
        realTxs.push({
          date: tx.date,
          payee: tx.payeeName,
          memo: tx.memo,
          amount: `${sign}$${(Math.abs(tx.amount) / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        });
      }
    }

    setInspectModal({
      title: `${categoryName} – ${month}`,
      category: categoryName,
      month,
      amount,
      transactions: realTxs,
    });
  };

  const renderExpandableGroup = (grp: {
    name: string;
    subcategories: Array<{ name: string; amounts: string[] }>;
    totals: string[];
  }) => {
    const isExpanded = expandedGroups[grp.name] ?? true;
    return (
      <React.Fragment key={grp.name}>
        <div className="income-expense-row">
          <button
            className="income-expense-column income-expense-first-column"
            type="button"
            onClick={() => toggleGroup(grp.name)}
          >
            <span className="user-entered-text">{grp.name}&nbsp;</span>
            <svg className="ynab-new-icon" width="8" height="8">
              <use href={isExpanded ? '#icon_sprite_caret_down' : '#icon_sprite_caret_right'} />
            </svg>
          </button>
          {isExpanded
            ? data.columns.map((_, idx) => (
                <div key={idx} className="income-expense-column" />
              ))
            : grp.totals.map((tot, idx) => (
                <button
                  key={idx}
                  className="income-expense-column income-expense-number"
                  type="button"
                  onClick={() => handleOpenInspect(grp.name, data.columns[idx], tot)}
                  title="View transactions"
                >
                  <span className="user-data currency tabular-nums zero">
                    {tot}
                  </span>
                </button>
              ))}
        </div>

        {isExpanded && (
          <>
            <div className="income-expense-group income-expense-level2">
              {grp.subcategories.map(sub => (
                <div key={sub.name} className="income-expense-row">
                  <div className="income-expense-column income-expense-first-column">
                    <span className="user-entered-text">{sub.name}</span>
                  </div>
                  {sub.amounts.map((amt, idx) => (
                    <button
                      key={idx}
                      className="income-expense-column income-expense-number"
                      type="button"
                      onClick={() => handleOpenInspect(sub.name, data.columns[idx], amt)}
                      title="View transactions"
                    >
                      <span className="user-data currency tabular-nums zero">
                        {amt}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="income-expense-row income-expense-totals">
              <div className="income-expense-column income-expense-first-column">
                Total {grp.name}
              </div>
              {grp.totals.map((tot, idx) => (
                <button
                  key={idx}
                  className="income-expense-column income-expense-number"
                  type="button"
                  onClick={() => handleOpenInspect(`Total ${grp.name}`, data.columns[idx], tot)}
                  title="View transactions"
                >
                  <span className="user-data currency tabular-nums zero">
                    {tot}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="reflect-income-expense-header">
        <ReflectPageHeader pageTitle="Income v Expense" onExport={onExport} />
        <ReflectFilterControls timeframeLabel={timeframeLabel} categoriesLabel={categoriesLabel} accountsLabel={accountsLabel} categoriesPill={categoriesPill} accountsPill={accountsPill} onPrevTimeframe={onPrevTimeframe} onNextTimeframe={onNextTimeframe} onOpenTimeframe={onOpenTimeframe} onOpenCategories={onOpenCategories} onOpenAccounts={onOpenAccounts} />
      </div>

      <div className="reports-income-expense reflect-income-expense" style={{ overflowX: 'auto' }}>
        <style>{`
          .income-expense-table { width: max-content !important; min-width: 100% !important; }
          .income-expense-table .income-expense-row { display: flex !important; width: 100% !important; min-width: max-content !important; }
          .income-expense-table .income-expense-first-column {
            width: 220px !important; min-width: 220px !important; max-width: 220px !important; flex: 0 0 220px !important;
            position: sticky !important; left: 0 !important; z-index: 3 !important;
            background-color: var(--backgroundPrimary, #ffffff) !important;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .income-expense-table .income-expense-column:not(.income-expense-first-column) {
            width: 98px !important; min-width: 98px !important; flex: 0 0 98px !important;
          }
        `}</style>
        <div className="reports-content">
          <div className="income-expense-table">
            {/* Header row */}
            <div className="income-expense-header">
              <div className="income-expense-row">
                <div className="income-expense-column income-expense-column-header income-expense-first-column">&nbsp;</div>
                {data.columns.map(col => (
                  <div key={col} className="income-expense-column income-expense-column-header">
                    {col.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Income section */}
            <div className="income-expense-income">
              <div className="income-expense-row income-expense-h1">
                <button
                  className="income-expense-column income-expense-first-column"
                  type="button"
                  onClick={() => setShowIncome(!showIncome)}
                >
                  <svg className="ynab-new-icon" width="8" height="8">
                    <use href={showIncome ? '#icon_sprite_caret_down' : '#icon_sprite_caret_right'} />
                  </svg>
                  Income
                </button>
                {data.columns.map((_, idx) => (
                  <div key={idx} className="income-expense-column" />
                ))}
              </div>

              {showIncome && (
                <div className="income-expense-group income-expense-level1">
                  {data.incomeGroups.map(grp => renderExpandableGroup(grp))}

                  <div className="income-expense-row income-expense-is-total-row">
                    <div className="income-expense-column income-expense-first-column">
                      <span className="user-entered-text">Total Income</span>
                    </div>
                    {data.totalIncome.map((tot, idx) => (
                      <button
                        key={idx}
                        className="income-expense-column income-expense-number"
                        type="button"
                        onClick={() => handleOpenInspect('Total Income', data.columns[idx], tot)}
                      >
                        <span className="user-data currency tabular-nums zero">
                          {tot}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expense section */}
            <div className="income-expense-expense">
              <div className="income-expense-row income-expense-h1">
                <button
                  className="income-expense-column income-expense-first-column"
                  type="button"
                  onClick={() => setShowExpense(!showExpense)}
                >
                  <svg className="ynab-new-icon" width="8" height="8">
                    <use href={showExpense ? '#icon_sprite_caret_down' : '#icon_sprite_caret_right'} />
                  </svg>
                  Expense
                </button>
                {data.columns.map((_, idx) => (
                  <div key={idx} className="income-expense-column" />
                ))}
              </div>

              {showExpense && (
                <div className="income-expense-group income-expense-level1">
                  {data.expenseGroups.map(grp => renderExpandableGroup(grp))}

                  <div className="income-expense-row income-expense-is-total-row">
                    <div className="income-expense-column income-expense-first-column">
                      <span className="user-entered-text">Total Expenses</span>
                    </div>
                    {data.totalExpense.map((tot, idx) => (
                      <button
                        key={idx}
                        className="income-expense-column income-expense-number"
                        type="button"
                        onClick={() => handleOpenInspect('Total Expenses', data.columns[idx], tot)}
                      >
                        <span className="user-data currency tabular-nums zero">
                          {tot}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Net Income section */}
            <div className="income-expense-net-income">
              <div className="income-expense-row income-expense-h1">
                <div className="income-expense-column income-expense-first-column">
                  Net Income
                </div>
                {data.columns.map((_, idx) => (
                  <div key={idx} className="income-expense-column" />
                ))}
              </div>
              <div className="income-expense-row">
                <div className="income-expense-column income-expense-first-column">&nbsp;</div>
                {data.netIncome.map((net, idx) => (
                  <div key={idx} className="income-expense-column income-expense-number">
                    <span className="user-data currency tabular-nums zero" style={{ fontWeight: 600 }}>
                      {net}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Transactions Modal */}
      {inspectModal && (
        <div
          className="modal-overlay active"
          onClick={() => setInspectModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10010,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        >
          <div
            className="pure-u modal-popup modal-reports-transactions"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
              borderRadius: '0.5rem',
              width: '560px',
              maxWidth: '92vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              opacity: 1,
              overflow: 'hidden',
            }}
          >
            <div className="modal-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--separatorStandard, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '15px' }}>{inspectModal.title}</strong>
              <button type="button" aria-label="Close" onClick={() => setInspectModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div className="modal-content" style={{ padding: '1rem 1.25rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--labelSecondary)' }}>
                <span>Activity in {inspectModal.month}</span>
                <strong style={{ color: 'var(--labelPrimary)' }}>{inspectModal.amount}</strong>
              </div>
              {inspectModal.transactions.length === 0 ? (
                <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--labelSecondary)', fontSize: '13px' }}>
                  No transactions recorded for this selection.
                </div>
              ) : (
                <table className="ynab-table" style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--separatorStandard, #e5e5e5)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Date</th>
                      <th style={{ padding: '0.5rem' }}>Payee</th>
                      <th style={{ padding: '0.5rem' }}>Memo</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectModal.transactions.map((tx, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--separatorSubtle, #f0f0f0)' }}>
                        <td style={{ padding: '0.5rem' }}>{tx.date}</td>
                        <td style={{ padding: '0.5rem' }}>{tx.payee}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--labelSecondary)' }}>{tx.memo}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500 }}>{tx.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
