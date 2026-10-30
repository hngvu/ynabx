/**
 * targetUtils.ts — YNAB Target, Progress Bar & Available Column Color/Icon Logic
 *
 * Implements 1:1 visual and behavioral specifications from official YNAB guides & DOM:
 * - "Progress Bars: A Guide" (https://support.ynab.com/en_us/progress-bars-a-guide-SkDEhot09)
 * - "Colors and Icons in Your Plan" (https://support.ynab.com/en_us/colors-and-icons-in-your-plan-HJQv_XHko)
 * - "How to Use Targets" (https://support.ynab.com/en_us/how-to-use-targets-rk5kkI9ks)
 * - "Underfunded: A Guide" (https://support.ynab.com/en_us/underfunded-a-guide-BJwPhQO09)
 * - "Snooze a Target" (https://support.ynab.com/en_us/snooze-a-target-HyS4E5rZT)
 */

export type TargetCadence = "MONTHLY" | "WEEKLY" | "YEARLY";
export type TargetType = "REFILL_UP_TO" | "SET_ASIDE_ANOTHER";

export interface CategoryTarget {
  amount_milliunits: number;
  cadence: TargetCadence;
  target_type: TargetType;
  day_of_week?: number; // 0=Sun..6=Sat for weekly targets
  due_date?: string; // YYYY-MM-DD
}

export interface TargetProgressSegment {
  className:
    | "is-fully-funded"
    | "is-fully-funded-spending"
    | "is-partially-funded"
    | "is-partially-funded-spending"
    | "is-overspent";
  widthPercent: number;
}

export interface TargetProgressSection {
  id: string;
  flexBasisPercent: number;
  spentRatio: number; // 0..1 (fraction of this section spent)
  availableRatio: number; // 0..1 (fraction of this section available)
  emptyRatio: number; // 0..1 (fraction unfilled)
  segments: TargetProgressSegment[];
  tooltip?: string;
}

export interface CategoryVisualState {
  status:
    | "SNOOZED"
    | "CASH_OVERSPENT"
    | "CREDIT_OVERSPENT"
    | "FUNDED"
    | "UNDERFUNDED"
    | "UNFUNDED";
  statusText: string;
  statusHighlight: string;
  statusSuffix?: string;
  statusDetailsPrefixDot?: boolean;
  statusDetails: string;
  colorFamily: "green" | "yellow" | "red" | "gray";
  availablePillClass: string;
  availableIcon?: string;
  fundedProgressRatio?: number;
  sections: TargetProgressSection[];
  target: CategoryTarget | null;
  isSnoozed: boolean;
  neededMilliunits: number;
}

const memStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.getItem === "function"
    ) {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // fallback
  }
  return memStore.get(key) ?? null;
}

function setStorageItem(key: string, val: string): void {
  try {
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.setItem === "function"
    ) {
      localStorage.setItem(key, val);
    }
  } catch {
    // fallback
  }
  memStore.set(key, val);
}

function removeStorageItem(key: string): void {
  try {
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.removeItem === "function"
    ) {
      localStorage.removeItem(key);
    }
  } catch {
    // fallback
  }
  memStore.delete(key);
}

/**
 * Storage helpers for category targets and monthly snooze state
 */
