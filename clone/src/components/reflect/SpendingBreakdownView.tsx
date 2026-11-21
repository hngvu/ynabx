import React, { useState, useEffect, useRef } from 'react';
import { ReflectPageHeader } from './ReflectPageHeader';
import { ReflectFilterControls } from './ReflectFilterControls';
import { ReflectLoadingState } from './ReflectLoadingState';
import { SpendingBreakdownDonutChart, DonutChartItem } from './SpendingBreakdownDonutChart';

const SINGLE_COLUMN_CUTOFF = 1004;

interface Props {
  data: any;
  conditions?: Record<string, any>;
  onOpenInflowModal?: () => void;
  onOpenTransactionsModal?: (categoryName: string) => void;
  onSelectGroup?: (groupName: string) => void;
  onClearGroup?: () => void;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenCategories?: () => void;
  onOpenAccounts?: () => void;
  onExport?: () => void;
}

export const SpendingBreakdownView: React.FC<Props> = ({
  data,
  conditions = {},
  onOpenInflowModal,
  onOpenTransactionsModal,
  onSelectGroup,
  onClearGroup,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenCategories,
  onOpenAccounts,
  onExport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barBodyRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'categories' | 'groups'>(conditions.activeTab || 'categories');
  const [selectedChartItem, setSelectedChartItem] = useState<string | null>(conditions.selectedChartItem || null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(conditions.hoveredItem || null);
  const [isSingleColumn, setIsSingleColumn] = useState<boolean>(conditions.singleColumn || false);
  const [isInflowsCollapsed, setIsInflowsCollapsed] = useState<boolean>(conditions.isInflowsCollapsed || false);
  const [isShowingGradient, setIsShowingGradient] = useState<boolean>(true);

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

  // Exact Ember ResizeObserver logic: container.clientWidth < SINGLE_COLUMN_CUTOFF => singleColumn = true
  useEffect(() => {
    if (conditions.singleColumn !== undefined) {
      setIsSingleColumn(conditions.singleColumn);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const checkWidth = () => {
      const outer = el.closest('.reflect-container') as HTMLElement | null;
      const w = outer ? outer.clientWidth : el.offsetWidth;
      setIsSingleColumn(w < SINGLE_COLUMN_CUTOFF);
    };

    const observer = new ResizeObserver(() => {
      checkWidth();
    });

    observer.observe(el);
    checkWidth();

    return () => observer.disconnect();
  }, [conditions.singleColumn]);

  const items =
    activeTab === 'groups' && !conditions.shouldShowBreadcrumbs && data.groupItems && data.groupItems.length > 0
      ? data.groupItems
      : data.items || [];
  const positiveInflows = data.positiveInflows || [];
  const isShowingGroups = activeTab === 'groups' && !conditions.shouldShowBreadcrumbs;
  const hasInflows = positiveInflows.length > 0 && conditions.hasPositiveInflows !== false;
  const shouldShowEmpty = items.length === 0;
  const hasNoRecordedTransactions = conditions.hasNoRecordedTransactions ?? true;
  const shouldShowEmptyStateMessage = shouldShowEmpty && hasNoRecordedTransactions;

  // Gradient visibility based on scroll position in bar chart list
  useEffect(() => {
    const bodyEl = barBodyRef.current;
    if (!bodyEl) return;

    const checkGradient = () => {
      if (bodyEl.scrollHeight <= bodyEl.clientHeight || bodyEl.scrollTop > 0) {
        setIsShowingGradient(false);
      } else {
        setIsShowingGradient(true);
      }
    };

    bodyEl.addEventListener('scroll', checkGradient);
    const ro = new ResizeObserver(checkGradient);
    ro.observe(bodyEl);
    checkGradient();

    return () => {
      bodyEl.removeEventListener('scroll', checkGradient);
      ro.disconnect();
    };
  }, [items]);

  const handleItemClick = (item: DonutChartItem) => {
    if (isShowingGroups && onSelectGroup) {
      onSelectGroup(item.name);
    } else if (!isShowingGroups && onOpenTransactionsModal) {
      onOpenTransactionsModal(item.name);
    } else {
      setSelectedChartItem((prev) => (prev === item.id ? null : item.id));
    }
  };

  if (conditions.isSyncingBackfill) {
    return <ReflectLoadingState />;
  }

  return (
    <div ref={containerRef} className={`reflect-spending-breakdown ${isSingleColumn ? 'single-column' : ''}`}>
      <ReflectPageHeader
        pageTitle="Spending Breakdown"
        shouldShowBreadcrumbs={conditions.shouldShowBreadcrumbs}
        selectedGroupName={data.groupName || 'Immediate Obligations'}
        onClearGroup={onClearGroup || (() => setSelectedChartItem(null))}
        onExport={onExport}
      />

      <ReflectFilterControls
        timeframeLabel={data.timeframeLabel || 'Nov 2026'}
        categoriesLabel={data.categoriesLabel}
        accountsLabel={data.accountsLabel}
        categoriesPill={conditions.categoriesPill}
        accountsPill={conditions.accountsPill}
        disableLeftArrow={conditions.disableLeftArrow ?? false}
        disableRightArrow={conditions.disableRightArrow ?? true}
        onPrevTimeframe={onPrevTimeframe}
        onNextTimeframe={onNextTimeframe}
        onOpenTimeframe={onOpenTimeframe}
        onOpenCategories={onOpenCategories}
        onOpenAccounts={onOpenAccounts}
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
                <div
                  className="segmented-control textOnlyOption spending-breakdown__category-group-toggle"
                  role="tablist"
                  tabIndex={0}
                >
                  <button
                    className={`segmented-control-button spending-breakdown-category-group-toggle__button ${
                      activeTab === 'categories' ? 'selected' : ''
                    }`}
                    aria-selected={activeTab === 'categories'}
                    role="tab"
                    type="button"
                    onClick={() => setActiveTab('categories')}
                  >
                    Categories
                  </button>
                  <button
                    className={`segmented-control-button spending-breakdown-category-group-toggle__button ${
                      activeTab === 'groups' ? 'selected' : ''
                    }`}
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

            {/* Ember-Parity Donut Chart Component */}
            <SpendingBreakdownDonutChart
              chartData={items}
              totalSpending={data.formattedTotalSpending}
              showInflowWarning={hasInflows}
              openInflowModal={onOpenInflowModal}
              segmentClicked={(chartItem) => handleItemClick(chartItem)}
            />

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
                <span className="spending-metric-value">
                  {data.monthlyAverage !== undefined ? data.monthlyAverage : '$0.00'}
                </span>
              </div>
              <div className="spending-breakdown__metric daily-average-spending">
                <span className="spending-metric-title">Average Daily Spending</span>
                <span className="spending-metric-value">
                  {data.dailyAverage !== undefined ? data.dailyAverage : '$0.00'}
                </span>
              </div>
            </div>

            <div className="spending-breakdown__metrics-row">
              <div className="spending-breakdown__metric most-frequent-category">
                <span className="spending-metric-title">
                  Most Frequent {isShowingGroups ? 'Group' : 'Category'}
                </span>
                {(() => {
                  const mf = isShowingGroups
                    ? (data as any).mostFrequentGroup ?? data.mostFrequent
                    : data.mostFrequent;
                  return (
                    <>
                      <span className="spending-metric-value">{mf?.name || 'None'}</span>
                      {mf?.count && <span className="spending-metric-subtitle">{mf.count}</span>}
                    </>
                  );
                })()}
              </div>
              <div className="spending-breakdown__metric largest-outflow">
                <span className="spending-metric-title">Largest Outflow</span>
                <span className="spending-metric-value">{data.largestOutflow?.name || 'None'}</span>
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

            <div ref={barBodyRef} className="spending-breakdown-bar-chart-body card-body">
              {shouldShowEmpty ? (
                <div className="reflect-spending-empty-table-state">
                  <span>{hasNoRecordedTransactions ? 'No spending to show yet' : 'No spending to show'}</span>
                </div>
              ) : (
                items.map((item: any) => {
                  const isSelected = selectedChartItem === item.id;
                  const isDimmed = selectedChartItem && !isSelected;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`reflect-bar-chart-row ghost-button spending-breakdown-bar-chart-row ${
                        isSelected ? 'active' : ''
                      } ${isDimmed ? 'unselected-row' : ''}`}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => handleItemClick(item)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="spending-breakdown-bar-chart-section">
                        <span>
                          {item.name}
                          {(item.isHidden || item.id === 'hiddenCategories') && (
                            <>
                              {' '}
                              <svg
                                className="ynab-new-icon"
                                width="12"
                                height="12"
                                style={{ verticalAlign: 'middle', color: 'var(--labelSecondary)' }}
                              >
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
                            backgroundColor: item.color,
                          }}
                        />
                        <span style={{ minWidth: '34px', textAlign: 'right', flexShrink: 0 }}>
                          {item.formattedPercentage || `${item.percentage.toFixed(0)}%`}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {isShowingGradient && <div className="reflect-card-gradient" />}
          </div>

          {/* Positive Inflows Card (rendered when positiveInflows > 0 and not explicitly disabled) */}
          {hasInflows && (
            <div className={`positive-inflows ${isSingleColumn ? 'no-scroll' : ''}`}>
              <div
                className={`card spending-breakdown__positive-inflows ${
                  isInflowsCollapsed ? 'is-collapsed' : ''
                }`}
              >
                <div
                  className="spending-breakdown__positive-inflows_header"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setIsInflowsCollapsed(!isInflowsCollapsed)}
                >
                  <div className="spending-breakdown__positive-inflows_title">
                    <span>
                      {isShowingGroups ? 'Positive Inflow Groups' : 'Positive Inflow Categories'}
                    </span>
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
                          onClick={() =>
                            onOpenTransactionsModal &&
                            onOpenTransactionsModal(inflow.category || inflow.name)
                          }
                        >
                          <div className="spending-breakdown__positive-inflows_name">
                            <span>{inflow.name}</span>
                          </div>
                          <div className="spending-breakdown__positive-inflows_amount">
                            +{inflow.formattedAmount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`reflect-card-gradient ${
                    positiveInflows.length <= 10 || isInflowsCollapsed ? 'hidden' : ''
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
