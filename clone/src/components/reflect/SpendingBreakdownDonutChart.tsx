import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import bb, { donut } from 'billboard.js';
import 'billboard.js/dist/billboard.css';

const TOP_ITEM_LIMIT = 10;
const EVERYTHING_ELSE_KEY = 'everythingElse';
const EMPTY_STATE_KEY = 'none';

// YNAB official 10 colors for Spending Breakdown
const TOP_CHART_COLORS = [
  '#545bfe', // Top 1
  '#93d53e', // Top 2
  '#f6c91d', // Top 3
  '#ce5e66', // Top 4
  '#7583ff', // Top 5
  '#aee865', // Top 6
  '#f8d655', // Top 7
  '#e48585', // Top 8
  '#a3acff', // Top 9
  '#c2f680', // Top 10
];
const EVERYTHING_ELSE_COLOR = '#d4d5ff';
const EMPTY_STATE_COLOR = 'var(--backgroundGroupedPrimary, #f8f6f2)';

export interface DonutChartItem {
  id: string;
  name: string;
  amount: number;
  percentage?: number;
  proportion?: number;
  formattedAmount: string;
  formattedPercentage?: string;
  color?: string;
  chartValue?: number;
  entityIds?: string[];
  isHidden?: boolean;
}

export interface SpendingBreakdownDonutChartProps {
  chartData: DonutChartItem[];
  totalSpending: string;
  chartDataMap?: Record<string, DonutChartItem>;
  showInflowWarning?: boolean;
  openInflowModal?: () => void;
  segmentClicked?: (
    chartItem: DonutChartItem,
    triggerElement: Element | null,
    offset: { x: number; y: number },
    arrowOffset: { x: number; y: number }
  ) => void;
}

