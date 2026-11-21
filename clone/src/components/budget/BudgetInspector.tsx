import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { Switch } from '../core/Switch';
import { ProgressDonut } from '../core/ProgressDonut';
import { IconCircleProgress } from '../core/IconCircleProgress';
import { MasterCategoryGroup, SubCategoryItem } from './budgetData';
import { calculateCategoryTargetStatus, formatAmountNumber, formatCurrency, CategoryTarget } from './categoryTargetStatus';
import { TargetConfigurationForm } from './TargetConfigurationForm';
import {
  computeCreditCardDetails,
  computeQuickBudgetOptions,
  QuickBudgetMethod,
  QuickBudgetOption,
} from '../../services/slikBudgetEngine';

export interface FutureMonthItem {
  monthKey: string;
  monthDate: Date;
  monthLabel: string;
  assigned: number;
  readyToAssign: number;
  proportionOfFunding?: number | null;
}

export interface BudgetInspectorProps {
  groups: MasterCategoryGroup[];
  selectedCategoryIds: string[];
  currentMonthName: string;
  readyToAssignMilliunits?: number;
  futureMonths?: FutureMonthItem[];
  isCurrentCalendarMonth?: boolean;
  onNavigateToMonth?: (date: Date) => void;
  onCoverOverspending?: () => void;
  onAutoAssign?: () => void;
  onClearSelection?: () => void;
  onAssignToCategory?: (catId: string, amountMilliunits: number) => void;
  onOpenMoveMoneyModal?: (catId: string, neededMilliunits: number) => void;
  onEditCategory?: (category: SubCategoryItem, triggerRect: DOMRect | null) => void;
  onUpdateNote?: (catId: string, note: string) => void;
  onSaveTarget?: (catId: string, target: CategoryTarget) => void;
  onDeleteTarget?: (catId: string) => void;
  onToggleSnoozeTarget?: (catId: string) => void;
  quickBudgetOptions?: QuickBudgetOption[];
  onPerformQuickBudget?: (method: QuickBudgetMethod) => void;
  creditCardAccountBalance?: number;
}

