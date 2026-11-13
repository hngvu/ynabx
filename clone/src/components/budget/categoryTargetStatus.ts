export type TargetType = 'NEED' | 'MF' | 'TB' | 'TBD' | 'DEBT';
export type TargetCadence = 'monthly' | 'weekly' | 'yearly' | 'custom';

export interface CategoryTarget {
  targetAmount: number; // in milliunits
  targetType?: TargetType;
  cadence?: TargetCadence;
  dayOfMonth?: number; // 1-31 (or 0 for end of month)
  dayOfWeek?: number; // 0 (Sun) - 6 (Sat)
  targetDate?: string; // ISO string or YYYY-MM-DD
  repeatInterval?: number;
  repeatUnit?: 'months' | 'years';
}

export interface TargetFundingMessagePart {
  content: string;
  highlighted: boolean;
}

export interface TargetFundingMessage {
  topline: TargetFundingMessagePart[];
  details: TargetFundingMessagePart[];
}

export interface BudgetBarSegment {
  classNames: string;
  style: string;
}

export interface BudgetBarSection {
  classNames: string;
  style: string;
  segments: BudgetBarSegment[];
  isOverTargetSpendingAmountSection?: boolean;
}

export type PillColorClass = 'positive' | 'zero' | 'negative' | 'cautious goal' | 'cautious upcoming' | 'cautious credit';