export const SpendingBreakdownDonutChart: React.FC<SpendingBreakdownDonutChartProps> = ({
  chartData,
  totalSpending,
  chartDataMap = {},
  showInflowWarning = false,
  openInflowModal,
  segmentClicked,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Truncate helper matching Ember truncateText
  const truncateText = (str = '', limit = 22) => {
    if (typeof str === 'string' && str.length > limit) {
      return str.slice(0, limit - 3) + '...';
    }
    return str;
  };

  // 1. Everything else chart data item if chartData > 10
  const everythingElseChartDataItem = useMemo<DonutChartItem | null>(() => {
    if (chartData.length <= TOP_ITEM_LIMIT) return null;
    const rest = chartData.slice(TOP_ITEM_LIMIT);
    const restAmount = rest.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalAmount = chartData.reduce((sum, item) => sum + (item.amount || 0), 0);
    const proportion = totalAmount > 0 ? restAmount / totalAmount : 0;
    const pct = proportion * 100;
    const chartVal = pct < 1 ? 1 : Math.round(pct);
    const formattedPct = pct < 1 ? '<1%' : `${Math.round(pct)}%`;
    const formattedAmt = `$${(Math.abs(restAmount) / 1000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return {
      id: EVERYTHING_ELSE_KEY,
      name: 'Everything Else',
      amount: restAmount,
      proportion,
      percentage: pct,
      isHidden: false,
      entityIds: rest.map((i) => i.id),
      chartValue: chartVal,
      color: EVERYTHING_ELSE_COLOR,
      formattedAmount: formattedAmt,
      formattedPercentage: formattedPct,
    };
  }, [chartData]);

  // 2. Filtered top 10 items + Everything Else
  const donutChartData = useMemo<DonutChartItem[]>(() => {
    const items = chartData.slice(0, TOP_ITEM_LIMIT);
    if (everythingElseChartDataItem) {
      items.push(everythingElseChartDataItem);
    }
    return items.filter((item) => item.amount !== 0);
  }, [chartData, everythingElseChartDataItem]);

  // 3. Map for fast lookup
  const donutChartDataMap = useMemo<Record<string, DonutChartItem>>(() => {
    const map: Record<string, DonutChartItem> = { ...chartDataMap };
    if (everythingElseChartDataItem) {
      map[EVERYTHING_ELSE_KEY] = everythingElseChartDataItem;
    }
    donutChartData.forEach((item, idx) => {
      map[item.id] = {
        ...item,
        color: item.color || (idx < TOP_CHART_COLORS.length ? TOP_CHART_COLORS[idx] : EVERYTHING_ELSE_COLOR),
      };
    });
    return map;
  }, [chartDataMap, everythingElseChartDataItem, donutChartData]);

  const isEmptyState = donutChartData.length === 0;

  // 4. Billboard chart columns
  const chartColumns: Array<[string, number]> = useMemo(() => {
    if (isEmptyState) {
      return [[EMPTY_STATE_KEY, 1]];
    }
    return donutChartData.map((item) => {
      const val = item.chartValue !== undefined
        ? item.chartValue
        : (item.percentage !== undefined ? (Math.round(item.percentage) || 1) : 1);
      return [item.id, val];
    });
  }, [isEmptyState, donutChartData]);

  // 5. Chart colors
  const chartColors = useMemo<Record<string, string>>(() => {
    if (isEmptyState) {
      return { [EMPTY_STATE_KEY]: EMPTY_STATE_COLOR };
    }
    const colors: Record<string, string> = {};
    chartColumns.forEach(([id]) => {
      colors[id] = donutChartDataMap[id]?.color || TOP_CHART_COLORS[0];
    });
    return colors;
  }, [isEmptyState, chartColumns, donutChartDataMap]);

  // 6. Dynamic center label matching Ember
  const centerLabel = useMemo(() => {
    if (hoveredItemId && donutChartDataMap[hoveredItemId]) {
      const item = donutChartDataMap[hoveredItemId];
      return {
        formattedAmount: item.formattedAmount,
        name: item.name,
        formattedPercentage: item.formattedPercentage,
      };
    }
    return {
      formattedAmount: totalSpending,
      name: 'Total Spending',
      formattedPercentage: undefined,
    };
  }, [hoveredItemId, donutChartDataMap, totalSpending]);

  const shouldShowWarning = !hoveredItemId && !isEmptyState && Boolean(showInflowWarning);

  // 7. Format item outer label matching Ember
  const formatItemLabel = useCallback(
    (_val: number, _ratio: number, id: string) => {
      if (isEmptyState || id === EMPTY_STATE_KEY) return '';
      const item = donutChartDataMap[id];
      if (item) {
        const name = truncateText(item.name, 22);
        const amt = truncateText(item.formattedAmount, 18);
        const pct = item.formattedPercentage || (item.percentage !== undefined ? `${Math.round(item.percentage)}%` : '');
        return `${name}\n${amt} (${pct})`;
      }
      return '';
    },
    [isEmptyState, donutChartDataMap]
  );

  // 8. Adjust outer label styles matching Ember adjustOuterLabelStyles
  const adjustOuterLabelStyles = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    try {
      const texts = chart?.$?.text?.texts;
      if (texts && typeof texts.each === 'function') {
        texts.each(function (d: any, i: number, nodes: any) {
          const textNode = nodes[i];
          if (textNode && d) {
            const midDeg = (((d.startAngle + d.endAngle) / 2) * (180 / Math.PI) + 360) % 360;
            textNode.style.textAnchor = midDeg < 180 ? 'start' : 'end';
            textNode.style.display = 'block';
            if (textNode.children.length > 1) {
              textNode.children[0].setAttribute('dy', '0em');
              textNode.children[1].setAttribute('dy', '1.45em');
            }
          }
        });
        return;
      }
    } catch (_) {}

    // Fallback: direct DOM traversal
    if (containerRef.current) {
      const textEls = containerRef.current.querySelectorAll('.bb-chart-arc text');
      textEls.forEach((textEl: any) => {
        const d = textEl.__data__;
        if (d && d.startAngle !== undefined && d.endAngle !== undefined) {
          const midDeg = (((d.startAngle + d.endAngle) / 2) * (180 / Math.PI) + 360) % 360;
          textEl.style.textAnchor = midDeg < 180 ? 'start' : 'end';
        }
        textEl.style.display = 'block';
        if (textEl.children.length > 1) {
          textEl.children[0].setAttribute('dy', '0em');
          textEl.children[1].setAttribute('dy', '1.45em');
        }
      });
    }
  }, []);

  // 9. Label threshold calculation matching Ember
  const chartLabelThreshold = (height: number) => {
    if (height < 694) {
      return 0.07;
    } else if (height < 764) {
      return 0.05;
    } else {
      return 0.03;
    }
  };

  // 10. ResizeObserver on .reflect-spending-breakdown
  useEffect(() => {
    const parentContainer = document.querySelector('.reflect-spending-breakdown') || containerRef.current?.parentElement;
    if (!parentContainer) return;

    let resizeTimer: any = null;
    const onResize = () => {
      const chart = chartRef.current;
      if (chart) {
        chart.resize();
        const svgEl = chart.$?.svg?.node?.() || containerRef.current?.querySelector('svg');
        if (svgEl) {
          const h = svgEl.getBoundingClientRect().height;
          const t = chartLabelThreshold(h);
          chart.config('donut.label.threshold', t, true);
        }
        setIsResizing(true);
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          setIsResizing(false);
          adjustOuterLabelStyles();
        }, 150);
      }
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(parentContainer);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [adjustOuterLabelStyles]);

  // 11. Chart initialization & data updates
  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.load({
        columns: chartColumns,
        colors: chartColors,
        unload: true,
        done: () => {
          adjustOuterLabelStyles();
        },
      });
      return;
    }

    const chart = bb.generate({
      bindto: containerRef.current,
      data: {
        type: donut(),
        columns: chartColumns,
        colors: chartColors,
        order: null,
        onclick: (d: any, element: any) => {
          if (!isEmptyState && segmentClicked) {
            const item = donutChartDataMap[d.id];
            if (item) {
              const modalTriggerEl = document.querySelector('.spending-breakdown-donut-chart__modal-trigger');
              let centroid = { x: 0, y: 0 };
              try {
                const chartAny = chart as any;
                if (chartAny.internal?.svgArc && element?.__data__) {
                  const c = chartAny.internal.svgArc.centroid(element.__data__);
                  centroid = { x: c[0], y: c[1] };
                }
              } catch (_) {}
              segmentClicked(item, modalTriggerEl, centroid, { x: centroid.x, y: 0 });
            }
          }
        },
        onover: (d: any) => {
          if (!isEmptyState) {
            setHoveredItemId(d.id);
          }
        },
        onout: () => {
          setHoveredItemId(null);
        },
      },
      transition: {
        duration: 100,
      },
      donut: {
        label: {
          ratio: 1.4,
          format: formatItemLabel,
          threshold: 0.07,
        },
        expand: {
          duration: 0,
        },
        startingAngle: 0,
      },
      color: {
        onover: (d: any) => {
          if (d.data?.id === EVERYTHING_ELSE_KEY || d.id === EVERYTHING_ELSE_KEY) {
            return TOP_CHART_COLORS[4];
          }
          return chartColors[d.data?.id || d.id] || '#545bfe';
        },
      },
      arc: {
        cornerRadius: {
          ratio: 0.03,
        },
      },
      tooltip: {
        show: false,
      },
      legend: {
        show: false,
      },
      resize: {
        auto: false,
      },
      padding: {
        top: 56,
        right: 180,
        bottom: 56,
        left: 180,
      },
      onrendered: () => {
        adjustOuterLabelStyles();
      },
    });

    chartRef.current = chart;

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartColumns, chartColors, isEmptyState, formatItemLabel, adjustOuterLabelStyles, segmentClicked, donutChartDataMap]);

  return (
    <div className="spending-breakdown-donut-chart">
      <div className="spending-breakdown-donut-chart__title">
        <span>{centerLabel.name}</span>
        <span className="spending-breakdown-donut-chart__title-amount">{centerLabel.formattedAmount}</span>
        {centerLabel.formattedPercentage && (
          <span className="spending-breakdown-donut-chart__percentage">{centerLabel.formattedPercentage}</span>
        )}
        {shouldShowWarning && (
          <button
            type="button"
            className="button primary is-icon-only spending-breakdown-donut-chart_modal-trigger"
            onClick={openInflowModal}
            title="Inflows detected"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
          >
            <svg className="ynab-new-icon" width="14" height="14">
              <use href="#icon_sprite_info_circle_fill" />
            </svg>
          </button>
        )}
      </div>

      <div className="spending-breakdown-donut-chart__modal-trigger" />

      <div
        ref={containerRef}
        className={`spending-breakdown-donut-chart__bb ${isResizing ? 'spending-breakdown-chart-is-resizing' : ''}`}
      />
    </div>
  );
};
