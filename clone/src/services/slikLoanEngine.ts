/**
 * SLIK Loan Amortization & Payoff Simulator Engine (100% integer milliunits)
 * Mirrors unminified/ember_app/app/services/loan-accounts.js & paydownHelper (WF).
 */

export interface LoanAccountDetails {
  accountId: string;
  accountName: string;
  originalBalanceMillis: number; // positive principal magnitude
  currentBalanceMillis: number; // positive remaining principal magnitude
  interestRatePct: number; // annual APR, e.g. 5.99
  minimumPaymentMillis: number;
  escrowAmountMillis: number;
  debtPaymentsThisMonthMillis: number;
  pairedCategoryId: string | null;
  pairedCategoryName: string | null;
  pairedGroupName: string | null;
  pairedAvailableMillis: number;
  pairedTargetAmountMillis: number;
  isClosed?: boolean;
}

export interface LoanAmortizationPoint {
  monthIndex: number;
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "Dec 2026"
  startingBalanceMillis: number;
  paymentMillis: number;
  principalMillis: number;
  interestMillis: number;
  escrowMillis: number;
  endingBalanceMillis: number;
}

export interface LoanSimulationPlan {
  monthlyPaymentMillis: number;
  oneTimeExtraMillis: number;
  payoffDateLabel: string;
  payoffMonthKey: string;
  payoffMonthCount: number;
  totalPaymentMillis: number;
  totalPrincipalMillis: number;
  totalInterestMillis: number;
  progress: 'positive' | 'negative' | 'paidOff';
  schedule: LoanAmortizationPoint[];
}

