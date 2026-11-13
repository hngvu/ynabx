import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { MasterCategoryGroup, SubCategoryItem } from './budgetData';
import { calculateCategoryTargetStatus, formatCurrency, CategoryTarget } from './categoryTargetStatus';
import { TargetConfigurationForm } from './TargetConfigurationForm';

export interface BudgetInspectorProps {
  groups: MasterCategoryGroup[];
  selectedCategoryIds: string[];
  currentMonthName: string;
  readyToAssignMilliunits?: number;
  onAutoAssign?: () => void;
  onClearSelection?: () => void;
  onAssignToCategory?: (catId: string, amountMilliunits: number) => void;
  onOpenMoveMoneyModal?: (catId: string, neededMilliunits: number) => void;
  onEditCategory?: (category: SubCategoryItem, triggerRect: DOMRect | null) => void;
  onUpdateNote?: (catId: string, note: string) => void;
  onSaveTarget?: (catId: string, target: CategoryTarget) => void;
  onDeleteTarget?: (catId: string) => void;
  onToggleSnoozeTarget?: (catId: string) => void;
}

export function BudgetInspector({
  groups,
  selectedCategoryIds,
  currentMonthName,
  readyToAssignMilliunits = 0,
  onAutoAssign,
  onClearSelection,
  onAssignToCategory,
  onOpenMoveMoneyModal,
  onEditCategory,
  onUpdateNote,
  onSaveTarget,
  onDeleteTarget,
  onToggleSnoozeTarget,
}: BudgetInspectorProps) {
  // Collapsible cards state
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [availableBalanceExpanded, setAvailableBalanceExpanded] = useState(true);
  const [autoAssignExpanded, setAutoAssignExpanded] = useState(true);
  const [targetsExpanded, setTargetsExpanded] = useState(true);
  const [futureMonthsExpanded, setFutureMonthsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
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
                    {(Math.abs(singleAvailable) / 1000).toFixed(2)}
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
                          <bdi>{singleAssigned > 0 ? '+' : ''}$</bdi>
                          {(singleAssigned / 1000).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Activity / Spending This Month */}
                    <div tabIndex={0} className="ynab-breakdown-row">
                      <div>Activity This Month</div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${singleActivity === 0 ? 'zero' : ''}`}>
                          <bdi>{singleActivity < 0 ? '-' : ''}$</bdi>
                          {(Math.abs(singleActivity) / 1000).toFixed(2)}
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
                          <bdi>$</bdi>
                          {(totalAssigned / 1000).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-activity">
                      <div>Activity</div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${totalActivity === 0 ? 'zero' : ''}`}>
                          <bdi>{totalActivity < 0 ? '-' : ''}$</bdi>
                          {(Math.abs(totalActivity) / 1000).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div tabIndex={0} className="ynab-breakdown-available">
                      <div>
                        <span className="ynab-breakdown-available-heading">Available</span>
                      </div>
                      <div className="user-data">
                        <span className={`user-data currency tabular-nums ${totalAvailable === 0 ? 'zero' : ''}`}>
                          <bdi>$</bdi>
                          {(totalAvailable / 1000).toFixed(2)}
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
                          <span className="description">{currentMonthName}’s Targets</span>
                          <span className="amount">$0.00</span>
                        </div>
                      </div>
                      <div>
                        <button className="ynab-button secondary income-button" type="button">
                          Enter your expected income
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* 3. TARGET INSPECTOR CARD                                     */}
          {/* ============================================================ */}
          {isSingleCategory && singleCategory && !singleCategory.isDebtPayment && (
            <section className="card target-inspector-card">
              <button
                className="card-roll-up"
                aria-expanded={targetsExpanded}
                type="button"
                onClick={() => setTargetsExpanded(!targetsExpanded)}
              >
                <h2>
                  {targetStatus?.hasTarget ? (
                    targetStatus.isFullyFunded ? (
                      <Icon name="check_circle_fill" width={16} height={16} className="fill-positive" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2.5" />
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeDasharray={`${targetStatus.overallPercent * 37.7} 37.7`}
                        />
                      </svg>
                    )
                  ) : (
                    <Icon name="target" width={16} height={16} />
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
                  {isEditingTarget ? (
                    /* 3A. EDIT / CREATE FORM */
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
                  ) : !targetStatus?.hasTarget ? (
                    /* 3B. EMPTY STATE */
                    <div className="view-target-empty-state" style={{ padding: '1rem', textAlign: 'center' }}>
                      <strong style={{ display: 'block', fontSize: '14px', marginBottom: '0.375rem', color: 'var(--labelPrimary)' }}>
                        How much do you need for {singleCategory.name}?
                      </strong>
                      <p style={{ fontSize: '12px', color: 'var(--labelSecondary)', margin: '0 0 1rem', lineHeight: 1.4 }}>
                        When you create a target, we’ll let you know how much money to set aside to stay on track over time.
                      </p>
                      <button
                        type="button"
                        className="button button-primary secondary"
                        style={{ padding: '0.4rem 1rem', fontSize: '13px' }}
                        onClick={() => setIsEditingTarget(true)}
                      >
                        Create Target
                      </button>
                    </div>
                  ) : (
                    /* 3C. VIEW STATE */
                    <div className="target-inspector" style={{ padding: '0 0.5rem 0.5rem' }}>
                      <div className="target-inspector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="target-behavior" style={{ fontWeight: 600, fontSize: '15px' }}>
                            {singleCategory.target?.targetType === 'NEED'
                              ? 'Needed for Spending'
                              : singleCategory.target?.targetType === 'TB'
                              ? 'Target Balance'
                              : singleCategory.target?.targetType === 'TBD'
                              ? 'Target Balance by Date'
                              : 'Set Aside Target'}
                          </div>
                          <div className="target-by-date" style={{ fontSize: '12px', color: 'var(--labelSecondary)' }}>
                            {singleCategory.target?.dayOfMonth
                              ? `By the ${singleCategory.target.dayOfMonth}th of each month`
                              : singleCategory.target?.cadence === 'weekly'
                              ? 'Each week'
                              : 'By the end of each month'}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="button button-link secondary"
                          style={{ fontSize: '12px', padding: '2px 6px', cursor: 'pointer' }}
                          onClick={() => setIsEditingTarget(true)}
                        >
                          Edit Target
                        </button>
                      </div>

                      <hr style={{ margin: '0.75rem 0', borderColor: 'var(--separatorSubdued)' }} />

                      {/* Snooze Switch */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '12px', color: 'var(--labelSecondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icon name="snooze" width={14} height={14} />
                          Snooze target for this month
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(singleCategory.isGoalSnoozed)}
                          onChange={() => onToggleSnoozeTarget?.(singleCategory.entityId)}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>

                      {/* Impact Message Box */}
                      {singleCategory.isGoalSnoozed ? (
                        <div className="impact-message snoozed" style={{ padding: '0.5rem', backgroundColor: 'var(--inputBackgroundSubdued, #f1f5f9)', borderRadius: '0.25rem', fontSize: '12px' }}>
                          This target is <span className="highlighted" style={{ fontWeight: 600 }}>snoozed</span> for this month.
                        </div>
                      ) : underfundedAmount > 0 ? (
                        <div className="impact-message warning">
                          <div className="impact-message-content">
                            Assign{' '}
                            <span className="highlighted">{formatCurrency(underfundedAmount)}</span>{' '}
                            more to fund this target.
                          </div>
                          {canQuickAssign && (
                            <button
                              className="button button-primary"
                              type="button"
                              style={{
                                backgroundColor: 'var(--calloutWarningSubtleBackgroundEmphasis, #eab308)',
                                color: '#000',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: '0.25rem',
                                padding: '0.375rem 1rem',
                                cursor: 'pointer',
                                marginTop: '0.25rem',
                              }}
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
                      <div className="target-breakdown" style={{ marginTop: '0.75rem' }}>
                        <div className="target-breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                          <div className="target-breakdown-item-label">Target:</div>
                          <div className="target-breakdown-item-value">{formatCurrency(targetAmount)}</div>
                        </div>
                        <div className="target-breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                          <div className="target-breakdown-item-label">Assigned:</div>
                          <div className="target-breakdown-item-value">{formatCurrency(singleAssigned)}</div>
                        </div>
                        <hr style={{ margin: '0.5rem 0', borderColor: 'var(--separatorSubdued)' }} />
                        <div className="target-breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontWeight: 600 }}>
                          <div className="target-breakdown-item-label">
                            {underfundedAmount > 0 ? 'Needed this month:' : 'Funded:'}
                          </div>
                          <div className="target-breakdown-item-value">
                            {underfundedAmount > 0 ? formatCurrency(underfundedAmount) : '$0.00'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                      <button
                        className="budget-inspector-button js-focus-on-start underfunded"
                        type="button"
                        onClick={() => {
                          if (isSingleCategory && underfundedAmount > 0) {
                            handleAssignClick();
                          } else {
                            onAutoAssign?.();
                          }
                        }}
                      >
                        <div>Underfunded</div>
                        <div>
                          <strong className="user-data">
                            <span
                              className={`user-data currency tabular-nums ${
                                (isSingleCategory ? underfundedAmount : 0) === 0 ? 'zero' : ''
                              }`}
                            >
                              <bdi>$</bdi>
                              {((isSingleCategory ? underfundedAmount : 0) / 1000).toFixed(2)}
                            </span>
                          </strong>
                        </div>
                      </button>
                    </div>
                    <div>
                      <button className="budget-inspector-button assigned-last month" type="button">
                        <div>Assigned Last Month</div>
                        <div>
                          <strong className="user-data" title="$0.00">
                            <span className="user-data currency tabular-nums zero">
                              <bdi>$</bdi>0.00
                            </span>
                          </strong>
                        </div>
                      </button>
                      <button className="budget-inspector-button spent-last month" type="button">
                        <div>Spent Last Month</div>
                        <div>
                          <strong className="user-data" title="$0.00">
                            <span className="user-data currency tabular-nums zero">
                              <bdi>$</bdi>0.00
                            </span>
                          </strong>
                        </div>
                      </button>
                      {!isSingleCategory && (
                        <>
                          <button className="budget-inspector-button average-assigned" title="Feeling average? Fund all of your categories with your historical average assigned." type="button">
                            <div>Average Assigned</div>
                            <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                          <button className="budget-inspector-button average-spent" title="Assign your historical average spent. Though you're above average in my book." type="button">
                            <div>Average Spent</div>
                            <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                        </>
                      )}
                    </div>
                    <div>
                      <button className="budget-inspector-button set-available amount to zero" title="Want to start from zero? Set the available amounts of all of your categories to $0.00, making the funds ready to assign. It's like a mini Fresh Start!" type="button">
                        <div>Reset Available Amounts</div>
                        <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                      </button>
                      <button className="budget-inspector-button reset-assigned amount" title="Reset all assigned amounts for this month, in case you want a do-over." type="button">
                        <div>Reset Assigned Amounts</div>
                        <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* 5. FUTURE MONTHS TOTALS (When no categories are selected)     */}
          {/* ============================================================ */}
          {isNoCategoriesSelected && (
            <section className="card budget-breakdown-future-totals future-assignments-update">
              <button
                className="card-roll-up"
                aria-expanded={futureMonthsExpanded}
                type="button"
                onClick={() => setFutureMonthsExpanded(!futureMonthsExpanded)}
              >
                <h2>
                  <span>Assigned in Future Months</span>
                  <Icon
                    className="card-chevron"
                    name={futureMonthsExpanded ? 'chevron_down' : 'chevron_right'}
                    width={12}
                    height={12}
                  />
                  <span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span>
                </h2>
              </button>
              {futureMonthsExpanded && (
                <div className="card-body">
                  <div className="ynab-breakdown">
                    <div tabIndex={0} className="ynab-breakdown-stealing-from-future">
                      <div>Stealing From Future</div>
                      <div className="user-data">
                        <span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          {/* ============================================================ */}
          {/* 6. CATEGORY NOTES CARD (When single category selected)        */}
          {/* ============================================================ */}
          {isSingleCategory && singleCategory && (
            <section className="card budget-inspector-category-notes">
              <button
                className="card-roll-up"
                aria-expanded={notesExpanded}
                type="button"
                onClick={() => setNotesExpanded(!notesExpanded)}
              >
                <h2>
                  <Icon name="notes" width={16} height={16} />
                  Notes
                  <Icon
                    className="card-chevron"
                    name={notesExpanded ? 'chevron_down' : 'chevron_right'}
                    width={12}
                    height={12}
                  />
                </h2>
              </button>
              {notesExpanded && (
                <div className="card-body" style={{ padding: '0.75rem' }}>
                  <div className="inspector-notes">
                    <textarea
                      className="user-data"
                      placeholder="Enter a note..."
                      value={singleCategory.note ?? ''}
                      onChange={(e) => onUpdateNote?.(singleCategory.entityId, e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        border: '1px solid var(--inputBorder, #cbd5e1)',
                        borderRadius: '0.25rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--inputBackground, #ffffff)',
                        color: 'var(--labelPrimary)',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
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
