import React, { useState, useEffect, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState<'categories' | 'groups'>(conditions.activeTab || 'categories');
  const [selectedChartItem, setSelectedChartItem] = useState<string | null>(conditions.selectedChartItem || null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(conditions.hoveredItem || null);
  const [isSingleColumn, setIsSingleColumn] = useState<boolean>(conditions.singleColumn || false);

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

  if (conditions.isSyncingBackfill) {
    return <ReflectLoadingState />;
  }

  const items = data.items || [];
  const positiveInflows = data.positiveInflows || [];
  const isShowingGradient = conditions.isShowingGradient ?? (items.length > 8);
  const hasInflows = positiveInflows.length > 0;
  const shouldShowEmpty = items.length === 0;

  // Selected or hovered display item
  const activeItem = items.find((i: any) => i.id === (hoveredItem || selectedChartItem));

  // Compute SVG arc angles for Donut Chart
  let cumulativeAngle = 0;
  const slices = items.map((item: any) => {
    const fraction = item.percentage / 100;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + fraction * 360;
    cumulativeAngle = endAngle;
    return { ...item, startAngle, endAngle };
  });

  function describeDonutArc(cx: number, cy: number, rIn: number, rOut: number, startA: number, endA: number) {
    const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const x1Out = cx + rOut * Math.cos(toRad(startA));
    const y1Out = cy + rOut * Math.sin(toRad(startA));
    const x2Out = cx + rOut * Math.cos(toRad(endA));
    const y2Out = cy + rOut * Math.sin(toRad(endA));

    const x1In = cx + rIn * Math.cos(toRad(endA));
    const y1In = cy + rIn * Math.sin(toRad(endA));
    const x2In = cx + rIn * Math.cos(toRad(startA));
    const y2In = cy + rIn * Math.sin(toRad(startA));

    const largeArc = endA - startA > 180 ? 1 : 0;

    return `M ${x1Out} ${y1Out} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2Out} ${y2Out} L ${x1In} ${y1In} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x2In} ${y2In} Z`;
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

              {!selectedChartItem && (
                <div className="segmented-control textOnlyOption spending-breakdown__category-group-toggle" role="tablist" tabIndex={0}>
                  <button
                    className={`segmented-control-button spending-breakdown-category-group-toggle__button ${activeTab === 'categories' ? 'selected' : ''}`}
                    aria-selected={activeTab === 'categories'}
                    role="tab"
                    tabIndex={-1}
                    type="button"
                    onClick={() => setActiveTab('categories')}
                  >
                    Categories
                  </button>
                  <button
                    className={`segmented-control-button spending-breakdown-category-group-toggle__button ${activeTab === 'groups' ? 'selected' : ''}`}
                    aria-selected={activeTab === 'groups'}
                    role="tab"
                    tabIndex={-1}
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

              {/* Billboard.js SVG Donut representation */}
              <div className="spending-breakdown-donut-chart__bb" style={{ position: 'relative' }}>
                <svg width="100%" height="527" viewBox="0 0 685 527" style={{ overflow: 'hidden', display: 'block' }}>
                  <g className="bb-main" transform="translate(0.5, 60.5)">
                    <g className="bb-chart">
                      <g className="bb-chart-arcs" transform="translate(342.5, 200.5)">
                        {shouldShowEmpty ? (
                          <g className="bb-chart-arc bb-target bb-target-none">
                            <g className="bb-shapes bb-shapes-none bb-arcs bb-arcs-none">
                              <path
                                className="bb-shape bb-shape bb-arc bb-arc-none"
                                style={{ fill: 'rgb(248, 246, 242)' }}
                                d="M0,-190.475A190.475,190.475,0,1,1,0,190.475A190.475,190.475,0,1,1,0,-190.475M0,-114.285A114.285,114.285,0,1,0,0,114.285A114.285,114.285,0,1,0,0,-114.285Z"
                              />
                            </g>
                          </g>
                        ) : (
                          slices.map((slice: any) => {
                            const isSelected = selectedChartItem === slice.id;
                            const isHovered = hoveredItem === slice.id;
                            const isDimmed = selectedChartItem && !isSelected;
                            return (
                              <g key={slice.id} className="bb-chart-arc">
                                <path
                                  className="bb-shape bb-arc"
                                  d={describeDonutArc(0, 0, 114, isSelected || isHovered ? 196 : 190, slice.startAngle, slice.endAngle - 0.5)}
                                  fill={slice.color}
                                  opacity={isDimmed ? 0.35 : 1}
                                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                                  onMouseEnter={() => setHoveredItem(slice.id)}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  onClick={() => setSelectedChartItem(selectedChartItem === slice.id ? null : slice.id)}
                                />
                              </g>
                            );
                          })
                        )}
                      </g>
                    </g>
                  </g>
                </svg>
              </div>

              {shouldShowEmpty && (
                <div className="spending-breakdown__empty-state-info">
                  Your spending breakdown will appear once you start recording your spending.
                </div>
              )}
            </div>
          </div>

          {/* Metrics Rows - Sister element to donut-card, inside column left */}
          <div className="spending-breakdown__metrics">
            <div className="spending-breakdown__metrics-row">
              <div className="spending-breakdown__metric monthly-average-spending">
                <span className="spending-metric-title">Average Monthly Spending</span>
                <span className="spending-metric-value">{data.monthlyAverage}</span>
              </div>
              <div className="spending-breakdown__metric daily-average-spending">
                <span className="spending-metric-title">Average Daily Spending</span>
                <span className="spending-metric-value">{data.dailyAverage}</span>
              </div>
            </div>

            <div className="spending-breakdown__metrics-row">
              <div className="spending-breakdown__metric most-frequent-category">
                <span className="spending-metric-title">
                  {activeTab === 'groups' ? 'Most Frequent Group' : 'Most Frequent Category'}
                </span>
                <span className="spending-metric-value">{data.mostFrequent.name}</span>
                {data.mostFrequent.count && (
                  <span className="spending-metric-subtitle">{data.mostFrequent.count}</span>
                )}
              </div>
              <div className="spending-breakdown__metric largest-outflow">
                <span className="spending-metric-title">Largest Outflow</span>
                <span className="spending-metric-value">{data.largestOutflow.payeeName || data.largestOutflow.name}</span>
                {data.largestOutflow.amount && (
                  <span className="spending-metric-subtitle">{data.largestOutflow.amount}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bar Chart + Positive Inflows */}
        <div className="spending-breakdown__column right">
          <div className="spending-breakdown__bar-card card">
            <div className="spending-breakdown-bar-chart-header spending-breakdown-bar-chart-row">
              <div className="spending-breakdown-bar-chart-section">
                <span>{activeTab === 'groups' ? 'Groups' : 'Categories'}</span>
                <span>Total Spending</span>
              </div>
            </div>

            <div className="spending-breakdown-bar-chart-body card-body">
              {shouldShowEmpty ? (
                <div className="reflect-spending-empty-table-state">
                  <span>No spending to show yet</span>
                </div>
              ) : (
                items.map((item: any) => {
                  const isSelected = selectedChartItem === item.id;
                  const isDimmed = selectedChartItem && !isSelected;
                  return (
                    <div
                      key={item.id}
                      className={`spending-breakdown-bar-chart-row ${isDimmed ? 'unselected-row' : ''} ${isSelected ? 'selected-row' : ''}`}
                      onClick={() => {
                        setSelectedChartItem(selectedChartItem === item.id ? null : item.id);
                        if (onOpenTransactionsModal) onOpenTransactionsModal(item.name);
                      }}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="spending-breakdown-bar-chart-section">
                        <span>{item.name}</span>
                        <span className="amount">{item.formattedAmount}</span>
                      </div>

                      <div className="spending-breakdown-bar-chart-section bar-section">
                        <div
                          className="spending-breakdown-bar-chart-bar"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
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

            <div className={`reflect-card-gradient ${!isShowingGradient ? 'hidden' : ''}`} />
          </div>

          {/* Positive Inflows Card */}
          {hasInflows && (
            <div className={`positive-inflows ${isSingleColumn ? 'no-scroll' : ''}`}>
              <div className="card spending-breakdown__positive-inflows">
                <div className="spending-breakdown__positive-inflows_header">
                  <div className="spending-breakdown__positive-inflows_title">
                    {activeTab === 'groups' ? 'Positive Inflow Groups' : 'Positive Inflow Categories'}
                    <svg className="ynab-new-icon" width="12" height="12">
                      <use href="#icon_sprite_info_circle_fill" />
                    </svg>
                  </div>
                  <div className="spending-breakdown__positive-inflows_total">
                    +$70.00
                  </div>
                </div>

                <div className="card-body">
                  <div role="list">
                    {positiveInflows.map((inflow: any) => (
                      <div key={inflow.id} className="spending-breakdown__positive-inflows_row">
                        <div className="spending-breakdown__positive-inflows_name">
                          <span>{inflow.name}</span>
                        </div>
                        <div className="spending-breakdown__positive-inflows_amount">
                          {inflow.formattedAmount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="reflect-card-gradient hidden" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