export function getCategoryTarget(
  planId: string,
  categoryId: string,
): CategoryTarget | null {
  try {
    const raw = getStorageItem(`ynabx_target_${planId}_${categoryId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CategoryTarget;
  } catch {
    return null;
  }
}

export function saveCategoryTarget(
  planId: string,
  categoryId: string,
  target: CategoryTarget | null,
): void {
  try {
    const key = `ynabx_target_${planId}_${categoryId}`;
    if (!target) {
      removeStorageItem(key);
    } else {
      setStorageItem(key, JSON.stringify(target));
    }
  } catch {
    // ignore storage failure
  }
}

export function isTargetSnoozed(
  planId: string,
  categoryId: string,
  month: string,
): boolean {
  try {
    return (
      getStorageItem(`ynabx_target_snooze_${planId}_${categoryId}_${month}`) ===
      "true"
    );
  } catch {
    return false;
  }
}

export function setTargetSnooze(
  planId: string,
  categoryId: string,
  month: string,
  snoozed: boolean,
): void {
  try {
    const key = `ynabx_target_snooze_${planId}_${categoryId}_${month}`;
    if (snoozed) {
      setStorageItem(key, "true");
    } else {
      removeStorageItem(key);
    }
  } catch {
    // ignore
  }
}

/**
 * Calculate how many weekly intervals fall into the given month (YYYY-MM).
 */
export function getWeeksInMonth(monthStr: string, dayOfWeek = 0): number {
  try {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    let count = 0;
    while (date.getMonth() === month - 1) {
      if (date.getDay() === dayOfWeek) {
        count++;
      }
      date.setDate(date.getDate() + 1);
    }
    return count >= 4 ? count : 4;
  } catch {
    return 4;
  }
}

/**
 * Build SVG clip-path arc `d` attribute for YNAB's `.icon-circle-progress` pie chart.
 */
export function buildCircleProgressArcPath(progressRatio = 0): string {
  const clamped = Math.max(0.07, Math.min(0.999, progressRatio));
  const angle = 2 * Math.PI * clamped;
  const endX = Math.cos(angle);
  const endY = Math.sin(angle);
  const largeArcFlag = clamped > 0.5 ? 1 : 0;
  return `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
}

/**
 * Compute the complete visual state of a category row, including progress bar sections,
 * striped/solid segments, status label parts, and available pill color/icon.
 */
export function computeCategoryVisualState(params: {
  planId: string;
  categoryId: string;
  availableMilliunits: number;
  assignedMilliunits: number;
  activityMilliunits: number;
  month: string;
  isCreditCardPayment?: boolean;
  formatCurrency: (milliunits: number) => string;
}): CategoryVisualState {
  const {
    planId,
    categoryId,
    availableMilliunits,
    assignedMilliunits,
    activityMilliunits,
    month,
    isCreditCardPayment = false,
    formatCurrency,
  } = params;

  const target = getCategoryTarget(planId, categoryId);
  const isSnoozed = isTargetSnoozed(planId, categoryId, month);

  const available = availableMilliunits;
  const assigned = assignedMilliunits;
  const activity = activityMilliunits;
  const spent = Math.abs(activity < 0 ? activity : 0);

  // 1. SNOOZED TARGET
  if (target && isSnoozed) {
    const totalFunds = Math.max(0, available) + spent;
    const spentRatio = totalFunds > 0 ? spent / totalFunds : 0;
    const availableRatio =
      totalFunds > 0 ? Math.max(0, available) / totalFunds : 0;
    const segments: TargetProgressSegment[] = [];
    if (spentRatio > 0) {
      segments.push({
        className: "is-fully-funded-spending",
        widthPercent: Number((spentRatio * 100).toFixed(1)),
      });
    }
    if (availableRatio > 0) {
      segments.push({
        className: "is-fully-funded",
        widthPercent: Number((availableRatio * 100).toFixed(1)),
      });
    }

    return {
      status: "SNOOZED",
      statusText: "Snoozed",
      statusHighlight: "Snoozed",
      statusDetails: "",
      colorFamily: "green",
      availablePillClass:
        available >= 0 ? "positive pill-positive" : "negative pill-negative",
      availableIcon: "snooze",
      sections: [
        {
          id: "snoozed-section",
          flexBasisPercent: 100,
          spentRatio,
          availableRatio,
          emptyRatio: Math.max(0, 1 - spentRatio - availableRatio),
          segments,
        },
      ],
      target,
      isSnoozed: true,
      neededMilliunits: 0,
    };
  }

  // 2. OVERSPENT (available < 0)
  if (available < 0) {
    const overspentAmount = Math.abs(available);
    const totalFunded = Math.max(0, spent - overspentAmount);
    const totalSpent = Math.max(spent, overspentAmount);

    const segments: TargetProgressSegment[] = [];
    if (totalFunded > 0 && totalSpent > 0) {
      const fundedPct = Number(((totalFunded / totalSpent) * 100).toFixed(1));
      const overspentPct = Number((100 - fundedPct).toFixed(1));
      const wasTargetMet = !target || totalFunded >= target.amount_milliunits;
      segments.push({
        className: wasTargetMet
          ? "is-fully-funded-spending"
          : "is-partially-funded-spending",
        widthPercent: fundedPct,
      });
      segments.push({
        className: "is-overspent",
        widthPercent: overspentPct,
      });
    } else {
      segments.push({
        className: "is-overspent",
        widthPercent: 100,
      });
    }

    const statusHighlight = "Overspent";
    const statusDetails = ` ${formatCurrency(totalSpent)} of ${formatCurrency(totalFunded)}`;
    const statusText = `Overspent.${statusDetails}`;

    if (isCreditCardPayment) {
      return {
        status: "CREDIT_OVERSPENT",
        statusText,
        statusHighlight,
        statusDetailsPrefixDot: true,
        statusDetails,
        colorFamily: "yellow",
        availablePillClass: "cautious credit pill-warning",
        availableIcon: "credit_card_exclamation_mark",
        sections: [
          {
            id: "overspent-credit",
            flexBasisPercent: 100,
            spentRatio: 1,
            availableRatio: 0,
            emptyRatio: 0,
            segments,
          },
        ],
        target,
        isSnoozed: false,
        neededMilliunits: overspentAmount,
      };
    } else {
      return {
        status: "CASH_OVERSPENT",
        statusText,
        statusHighlight,
        statusDetailsPrefixDot: true,
        statusDetails,
        colorFamily: "red",
        availablePillClass: "negative pill-negative",
        sections: [
          {
            id: "overspent-cash",
            flexBasisPercent: 100,
            spentRatio: 1,
            availableRatio: 0,
            emptyRatio: 0,
            segments,
          },
        ],
        target,
        isSnoozed: false,
        neededMilliunits: overspentAmount,
      };
    }
  }

  // 3. CATEGORY HAS A TARGET
  if (target) {
    let targetAmount = target.amount_milliunits;
    let numSections = 1;
    const startingRollover = Math.max(
      0,
      available + spent - Math.max(0, assigned),
    );

    if (target.cadence === "WEEKLY") {
      const weeksCount = getWeeksInMonth(month, target.day_of_week ?? 0);
      numSections = weeksCount;
      targetAmount = target.amount_milliunits * weeksCount;
    } else if (
      target.target_type === "SET_ASIDE_ANOTHER" &&
      startingRollover > 0
    ) {
      numSections = 2;
    }

    // Needed calculation:
    // - REFILL_UP_TO: total funds available this month (available + spent) must reach targetAmount
    // - SET_ASIDE_ANOTHER: assigned this month must reach targetAmount
    let needed = 0;
    if (target.target_type === "REFILL_UP_TO") {
      needed = Math.max(0, targetAmount - (available + spent));
    } else {
      needed = Math.max(0, targetAmount - assigned);
    }

    const isFullyFunded = needed === 0;

    const sections = buildSections({
      numSections,
      totalTarget: targetAmount,
      startingRollover:
        target.target_type === "SET_ASIDE_ANOTHER" && numSections === 2
          ? startingRollover
          : 0,
      spentAmount: spent,
      availableAmount: available,
      isFunded: isFullyFunded,
    });

    if (isFullyFunded) {
      const totalFunds = available + spent;
      if (available === 0 && spent > 0) {
        return {
          status: "FUNDED",
          statusText: "Fully Spent",
          statusHighlight: "Fully Spent",
          statusDetailsPrefixDot: false,
          statusDetails: "",
          colorFamily: "green",
          availablePillClass: "zero pill-zero",
          availableIcon: "check_circle_fill",
          fundedProgressRatio: 1,
          sections,
          target,
          isSnoozed: false,
          neededMilliunits: 0,
        };
      }

      const statusDetails =
        spent > 0
          ? ` Spent ${formatCurrency(spent)} of ${formatCurrency(totalFunds)}`
          : "";
      const statusText = spent > 0 ? `Funded.${statusDetails}` : "Funded";

      return {
        status: "FUNDED",
        statusText,
        statusHighlight: "Funded",
        statusDetailsPrefixDot: spent > 0,
        statusDetails,
        colorFamily: "green",
        availablePillClass: "positive pill-positive",
        availableIcon: "check_circle_fill",
        fundedProgressRatio: 1,
        sections,
        target,
        isSnoozed: false,
        neededMilliunits: 0,
      };
    } else {
      // UNDERFUNDED TARGET
      const fundedTowardsTarget = Math.max(0, targetAmount - needed);
      const fundedProgressRatio =
        targetAmount > 0 ? fundedTowardsTarget / targetAmount : 0;
      const hasAnyFunding = assigned > 0 || available > 0 || spent > 0;
      const statusHighlight = formatCurrency(needed);
      const statusSuffix = hasAnyFunding ? " more needed" : " needed";
      const statusDetails = " this month";
      const statusText = `${statusHighlight}${statusSuffix}${statusDetails}`;

      return {
        status: "UNDERFUNDED",
        statusText,
        statusHighlight,
        statusSuffix,
        statusDetailsPrefixDot: false,
        statusDetails,
        colorFamily: "yellow",
        availablePillClass: "cautious goal pill-warning",
        availableIcon: "pie_chart",
        fundedProgressRatio,
        sections,
        target,
        isSnoozed: false,
        neededMilliunits: needed,
      };
    }
  }

  // 4. NO TARGET CONFIGURED
  if (available > 0) {
    const totalFunds = available + spent;
    const spentRatio = totalFunds > 0 ? spent / totalFunds : 0;
    const availableRatio = totalFunds > 0 ? available / totalFunds : 1;
    const spentPct = Number((spentRatio * 100).toFixed(1));
    const availPct = Number((100 - spentPct).toFixed(1));

    const segments: TargetProgressSegment[] = [];
    if (spentPct > 0) {
      segments.push({
        className: "is-fully-funded-spending",
        widthPercent: spentPct,
      });
    }
    if (availPct > 0) {
      segments.push({
        className: "is-fully-funded",
        widthPercent: availPct,
      });
    }

    const statusDetails =
      spent > 0
        ? ` Spent ${formatCurrency(spent)} of ${formatCurrency(totalFunds)}`
        : "";
    const statusText = spent > 0 ? `Funded.${statusDetails}` : "Funded";

    return {
      status: "FUNDED",
      statusText,
      statusHighlight: "Funded",
      statusDetailsPrefixDot: spent > 0,
      statusDetails,
      colorFamily: "green",
      availablePillClass: "positive pill-positive",
      sections: [
        {
          id: "no-target-funded",
          flexBasisPercent: 100,
          spentRatio,
          availableRatio,
          emptyRatio: 0,
          segments,
        },
      ],
      target: null,
      isSnoozed: false,
      neededMilliunits: 0,
    };
  }

  // All assigned money spent (available === 0 && spent > 0) -> YNAB "Fully Spent" with striped green bar
  if (available === 0 && spent > 0) {
    return {
      status: "FUNDED",
      statusText: "Fully Spent",
      statusHighlight: "Fully Spent",
      statusDetailsPrefixDot: false,
      statusDetails: "",
      colorFamily: "green",
      availablePillClass: "zero pill-zero",
      sections: [
        {
          id: "no-target-all-spent",
          flexBasisPercent: 100,
          spentRatio: 1,
          availableRatio: 0,
          emptyRatio: 0,
          segments: [
            {
              className: "is-fully-funded-spending",
              widthPercent: 100,
            },
          ],
        },
      ],
      target: null,
      isSnoozed: false,
      neededMilliunits: 0,
    };
  }

  // Completely empty category (0 available, 0 spent, no target) -> blank status text, empty track
  return {
    status: "UNFUNDED",
    statusText: "",
    statusHighlight: "",
    statusDetails: "",
    colorFamily: "gray",
    availablePillClass: "zero pill-zero",
    sections: [
      {
        id: "no-target-empty",
        flexBasisPercent: 100,
        spentRatio: 0,
        availableRatio: 0,
        emptyRatio: 1,
        segments: [],
      },
    ],
    target: null,
    isSnoozed: false,
    neededMilliunits: 0,
  };
}

/**
 * Distribute spent and available amounts across N sections (1, 2 for rollover + set-aside, or 4-5 for weekly).
 */
function buildSections(params: {
  numSections: number;
  totalTarget: number;
  startingRollover: number;
  spentAmount: number;
  availableAmount: number;
  isFunded: boolean;
}): TargetProgressSection[] {
  const {
    numSections,
    totalTarget,
    startingRollover,
    spentAmount,
    availableAmount,
    isFunded,
  } = params;

  const sectionCaps: number[] = [];
  const sectionFlexBasis: number[] = [];

  if (numSections === 2 && startingRollover > 0) {
    const totalCap = startingRollover + totalTarget;
    const firstBasis =
      totalCap > 0
        ? Number(((startingRollover / totalCap) * 100).toFixed(1))
        : 50;
    sectionCaps.push(startingRollover, totalTarget);
    sectionFlexBasis.push(firstBasis, Number((100 - firstBasis).toFixed(1)));
  } else {
    const effectiveTotal = isFunded
      ? Math.max(totalTarget, spentAmount + availableAmount)
      : totalTarget;
    const cap = effectiveTotal > 0 ? effectiveTotal / numSections : 1;
    const basis = Number((100 / numSections).toFixed(1));
    for (let i = 0; i < numSections; i++) {
      sectionCaps.push(cap);
      sectionFlexBasis.push(basis);
    }
  }

  let remainingSpent = spentAmount;
  let remainingAvailable = availableAmount;

  const sections: TargetProgressSection[] = [];

  for (let i = 0; i < numSections; i++) {
    const sectionCap = sectionCaps[i] ?? 1;
    const flexBasisPercent = sectionFlexBasis[i] ?? 100;

    // Portion of this section filled by spent
    const sectionSpent = Math.min(sectionCap, remainingSpent);
    remainingSpent = Math.max(0, remainingSpent - sectionSpent);

    // Remaining capacity in this section
    const roomLeft = Math.max(0, sectionCap - sectionSpent);

    // Portion filled by available
    const sectionAvailable = Math.min(roomLeft, remainingAvailable);
    remainingAvailable = Math.max(0, remainingAvailable - sectionAvailable);

    const spentRatio = sectionCap > 0 ? sectionSpent / sectionCap : 0;
    const availableRatio = sectionCap > 0 ? sectionAvailable / sectionCap : 0;
    const emptyRatio = Math.max(0, 1 - spentRatio - availableRatio);

    const clampedSpent = Math.min(1, Math.max(0, spentRatio));
    const clampedAvail = Math.min(1, Math.max(0, availableRatio));
    const spentPct = Number((clampedSpent * 100).toFixed(1));
    const availPct = Number(
      Math.min(100 - spentPct, clampedAvail * 100).toFixed(1),
    );

    const segments: TargetProgressSegment[] = [];
    if (spentPct > 0) {
      segments.push({
        className: isFunded
          ? "is-fully-funded-spending"
          : "is-partially-funded-spending",
        widthPercent: spentPct,
      });
    }
    if (availPct > 0) {
      segments.push({
        className: isFunded ? "is-fully-funded" : "is-partially-funded",
        widthPercent: availPct,
      });
    }

    sections.push({
      id: `section-${i}`,
      flexBasisPercent,
      spentRatio: clampedSpent,
      availableRatio: clampedAvail,
      emptyRatio: Math.min(1, Math.max(0, emptyRatio)),
      segments,
    });
  }

  return sections;
}
