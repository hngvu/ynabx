import React, { useState } from 'react';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { INCOME_EXPENSE_DATA } from './reflectFixtures';
import { Modal } from '../core/Modal';

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
  data = INCOME_EXPENSE_DATA,
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
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Immediate Income': true,
    'Immediate Obligations': true,
    'True Expenses': true,
    'Quality of Life': false
  });

  const [inspectModal, setInspectModal] = useState<InspectModalData | null>(null);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleOpenInspect = (categoryName: string, month: string, amount: string) => {
    setInspectModal({
      title: `${categoryName} – ${month}`,
      category: categoryName,
      month,
      amount,
      transactions: [
        { date: `12/${month.slice(-2)}`, payee: `${categoryName} Vendor`, memo: 'Monthly payment', amount },
        { date: `05/${month.slice(-2)}`, payee: 'Online Service', memo: 'Subscription / utility', amount: '$45.00' }
      ]
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

      <div className="reports-income-expense reflect-income-expense">
        <div className="reports-content">
          <div className="income-expense-table" style={{ width: '100%' }}>
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
        <Modal className="modal-reports-transactions" onClose={() => setInspectModal(null)} arrow="none">
          <Modal.Header close={() => setInspectModal(null)}>
            {inspectModal.title}
          </Modal.Header>
          <Modal.Body>
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--labelSecondary)' }}>
                <span>Activity in {inspectModal.month}</span>
                <strong style={{ color: 'var(--labelPrimary)' }}>{inspectModal.amount}</strong>
              </div>
              <table className="ynab-table" style={{ width: '100%', fontSize: '0.875rem' }}>
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
            </div>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};