export function formatCurrency(milliunits: number): string {
  const abs = Math.abs(milliunits) / 1000;
  return `$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function oi(parts: TargetFundingMessagePart[]): string {
  return parts
    .map((p) =>
      p.highlighted
        ? `<span class="highlighted-message-part">${p.content}</span>`
        : p.content
    )
    .join(' ');
}

function zi(content: string): TargetFundingMessagePart {
  return { content, highlighted: true };
}

function Oi(content: string): TargetFundingMessagePart {
  return { content, highlighted: false };
}

/**
 * Calculate the number of months from currentMonth to targetDate (inclusive).
 * Returns at least 1.
 */
function monthsUntilTarget(currentMonth: Date, targetDateStr: string): number {
  const target = new Date(targetDateStr + (targetDateStr.includes('T') ? '' : 'T00:00:00'));
  if (isNaN(target.getTime())) return 1;
  const diffMonths =
    (target.getFullYear() - currentMonth.getFullYear()) * 12 +
    (target.getMonth() - currentMonth.getMonth()) +
    1; // inclusive current month
  return Math.max(1, diffMonths);
}

/**
 * Exact implementation corresponding to YNAB getFundingMessageParts & createFilledSectionsForProgressBars
 * Matches wrapper-DkFKwf1z.js class yf & components/budget-bar-v2
 */
export function calculateCategoryTargetStatus(
  assigned: number, // milliunits
  activity: number, // milliunits (usually negative for spending)
  available: number, // milliunits
  target?: CategoryTarget,
  isDebtPaymentCategory: boolean = false,
  currentMonth?: Date,
  fromPreviousMonth: number = 0
) {
  // If no target set and not debt payment
  if (!target && !isDebtPaymentCategory) {
    const defaultPillClass: PillColorClass = available > 0 ? 'positive' : available < 0 ? 'negative' : 'zero';
    return {
      hasTarget: false,
      toplineHtml: '',
      detailsHtml: '',
      barSections: [] as BudgetBarSection[],
      overallPercent: 0,
      isFullyFunded: false,
      pillClass: defaultPillClass,
    };
  }

  // Credit Card Payment Category
  if (isDebtPaymentCategory) {
    const ccPillClass: PillColorClass = available > 0 ? 'positive' : available < 0 ? 'cautious credit' : 'zero';
    return {
      hasTarget: false,
      toplineHtml: '',
      detailsHtml: '',
      barSections: [
        {
          classNames: 'ynab-new-budget-bar-v2-section-funded',
          style: 'flex-basis: 100%;',
          segments: [
            {
              classNames: 'is-fully-funded',
              style: 'width: 100%;',
            },
          ],
        },
      ],
      overallPercent: 1,
      isFullyFunded: true,
      pillClass: ccPillClass,
    };
  }

  const spending = Math.abs(Math.min(0, activity));
  const targetAmount = target?.targetAmount ?? 0;
  const isOverspent = available < 0;

  // 1. OVERSPENT CASE
  if (isOverspent) {
    const formattedSpent = formatCurrency(spending);
    const formattedTarget = formatCurrency(targetAmount);
    return {
      hasTarget: true,
      toplineHtml: oi([zi('Overspent')]),
      detailsHtml: targetAmount > 0 ? oi([zi('.'), Oi(` ${formattedSpent} of ${formattedTarget}`)]) : '',
      barSections: [
        {
          classNames: 'ynab-new-budget-bar-v2-section-funded',
          style: 'flex-basis: 100%;',
          segments: [
            {
              classNames: 'is-overspent',
              style: 'width: 100%;',
            },
          ],
        },
      ],
      overallPercent: 1,
      isFullyFunded: false,
      pillClass: 'negative' as PillColorClass,
    };
  }

  // Underfunded amount to reach target this month:
  // For TBD (Target Balance by Date): divide remaining shortfall by months left
  // For TB: target balance needed based on available
  // For NEED / MF: monthly spending target
  let needed: number;
  if (target?.targetType === 'TBD' && target.targetDate && currentMonth) {
    const monthsLeft = monthsUntilTarget(currentMonth, target.targetDate);
    const remainingToTarget = Math.max(0, targetAmount - fromPreviousMonth);
    const monthlyNeeded = Math.ceil(remainingToTarget / monthsLeft);
    needed = Math.max(0, monthlyNeeded - assigned);
  } else if (target?.targetType === 'TB') {
    needed = Math.max(0, targetAmount - available);
  } else {
    needed = Math.max(0, targetAmount - assigned);
  }

  const isFullyFunded = needed <= 0;
  const percentFunded = targetAmount > 0 ? Math.min(1, Math.max(0, assigned / targetAmount)) : 1;

  // Progress Bar Segments:
  // - Spending segment: striped (is-fully-funded-spending or is-partially-funded-spending)
  // - Remaining funded segment: solid (is-fully-funded or is-partially-funded)
  const spentRatio = targetAmount > 0 ? Math.min(percentFunded, spending / targetAmount) : 0;
  const fundedAvailableRatio = Math.max(0, percentFunded - spentRatio);

  const segments: BudgetBarSegment[] = [];
  if (spentRatio > 0) {
    segments.push({
      classNames: isFullyFunded ? 'is-fully-funded-spending' : 'is-partially-funded-spending',
      style: `width: ${(spentRatio * 100).toFixed(1)}%;`,
    });
  }
  if (fundedAvailableRatio > 0) {
    segments.push({
      classNames: isFullyFunded ? 'is-fully-funded' : 'is-partially-funded',
      style: `width: ${(fundedAvailableRatio * 100).toFixed(1)}%;`,
    });
  }

  // Generate topline and details message exact match from YNAB wrapper yf.getFundingMessageParts
  let toplineParts: TargetFundingMessagePart[] = [];
  let detailsParts: TargetFundingMessagePart[] = [];

  const formattedSpending = formatCurrency(spending);
  const formattedTarget = formatCurrency(targetAmount);
  const formattedNeeded = formatCurrency(needed);

  if (isFullyFunded) {
    if (spending >= targetAmount && available === 0) {
      toplineParts = [zi('Fully Spent')];
      detailsParts = [];
    } else if (spending > 0) {
      toplineParts = [zi('Funded')];
      detailsParts = [zi('.'), Oi(`Spent ${formattedSpending} of ${formattedTarget}`)];
    } else {
      toplineParts = [zi('Funded')];
      detailsParts = [];
    }
  } else {
    // Underfunded: "[Needed] needed this month" or "[Needed] more needed by the 15th"
    const isMore = assigned > 0;
    toplineParts = [
      zi(formattedNeeded),
      Oi(isMore ? 'more needed' : 'needed'),
    ];
    if (target?.dayOfMonth) {
      detailsParts = [Oi(` by the ${target.dayOfMonth}th`)];
    } else {
      detailsParts = [Oi(' this month')];
    }
  }

  let pillClass: PillColorClass = 'zero';
  if (available > 0) {
    if (needed > 0 && !isDebtPaymentCategory) {
      pillClass = 'cautious goal';
    } else {
      pillClass = 'positive';
    }
  } else if (available < 0) {
    pillClass = isDebtPaymentCategory ? 'cautious credit' : 'negative';
  }

  return {
    hasTarget: true,
    toplineHtml: oi(toplineParts),
    detailsHtml: oi(detailsParts),
    barSections: [
      {
        classNames: 'ynab-new-budget-bar-v2-section-funded',
        style: 'flex-basis: 100%;',
        segments,
      },
    ],
    overallPercent: percentFunded,
    isFullyFunded,
    pillClass,
  };
}
