import React, { useState, useEffect, useRef } from 'react';
import bb, { bar, line } from 'billboard.js';
import 'billboard.js/dist/billboard.css';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { NET_WORTH_DATA } from './reflectFixtures';

export interface NetWorthProps {
  data?: typeof NET_WORTH_DATA;
  isEmpty?: boolean;
  timeframeLabel?: string;
  accountsLabel?: string;
  accountsPill?: string;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenAccounts?: () => void;
  onShareProgress?: () => void;
  onExport?: () => void;
  onMonthClick?: (month: string) => void;
}

interface NWTooltipState {
  x: number;
  y: number;
  month: string;
  netWorth: string;
  debts: string;
  assets: string;
  change: string;
}

export const NetWorthView: React.FC<NetWorthProps> = ({
  data = NET_WORTH_DATA,
  isEmpty = false,
  timeframeLabel,
  accountsLabel,
  accountsPill,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenAccounts,
  onShareProgress,
  onExport,
  onMonthClick,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<NWTooltipState | null>(null);

  const months = data.history;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Prepare time series x labels (YYYY-MM-01)
    const xLabels = ['x', '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'];

    // In Ember YNAB (NP.bbChartData):
    // n[1] is negative debt (-m.debts), and bbChartData pushes -n[1] (+m.debts / 1000) so BOTH
    // Debts (left bar) and Assets (right bar) rise upward from $0 side-by-side!
    // Net Worth (l = Assets - Debts) is the line chart whose white dot sits at the X-center
    // between the Debts bar and the Assets bar.
    const debtsCol: (string | number)[] = ['Debts'];
    const assetsCol: (string | number)[] = ['Assets'];
    const netWorthCol: (string | number)[] = ['Net Worth'];

    months.forEach(m => {
      debtsCol.push(isEmpty ? 0 : m.debts / 1000);
      assetsCol.push(isEmpty ? 0 : m.assets / 1000);
      netWorthCol.push(isEmpty ? 0 : m.netWorth / 1000);
    });

    // Exact Ember NP.yTickIntervals calculation from wrapper-DkFKwf1z.js
    const yTickValues: number[] = [];
    if (isEmpty) {
      yTickValues.push(0);
    } else {
      let maxVal = 0;
      let minVal = 0;
      months.forEach(m => {
        const d = m.debts / 1000;
        const a = m.assets / 1000;
        const nw = m.netWorth / 1000;
        const taller = d > a ? d : a;
        if (taller > maxVal) maxVal = taller;
        if (nw < minVal) minVal = nw;
      });
      if (maxVal > 0) {
        maxVal = 80 * Math.ceil(maxVal / 80);
        minVal = 80 * Math.ceil(minVal / 80);
        const step = (maxVal - minVal) / 8;
        if (step > 0) {
          for (let v = minVal; v <= maxVal; v += step) {
            yTickValues.push(Number(v.toFixed(0)));
          }
        }
      }
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Exact billboard options from wrapper-DkFKwf1z.js (reports/net-worth.hbs)
    const chart = bb.generate({
      bindto: chartContainerRef.current,
      data: {
        x: 'x',
        columns: [xLabels, netWorthCol, debtsCol, assetsCol],
        types: {
          'Net Worth': line(),
          'Debts': bar(),
          'Assets': bar()
        },
        colors: {
          'Net Worth': 'var(--reportsNetworthLine, rgb(25, 24, 24))',
          'Assets': 'var(--reportsNetworthAssetsBackground, rgb(84, 91, 254))',
          'Debts': 'var(--reportsNetworthDebtsBackground, rgb(206, 94, 102))'
        },
        onover: (d: any, element: any) => {
          if (isEmpty || !element) return;
          const rect = element.getBoundingClientRect();
          const parentRect = chartContainerRef.current?.getBoundingClientRect();
          if (parentRect) {
            const m = months[d.index];
            if (m) {
              setTooltip({
                x: rect.left - parentRect.left + rect.width / 2,
                y: rect.top - parentRect.top,
                month: m.month,
                netWorth: `$${(m.netWorth / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                debts: `-$${(m.debts / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                assets: `$${(m.assets / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                change: `+$${(m.change / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
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
      padding: { mode: 'fit' as any, top: 16, right: 20, bottom: 20, left: 10 },
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
            values: yTickValues,
            format: (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
        }
      },
      grid: { y: { lines: [{ value: 0 }] } },
      point: { r: 5, focus: { expand: { enabled: false } }, sensitivity: 12 },
      tooltip: { show: false, grouped: false },
      onafterinit: function (this: any) {
        if (this.$?.bar?.bars) {
          this.$.bar.bars
            .style('stroke-width', '2px')
            .style('stroke', (t: any) => this.color(t));
        }
      },
      onrendered: () => {
        // Strip inline SVG fill/stroke on circles so YNAB CSS .reports-net-worth .bb-circle applies:
        // stroke: var(--labelPrimary), fill: var(--backgroundTableHeader)
        if (chartContainerRef.current) {
          const circles = chartContainerRef.current.querySelectorAll('circle.bb-circle');
          circles.forEach(c => {
            (c as SVGElement).style.fill = '';
            (c as SVGElement).style.stroke = '';
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
    <div className="reflect-net-worth">
      <ReflectPageHeader
        pageTitle="Net Worth"
        onShareProgress={onShareProgress}
        onExport={onExport}
      />
      <ReflectFilterControls showCategories={false} timeframeLabel={timeframeLabel} accountsLabel={accountsLabel} accountsPill={accountsPill} onPrevTimeframe={onPrevTimeframe} onNextTimeframe={onNextTimeframe} onOpenTimeframe={onOpenTimeframe} onOpenAccounts={onOpenAccounts} />

      {/* Chart Card */}
      <div className="reflect-net-worth__chart-card card">
        <div className="reflect-net-worth__net-worth" tabIndex={0}>
          <span className="net-worth-title">Net Worth</span>
          <span className="net-worth-value">
            <span className="user-data currency tabular-nums zero">
              {isEmpty ? <><bdi>$</bdi>0.00</> : data.formattedNetWorth}
            </span>
          </span>
        </div>

        <div className="reflect-net-worth-summary">
          <div>
            <span className="summary-titles">
              <span className="rounded-square rounded-square-assets" />
              Assets
            </span>
            <div className="networth-summary-value">
              <span className="user-data currency tabular-nums zero">
                {isEmpty ? <><bdi>$</bdi>0.00</> : data.formattedAssets}
              </span>
            </div>
          </div>

          <div>
            <span className="summary-titles">
              <span className="rounded-square rounded-square-debts" />
              Debts
            </span>
            <div className="networth-summary-value">
              {isEmpty ? '-' : ''}
              <span className="user-data currency tabular-nums zero">
                {isEmpty ? <><bdi>$</bdi>0.00</> : data.formattedDebts}
              </span>
            </div>
          </div>

          <div>
            <span className="summary-titles">Change in Net Worth</span>
            <div className="networth-summary-value">
              {isEmpty ? (
                <>
                  <span>$0.00</span>
                  <span className="static-net-worth">
                    0.0<bdi>%</bdi>
                  </span>
                </>
              ) : (
                <>
                  <span>{data.formattedChange}</span>
                  <span className={data.didIncrease ? 'positive-net-worth' : 'negative-net-worth'}>
                    <svg className="ynab-new-icon" width="12" height="12">
                      <use href={data.didIncrease ? '#icon_sprite_arrow_up' : '#icon_sprite_arrow_down'} />
                    </svg>
                    14.5<bdi>%</bdi>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="reports-net-worth chart-container" style={{ position: 'relative' }}>
          {/* Real Billboard Mount Container */}
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
              <div className="reflect-spending-tooltip reports-net-worth-tooltip">
                <h4>{tooltip.month}</h4>
                <div>Net Worth: <strong>{tooltip.netWorth}</strong></div>
                <div>Assets: <strong style={{ color: 'var(--reportsNetworthAssetsBackground, rgb(84, 91, 254))' }}>{tooltip.assets}</strong></div>
                <div>Debts: <strong style={{ color: 'var(--reportsNetworthDebtsBackground, rgb(206, 94, 102))' }}>{tooltip.debts}</strong></div>
                <div className="tooltip-arrow" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="reflect-networth-monthly-table">
        <div className="networth__table-card card">
          <div className="networth-table-header networth-table-row">
            <div className="networth-table-section networth-table-first-section">
              <span>Month</span>
            </div>
            <div className="networth-table-section networth-table-second-section">
              <span>Net Worth</span>
            </div>
            <div className="networth-table-section networth-table-third-section">
              <span>
                Monthly Change{' '}
                <svg className="ynab-new-icon networth-info-circle" width="16" height="16">
                  <use href="#icon_sprite_info_circle_fill" />
                </svg>
              </span>
            </div>
          </div>

          <div className="networth-table-body card-body">
            {isEmpty ? (
              <div className="reflect-net-worth-empty-table-state">
                <span>No information to show</span>
              </div>
            ) : (
              months.slice().reverse().map(row => {
                const isSelected = selectedMonth === row.month;
                return (
                  <div
                    key={row.month}
                    className={`reflect-bar-chart-row net-worth-bar-chart-row networth-table-row ${isSelected ? 'active' : ''}`}
                    tabIndex={0}
                    onClick={() => { setSelectedMonth(isSelected ? null : row.month); if (onMonthClick) onMonthClick(row.month); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="networth-table-section networth-table-first-section">
                      <span className="amount">{row.month}</span>
                    </div>
                    <div className="networth-table-section networth-table-second-section">
                      <span className="amount">${(row.netWorth / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="networth-table-section networth-table-third-section">
                      {row.increased ? (
                        <span className="positive-net-worth">
                          <span className="networth-percentage-arrows">
                            <svg className="ynab-new-icon positive-net-worth" role="img" width="12" height="12" aria-label="Up from last month">
                              <use href="#icon_sprite_arrow_up" />
                            </svg>
                          </span>
                          <span className="amount">
                            +${(row.change / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                            <span className="networth-percentage">
                              ({Math.abs((row.change / row.netWorth) * 100).toFixed(1)}%)
                            </span>
                          </span>
                        </span>
                      ) : (
                        <span className="negative-net-worth">
                          <span className="networth-percentage-arrows">
                            <svg className="ynab-new-icon negative-net-worth" role="img" width="12" height="12" aria-label="Down from last month">
                              <use href="#icon_sprite_arrow_down" />
                            </svg>
                          </span>
                          <span className="amount">
                            -${(Math.abs(row.change) / 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                            <span className="networth-percentage">
                              ({Math.abs((row.change / row.netWorth) * 100).toFixed(1)}%)
                            </span>
                          </span>
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