export interface LoanPayoffComparison {
  baselinePlan: LoanSimulationPlan;
  simulatedPlan: LoanSimulationPlan;
  monthsSaved: number;
  interestSavedMillis: number;
  principalPaidSoFarMillis: number;
  principalPaidPct: number;
  maximumOneTimeExtraMillis: number;
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MAX_AMORTIZATION_MONTHS = 600; // 50-year cap

export function addMonthsToKey(
  baseYear: number,
  baseMonthZeroIndexed: number,
  offset: number
): { year: number; month: number; monthKey: string; monthLabel: string } {
  const totalMonths = baseYear * 12 + baseMonthZeroIndexed + offset;
  const year = Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  return {
    year,
    month,
    monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
    monthLabel: `${SHORT_MONTHS[month]} ${year}`,
  };
}

/**
 * Computes monthly interest in integer milliunits for a given principal balance and annual APR.
 */
export function computeMonthlyInterestMillis(
  balanceMillis: number,
  interestRatePct: number
): number {
  if (balanceMillis <= 0 || interestRatePct <= 0) return 0;
  return Math.round((balanceMillis * (interestRatePct / 100)) / 12);
}

/**
 * Simulates loan payoff schedule in integer milliunits.
 */
export function simulateLoanPayoff(params: {
  currentBalanceMillis: number;
  interestRatePct: number;
  monthlyPaymentMillis: number;
  oneTimeExtraMillis?: number;
  escrowAmountMillis?: number;
  baseYear?: number;
  baseMonth?: number; // 0-indexed
}): LoanSimulationPlan {
  const {
    currentBalanceMillis,
    interestRatePct,
    monthlyPaymentMillis,
    oneTimeExtraMillis = 0,
    escrowAmountMillis = 0,
    baseYear = 2026,
    baseMonth = 10, // Nov 2026
  } = params;

  const startingBalance = Math.max(0, Math.round(currentBalanceMillis));
  const extraMillis = Math.max(0, Math.min(startingBalance, Math.round(oneTimeExtraMillis)));
  const effectiveMonthlyPayment = Math.max(0, Math.round(monthlyPaymentMillis));

  if (startingBalance === 0) {
    const first = addMonthsToKey(baseYear, baseMonth, 0);
    return {
      monthlyPaymentMillis: effectiveMonthlyPayment,
      oneTimeExtraMillis: extraMillis,
      payoffDateLabel: first.monthLabel,
      payoffMonthKey: first.monthKey,
      payoffMonthCount: 0,
      totalPaymentMillis: 0,
      totalPrincipalMillis: 0,
      totalInterestMillis: 0,
      progress: 'paidOff',
      schedule: [],
    };
  }

  let balance = Math.max(0, startingBalance - extraMillis);
  const schedule: LoanAmortizationPoint[] = [];
  let totalPaymentMillis = extraMillis;
  let totalPrincipalMillis = extraMillis;
  let totalInterestMillis = 0;

  // Check if monthly payment (excluding escrow) can cover first month's interest
  const principalAndInterestPayment = Math.max(0, effectiveMonthlyPayment - escrowAmountMillis);
  const firstInterest = computeMonthlyInterestMillis(balance, interestRatePct);
  if (balance > 0 && principalAndInterestPayment <= firstInterest) {
    const next = addMonthsToKey(baseYear, baseMonth, 1);
    return {
      monthlyPaymentMillis: effectiveMonthlyPayment,
      oneTimeExtraMillis: extraMillis,
      payoffDateLabel: 'Never',
      payoffMonthKey: next.monthKey,
      payoffMonthCount: MAX_AMORTIZATION_MONTHS,
      totalPaymentMillis: 0,
      totalPrincipalMillis: balance,
      totalInterestMillis: 0,
      progress: 'negative',
      schedule: [],
    };
  }

  for (let i = 1; i <= MAX_AMORTIZATION_MONTHS && balance > 0; i++) {
    const { monthKey, monthLabel } = addMonthsToKey(baseYear, baseMonth, i);
    const interestMillis = computeMonthlyInterestMillis(balance, interestRatePct);
    const maxNeeded = balance + interestMillis;
    const appliedPI = Math.min(principalAndInterestPayment, maxNeeded);
    const principalMillis = Math.max(0, appliedPI - interestMillis);
    const endingBalanceMillis = Math.max(0, balance - principalMillis);
    const actualPaymentMillis = appliedPI + (endingBalanceMillis > 0 || appliedPI > 0 ? escrowAmountMillis : 0);

    schedule.push({
      monthIndex: i,
      monthKey,
      monthLabel,
      startingBalanceMillis: balance,
      paymentMillis: actualPaymentMillis,
      principalMillis,
      interestMillis,
      escrowMillis: escrowAmountMillis,
      endingBalanceMillis,
    });

    totalPaymentMillis += actualPaymentMillis;
    totalPrincipalMillis += principalMillis;
    totalInterestMillis += interestMillis;
    balance = endingBalanceMillis;
  }

  const lastPoint = schedule[schedule.length - 1];
  const currentInfo = addMonthsToKey(baseYear, baseMonth, 0);

  return {
    monthlyPaymentMillis: effectiveMonthlyPayment,
    oneTimeExtraMillis: extraMillis,
    payoffDateLabel: lastPoint ? lastPoint.monthLabel : currentInfo.monthLabel,
    payoffMonthKey: lastPoint ? lastPoint.monthKey : currentInfo.monthKey,
    payoffMonthCount: schedule.length,
    totalPaymentMillis,
    totalPrincipalMillis,
    totalInterestMillis,
    progress: balance === 0 ? 'positive' : 'negative',
    schedule,
  };
}

/**
 * Solves for the monthly payment (in integer milliunits) needed to pay off a loan
 * in `targetMonths` via binary search.
 */
export function solveMonthlyPaymentForMonths(params: {
  currentBalanceMillis: number;
  interestRatePct: number;
  targetMonths: number;
  oneTimeExtraMillis?: number;
  escrowAmountMillis?: number;
}): number {
  const target = Math.max(1, Math.min(MAX_AMORTIZATION_MONTHS, Math.round(params.targetMonths)));
  const balanceAfterExtra = Math.max(
    0,
    Math.round(params.currentBalanceMillis) - Math.max(0, Math.round(params.oneTimeExtraMillis ?? 0))
  );
  if (balanceAfterExtra === 0) return 0;

  const escrow = Math.max(0, Math.round(params.escrowAmountMillis ?? 0));
  let low = escrow + computeMonthlyInterestMillis(balanceAfterExtra, params.interestRatePct) + 1000;
  let high = balanceAfterExtra + escrow + computeMonthlyInterestMillis(balanceAfterExtra, params.interestRatePct);

  for (let iter = 0; iter < 40 && low < high; iter++) {
    const mid = Math.floor((low + high) / 2);
    const plan = simulateLoanPayoff({
      currentBalanceMillis: params.currentBalanceMillis,
      interestRatePct: params.interestRatePct,
      monthlyPaymentMillis: mid,
      oneTimeExtraMillis: params.oneTimeExtraMillis,
      escrowAmountMillis: escrow,
    });
    if (plan.progress === 'positive' && plan.payoffMonthCount <= target) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

/**
 * Computes full baseline vs simulated loan comparison matching LoanAccountPayoffSimulator.
 */
export function buildLoanPayoffComparison(
  details: LoanAccountDetails,
  simulatedMonthlyPaymentMillis: number,
  oneTimeExtraMillis: number
): LoanPayoffComparison {
  const baselineMonthlyPayment =
    details.pairedTargetAmountMillis > 0
      ? details.pairedTargetAmountMillis
      : details.minimumPaymentMillis;

  const baselinePlan = simulateLoanPayoff({
    currentBalanceMillis: details.currentBalanceMillis,
    interestRatePct: details.interestRatePct,
    monthlyPaymentMillis: baselineMonthlyPayment,
    oneTimeExtraMillis: 0,
    escrowAmountMillis: details.escrowAmountMillis,
  });

  const simulatedPlan = simulateLoanPayoff({
    currentBalanceMillis: details.currentBalanceMillis,
    interestRatePct: details.interestRatePct,
    monthlyPaymentMillis: simulatedMonthlyPaymentMillis,
    oneTimeExtraMillis,
    escrowAmountMillis: details.escrowAmountMillis,
  });

  const stillExpectedThisMonth = Math.max(
    0,
    baselineMonthlyPayment - details.debtPaymentsThisMonthMillis
  );
  const maximumOneTimeExtraMillis = Math.max(
    0,
    details.currentBalanceMillis - stillExpectedThisMonth
  );

  const original = Math.max(details.originalBalanceMillis, details.currentBalanceMillis);
  const principalPaidSoFarMillis = Math.max(0, original - details.currentBalanceMillis);
  const principalPaidPct =
    original > 0 ? Math.round((principalPaidSoFarMillis / original) * 100) : 100;

  const monthsSaved =
    baselinePlan.progress === 'positive' && simulatedPlan.progress === 'positive'
      ? baselinePlan.payoffMonthCount - simulatedPlan.payoffMonthCount
      : 0;
  const interestSavedMillis =
    baselinePlan.progress === 'positive' && simulatedPlan.progress === 'positive'
      ? baselinePlan.totalInterestMillis - simulatedPlan.totalInterestMillis
      : 0;

  return {
    baselinePlan,
    simulatedPlan,
    monthsSaved,
    interestSavedMillis,
    principalPaidSoFarMillis,
    principalPaidPct,
    maximumOneTimeExtraMillis,
  };
}

export const INITIAL_LOAN_DETAILS: Record<string, LoanAccountDetails> = {
  'acc-car-loan': {
    accountId: 'acc-car-loan',
    accountName: 'Car Loan',
    originalBalanceMillis: 12000000, // $12,000.00
    currentBalanceMillis: 6680000, // $6,680.00
    interestRatePct: 5.49,
    minimumPaymentMillis: 325000, // $325.00/mo
    escrowAmountMillis: 0,
    debtPaymentsThisMonthMillis: 0,
    pairedCategoryId: 'cat-auto-loan',
    pairedCategoryName: 'Auto Loan',
    pairedGroupName: 'Debt Payments',
    pairedAvailableMillis: 325000,
    pairedTargetAmountMillis: 325000,
  },
};
