import React from 'react';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { NET_WORTH_DATA } from './reflectFixtures';

export const NetWorthView: React.FC<{ data?: typeof NET_WORTH_DATA }> = ({
  data = NET_WORTH_DATA
}) => {
  return (
    <div className="reports-net-worth">
      <ReflectPageHeader
        pageTitle="Net Worth"
        onShareProgress={() => {}}
      />
      <ReflectFilterControls showCategories={false} />

      <div className="reflect-net-worth">
        <div className="reflect-net-worth__chart-card card">
          <div className="reflect-net-worth-summary">
            <div className="summary-block net-worth">
              <span className="label">Net Worth</span>
              <span className="amount">{data.formattedNetWorth}</span>
              <span className="change positive">{data.formattedChange}</span>
            </div>

            <div className="summary-block assets">
              <span className="rounded-square-assets" />
              <span className="label">Assets</span>
              <span className="amount">{data.formattedAssets}</span>
            </div>

            <div className="summary-block debts">
              <span className="rounded-square-debts" />
              <span className="label">Debts</span>
              <span className="amount">{data.formattedDebts}</span>
            </div>
          </div>

          <div className="reports-net-worth chart-container">
            <svg width="100%" height="220" viewBox="0 0 700 220">
              <line x1="50" y1="120" x2="650" y2="120" stroke="var(--borderSubtle, #ddd)" strokeWidth="1" />
              {data.history.map((h, idx) => {
                const x = 70 + idx * 100;
                const assetH = (h.assets / 60000000) * 80;
                const debtH = (h.debts / 60000000) * 40;
                return (
                  <g key={h.month}>
                    {/* Asset bar (above line) */}
                    <rect x={x} y={120 - assetH} width="40" height={assetH} rx="2" fill="#4a90e2" />
                    {/* Debt bar (below line) */}
                    <rect x={x} y={120} width="40" height={debtH} rx="2" fill="#e24a8d" />
                    <text x={x + 20} y="185" textAnchor="middle" fontSize="11" fill="var(--colorTextSecondary, #777)">
                      {h.month.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="reflect-networth-monthly-table">
          <div className="networth__table-card card">
            <table className="ynab-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Debts</th>
                  <th>Assets</th>
                  <th>Net Worth</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map(row => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td className="debt-amount">-${(row.debts / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="asset-amount">${(row.assets / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td><strong>${(row.netWorth / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                    <td className={row.increased ? 'positive' : 'negative'}>
                      +${(row.change / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
