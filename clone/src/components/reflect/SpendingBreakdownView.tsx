import React, { useState, useEffect, useRef } from 'react';
import bb, { donut } from 'billboard.js';
import 'billboard.js/dist/billboard.css';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { ReflectLoadingState } from './ReflectLoadingState';

const SINGLE_COLUMN_CUTOFF = 1004;

interface Props {
  data: any;
  conditions?: Record<string, any>;
  onOpenInflowModal?: () => void;
  onOpenTransactionsModal?: (categoryName: string) => void;
}

export const SpendingBreakdownView: React.FC<Props> = ({
  data,
  conditions = {},
  onOpenInflowModal,
  onOpenTransactionsModal
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<'categories' | 'groups'>(conditions.activeTab || 'categories');
  const [selectedChartItem, setSelectedChartItem] = useState<string | null>(conditions.selectedChartItem || null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(conditions.hoveredItem || null);
  const [isSingleColumn, setIsSingleColumn] = useState<boolean>(conditions.singleColumn || false);
  const [isInflowsCollapsed, setIsInflowsCollapsed] = useState<boolean>(conditions.isInflowsCollapsed || false);

  // Sync state with incoming conditions prop whenever story changes
  useEffect(() => {
    setActiveTab(conditions.activeTab || 'categories');
    setSelectedChartItem(conditions.selectedChartItem || null);
    setHoveredItem(conditions.hoveredItem || null);
    if (conditions.singleColumn !== undefined) {
      setIsSingleColumn(conditions.singleColumn);
    } else {
      setIsSingleColumn(false);
    }
    if (conditions.isInflowsCollapsed !== undefined) {
      setIsInflowsCollapsed(conditions.isInflowsCollapsed);
    }
  }, [conditions]);

  // Exact Ember ResizeObserver logic: e.clientWidth < SINGLE_COLUMN_CUTOFF => singleColumn = true
  useEffect(() => {
    if (conditions.singleColumn !== undefined) {
      setIsSingleColumn(conditions.singleColumn);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsSingleColumn(entry.contentRect.width < SINGLE_COLUMN_CUTOFF);
      }
    });

    observer.observe(el);
    setIsSingleColumn(el.clientWidth < SINGLE_COLUMN_CUTOFF);

    return () => observer.disconnect();
  }, [conditions.singleColumn]);

  const items = data.items || [];
  const positiveInflows = data.positiveInflows || [];
  const isShowingGroups = activeTab === 'groups' && !conditions.shouldShowBreadcrumbs;
  const isShowingGradient = conditions.isShowingGradient ?? (items.length > 10);
  const hasInflows = positiveInflows.length > 0 && conditions.hasPositiveInflows !== false;
  const shouldShowEmpty = items.length === 0;
  const hasNoRecordedTransactions = conditions.hasNoRecordedTransactions ?? true;
  const shouldShowEmptyStateMessage = shouldShowEmpty && hasNoRecordedTransactions;

  // Build donutItems: top 10 + Everything Else (exact BJ.donutChartData logic)
  const donutItems = React.useMemo(() => {
    if (items.length <= 10) return items;
    const top10 = items.slice(0, 10);
    const rest = items.slice(10);
    const restAmount = rest.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const restPct = rest.reduce((sum: number, item: any) => sum + (item.percentage || 0), 0);
    const formattedRestAmount = `$${(restAmount / 1000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    return [
      ...top10,
      {
        id: 'everythingElse',
        name: 'Everything Else',
        amount: restAmount,
        formattedAmount: formattedRestAmount,
        percentage: restPct,
        color: '#d4d5ff'
      }
    ];
  }, [items]);

  // Selected or hovered display item
  const activeItem =
    donutItems.find((i: any) => i.id === (hoveredItem || selectedChartItem)) ||
    items.find((i: any) => i.id === (hoveredItem || selectedChartItem));

  // Initialize Billboard.js donut chart exactly as YNAB does
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Build columns & colors for Billboard.js
    // Ember behavior: when empty, columns is [['none', 1]] with color var(--backgroundGroupedPrimary, #f8f6f2)
    const columns: Array<[string, number]> = shouldShowEmpty
      ? [['none', 1]]
      : donutItems.map((item: any) => [
          item.id,
          Math.round(item.percentage) || 1
        ]);

    const colors: Record<string, string> = shouldShowEmpty
      ? { none: 'var(--backgroundGroupedPrimary, rgb(248, 246, 242))' }
      : donutItems.reduce((acc: Record<string, string>, item: any) => {
          acc[item.id] = item.color;
          return acc;
        }, {});

    const donutDataMap: Record<string, any> = {};
    donutItems.forEach((item: any) => {
      donutDataMap[item.id] = item;
    });

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Exact Billboard.js donut configuration from main-Dmb20EGn.js (generateChart)
    const chart = bb.generate({
      bindto: chartContainerRef.current,
      data: {
        type: donut(),
        columns,
        colors,
        order: null,
        onclick: (d: any) => {
          if (shouldShowEmpty) return;
          setSelectedChartItem((prev: string | null) => (prev === d.id ? null : d.id));
        },
        onover: (d: any) => {
          if (shouldShowEmpty) return;
          setHoveredItem(d.id);
        },
        onout: () => {
          setHoveredItem(null);
        }
      },
      transition: { duration: 100 },
      donut: {
        label: {
          ratio: 1.4,
          format: (_val: number, _ratio: number, id: string) => {
            if (shouldShowEmpty || id === 'none') return '';
            const item = donutDataMap[id];
            if (!item) return '';
            const name = item.name.length > 18 ? item.name.slice(0, 15) + '...' : item.name;
            const amt = item.formattedAmount;
            const pct = item.formattedPercentage || `${Math.round(item.percentage)}%`;
            return `${name}\n${amt} (${pct})`;
          },
          threshold: 0.07
        },
        expand: { duration: 0 },
        startingAngle: 0
      },
      arc: { cornerRadius: { ratio: 0.03 } },
      tooltip: { show: false },
      legend: { show: false },
      resize: { auto: true },
      padding: { top: 56, right: 180, bottom: 56, left: 180 },
      onrendered: () => {
        // Adjust outer label text-anchor and display exactly as Ember does in adjustOuterLabelStyles
        if (chartContainerRef.current) {
          const texts = chartContainerRef.current.querySelectorAll('.bb-chart-arc text');
          texts.forEach((textEl: Element) => {
            const htmlEl = textEl as HTMLElement;
            if (htmlEl.textContent && htmlEl.textContent.trim()) {
              htmlEl.style.display = 'block';
              // Check translate(x, y) coordinate: if x < 0 it's on left hemisphere -> text-anchor: end
              const transform = htmlEl.getAttribute('transform') || '';
              const match = /translate\(\s*([-\d.]+)/.exec(transform);
              const transX = match ? parseFloat(match[1]) : 0;
              htmlEl.style.textAnchor = transX >= 0 ? 'start' : 'end';
              if (htmlEl.children.length > 1) {
                (htmlEl.children[0] as Element).setAttribute('dy', '0em');
                (htmlEl.children[1] as Element).setAttribute('dy', '1.45em');
              }
            } else {
              htmlEl.style.display = 'none';
            }
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
  }, [donutItems, shouldShowEmpty]);

  if (conditions.isSyncingBackfill) {
    return <ReflectLoadingState />;
  }

  return (
    <div ref={containerRef} className={`reflect-spending-breakdown ${isSingleColumn ? 'single-column' : ''}`}>
      <ReflectPageHeader
        pageTitle="Spending Breakdown"
        shouldShowBreadcrumbs={conditions.shouldShowBreadcrumbs}
        selectedGroupName={data.groupName || 'Immediate Obligations'}
        onClearGroup={() => setSelectedChartItem(null)}
      />

      <ReflectFilterControls
        timeframeLabel={data.timeframeLabel || 'Nov 2026'}
        categoriesPill={conditions.categoriesPill}
        accountsPill={conditions.accountsPill}
        disableRightArrow={conditions.disableRightArrow ?? true}
      />

      <div className={`spending-breakdown__content ${isSingleColumn ? 'single-column' : ''}`}>
        {/* Left Column: Donut + Metrics */}
        <div className="spending-breakdown__column left">
          <div className="spending-breakdown__donut-card card">
            <div className="spending-breakdown__donut-header">
              <div className="spending-breakdown__total-spending" tabIndex={0}>
                <span className="total-spending-title">Total Spending</span>
                <span className="total-spending-value">{data.formattedTotalSpending}</span>
              </div>

              {!selectedChartItem && !conditions.shouldShowBreadcrumbs && (
                <div className="segmented-control textOnlyOption spending-breakdown__category-group-toggle" role="tablist" tabIndex={0}>
                  <button
                    className={`segmented-control-button spending-breakdown-category-group-toggle__button ${activeTab === 'categories' ? 'selected' : ''}`}
                    aria-selected={activeTab === 'categories'}
                    role="tab"
                    type="button"
                    onClick={() => setActiveTab('categories')}
                  >
                    Categories
                  </button>
                  <button
                    className={`segmented-control-button spending-breakdown-category-group-toggle__button ${activeTab === 'groups' ? 'selected' : ''}`}
                    aria-selected={activeTab === 'groups'}
                    role="tab"
                    type="button"
                    onClick={() => setActiveTab('groups')}
                  >
                    Groups
                  </button>
                </div>
              )}
            </div>

            {/* Donut Chart */}
            <div className="spending-breakdown-donut-chart">
              <div className="spending-breakdown-donut-chart__title">
                <span>{activeItem ? activeItem.name : 'Total Spending'}</span>
                <span className="spending-breakdown-donut-chart__title-amount">
                  {activeItem ? activeItem.formattedAmount : data.formattedTotalSpending}
                </span>
                {activeItem && (
                  <div className="spending-breakdown-donut-chart__percentage">
                    {activeItem.formattedPercentage || `${activeItem.percentage.toFixed(0)}%`}
                  </div>
                )}
                {conditions.shouldShowInflowWarning && (
                  <button
                    type="button"
                    className="spending-breakdown-donut-chart_modal-trigger"
                    onClick={onOpenInflowModal}
                    title="Inflows detected"
                  >
                    <svg className="ynab-new-icon" width="14" height="14">
                      <use href="#icon_sprite_info_circle_fill" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="spending-breakdown-donut-chart__modal-trigger" />

              {/* Billboard.js Donut Chart Mount */}
              <div
                ref={chartContainerRef}
                className="spending-breakdown-donut-chart__bb"
                style={{ position: 'relative', width: '100%', minHeight: '29rem' }}
              />
            </div>

            {shouldShowEmptyStateMessage && (
              <div className="spending-breakdown__empty-state-info">
                Your spending breakdown will appear once you start recording your spending.
              </div>
            )}
          </div>

          {/* 4 Metrics in 2 Rows inside .spending-breakdown__metrics */}
          <div className="spending-breakdown__metrics">
            <div className="spending-breakdown__metrics-row">
              <div className="spending-breakdown__metric monthly-average-spending">
                <span className="spending-metric-title">Average Monthly Spending</span>
                <span className="spending-metric-value">{data.monthlyAverage || '$2,450.50'}</span>
              </div>
              <div className="spending-breakdown__metric daily-average-spending">
                <span className="spending-metric-title">Average Daily Spending</span>
                <span className="spending-metric-value">{data.dailyAverage || '$81.68'}</span>
              </div>
            </div>

            <div className="spending-breakdown__metrics-row">
              <div className="spending-breakdown__metric most-frequent-category">
                <span className="spending-metric-title">Most Frequent {isShowingGroups ? 'Group' : 'Category'}</span>
                <span className="spending-metric-value">{data.mostFrequent?.name || 'Groceries'}</span>
                {data.mostFrequent?.count && (
                  <span className="spending-metric-subtitle">{data.mostFrequent.count}</span>
                )}
              </div>
              <div className="spending-breakdown__metric largest-outflow">
                <span className="spending-metric-title">Largest Outflow</span>
                <span className="spending-metric-value">{data.largestOutflow?.name || 'Rent / Mortgage'}</span>
                {data.largestOutflow?.amount && (
                  <span className="spending-metric-subtitle">{data.largestOutflow.amount}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bar List */}
        <div className="spending-breakdown__column right">
          <div className="spending-breakdown__bar-card card">
            <div className="spending-breakdown-bar-chart-header spending-breakdown-bar-chart-row">
              <div className="spending-breakdown-bar-chart-section">
                <span>{isShowingGroups ? 'Groups' : 'Categories'}</span>
                <span>Total Spending</span>
              </div>
            </div>

            <div className="spending-breakdown-bar-chart-body card-body">
              {shouldShowEmpty ? (
                <div className="reflect-spending-empty-table-state">
                  <span>{hasNoRecordedTransactions ? 'No spending to show yet' : 'No spending to show'}</span>
                </div>
              ) : (
                items.map((item: any) => {
                  const isSelected = selectedChartItem === item.id;
                  const isDimmed = selectedChartItem && !isSelected;

                  return (
                    <div
                      key={item.id}
                      className={`reflect-bar-chart-row spending-breakdown-bar-chart-row ${isSelected ? 'active' : ''} ${isDimmed ? 'unselected-row' : ''}`}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => setSelectedChartItem(isSelected ? null : item.id)}
                    >
                      <div className="spending-breakdown-bar-chart-section">
                        <span>
                          {item.name}
                          {(item.isHidden || item.id === 'hiddenCategories') && (
                            <>
                              {' '}
                              <svg className="ynab-new-icon" width="12" height="12" style={{ verticalAlign: 'middle', color: 'var(--labelSecondary)' }}>
                                <use href="#icon_sprite_info_circle_fill" />
                              </svg>
                            </>
                          )}
                        </span>
                        <span className="amount">{item.formattedAmount}</span>
                      </div>
                      <div className="spending-breakdown-bar-chart-section bar-section">
                        <div
                          className="spending-breakdown-bar-chart-bar"
                          style={{
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: item.color
                          }}
                        />
                        <span>{item.formattedPercentage || `${item.percentage.toFixed(0)}%`}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isShowingGradient && <div className="reflect-card-gradient" />}
          </div>

          {/* Positive Inflows Card (rendered when positiveInflows > 0 and not explicitly disabled) */}
          {hasInflows && (
            <div className={`positive-inflows ${isSingleColumn ? 'no-scroll' : ''}`}>
              <div className={`card spending-breakdown__positive-inflows ${isInflowsCollapsed ? 'is-collapsed' : ''}`}>
                <div
                  className="spending-breakdown__positive-inflows_header"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setIsInflowsCollapsed(!isInflowsCollapsed)}
                >
                  <div className="spending-breakdown__positive-inflows_title">
                    <span>{isShowingGroups ? 'Positive Inflow Groups' : 'Positive Inflow Categories'}</span>
                    <svg className="ynab-new-icon" width="12" height="12">
                      <use href="#icon_sprite_info_circle_fill" />
                    </svg>
                  </div>
                  <div className="spending-breakdown__positive-inflows_total">
                    {data.formattedTotalPositiveInflows || '+$70.00'}
                  </div>
                </div>

                {!isInflowsCollapsed && (
                  <div className="card-body">
                    <div role="list">
                      {positiveInflows.map((inflow: any) => (
                        <div
                          key={inflow.id}
                          className="reflect-bar-chart-row ghost-button spending-breakdown__positive-inflows_row"
                          tabIndex={0}
                          onClick={() => onOpenTransactionsModal && onOpenTransactionsModal(inflow.category || inflow.name)}
                        >
                          <div className="spending-breakdown__positive-inflows_name">
                            <span>{inflow.name}</span>
                          </div>
                          <div className="spending-breakdown__positive-inflows_amount">+{inflow.formattedAmount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`reflect-card-gradient ${positiveInflows.length <= 10 || isInflowsCollapsed ? 'hidden' : ''}`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
