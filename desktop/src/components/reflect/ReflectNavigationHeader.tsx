import React from 'react';

interface Props {
  activeTab: 'spending-breakdown' | 'spending-trends' | 'net-worth' | 'income-expense' | 'age-of-money';
  onTabChange: (tab: 'spending-breakdown' | 'spending-trends' | 'net-worth' | 'income-expense' | 'age-of-money') => void;
}

export const ReflectNavigationHeader: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'spending-breakdown', label: 'Spending Breakdown' },
    { id: 'spending-trends', label: 'Spending Trends' },
    { id: 'net-worth', label: 'Net Worth' },
    { id: 'income-expense', label: 'Income v Expense' },
    { id: 'age-of-money', label: 'Age of Money' }
  ] as const;

  return (
    <div className="ynab-u reports-header">
      {tabs.map(item => (
        <button
          key={item.id}
          className={activeTab === item.id ? 'active' : ''}
          type="button"
          onClick={() => onTabChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
