import React, { useState, useEffect, useRef } from 'react';
import bb, { bar, line } from 'billboard.js';
import 'billboard.js/dist/billboard.css';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { SPENDING_TRENDS_DATA } from './reflectFixtures';
import {
  computeSpendingTrendsReportData,
  REFLECT_HISTORICAL_TRANSACTIONS,
} from './reflectDataEngine';
import { INITIAL_CATEGORY_GROUPS } from '../budget/budgetData';

export interface SpendingTrendsMonthItem {
  month: string;
  dateKey?: string;
  total: number;
  formattedTotal: string;
  diff: number;
  didDecrease?: boolean;
  didIncrease?: boolean;
  diffFormatted: string;
}

export interface SpendingTrendsProps {
  data?: {
    monthlyAverage: string;
    totalSpending: string;
    months: SpendingTrendsMonthItem[];
    xLabels?: string[];
    series?: Array<{ name: string; color: string; values: number[] }>;
  };
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
  data: dataProp,
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
  const liveData = React.useMemo(
    () =>
      computeSpendingTrendsReportData(
        REFLECT_HISTORICAL_TRANSACTIONS,
        INITIAL_CATEGORY_GROUPS
      ),
    []
  );
  const data = dataProp ?? liveData;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const months = data.months;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const xLabels = liveData.xLabels;
    const seriesCols = liveData.series.map((ser) => [
      ser.name,
      ...(isEmpty ? ser.values.map(() => 0) : ser.values),
    ]);
    const lineChartData = [
      'lineChart',
      ...months.map((m) => (isEmpty ? 0 : Number((m.total / 1000).toFixed(2)))),
    ];

    const colors: Record<string, string> = {
      lineChart: 'var(--labelPrimary, #191818)',
    };
    liveData.series.forEach((ser) => {
      colors[ser.name] = ser.color;
    });
    const groupNames = liveData.series.map((ser) => ser.name);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const chart = bb.generate({
      bindto: chartContainerRef.current,
      data: {
        x: 'x',
        columns: isEmpty ? [xLabels, lineChartData] : [xLabels, ...seriesCols, lineChartData],
        type: bar(),
        types: { lineChart: line() },
        groups: groupNames.length > 0 ? [groupNames] : [],
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
                      {(() => {
                        const avg = m.total - m.diff;
                        const pct = avg > 0 ? Math.abs((m.diff / avg) * 100).toFixed(1) : '0.0';
                        return m.didDecrease ? (
                          <span>
                            <svg className="ynab-new-icon" role="img" width="12" height="12" aria-label="Down from average">
                              <use href="#icon_sprite_arrow_down" />
                            </svg>
                            {' '}{m.diffFormatted}{' '}
                            ({pct}%)
                          </span>
                        ) : (
                          <span>
                            <svg className="ynab-new-icon" role="img" width="12" height="12" aria-label="Up from average">
                              <use href="#icon_sprite_arrow_up" />
                            </svg>
                            {' +'}{m.diffFormatted.replace('+', '')}{' '}
                            ({pct}%)
                          </span>
                        );
                      })()}
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
