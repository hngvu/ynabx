import React, { useState, useEffect, useRef } from 'react';
import bb, { line, area } from 'billboard.js';
import 'billboard.js/dist/billboard.css';
import { ReflectPageHeader } from './ReflectPageHeader';
import { AGE_OF_MONEY_DATA } from './reflectFixtures';

export interface AgeOfMoneyProps {
  data?: typeof AGE_OF_MONEY_DATA;
  isEmpty?: boolean;
}

interface AOMTooltipState {
  x: number;
  y: number;
  month: string;
  days: number;
}

export const AgeOfMoneyView: React.FC<AgeOfMoneyProps> = ({
  data = AGE_OF_MONEY_DATA,
  isEmpty = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [tooltip, setTooltip] = useState<AOMTooltipState | null>(null);

  const timelineOptions = [
    { label: '6 Months', monthsToShow: 6 },
    { label: '1 Year', monthsToShow: 12 },
    { label: '2 Years', monthsToShow: 24 }
  ];

  const points = data.points;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (isEmpty) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    // Prepare time series x labels (YYYY-MM-01)
    const xLabels = ['x', '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'];
    const aomCol: (string | number)[] = ['ageOfMoney'];
    points.forEach(p => aomCol.push(p.age));

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Exact billboard options from components/reflect/age-of-money/chart/index.hbs
    const chart = bb.generate({
      bindto: chartContainerRef.current,
      data: {
        x: 'x',
        columns: [xLabels, aomCol],
        types: { ageOfMoney: area() },
        colors: { ageOfMoney: 'var(--reportsSpendingBreakdownTop6, #14b8a6)' },
        onover: (d: any, element: any) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const parentRect = chartContainerRef.current?.getBoundingClientRect();
          if (parentRect) {
            const pt = points[d.index];
            if (pt) {
              setTooltip({
                x: rect.left - parentRect.left + rect.width / 2,
                y: rect.top - parentRect.top,
                month: pt.date,
                days: pt.age
              });
            }
          }
        },
        onout: () => {
          setTooltip(null);
        }
      },
      legend: { show: false },
      padding: { top: 20, right: 20, bottom: 20, left: 60 },
      axis: {
        x: {
          type: 'timeseries',
          tick: {
            format: '%b\n%Y'
          }
        },
        y: {
          tick: {
            values: [0, 60],
            format: (v: number) => `${v} days`
          },
          max: 60
        }
      },
      grid: {
        y: {
          lines: [{ value: 0 }, { value: 60 }]
        }
      },
      point: { r: 5, focus: { expand: { enabled: false } } },
      tooltip: { show: false },
      onrendered: () => {
        // Strip inline SVG fill/stroke on dots and line so YNAB CSS controls dots & line
        if (chartContainerRef.current) {
          const circles = chartContainerRef.current.querySelectorAll('circle.bb-circle');
          circles.forEach(c => {
            (c as SVGElement).style.fill = '';
            (c as SVGElement).style.stroke = '';
          });
          const linePaths = chartContainerRef.current.querySelectorAll('.bb-line-ageOfMoney');
          linePaths.forEach(l => {
            (l as SVGElement).style.fill = '';
            (l as SVGElement).style.stroke = '';
          });
        }
      }
    });

    chartInstanceRef.current = chart;

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isEmpty, points]);

  return (
    <div className="reflect-age-of-money">
      <ReflectPageHeader
        pageTitle="Age of Money"
        hideActionButtons={true}
      />

      {/* Main Card */}
      <section className={`card chart-card ${isEmpty ? 'is-empty-state' : ''}`}>
        {isEmpty ? (
          <div className="empty-state-content">
            <h4>Spend more money!</h4>
            <p>Strange advice, we know. YNAB needs a minimum of 10 transactions to calculate your Age of Money.</p>
          </div>
        ) : (
          <>
            <div className="top-row">
              <div className="current-age-of-money" tabIndex={0}>
                <span className="current-age-of-money-title">Age of Money</span>
                <span className="current-age-of-money-value">
                  {data.currentAge} days
                </span>
              </div>

              {/* Segmented Control Timeline Toggle */}
              <div className="segmented-control textOnlyOption" role="group">
                {timelineOptions.map(opt => (
                  <button
                    key={opt.monthsToShow}
                    type="button"
                    className={`segmented-control-button ${selectedMonths === opt.monthsToShow ? 'selected' : ''}`}
                    onClick={() => setSelectedMonths(opt.monthsToShow)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="age-of-money-chart chart-container" style={{ position: 'relative' }}>
              {/* Real Billboard Mount Container */}
              <div ref={chartContainerRef} className="chart bb" style={{ width: '100%', height: 260 }} />

              {/* Ember tooltip */}
              {tooltip && (
                <div
                  className="bb-tooltip-container"
                  style={{
                    position: 'absolute',
                    left: tooltip.x,
                    top: tooltip.y - 12,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'none',
                    zIndex: 1000
                  }}
                >
                  <div className="reflect-age-of-money-tooltip">
                    <div className="content-container">
                      <div className="age-of-money-month">{tooltip.month}</div>
                      <div className="age-of-money-value">
                        <span>{tooltip.days}</span>{' '}
                        <span>Days</span>
                      </div>
                    </div>
                    <div className="tooltip-arrow" />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Understanding Age of Money Info Card */}
      <section className="card info-card">
        <h2 tabIndex={0}>Understanding Age of Money</h2>
        <div className="info-card-content" tabIndex={0}>
          <p>Age of Money is how long, on average, money sits in your account(s) between earning and spending it.</p>
          <p>Want to have more time to make decisions? Tired of shifting money around at the last minute? Use Age of Money to help you gauge the time between earning and spending.</p>
        </div>
      </section>
    </div>
  );
};
