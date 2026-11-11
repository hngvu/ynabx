import React, { useState } from 'react';
import { ReflectNavigationHeader } from './ReflectNavigationHeader';
import { SpendingBreakdownView } from './SpendingBreakdownView';
import { SpendingTrendsView } from './SpendingTrendsView';
import { NetWorthView } from './NetWorthView';
import { IncomeExpenseView } from './IncomeExpenseView';
import { AgeOfMoneyView } from './AgeOfMoneyView';
import { InflowWarningModal } from './modals/InflowWarningModal';
import { DEFAULT_SPENDING_BREAKDOWN_DATA } from './reflectFixtures';

export const ReflectWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'spending-breakdown' | 'spending-trends' | 'net-worth' | 'income-expense' | 'age-of-money'>('spending-breakdown');
  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);

  const isOnIncomeExpenseRoute = activeTab === 'income-expense';

  return (
    <div className={`reports-header-top ${!isOnIncomeExpenseRoute ? 'content-min-break' : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ReflectNavigationHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={`reflect-container ${isOnIncomeExpenseRoute ? 'reflect-income-expense-container' : ''}`} style={{ flex: 1, overflow: 'auto' }}>
        <div className="reflect-content">
          {activeTab === 'spending-breakdown' && (
            <SpendingBreakdownView
              data={DEFAULT_SPENDING_BREAKDOWN_DATA}
              onOpenInflowModal={() => setIsInflowModalOpen(true)}
            />
          )}

          {activeTab === 'spending-trends' && <SpendingTrendsView />}
          {activeTab === 'net-worth' && <NetWorthView />}
          {activeTab === 'income-expense' && <IncomeExpenseView />}
          {activeTab === 'age-of-money' && <AgeOfMoneyView />}
        </div>
      </div>

      <InflowWarningModal
        isOpen={isInflowModalOpen}
        onClose={() => setIsInflowModalOpen(false)}
      />
    </div>
  );
};