export function BudgetInspector({
  groups,
  selectedCategoryIds,
  currentMonthName,
  readyToAssignMilliunits = 0,
  futureMonths = [],
  isCurrentCalendarMonth = true,
  onNavigateToMonth,
  onCoverOverspending,
  onAutoAssign,
  onClearSelection,
  onAssignToCategory,
  onOpenMoveMoneyModal,
  onEditCategory,
  onUpdateNote,
  onSaveTarget,
  onDeleteTarget,
  onToggleSnoozeTarget,
  quickBudgetOptions,
  onPerformQuickBudget,
  creditCardAccountBalance = -27480,
}: BudgetInspectorProps) {
  // Collapsible cards state
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [availableBalanceExpanded, setAvailableBalanceExpanded] = useState(true);
  const [ccAvailableForPaymentExpanded, setCcAvailableForPaymentExpanded] = useState(true);
  const [ccCurrentBalanceExpanded, setCcCurrentBalanceExpanded] = useState(false);
  const [autoAssignExpanded, setAutoAssignExpanded] = useState(false);
  const [targetsExpanded, setTargetsExpanded] = useState(true);
  const [isEditingExpectedIncome, setIsEditingExpectedIncome] = useState(false);
  const [expectedIncomeInput, setExpectedIncomeInput] = useState('');
  const [expectedIncomeMillis, setExpectedIncomeMillis] = useState<number | null>(null);
  const [futureMonthsExpanded, setFutureMonthsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [forYouExpanded, setForYouExpanded] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  // All subcategories flat list
  const allSubCategories = groups.flatMap((g) => g.categories);
  const selectedCategories = allSubCategories.filter((c) => selectedCategoryIds.includes(c.entityId));
  const isNoCategoriesSelected = selectedCategories.length === 0;
  const isSingleCategory = selectedCategories.length === 1;
  const isMultipleCategories = selectedCategories.length > 1;
  const singleCategory: SubCategoryItem | undefined = isSingleCategory ? selectedCategories[0] : undefined;

  // Active categories for totals calculation:
  // If multiple categories are selected, monthlyTotals calculates over selected categories (matching Ember bH.monthlyTotals)
  // If no category is selected, calculates over all categories
  const targetTotalsCategories = isMultipleCategories ? selectedCategories : allSubCategories;
  const totalAssigned = targetTotalsCategories.reduce((s, c) => s + (c.assigned ?? 0), 0);
  const totalActivity = targetTotalsCategories.reduce((s, c) => s + (c.activity ?? 0), 0);
  const totalAvailable = targetTotalsCategories.reduce((s, c) => s + (c.available ?? 0), 0);

  // Single category target info
  const targetStatus = singleCategory
    ? calculateCategoryTargetStatus(
        singleCategory.assigned ?? 0,
        singleCategory.activity ?? 0,
        singleCategory.available ?? 0,
        singleCategory.target,
        singleCategory.isDebtPayment
      )
    : null;

  const targetAmount = singleCategory?.target?.targetAmount ?? 0;
  const singleAssigned = singleCategory?.assigned ?? 0;
  const singleActivity = singleCategory?.activity ?? 0;
  const singleAvailable = singleCategory?.available ?? 0;
  const underfundedAmount = Math.max(0, targetAmount - singleAssigned);
  const canQuickAssign = targetStatus?.hasTarget && underfundedAmount > 0 && readyToAssignMilliunits > 0;

  const inspectorCategories = isSingleCategory && singleCategory
    ? [singleCategory]
    : isMultipleCategories
      ? selectedCategories
      : allSubCategories;

  const effectiveQuickBudgetOptions =
    quickBudgetOptions ??
    computeQuickBudgetOptions({
      categories: inspectorCategories,
      leftToBudget: readyToAssignMilliunits,
      hasExplicitSelection: selectedCategories.length > 0,
    });

  const getQuickBudgetOpt = (type: QuickBudgetMethod) =>
    effectiveQuickBudgetOptions.find((o) => o.type === type);

  const ccDetails =
    isSingleCategory && singleCategory?.isDebtPayment
      ? computeCreditCardDetails(singleCategory, groups, creditCardAccountBalance)
      : null;

  const totalMonthlyTargets = allSubCategories.reduce(
    (s, c) => s + (c.isDebtPayment ? 0 : (c.target?.targetAmount ?? 0)),
    0
  );

  const handleAssignClick = () => {
    if (!singleCategory) return;
    if (underfundedAmount <= readyToAssignMilliunits) {
      onAssignToCategory?.(singleCategory.entityId, underfundedAmount);
    } else {
      onOpenMoveMoneyModal?.(singleCategory.entityId, underfundedAmount);
    }
  };

  return (
    <aside className="budget-inspector">
      <div className="budget-inspector-resizer" />
      <div className="budget-inspector-content">
        <div className="budget-breakdown">
          {/* ============================================================ */}
          {/* 1. TOP SECTION: HEADER OR MULTIPLE SELECTION BANNER          */}
          {/* ============================================================ */}
          {isSingleCategory && singleCategory ? (
            /* Single Category Header (Ember class budget-inspector-category-header) */
            <div className="budget-inspector-category-header">
              <div className="budget-inspector-category">
                <div className="inspector-category-name user-data">
                  <div className="user-entered-text">
                    <h1>{singleCategory.name}</h1>
                  </div>
                </div>
                <button
                  className="inspector-category-edit"
                  aria-label={`Edit category: ${singleCategory.name}`}
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onEditCategory?.(singleCategory, rect);
                  }}
                >
                  <Icon name="pencil" width={16} height={16} className="fill-secondary" />
                </button>
              </div>
            </div>
          ) : isMultipleCategories ? (
            /* Multiple Categories Selected Banner (Ember class budget-breakdown-multiple) */
            <div className="budget-breakdown-multiple">
              <h2>{selectedCategories.length} Categories Selected</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--labelSecondary)' }}>
                  {selectedCategories.map((c) => c.name).join(', ')}
                </div>
                {onClearSelection && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="button-link"
                    style={{ fontSize: '12px', color: 'var(--labelAction)', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}
                  >
                    Deselect All
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* ============================================================ */}
          {/* 2. SUMMARY CARD: AVAILABLE BALANCE OR MONTH'S SUMMARY        */}
          {/* ============================================================ */}
          {isSingleCategory && singleCategory ? (
            /* A. Available Balance Card for Single Category (Ember budget-breakdown-available-balance) */
            <section className="card budget-breakdown-available-balance">
              <button
                className="card-roll-up"
                aria-expanded={availableBalanceExpanded}
                type="button"
                onClick={() => setAvailableBalanceExpanded(!availableBalanceExpanded)}
              >
                <h2>
                  Available Balance
                  <Icon
                    className="card-chevron"
                    name={availableBalanceExpanded ? 'chevron_down' : 'chevron_right'}
                    width={12}
                    height={12}
                  />
                  <span
                    className={`ynab-new-budget-available-number user-data ${
                      singleAvailable < 0 ? 'negative' : singleAvailable > 0 ? 'positive' : 'zero'
                    }`}
                  >
                    <bdi>{singleAvailable < 0 ? '-' : ''}$</bdi>
                    {formatAmountNumber(singleAvailable)}
                  </span>
                </h2>
              </button>

              {availableBalanceExpanded && (
                <div className="card-body">
                  <div className="ynab-breakdown">
                    {/* Cash Left Over From Previous Month */}
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Cash Left Over From Last Month</div>
                      <div className="user-data">
                        <span className="user-data currency tabular-nums zero">
                          <bdi>$</bdi>0.00
                        </span>
                      </div>
                    </div>

                    {/* Assigned This Month */}
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Assigned This Month</div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${singleAssigned === 0 ? 'zero' : ''}`}>
                          <bdi>{singleAssigned > 0 ? '+' : singleAssigned < 0 ? '-' : ''}$</bdi>
                          {formatAmountNumber(singleAssigned)}
                        </span>
                      </div>
                    </div>

                    {/* Activity / Spending This Month */}
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Activity This Month</div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${singleActivity === 0 ? 'zero' : ''}`}>
                          <bdi>{singleActivity < 0 ? '-' : ''}$</bdi>
                          {formatAmountNumber(singleActivity)}
                        </span>
                      </div>
                    </div>

                    {/* Total Available */}
                    <div tabIndex={0} className="ynab-breakdown-row ynab-breakdown-available" style={{ borderTop: '1px solid var(--separatorSubdued)', paddingTop: '4px', marginTop: '4px' }}>
                      <div>
                        <span className="ynab-breakdown-available-heading" style={{ fontWeight: 600 }}>Available</span>
                      </div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${singleAvailable === 0 ? 'zero' : singleAvailable > 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                          <bdi>{singleAvailable < 0 ? '-' : ''}$</bdi>
                          {(Math.abs(singleAvailable) / 1000).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            /* B. Month's Summary Card (When no category or multiple categories are selected) */
            <section className="card">
              <button
                className="card-roll-up"
                aria-expanded={summaryExpanded}
                type="button"
                onClick={() => setSummaryExpanded(!summaryExpanded)}
              >
                <h2>
                  {isMultipleCategories ? `${selectedCategories.length} Categories' Summary` : `${currentMonthName}'s Summary`}
                  <Icon
                    className="card-chevron"
                    name={summaryExpanded ? 'chevron_down' : 'chevron_right'}
                    width={12}
                    height={12}
                  />
                </h2>
              </button>
              {summaryExpanded && (
                <div className="card-body">
                  <div className="ynab-breakdown">
                    <div tabIndex={0} className="ynab-breakdown-leftover-prev-month">
                      <div>Left Over from Last Month</div>
                      <div className="user-data">
                        <span className="user-data currency tabular-nums zero">
                          <bdi>$</bdi>0.00
                        </span>
                      </div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-assigned-in-month">
                      <div>Assigned in {currentMonthName}</div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${totalAssigned === 0 ? 'zero' : ''}`}>
                          <bdi>{totalAssigned < 0 ? '-' : ''}$</bdi>
                          {formatAmountNumber(totalAssigned)}
                        </span>
                      </div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-activity">
                      <div>Activity</div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${totalActivity === 0 ? 'zero' : ''}`}>
                          <bdi>{totalActivity < 0 ? '-' : ''}$</bdi>
                          {formatAmountNumber(totalActivity)}
                        </span>
                      </div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-available">
                      <div>
                        <span className="ynab-breakdown-available-heading">Available</span>
                      </div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${totalAvailable === 0 ? 'zero' : ''}`}>
                          <bdi>{totalAvailable < 0 ? '-' : ''}$</bdi>
                          {formatAmountNumber(totalAvailable)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cost to Be Me section (only when 0 categories selected) */}
                  {isNoCategoriesSelected && (
                    <div className="cost-to-be-me-summary">
                      <div>
                        <div className="cost-to-be-me-separator" />
                        <div tabIndex={0} className="title">Cost to Be Me</div>
                        <div tabIndex={0} className="label">
                          <span className="description">{`${currentMonthName}’s Targets`}</span>
                          <span className="amount">{formatCurrency(totalMonthlyTargets)}</span>
                        </div>
                      </div>
                      <div>
                        {isEditingExpectedIncome ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const val = parseFloat(expectedIncomeInput.replace(/[^0-9.]/g, ''));
                              setExpectedIncomeMillis(isNaN(val) ? null : Math.round(val * 1000));
                              setIsEditingExpectedIncome(false);
                            }}
                            style={{ display: 'flex', gap: '6px', marginTop: '6px' }}
                          >
                            <input
                              type="text"
                              autoFocus
                              placeholder="$0.00"
                              value={expectedIncomeInput}
                              onChange={(e) => setExpectedIncomeInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Escape') setIsEditingExpectedIncome(false); }}
                              style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--inputBorder, #cbd5e1)', fontSize: '13px' }}
                            />
                            <button className="ynab-button primary" type="submit" style={{ padding: '4px 10px', fontSize: '12px' }}>
                              Save
                            </button>
                          </form>
                        ) : (
                          <>
                            {expectedIncomeMillis !== null && (
                              <div className="label" style={{ marginBottom: '4px' }}>
                                <span className="description">Expected Income</span>
                                <span className="amount">{formatCurrency(expectedIncomeMillis)}</span>
                              </div>
                            )}
                            <button
                              className="ynab-button secondary income-button"
                              type="button"
                              onClick={() => {
                                setExpectedIncomeInput(expectedIncomeMillis !== null ? (expectedIncomeMillis / 1000).toFixed(2) : '');
                                setIsEditingExpectedIncome(true);
                              }}
                            >
                              {expectedIncomeMillis !== null ? 'Edit expected income' : 'Enter your expected income'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* 3. TARGET INSPECTOR CARD (Authentic Ember ynab-new-inspector-goals) */}
          {/* ============================================================ */}
          {isSingleCategory && singleCategory && !singleCategory.isDebtPayment && (
            <section className="card target-inspector-card">
              <div className="ynab-new-inspector-goals">
                {isEditingTarget ? (
                  <>
                    <h2>
                      {targetStatus?.hasTarget && (
                        singleCategory.isGoalSnoozed ? (
                          <Icon className="header-snooze-icon" width={12} height={12} name="snooze" />
                        ) : (
                          <IconCircleProgress width={16} height={16} percentageComplete={targetStatus.overallPercent * 100} />
                        )
                      )}
                      Target
                    </h2>
                    <TargetConfigurationForm
                      initialTarget={singleCategory.target}
                      onSave={(newTarget) => {
                        onSaveTarget?.(singleCategory.entityId, newTarget);
                        setIsEditingTarget(false);
                      }}
                      onCancel={() => setIsEditingTarget(false)}
                      onDelete={() => {
                        onDeleteTarget?.(singleCategory.entityId);
                        setIsEditingTarget(false);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <button
                      className="card-roll-up"
                      aria-expanded={targetsExpanded}
                      type="button"
                      onClick={() => setTargetsExpanded(!targetsExpanded)}
                    >
                      <h2>
                        {targetStatus?.hasTarget && (
                        singleCategory.isGoalSnoozed ? (
                          <Icon className="header-snooze-icon" width={12} height={12} name="snooze" />
                        ) : (
                          <IconCircleProgress width={16} height={16} percentageComplete={targetStatus.overallPercent * 100} />
                        )
                      )}
                        Target
                        <Icon
                          className="card-chevron"
                          name={targetsExpanded ? 'chevron_down' : 'chevron_right'}
                          width={12}
                          height={12}
                        />
                      </h2>
                    </button>

                    {targetsExpanded && (
                      <div className="card-body">
                        {!targetStatus?.hasTarget ? (
                          /* 3B. EMPTY STATE */
                          <div className="view-target-empty-state">
                            <strong>How much do you need for {singleCategory.name}?</strong>
                            <p>
                              When you create a target, we’ll let you know how much money to set aside to stay on track over time.
                            </p>
                            <button
                              type="button"
                              className="button button-secondary secondary budget-inspector-goals-create"
                              onClick={() => setIsEditingTarget(true)}
                            >
                              Create Target
                            </button>
                          </div>
                        ) : (
                          /* 3C. VIEW STATE */
                          <div className="target-inspector">
                            <div className="target-inspector-header">
                              <div className="header-bottom">
                                <h2 className="target-behavior">
                                  {singleCategory.target?.targetType === 'NEED'
                                    ? `Refill Up to ${formatCurrency(targetAmount)}`
                                    : singleCategory.target?.targetType === 'TB'
                                    ? `Have a Balance of ${formatCurrency(targetAmount)}`
                                    : singleCategory.target?.targetType === 'TBD'
                                    ? `Have a Balance of ${formatCurrency(targetAmount)}`
                                    : `Set Aside Another ${formatCurrency(targetAmount)}`}
                                </h2>
                                <div className="target-by-date">
                                  {singleCategory.target?.dayOfMonth
                                    ? (() => {
                                        const d = singleCategory.target!.dayOfMonth!;
                                        const mod100 = d % 100;
                                        const suffix =
                                          mod100 >= 11 && mod100 <= 13
                                            ? 'th'
                                            : d % 10 === 1
                                            ? 'st'
                                            : d % 10 === 2
                                            ? 'nd'
                                            : d % 10 === 3
                                            ? 'rd'
                                            : 'th';
                                        return `By the ${d}${suffix} of each month`;
                                      })()
                                    : singleCategory.target?.cadence === 'weekly'
                                    ? 'Each week'
                                    : 'By the end of each month'}
                                </div>
                              </div>
                            </div>

                            <hr />

                            {/* Donut Chart Progress */}
                            <ProgressDonut
                              value={targetStatus.overallPercent * 100}
                              className={targetStatus.isFullyFunded ? 'positive' : targetStatus.overallPercent > 0 ? 'warning' : 'passive'}
                            />

                            {/* Impact Message Box */}
                            {singleCategory.isGoalSnoozed ? (
                              <div className="impact-message snoozed">
                                <div className="impact-message-content">
                                  This target is <span className="highlighted">snoozed</span> for this month.
                                </div>
                              </div>
                            ) : underfundedAmount > 0 ? (
                              <div className="impact-message warning">
                                <div className="impact-message-content">
                                  Assign <span className="highlighted">{formatCurrency(underfundedAmount)}</span> more to fund this target.
                                </div>
                                {canQuickAssign && (
                                  <button
                                    className="button button-primary"
                                    type="button"
                                    onClick={handleAssignClick}
                                  >
                                    Assign
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="impact-message positive">
                                <div className="impact-message-content">
                                  This target is <span className="highlighted">funded</span> for this month!
                                </div>
                              </div>
                            )}

                            {/* Target Breakdown list */}
                            <div className="target-breakdown">
                              <div className="target-breakdown-item">
                                <div className="target-breakdown-item-label">Needed This Month:</div>
                                <div className="target-breakdown-item-value">{formatCurrency(targetAmount)}</div>
                              </div>
                              <div className="target-breakdown-item">
                                <div className="target-breakdown-item-label">Funded:</div>
                                <div className="target-breakdown-item-value">{formatCurrency(singleAssigned)}</div>
                              </div>
                              <hr />
                              <div className="target-breakdown-item">
                                <div className="target-breakdown-item-label">To Go:</div>
                                <div className="target-breakdown-item-value">{formatCurrency(underfundedAmount)}</div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="button button-secondary secondary"
                              onClick={() => setIsEditingTarget(true)}
                            >
                              Edit Target
                            </button>

                            {/* Snooze Switch */}
                            <div className="goal-snooze">
                              <Switch
                                isOn={Boolean(singleCategory.isGoalSnoozed)}
                                onClick={() => onToggleSnoozeTarget?.(singleCategory.entityId)}
                              >
                                Snooze for this month
                              </Switch>
                              <span className="info-icon-tooltip">
                                <a href="#" onClick={(e) => e.preventDefault()}>
                                  <Icon name="question_mark_circle" width={16} height={16} />
                                </a>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* 3B. CREDIT CARD NEXT PAYMENT CARD                            */}
          {/* ============================================================ */}
          {ccDetails && singleCategory && (
            <section className="card">
              <div className="budget-inspector-next-payment">
                <h3>Payment</h3>
                <div className={`container payment-state-${ccDetails.paymentState}`}>
                  <div className="container-body">
                    {ccDetails.paymentState === 'CreditOverspending' && (
                      <div className="message">
                        Cover {formatCurrency(ccDetails.overspentAmount)} in overspent categories to keep your payment on track.
                      </div>
                    )}
                    {ccDetails.paymentState === 'Underfunded' && (
                      <div className="message">
                        Assign {formatCurrency(ccDetails.underfundedAmount)} more to cover your {singleCategory.name} balance.
                      </div>
                    )}
                    {ccDetails.paymentState === 'FullyOrOverFunded' && (
                      <div className="message">
                        <p><b>You have enough set aside to pay your balance in full.</b></p>
                      </div>
                    )}
                    {ccDetails.paymentState === 'FullyPaid' && (
                      <div className="message">
                        <p><b>{singleCategory.name} is paid off!</b></p>
                      </div>
                    )}
                    {ccDetails.paymentState === 'UnfundedPaymentMade' && (
                      <div className="message">
                        You paid more toward {singleCategory.name} than you had available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3C. CREDIT CARD AVAILABLE FOR PAYMENT BREAKDOWN (Ember card) */}
          {isSingleCategory && singleCategory?.isDebtPayment && (
            <section className={`card budget-inspector-credit-card-available-for-payment ${ccAvailableForPaymentExpanded ? '' : 'is-collapsed'}`}>
              <button
                className="card-roll-up"
                aria-expanded={ccAvailableForPaymentExpanded}
                type="button"
                onClick={() => setCcAvailableForPaymentExpanded(!ccAvailableForPaymentExpanded)}
              >
                <h2>
                  Available for Payment
                  <Icon
                    className="card-chevron"
                    name={ccAvailableForPaymentExpanded ? 'chevron_down' : 'chevron_right'}
                    width={12}
                    height={12}
                  />
                  <span
                    className={`ynab-new-budget-available-number user-data ${
                      singleAvailable < 0 ? 'cautious credit' : singleAvailable > 0 ? 'positive' : 'zero'
                    }`}
                  >
                    <bdi>{singleAvailable < 0 ? '-' : ''}$</bdi>
                    {formatAmountNumber(singleAvailable)}
                  </span>
                </h2>
              </button>
              {ccAvailableForPaymentExpanded && (
                <div className="card-body">
                  <div className="ynab-breakdown">
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Cash Left Over From Last Month</div>
                      <div className="user-data">$0.00</div>
                    </div>
                    <div className="this-month">Activity This Month</div>
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Assigned</div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${singleAssigned === 0 ? 'zero' : ''}`}>
                          <bdi>{singleAssigned > 0 ? '+' : singleAssigned < 0 ? '-' : ''}$</bdi>
                          {formatAmountNumber(singleAssigned)}
                        </span>
                      </div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Funded Spending This Month</div>
                      <div className="user-data">
                        <span className="user-data currency tabular-nums">
                          ${formatAmountNumber(Math.max(0, singleActivity))}
                        </span>
                      </div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Payments Made This Month</div>
                      <div className="user-data">
                        <span className="user-data currency tabular-nums">
                          ${formatAmountNumber(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 3D. CREDIT CARD CURRENT BALANCE CARD (Ember card) */}
          {isSingleCategory && singleCategory?.isDebtPayment && (
            <section className={`card budget-inspector-credit-card-current-balance ${ccCurrentBalanceExpanded ? '' : 'is-collapsed'}`}>
              <button
                className="card-roll-up"
                aria-expanded={ccCurrentBalanceExpanded}
                type="button"
                onClick={() => setCcCurrentBalanceExpanded(!ccCurrentBalanceExpanded)}
              >
                <h2>
                  Current Balance
                  <Icon
                    className="card-chevron"
                    name={ccCurrentBalanceExpanded ? 'chevron_down' : 'chevron_right'}
                    width={12}
                    height={12}
                  />
                  <span className="user-data currency tabular-nums">
                    <bdi>{creditCardAccountBalance < 0 ? '-' : ''}$</bdi>
                    {formatAmountNumber(creditCardAccountBalance)}
                  </span>
                </h2>
              </button>
              {ccCurrentBalanceExpanded && (
                <div className="card-body">
                  <div className="ynab-breakdown">
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Prior Balance</div>
                      <div className="user-data">
                        ${formatAmountNumber(creditCardAccountBalance)}
                      </div>
                    </div>
                    <div className="this-month">Activity This Month</div>
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Outflows This Month</div>
                      <div className="user-data">$0.00</div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Inflows This Month</div>
                      <div className="user-data">$0.00</div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* 4. AUTO-ASSIGN CARD                                          */}
          {/* ============================================================ */}
          <section className={`card budget-breakdown-auto-assign ${autoAssignExpanded ? '' : 'is-collapsed'}`}>
            <button
              className="card-roll-up"
              aria-expanded={autoAssignExpanded}
              type="button"
              onClick={() => setAutoAssignExpanded(!autoAssignExpanded)}
            >
              <h2>
                <Icon name="lightning" width={16} height={16} />
                Auto-Assign
                <Icon
                  className="card-chevron"
                  name={autoAssignExpanded ? 'chevron_down' : 'chevron_right'}
                  width={12}
                  height={12}
                />
              </h2>
            </button>
            {autoAssignExpanded && (
              <div className="card-body">
                <div className="inspector-quick-budget">
                  <div className="option-groups">
                    <div>
                      {(() => {
                        const opt = getQuickBudgetOpt('underfunded');
                        const val = opt?.displayValue ?? 0;
                        return (
                          <button
                            className="budget-inspector-button js-focus-on-start underfunded"
                            title={opt?.title}
                            type="button"
                            onClick={() => {
                              if (onPerformQuickBudget) {
                                onPerformQuickBudget('underfunded');
                              } else if (isSingleCategory && underfundedAmount > 0) {
                                handleAssignClick();
                              } else {
                                onAutoAssign?.();
                              }
                            }}
                          >
                            <div>Underfunded</div>
                            <div>
                              <strong className="user-data">
                                <span className={`user-data currency tabular-nums ${val === 0 ? 'zero' : ''}`}>
                                  <bdi>$</bdi>
                                  {formatAmountNumber(val)}
                                </span>
                              </strong>
                            </div>
                          </button>
                        );
                      })()}
                    </div>
                    <div>
                      {(['assignedLastMonth', 'spentLastMonth', 'averageAssigned', 'averageSpent'] as QuickBudgetMethod[])
                        .filter((m) => !isSingleCategory || (m !== 'averageAssigned' && m !== 'averageSpent'))
                        .map((method) => {
                          const opt = getQuickBudgetOpt(method);
                          const val = opt?.displayValue ?? 0;
                          const cls = opt?.name.toLowerCase().replace(/\s+/g, '-') ?? method;
                          return (
                            <button
                              key={method}
                              className={`budget-inspector-button ${cls}`}
                              title={opt?.title}
                              type="button"
                              onClick={() => onPerformQuickBudget?.(method)}
                            >
                              <div>{opt?.name}</div>
                              <div>
                                <strong className="user-data" title={formatCurrency(val)}>
                                  <span className={`user-data currency tabular-nums ${val === 0 ? 'zero' : ''}`}>
                                    <bdi>$</bdi>
                                    {formatAmountNumber(val)}
                                  </span>
                                </strong>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                    <div>
                      {(['resetAvailable', 'resetAssigned'] as QuickBudgetMethod[]).map((method) => {
                        const opt = getQuickBudgetOpt(method);
                        const cls = opt?.name.toLowerCase().replace(/\s+/g, '-') ?? method;
                        return (
                          <button
                            key={method}
                            className={`budget-inspector-button ${cls}`}
                            title={opt?.title}
                            type="button"
                            onClick={() => onPerformQuickBudget?.(method)}
                          >
                            <div>{opt?.name}</div>
                            <div>
                              <strong className="user-data" title="$0.00">
                                <span className="user-data currency tabular-nums zero">
                                  <bdi>$</bdi>0.00
                                </span>
                              </strong>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* 5. FUTURE MONTHS TOTALS (Exact Ember budget-breakdown/future-months) */}
          {/* ============================================================ */}
          {isNoCategoriesSelected && isCurrentCalendarMonth && (() => {
            const allFutureBudgetedTotal = futureMonths.reduce((sum, m) => sum + (m.assigned ?? 0), 0);
            const negativeFutureMonth = futureMonths.find((m) => (m.readyToAssign ?? 0) < 0);
            const showNegativeFutureRTAWarning = (readyToAssignMilliunits >= 0) && !!negativeFutureMonth;
            const hasFutureMonthsWithData = futureMonths.length > 0;

            return (
              <section className="card budget-breakdown-future-totals future-assignments-update">
                <button
                  className="card-roll-up"
                  aria-expanded={futureMonthsExpanded}
                  type="button"
                  onClick={() => setFutureMonthsExpanded(!futureMonthsExpanded)}
                >
                  <h2>
                    {showNegativeFutureRTAWarning && (
                      <Icon name="exclamation_mark_triangle_fill" width={14} height={14} className="warning-icon" />
                    )}
                    <span>Assigned in Future Months</span>
                    <Icon
                      className="card-chevron"
                      name={futureMonthsExpanded ? 'chevron_down' : 'chevron_right'}
                      width={12}
                      height={12}
                    />
                    <span className={`user-data currency tabular-nums ${allFutureBudgetedTotal === 0 ? 'zero' : ''}`}>
                      {formatCurrency(allFutureBudgetedTotal)}
                    </span>
                  </h2>
                </button>
                {futureMonthsExpanded && (
                  <div className="card-body">
                    {/* Stealing From Future Warning banner */}
                    {showNegativeFutureRTAWarning && negativeFutureMonth && (
                      <div className="budget-breakdown-alert">
                        <div className="negative-future-warning">
                          Ready to Assign in {negativeFutureMonth.monthLabel} is {formatCurrency(negativeFutureMonth.readyToAssign)}
                        </div>
                        <div className="message" style={{ fontSize: '12px', color: 'var(--labelSecondary)', marginBottom: '8px' }}>
                          Cash overspending in {currentMonthName} reduced your Ready to Assign in {negativeFutureMonth.monthLabel}.
                        </div>
                        <div className="button-container" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => onCoverOverspending?.()}
                          >
                            Cover Overspending
                          </button>
                          <button
                            type="button"
                            className="button button-secondary secondary"
                            onClick={() => onNavigateToMonth?.(negativeFutureMonth.monthDate)}
                          >
                            Go to {negativeFutureMonth.monthLabel}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Future Months Buttons List (Exact Ember .future-month-button) */}
                    {hasFutureMonthsWithData ? (
                      <div className="ynab-breakdown">
                        {futureMonths.map((fm) => (
                          <button
                            key={fm.monthKey}
                            className="future-month-button"
                            type="button"
                            onClick={() => onNavigateToMonth?.(fm.monthDate)}
                          >
                            <div className="future-month-button-interior">
                              <div className="month-label">
                                {fm.proportionOfFunding != null && (
                                  <IconCircleProgress
                                    width={16}
                                    height={16}
                                    percentageComplete={Math.min(100, Math.round(fm.proportionOfFunding * 100))}
                                  />
                                )}
                                <div>{fm.monthLabel}</div>
                              </div>
                              <div className="user-data">
                                <span className={`user-data currency tabular-nums ${fm.assigned === 0 ? 'zero' : ''}`}>
                                  {formatCurrency(fm.assigned)}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="info-box">
                        <div className="info-box-content">
                          Tired of living paycheck to paycheck? Assign money to future months to get ahead!
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })()}
          {/* ============================================================ */}
          {/* 6. CATEGORY NOTES CARD (Exact Ember Card > InspectorNotes) */}
          {isSingleCategory && singleCategory && (
            <section className="card">
              <div className="inspector-notes">
                <h2>Notes</h2>
                <div className="inspector-category-note user-data">
                  <textarea
                    placeholder="Enter a note..."
                    value={singleCategory.note ?? ''}
                    onChange={(e) => onUpdateNote?.(singleCategory.entityId, e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}
          {/* ============================================================ */}
          {/* 7. FOR YOU FEED CARD (When no categories are selected)        */}
          {/* ============================================================ */}
          {isNoCategoriesSelected && (
            <section className={`card for-you-feed-card ${forYouExpanded ? '' : 'is-collapsed'}`}>
              <button
                className="card-roll-up"
                aria-expanded={forYouExpanded}
                type="button"
                onClick={() => setForYouExpanded(!forYouExpanded)}
              >
                <h2>
                  For You
                  <Icon
                    className="card-chevron"
                    name={forYouExpanded ? 'chevron_down' : 'chevron_right'}
                    width={12}
                    height={12}
                  />
                </h2>
              </button>
              {forYouExpanded && (
                <div className="card-body">
                  <div className="body-container" style={{ fontSize: '13px', color: 'var(--labelSecondary)', lineHeight: 1.45 }}>
                    <div>Give every dollar a job to stay on top of your monthly targets and upcoming bills.</div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}

export default BudgetInspector;
