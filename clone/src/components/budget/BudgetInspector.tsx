import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { MasterCategoryGroup, SubCategoryItem } from './budgetData';

export interface BudgetInspectorProps {
  groups: MasterCategoryGroup[];
  selectedCategoryIds: string[];
  currentMonthName: string;
  onAutoAssign?: () => void;
  onClearSelection?: () => void;
}

export function BudgetInspector({
  groups,
  selectedCategoryIds,
  currentMonthName,
  onAutoAssign,
  onClearSelection,
}: BudgetInspectorProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [autoAssignExpanded, setAutoAssignExpanded] = useState(false);
  const [futureMonthsExpanded, setFutureMonthsExpanded] = useState(true);
  const [forYouExpanded, setForYouExpanded] = useState(true);

  // All subcategories flat list
  const allSubCategories = groups.flatMap((g) => g.categories);
  const selectedCategories = allSubCategories.filter((c) => selectedCategoryIds.includes(c.entityId));
  const isSingleCategory = selectedCategories.length === 1;
  const singleCategory: SubCategoryItem | undefined = isSingleCategory ? selectedCategories[0] : undefined;

  // Totals calculations
  const totalAssigned = allSubCategories.reduce((s, c) => s + (c.assigned ?? 0), 0);
  const totalActivity = allSubCategories.reduce((s, c) => s + (c.activity ?? 0), 0);
  const totalAvailable = allSubCategories.reduce((s, c) => s + (c.available ?? 0), 0);

  return (
    <aside className="budget-inspector">
      <div className="budget-inspector-resizer" />
      <div className="budget-inspector-content">
        <div className="budget-breakdown">
          {singleCategory ? (
            <div className="inspector-category-header">
              <h2 className="user-data" style={{ fontSize: '18px', fontWeight: 600, padding: '16px 20px 8px' }}>
                {singleCategory.name}
              </h2>
              <div style={{ padding: '0 20px 16px', color: '#64748b', fontSize: '13px' }}>
                {singleCategory.isDebtPayment ? 'Credit Card Payment Category' : 'Budget Category'}
              </div>

              {/* Quick Budget for this Category */}
              <section className="card budget-breakdown-auto-assign">
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
                          <button className="budget-inspector-button js-focus-on-start underfunded" type="button">
                            <div>Underfunded</div>
                            <div><strong className="user-data"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                        </div>
                        <div>
                          <button className="budget-inspector-button assigned-last month" type="button">
                            <div>Assigned Last Month</div>
                            <div><strong className="user-data"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                          <button className="budget-inspector-button spent-last month" type="button">
                            <div>Spent Last Month</div>
                            <div><strong className="user-data"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <>
              {/* 1. Month Summary Card */}
              <section className="card">
                <button
                  className="card-roll-up"
                  aria-expanded={summaryExpanded}
                  type="button"
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                >
                  <h2>
                    {currentMonthName}'s Summary
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
                            {((totalAssigned) / 1000).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div tabIndex={0} className="ynab-breakdown-activity">
                        <div>Activity</div>
                        <div className="user-data">
                          <span className={`user-data currency tabular-nums ${totalActivity === 0 ? 'zero' : ''}`}>
                            <bdi>{totalActivity < 0 ? '-' : ''}$</bdi>
                            {((Math.abs(totalActivity)) / 1000).toFixed(2)}
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
                            {((totalAvailable) / 1000).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cost to Be Me section */}
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
                  </div>
                )}
              </section>

              {/* 2. Auto-Assign Card */}
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
                          <button className="budget-inspector-button js-focus-on-start underfunded" type="button">
                            <div>Underfunded</div>
                            <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                        </div>
                        <div>
                          <button className="budget-inspector-button assigned-last month" type="button">
                            <div>Assigned Last Month</div>
                            <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                          <button className="budget-inspector-button spent-last month" type="button">
                            <div>Spent Last Month</div>
                            <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                          <button className="budget-inspector-button average-assigned" title="Feeling average? Fund all of your categories with your historical average assigned." type="button">
                            <div>Average Assigned</div>
                            <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
                          <button className="budget-inspector-button average-spent" title="Assign your historical average spent. Though you're above average in my book." type="button">
                            <div>Average Spent</div>
                            <div><strong className="user-data" title="$0.00"><span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span></strong></div>
                          </button>
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

              {/* 3. Future Months Card */}
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
                      <button className="future-month-button" type="button">
                        <div className="future-month-button-interior">
                          <div className="month-label">
                            <div>December</div>
                          </div>
                          <div className="user-data">
                            <span className="user-data currency tabular-nums zero"><bdi>$</bdi>0.00</span>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="info-box">
                      <div className="calendar-image-container">
                        <img className="calendar-image" src="/images/inspector/calendar.svg" alt="" />
                      </div>
                      <div className="info-box-content">
                        Tired of living paycheck to paycheck? Getting one month ahead can make all the difference.
                        <span className="icon-button-container">
                          <Icon className="icon-play" name="play_circle_fill" width={16} height={16} />
                          <button aria-label="Play a video on how to get a month ahead" type="button">
                            Learn How
                          </button>
                        </span>
                      </div>
                      <button aria-label="Dismiss this help message" title="Close" type="button">
                        <Icon className="icon-close" name="close" width={16} height={16} />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 4. For You Feed Card */}
              <section className="card for-you-feed-card">
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
                    <div className="body-container">
                      <div className="for-you-card-feed">
                        <div className="empty-message">
                          <img className="image" src="/images/for-you-feed-card/sunshine-outline.svg" alt="" />
                          <h3 className="title">You’re all caught up!</h3>
                          <p className="description">
                            Want to keep going? There’s plenty more where that came from.
                          </p>
                          <button className="ghost-button primary type-body" type="button">
                            Read the Blog
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export default BudgetInspector;
