import React, { useState } from 'react';
import { ReflectPageHeader } from './ReflectPageHeader';
import { AGE_OF_MONEY_DATA } from './reflectFixtures';

export const AgeOfMoneyView: React.FC<{ data?: typeof AGE_OF_MONEY_DATA }> = ({
  data = AGE_OF_MONEY_DATA
}) => {
  const [timeline, setTimeline] = useState('6 Months');

  return (
    <div className="reports-age-of-money">
      <ReflectPageHeader pageTitle="Age of Money" hideActionButtons={true} />

      <div className="reflect-age-of-money">
        <div className="chart-card card">
          <div className="top-row">
            <div className="current-age-of-money">
              <span className="age-number">{data.currentAge}</span>
              <span className="age-label">Days</span>
            </div>

            <div className="timeline-toggle segmented-control">
              {['6 Months', '1 Year', '2 Years'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={timeline === opt ? 'is-active' : ''}
                  onClick={() => setTimeline(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="age-of-money-chart">
            <svg width="100%" height="220" viewBox="0 0 700 220">
              <path
                d="M 60 160 L 160 140 L 260 135 L 360 115 L 460 105 L 560 100"
                fill="none"
                stroke="#50e3c2"
                strokeWidth="3"
              />
              {data.points.map((pt, idx) => {
                const x = 60 + idx * 100;
                const y = 220 - pt.age * 2.5;
                return (
                  <g key={pt.date}>
                    <circle cx={x} cy={y} r="5" fill="#50e3c2" stroke="#fff" strokeWidth="2" />
                    <text x={x} y="210" textAnchor="middle" fontSize="11" fill="var(--colorTextSecondary, #777)">
                      {pt.date.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="info-card card">
          <h4>Understanding Age of Money</h4>
          <p>
            Age of Money tells you how old your money is before you spend it. In other words, how many days have passed between when you earned a dollar and when you spent it.
          </p>
        </div>
      </div>
    </div>
  );
};
