import React, { useState, useEffect, useRef } from 'react';
import bb, { bar, line } from 'billboard.js';
import 'billboard.js/dist/billboard.css';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { SPENDING_TRENDS_DATA, SPENDING_COLORS } from './reflectFixtures';

export interface SpendingTrendsProps {
  data?: typeof SPENDING_TRENDS_DATA;
  isEmpty?: boolean;
  timeframeLabel?: string;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenCategories?: () => void;
  onOpenAccounts?: () => void;
  onExport?: () => void;
  onMonthClick?: (month: string) => void;
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  amount: string;
  subtext?: string;
  percentage?: string;
}

export const SpendingTrendsView: React.FC<SpendingTrendsProps> = ({
  data = SPENDING_TRENDS_DATA,
  isEmpty = false,
  timeframeLabel,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenCategories,
  onOpenAccounts,
  onExport,
  onMonthClick,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const months = data.months;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Prepare time labels: YYYY-MM-01
    const xLabels = ['x', '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'];

    // Categories breakdown per month (exact proportions matching Ember data)
    const cat1 = isEmpty
      ? ['Immediate Obligations', 0, 0, 0, 0, 0, 0]
      : ['Immediate Obligations', 1307.63, 1471.84, 1386.69, 1526.58, 1331.95, 1398.86];
    const cat2 = isEmpty
      ? ['True Expenses', 0, 0, 0, 0, 0, 0]
      : ['True Expenses', 482.67, 543.29, 511.86, 563.49, 491.65, 516.35];
    const cat3 = isEmpty
      ? ['Quality of Life', 0, 0, 0, 0, 0, 0]
      : ['Quality of Life', 359.70, 404.87, 381.45, 419.93, 366.40, 384.79];

    // Line chart connects the monthly net totals at the top of each stacked bar (dZ.lineChartData)
    const lineChartData = isEmpty
      ? ['lineChart', 0, 0, 0, 0, 0, 0]
      : ['lineChart', 2150.00, 2420.00, 2280.00, 2510.00, 2190.00, 2300.00];

    // Color mapping
    const colors: Record<string, string> = {
      'Immediate Obligations': SPENDING_COLORS[0], // #545bfe
      'True Expenses': SPENDING_COLORS[1],         // #93d53e
      'Quality of Life': SPENDING_COLORS[2],        // #f6c91d
      'lineChart': 'var(--labelPrimary, #191818)'
    };

    // Clean up previous instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Exact Ember billboard.js options decompiled from components/reports/spending/trends-chart.hbs
    const chart = bb.generate({
      bindto: chartContainerRef.current,
      data: {
        x: 'x',
        columns: isEmpty ? [xLabels, lineChartData] : [xLabels, cat1, cat2, cat3, lineChartData],
        type: bar(),
        types: { lineChart: line() },
        groups: [['Immediate Obligations', 'True Expenses', 'Quality of Life']],
        colors,
        onover: (d: any, element: any) => {
          if (isEmpty || !element) return;
          const rect = element.getBoundingClientRect();
          const parentRect = chartContainerRef.current?.getBoundingClientRect();
          if (parentRect) {
            const x = rect.left - parentRect.left + rect.width / 2;
            const y = rect.top - parentRect.top;
            if (d.id === 'lineChart') {
              const monthName = months[d.index]?.month || '';
              setTooltip({
                x,
                y,
                title: monthName,
                amount: `$${d.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                subtext: 'Total Spending'
              });
            } else {
              setTooltip({
                x,
                y,
                title: d.id,
                amount: `$${d.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                percentage: `${((d.value / 2310.40) * 100).toFixed(1)}%`
              });
            }
          }
        },
        onout: () => {
          setTooltip(null);
        },
        onclick: (d: any) => {
          if (isEmpty) return;
          const clickedMonth = months[d.index]?.month;
          if (clickedMonth) {
            setSelectedMonth(prev => prev === clickedMonth ? null : clickedMonth);
          }
        }
      },
      legend: { show: false },
      padding: { top: 20, right: 20, bottom: 20, left: 60 },
      bar: { width: { ratio: 0.5 } },
      axis: {
        x: {
          type: 'timeseries',
          tick: {
            format: '%m/%y'
          }
        },
        y: {
          tick: {
            values: isEmpty ? [0] : [0, 500, 1000, 1500, 2000, 2500, 3000],
            format: (v: number) => `$${v.toLocaleString()}`
          }
        }
      },
      grid: { y: { lines: [{ value: 0 }] } },
      point: { show: !isEmpty, r: 5, focus: { expand: { enabled: false } } },
      tooltip: { show: false },
      onrendered: () => {
        // Strip inline SVG fill/stroke injected by billboard so YNAB CSS controls dots & line
        if (chartContainerRef.current) {
          const circles = chartContainerRef.current.querySelectorAll('circle.bb-circle');
          circles.forEach(c => {
            (c as SVGElement).style.fill = '';
            (c as SVGElement).style.stroke = '';
          });
          const linePaths = chartContainerRef.current.querySelectorAll('.bb-line-lineChart');
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
  }, [isEmpty, months]);

  return (
    <div className="reflect-spending-trends">
      <ReflectPageHeader pageTitle="Spending Trends" onExport={onExport} />
      <ReflectFilterControls timeframeLabel={timeframeLabel} onPrevTimeframe={onPrevTimeframe} onNextTimeframe={onNextTimeframe} onOpenTimeframe={onOpenTimeframe} onOpenCategories={onOpenCategories} onOpenAccounts={onOpenAccounts} />

      {/* Chart Card */}
      <div className="reflect-spending-trends__chart-card card">
        <div className="spending-trends__chart-header">
          <div className="spending-trends__average-monthly-spending">
            <span className="average-monthly-spending-title">Average Monthly Spending</span>
            <span className="average-monthly-spending-value">
              <span className="user-data currency tabular-nums zero">
                {isEmpty ? <><bdi>$</bdi>0.00</> : data.monthlyAverage}
              </span>
            </span>
          </div>
          <div className="spending-trends__total-spending">
            <span className="total-spending-title">Total Spending</span>
            <span className="total-spending-value">
              <span className="user-data currency tabular-nums zero">
                {isEmpty ? <><bdi>$</bdi>0.00</> : data.totalSpending}
              </span>
            </span>
          </div>
        </div>

        <div className="reports-spending-trends chart-container" style={{ position: 'relative' }}>
          {/* Billboard.js real mount container */}
          <div ref={chartContainerRef} className="chart bb" style={{ width: '100%', height: 280 }} />

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
              <div className="reflect-spending-tooltip">
                <h4>
                  <span className="user-entered-text">{tooltip.title}</span>
                </h4>
                <strong>{tooltip.amount}</strong>
                {tooltip.percentage ? (
                  <em>{tooltip.percentage}</em>
                ) : (
                  <em>{tooltip.subtext}</em>
                )}
                <div className="tooltip-arrow" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="spending-trends__table-card card">
        <div className="spending-breakdown-bar-chart">
          <div className="spending-trends-table-header spending-trends-table-row">
            <div className="spending-trends-table-section spending-trends-table-first-section">
              <span>Month</span>
            </div>
            <div className="spending-trends-table-section spending-trends-table-second-section">
              <span>Total Spending</span>
            </div>
            <div className="spending-trends-table-section spending-trends-table-third-section">
              <span>Compared to Average</span>
              <svg className="ynab-new-icon spending-trends-info-circle" width="16" height="16">
                <use href="#icon_sprite_info_circle_fill" />
              </svg>
            </div>
          </div>

          <div className="spending-trends-table-body card-body">
            {isEmpty ? (
              <div className="reflect-spending-empty-table-state">
                <span>No spending to show yet</span>
              </div>
            ) : (
              months.slice().reverse().map(m => {
                const isSelected = selectedMonth === m.month;
                return (
                  <div
                    key={m.month}
                    className={`reflect-bar-chart-row spending-trends-bar-chart-row spending-trends-table-row ${isSelected ? 'active' : ''}`}
                    tabIndex={0}
                    onClick={() => { setSelectedMonth(isSelected ? null : m.month); if (onMonthClick) onMonthClick(m.month); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="spending-trends-table-section spending-trends-table-first-section">
                      <span>{m.month}</span>
                    </div>
                    <div className="spending-trends-table-section spending-trends-table-second-section">
                      <span className="amount">{m.formattedTotal}</span>
                    </div>
                    <div className="spending-trends-table-section spending-trends-table-third-section">
                      {m.didDecrease ? (
                        <span>
                          <svg className="ynab-new-icon" role="img" width="12" height="12" aria-label="Down from average">
                            <use href="#icon_sprite_arrow_down" />
                          </svg>
                          {' '}{m.diffFormatted}{' '}
                          ({Math.abs((m.diff / 2310400) * 100).toFixed(1)}%)
                        </span>
                      ) : (
                        <span>
                          <svg className="ynab-new-icon" role="img" width="12" height="12" aria-label="Up from average">
                            <use href="#icon_sprite_arrow_up" />
                          </svg>
                          {' +'}{m.diffFormatted.replace('+', '')}{' '}
                          ({Math.abs((m.diff / 2310400) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
