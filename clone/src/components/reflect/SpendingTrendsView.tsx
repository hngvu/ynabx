import React from 'react';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { SPENDING_TRENDS_DATA } from './reflectFixtures';

export const SpendingTrendsView: React.FC<{ data?: typeof SPENDING_TRENDS_DATA }> = ({
  data = SPENDING_TRENDS_DATA
}) => {
  return (
    <div className="reports-spending-trends">
      <ReflectPageHeader pageTitle="Spending Trends" />
      <ReflectFilterControls />

      <div className="reflect-spending-trends">
        <div className="reflect-spending-trends__chart-card card">
          <div className="spending-trends__chart-header">
            <div className="spending-trends__average-monthly-spending">
              <span className="title">Average Monthly Spending</span>
              <span className="value">{data.monthlyAverage}</span>
            </div>
            <div className="spending-trends__total-spending">
              <span className="title">Total Spending</span>
              <span className="value">{data.totalSpending}</span>
            </div>
          </div>

          <div className="reports-spending-trends chart-container">
            {/* SVG Trends Bar & Line representation */}
            <svg width="100%" height="220" viewBox="0 0 700 220">
              <line x1="50" y1="110" x2="650" y2="110" stroke="#4a90e2" strokeDasharray="4 4" strokeWidth="2" />
              {data.months.map((m, idx) => {
                const x = 80 + idx * 100;
                const h = (m.total / 3000000) * 150;
                const y = 190 - h;
                return (
                  <g key={m.month}>
                    <rect x={x} y={y} width="50" height={h} rx="3" fill="#50e3c2" />
                    <text x={x + 25} y="210" textAnchor="middle" fontSize="11" fill="var(--colorTextSecondary, #777)">
                      {m.month.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="spending-trends__table-card card">
          <table className="ynab-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Total Spending</th>
                <th>Compared to Monthly Average</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map(m => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{m.formattedTotal}</td>
                  <td className={m.didDecrease ? 'positive' : 'negative'}>
                    <span className="diff-badge">
                      <svg className="ynab-new-icon" width="10" height="10">
                        <use href={m.didDecrease ? '#icon_sprite_arrow_down' : '#icon_sprite_arrow_up'} />
                      </svg>
                      {m.diffFormatted}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
