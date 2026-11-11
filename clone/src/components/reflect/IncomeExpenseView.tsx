import React, { useState } from 'react';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { INCOME_EXPENSE_DATA } from './reflectFixtures';

export const IncomeExpenseView: React.FC<{ data?: typeof INCOME_EXPENSE_DATA }> = ({
  data = INCOME_EXPENSE_DATA
}) => {
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);

  return (
    <div className="reports-income-expense reflect-income-expense">
      <div className="reflect-income-expense-header">
        <ReflectPageHeader pageTitle="Income v Expense" />
        <ReflectFilterControls />
      </div>

      <div className="reports-content">
        <div className="income-expense-table">
          <table className="ynab-table">
            <thead>
              <tr className="income-expense-header">
                <th className="category-header">Category</th>
                {data.columns.map(col => (
                  <th key={col} className="month-header">{col}</th>
                ))}
              </tr>
            </thead>

            {/* Income Section */}
            <tbody className="income-expense-income">
              <tr className="income-expense-section-header" onClick={() => setShowIncome(!showIncome)}>
                <td colSpan={data.columns.length + 1}>
                  <svg className="ynab-new-icon" width="10" height="10">
                    <use href={showIncome ? '#icon_sprite_chevron_down' : '#icon_sprite_chevron_right'} />
                  </svg>
                  <strong>INCOME</strong>
                </td>
              </tr>

              {showIncome &&
                data.incomeGroups.map(grp => (
                  <React.Fragment key={grp.name}>
                    <tr className="income-expense-group income-expense-level1">
                      <td>{grp.name}</td>
                      {grp.totals.map((t, idx) => (
                        <td key={idx}>{t}</td>
                      ))}
                    </tr>
                    {grp.subcategories.map(sub => (
                      <tr key={sub.name} className="income-expense-row income-expense-level2">
                        <td className="subcat-name">{sub.name}</td>
                        {sub.amounts.map((a, idx) => (
                          <td key={idx}>{a}</td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

              <tr className="income-expense-totals">
                <td>Total Income</td>
                {data.totalIncome.map((tot, idx) => (
                  <td key={idx}><strong>{tot}</strong></td>
                ))}
              </tr>
            </tbody>

            {/* Expense Section */}
            <tbody className="income-expense-expense">
              <tr className="income-expense-section-header" onClick={() => setShowExpense(!showExpense)}>
                <td colSpan={data.columns.length + 1}>
                  <svg className="ynab-new-icon" width="10" height="10">
                    <use href={showExpense ? '#icon_sprite_chevron_down' : '#icon_sprite_chevron_right'} />
                  </svg>
                  <strong>EXPENSES</strong>
                </td>
              </tr>

              {showExpense &&
                data.expenseGroups.map(grp => (
                  <React.Fragment key={grp.name}>
                    <tr className="income-expense-group income-expense-level1">
                      <td>{grp.name}</td>
                      {grp.totals.map((t, idx) => (
                        <td key={idx}>{t}</td>
                      ))}
                    </tr>
                    {grp.subcategories.map(sub => (
                      <tr key={sub.name} className="income-expense-row income-expense-level2">
                        <td className="subcat-name">{sub.name}</td>
                        {sub.amounts.map((a, idx) => (
                          <td key={idx}>{a}</td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

              <tr className="income-expense-totals">
                <td>Total Expenses</td>
                {data.totalExpense.map((tot, idx) => (
                  <td key={idx}><strong>{tot}</strong></td>
                ))}
              </tr>
            </tbody>

            {/* Net Income Summary */}
            <tbody className="income-expense-net-income">
              <tr className="net-income-row">
                <td><strong>NET INCOME</strong></td>
                {data.netIncome.map((net, idx) => (
                  <td key={idx} className="positive">
                    <strong>{net}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
