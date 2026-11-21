import React, { useEffect, useMemo, useRef, useState } from 'react';
import bb, { line } from 'billboard.js';
import 'billboard.js/dist/billboard.css';
import { AccountItem } from '../sidebar/NavAccountRow';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { Modal } from '../core/Modal';
import { formatMilliunits } from '../reflect/reflectDataEngine';
import { MasterCategoryGroup } from '../budget/budgetData';
import {
  buildLoanPayoffComparison,
  INITIAL_LOAN_DETAILS,
  LoanAccountDetails,
  solveMonthlyPaymentForMonths,
} from '../../services/slikLoanEngine';

export interface LoanAccountWorkspaceProps {
  account: AccountItem;
  categoryGroups: MasterCategoryGroup[];
  onOpenEditAccount?: (account: AccountItem) => void;
  onNavigateToBudget?: () => void;
  onUpdateLoanDetails?: (details: LoanAccountDetails) => void;
}

export const LoanAccountWorkspace: React.FC<LoanAccountWorkspaceProps> = ({
  account,
  categoryGroups,
  onOpenEditAccount,
  onNavigateToBudget,
  onUpdateLoanDetails,
}) => {
  const initialDetails: LoanAccountDetails = useMemo(() => {
    const base = INITIAL_LOAN_DETAILS[account.entityId];
    const absBalance = Math.abs(account.accountCalculation?.balance ?? 0);
    if (base) {
      return {
        ...base,
        accountName: account.accountName,
        currentBalanceMillis: absBalance > 0 ? absBalance : base.currentBalanceMillis,
        isClosed: account.isClosed,
      };
    }
    return {
      accountId: account.entityId,
      accountName: account.accountName,
      originalBalanceMillis: absBalance || 5000000,
      currentBalanceMillis: absBalance,
      interestRatePct: 6.0,
      minimumPaymentMillis: Math.max(50000, Math.round((absBalance || 5000000) * 0.025)),
      escrowAmountMillis: 0,
      debtPaymentsThisMonthMillis: 0,
      pairedCategoryId: null,
      pairedCategoryName: null,
      pairedGroupName: null,
      pairedAvailableMillis: 0,
      pairedTargetAmountMillis: 0,
      isClosed: account.isClosed,
    };
  }, [account]);

  const [details, setDetails] = useState<LoanAccountDetails>(initialDetails);
  useEffect(() => {
    setDetails(initialDetails);
  }, [initialDetails]);

  const [isSimulatorBannerDismissed, setIsSimulatorBannerDismissed] = useState(false);
  const [isPairBannerDismissed, setIsPairBannerDismissed] = useState(false);
  const [isPairedCardCollapsed, setIsPairedCardCollapsed] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);

  // Simulator input states (in milliunits)
  const defaultMonthly =
    details.pairedTargetAmountMillis > 0
      ? details.pairedTargetAmountMillis
      : details.minimumPaymentMillis;
  const [simMonthlyInput, setSimMonthlyInput] = useState<string>(
    (defaultMonthly / 1000).toFixed(2)
  );
  const [simExtraInput, setSimExtraInput] = useState<string>('0.00');
  const [simTargetMonths, setSimTargetMonths] = useState<string>('');

  useEffect(() => {
    const baseMonthly =
      details.pairedTargetAmountMillis > 0
        ? details.pairedTargetAmountMillis
        : details.minimumPaymentMillis;
    setSimMonthlyInput((baseMonthly / 1000).toFixed(2));
    setSimExtraInput('0.00');
    setSimTargetMonths('');
  }, [details.accountId, details.minimumPaymentMillis, details.pairedTargetAmountMillis]);

  const parsedMonthlyMillis = Math.max(
    0,
    Math.round((parseFloat(simMonthlyInput) || 0) * 1000)
  );
  const rawExtraMillis = Math.max(
    0,
    Math.round((parseFloat(simExtraInput) || 0) * 1000)
  );

  const comparison = useMemo(
    () => buildLoanPayoffComparison(details, parsedMonthlyMillis, rawExtraMillis),
    [details, parsedMonthlyMillis, rawExtraMillis]
  );

  const clampedExtraMillis = Math.min(
    rawExtraMillis,
    comparison.maximumOneTimeExtraMillis
  );

  const handleTargetMonthsChange = (monthsStr: string) => {
    setSimTargetMonths(monthsStr);
    const months = parseInt(monthsStr, 10);
    if (!Number.isNaN(months) && months > 0) {
      const solved = solveMonthlyPaymentForMonths({
        currentBalanceMillis: details.currentBalanceMillis,
        interestRatePct: details.interestRatePct,
        targetMonths: months,
        oneTimeExtraMillis: clampedExtraMillis,
        escrowAmountMillis: details.escrowAmountMillis,
      });
      setSimMonthlyInput((solved / 1000).toFixed(2));
    }
  };

  const handleResetSimulator = () => {
    setSimMonthlyInput((defaultMonthly / 1000).toFixed(2));
    setSimExtraInput('0.00');
    setSimTargetMonths('');
  };

  // Paydown Chart (billboard.js)
  const mainChartRef = useRef<HTMLDivElement>(null);
  const simChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderPaydownChart = (
      el: HTMLDivElement | null,
      showSimulation: boolean
    ) => {
      if (!el) return null;
      const baseSched = comparison.baselinePlan.schedule;
      const simSched = comparison.simulatedPlan.schedule;
      const maxLen = Math.max(baseSched.length, showSimulation ? simSched.length : 0);
      if (maxLen === 0) return null;

      // Thin out to <= 36 points for crisp rendering
      const step = Math.max(1, Math.ceil(maxLen / 36));
      const indices: number[] = [];
      for (let i = 0; i < maxLen; i += step) indices.push(i);
      if (indices[indices.length - 1] !== maxLen - 1) indices.push(maxLen - 1);

      const xLabels: string[] = ['date'];
      const budgetCol: (string | number)[] = ['budget'];
      const simCol: (string | number)[] = ['simulation'];

      xLabels.push('2026-11-01');
      budgetCol.push(details.currentBalanceMillis / 1000);
      simCol.push(Math.max(0, details.currentBalanceMillis - clampedExtraMillis) / 1000);

      for (const idx of indices) {
        const bPt = baseSched[idx];
        const sPt = simSched[idx];
        const ref = bPt ?? sPt;
        if (!ref) continue;
        xLabels.push(`${ref.monthKey}-01`);
        budgetCol.push(bPt ? bPt.endingBalanceMillis / 1000 : 0);
        simCol.push(sPt ? sPt.endingBalanceMillis / 1000 : 0);
      }

      const columns = showSimulation
        ? [xLabels, budgetCol, simCol]
        : [xLabels, budgetCol];

      return bb.generate({
        bindto: el,
        size: { height: showSimulation ? 220 : 240 },
        padding: { right: 24 },
        data: {
          x: 'date',
          columns,
          type: line(),
          colors: {
            budget: '#545bfe',
            simulation: '#16a34a',
          },
          names: {
            budget: 'Current Plan',
            simulation: 'Simulated Plan',
          },
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: { format: "%b '%y", count: 6 },
          },
          y: {
            min: 0,
            padding: { bottom: 0 },
            tick: {
              format: (v: number) => `$${Math.round(v).toLocaleString('en-US')}`,
            },
          },
        },
        point: { r: 2.5 },
        grid: { y: { show: true } },
      });
    };

    const mainChart = renderPaydownChart(mainChartRef.current, false);
    const simChart = isSimulatorOpen
      ? renderPaydownChart(simChartRef.current, true)
      : null;

    return () => {
      mainChart?.destroy();
      simChart?.destroy();
    };
  }, [comparison, details.currentBalanceMillis, clampedExtraMillis, isSimulatorOpen]);

  const handlePairCategory = (catId: string, catName: string, groupName: string) => {
    const next: LoanAccountDetails = {
      ...details,
      pairedCategoryId: catId,
      pairedCategoryName: catName,
      pairedGroupName: groupName,
      pairedTargetAmountMillis:
        details.pairedTargetAmountMillis > 0
          ? details.pairedTargetAmountMillis
          : details.minimumPaymentMillis,
    };
    setDetails(next);
    setIsPairingOpen(false);
    onUpdateLoanDetails?.(next);
  };

  const isPaidOff = details.currentBalanceMillis <= 0;

  return (
    <div className="loan-account loan-account-lpv2" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* Account Header */}
      <header className="accounts-header" style={{ width: '100%', flexShrink: 0, padding: '16px 24px', borderBottom: '1px solid var(--separatorStandard, #e5e5e5)', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', background: '#fff', textAlign: 'left' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{details.accountName}</h1>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#eef2ff', color: '#4338ca', fontWeight: 600 }}>
              {details.interestRatePct.toFixed(2)}% APR
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Balance: <strong>{formatMilliunits(-details.currentBalanceMillis)}</strong> · Min Payment: <strong>{formatMilliunits(details.minimumPaymentMillis)}/mo</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => onOpenEditAccount?.(account)}>
            Edit Account
          </Button>
          <Button variant="primary" onClick={() => setIsSimulatorOpen(true)}>
            <Icon name="line_chart" width={14} />
            Loan Payoff Simulator
          </Button>
        </div>
      </header>

      <div className="loan-account-container" style={{ padding: '24px 24px 72px 24px', maxWidth: 1040, width: '100%', margin: '0 auto' }}>
        <section className="loan-account-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Payoff Simulator Banner */}
          {!isSimulatorBannerDismissed && !isPaidOff && (
            <div className="loan-account-payoff-simulator-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div className="banner-text">
                <div className="banner-heading" style={{ fontWeight: 600, fontSize: 14 }}>See how extra payments speed up your payoff</div>
                <div className="banner-subheading" style={{ fontSize: 12, color: '#64748b' }}>
                  Simulate monthly or one-time extra payments and calculate interest saved.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button variant="primary" onClick={() => setIsSimulatorOpen(true)}>
                  Try Simulator
                </Button>
                <button className="close-banner-button" type="button" aria-label="Dismiss" onClick={() => setIsSimulatorBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Icon name="close" width={14} />
                </button>
              </div>
            </div>
          )}

          {/* Payoff Celebration Banner */}
          {isPaidOff && (
            <div className="loan-account-payoff-celebration-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8 }}>
              <div className="banner-text">
                <div className="banner-heading" style={{ fontWeight: 700, fontSize: 15, color: '#065f46' }}>Loan Paid Off!</div>
                <div className="banner-subheading" style={{ fontSize: 12, color: '#047857' }}>
                  You paid off {formatMilliunits(details.originalBalanceMillis)} in principal.
                </div>
              </div>
            </div>
          )}

          {/* Progress & Paydown Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 18, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600 }}>Loan Progress</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Paid So Far</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{formatMilliunits(comparison.principalPaidSoFarMillis)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Remaining Balance</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{formatMilliunits(details.currentBalanceMillis)}</div>
                </div>
              </div>
              <div style={{ height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${comparison.principalPaidPct}%`, height: '100%', background: '#16a34a' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                <span>{comparison.principalPaidPct}% paid off</span>
                <span>Est. Payoff: <strong>{comparison.baselinePlan.payoffDateLabel}</strong> ({comparison.baselinePlan.payoffMonthCount} mo)</span>
              </div>
            </div>

            {/* Paired Category Card or Pair Banner */}
            {details.pairedCategoryId ? (
              <div className="card loan-paired-category-card" style={{ padding: 18, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsPairedCardCollapsed((c) => !c)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsPairedCardCollapsed((c) => !c); } }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPairedCardCollapsed ? 0 : 12, cursor: 'pointer' }}
                >
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Paired Budget Category</h2>
                  <button type="button" aria-label={isPairedCardCollapsed ? 'Expand Paired Budget Category' : 'Collapse Paired Budget Category'} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Icon name={isPairedCardCollapsed ? 'chevron_right' : 'chevron_down'} width={12} />
                  </button>
                </div>
                {!isPairedCardCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Category</span>
                      <button type="button" className="button-link navigate-to-paired-category-button" onClick={onNavigateToBudget} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>
                        {details.pairedGroupName}: {details.pairedCategoryName}
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Available to Spend</span>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatMilliunits(details.pairedAvailableMillis)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Monthly Target</span>
                      <span style={{ fontWeight: 600 }}>{formatMilliunits(details.pairedTargetAmountMillis)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : !isPairBannerDismissed ? (
              <div className="loan-account-pair-category-banner card" style={{ padding: 18, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="banner-heading" style={{ fontWeight: 600, fontSize: 14 }}>Pair with a Budget Category</div>
                    <button className="close-banner-button" type="button" onClick={() => setIsPairBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Icon name="close" width={12} />
                    </button>
                  </div>
                  <div className="banner-subheading" style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Link this loan to a budget category to track your monthly payoff target automatically.
                  </div>
                </div>
                {isPairingOpen ? (
                  <div style={{ marginTop: 10, maxHeight: 140, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 6 }}>
                    {categoryGroups.map((grp) => (
                      <div key={grp.entityId} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '2px 6px' }}>{grp.name}</div>
                        {grp.categories.map((cat) => (
                          <button
                            key={cat.entityId}
                            type="button"
                            onClick={() => handlePairCategory(cat.entityId, cat.name, grp.name)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Button variant="primary" className="loan-account-pair-category-button" onClick={() => setIsPairingOpen(true)} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                    Pair Category
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          {/* Paydown Chart */}
          <div className="card loan-paydown-chart" style={{ padding: 18, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Projected Paydown Schedule</h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Est. Total Interest Remaining: <strong>{formatMilliunits(comparison.baselinePlan.totalInterestMillis)}</strong>
              </span>
            </div>
            <div ref={mainChartRef} className="loan-paydown-chart-body" />
          </div>

          {/* Amortization Activity Preview */}
          <div className="card" style={{ padding: 18, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600 }}>Upcoming Monthly Principal &amp; Interest</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', fontSize: 12, fontWeight: 700, color: '#64748b', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
              <span>Month</span>
              <span style={{ textAlign: 'right' }}>Payment</span>
              <span style={{ textAlign: 'right' }}>Principal</span>
              <span style={{ textAlign: 'right' }}>Interest</span>
              <span style={{ textAlign: 'right' }}>Ending Balance</span>
            </div>
            {comparison.baselinePlan.schedule.slice(0, 6).map((pt) => (
              <div key={pt.monthKey} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', fontSize: 13, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>{pt.monthLabel}</span>
                <span style={{ textAlign: 'right' }}>{formatMilliunits(pt.paymentMillis)}</span>
                <span style={{ textAlign: 'right', color: '#16a34a' }}>{formatMilliunits(pt.principalMillis)}</span>
                <span style={{ textAlign: 'right', color: '#dc2626' }}>{formatMilliunits(pt.interestMillis)}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatMilliunits(pt.endingBalanceMillis)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Payoff Simulator Modal */}
      {isSimulatorOpen && (
        <Modal className="modal-fresh self-centered loan-account-payoff-simulator loan-modal" onClose={() => setIsSimulatorOpen(false)}>
          <Modal.Header close={() => setIsSimulatorOpen(false)}>
            Loan Payoff Simulator — {details.accountName}
          </Modal.Header>
          <Modal.Body>
            <div className="paydown-analysis" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, padding: 16 }}>
              <div className="payoff-simulator-inputs" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="paydown-analysis-min-payment-section">
                  <div className="paydown-analysis-min-payment-amount" style={{ fontSize: 18, fontWeight: 700 }}>
                    {formatMilliunits(details.minimumPaymentMillis)}
                  </div>
                  <div className="paydown-analysis-min-payment-note" style={{ fontSize: 12, color: '#64748b' }}>
                    Minimum Monthly Payment
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Monthly Payment ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={simMonthlyInput}
                    onChange={(e) => {
                      setSimTargetMonths('');
                      setSimMonthlyInput(e.target.value);
                    }}
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Target Payoff (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    placeholder={String(comparison.simulatedPlan.payoffMonthCount || '')}
                    value={simTargetMonths}
                    onChange={(e) => handleTargetMonthsChange(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    One-Time Extra Payment ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={simExtraInput}
                    onChange={(e) => setSimExtraInput(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>

                <button type="button" className="button-link payoff-simulator-inputs-reset" onClick={handleResetSimulator} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: 12 }}>
                  Reset All Changes
                </button>
              </div>

              <div className="paydown-analysis-results" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div ref={simChartRef} className="loan-paydown-chart-body" />

                <div className="paydown-comparison" style={{ padding: 12, borderRadius: 8, background: comparison.interestSavedMillis >= 0 ? '#ecfdf5' : '#fef2f2', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: comparison.interestSavedMillis >= 0 ? '#16a34a' : '#dc2626' }}>
                      {formatMilliunits(Math.abs(comparison.interestSavedMillis))}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {comparison.interestSavedMillis >= 0 ? 'Interest Saved' : 'Extra Interest'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: comparison.monthsSaved >= 0 ? '#16a34a' : '#dc2626' }}>
                      {Math.abs(comparison.monthsSaved)} mo
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {comparison.monthsSaved >= 0 ? 'Time Saved' : 'Longer'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {comparison.simulatedPlan.payoffDateLabel}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>New Payoff Date</div>
                  </div>
                </div>

                <div className="paydown-analysis-results-summary" style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Remaining to Pay</span>
                    <span>{comparison.simulatedPlan.progress === 'positive' ? formatMilliunits(comparison.simulatedPlan.totalPaymentMillis) : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Principal</span>
                    <span>{formatMilliunits(details.currentBalanceMillis)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Interest</span>
                    <span>{comparison.simulatedPlan.progress === 'positive' ? formatMilliunits(comparison.simulatedPlan.totalInterestMillis) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setIsSimulatorOpen(false)}>
              Done
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default LoanAccountWorkspace;
