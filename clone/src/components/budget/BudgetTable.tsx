import React from 'react';
import { Icon } from '../core/Icon';
import { MasterCategoryGroup } from './budgetData';
import { BudgetCategoryGroupSection } from './BudgetCategoryGroupSection';

export interface BudgetTableProps {
  groups: MasterCategoryGroup[];
  selectedCategoryIds: string[];
  showProgressBars: boolean;
  activeView?: string;
  onResetViewToAll?: () => void;
  onToggleProgressBars: () => void;
  onToggleCollapseGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onSelectCategory: (catId: string) => void;
  onSelectAll: () => void;
  onCollapseAll: () => void;
  onAddCategoryGroup?: (triggerRect: DOMRect) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onRecentMoves?: () => void;
  onUpdateAssigned: (catId: string, newAssigned: number) => void;
  onOpenActivityModal: (catId: string) => void;
  onOpenAddSubCategory?: (groupId: string, triggerRect: DOMRect) => void;
  onOpenEditCategory?: (category: {
    id: string;
    name: string;
    isMasterCategory?: boolean;
    canDelete?: boolean;
    canRename?: boolean;
    isCreditCardPaymentCategory?: boolean;
  }, triggerRect: DOMRect) => void;
}

export function BudgetTable({
  groups,
  selectedCategoryIds,
  showProgressBars,
  activeView = 'all',
  onResetViewToAll,
  onToggleProgressBars,
  onToggleCollapseGroup,
  onSelectGroup,
  onSelectCategory,
  onSelectAll,
  onCollapseAll,
  onAddCategoryGroup,
  onUndo,
  onRedo,
  onRecentMoves,
  onUpdateAssigned,
  onOpenActivityModal,
  onOpenAddSubCategory,
  onOpenEditCategory,
}: BudgetTableProps) {
  const allSubCategoryIds = groups.flatMap((g) => g.categories.map((c) => c.entityId));
  const isAllChecked = allSubCategoryIds.length > 0 && allSubCategoryIds.every((id) => selectedCategoryIds.includes(id));

  return (
    <section className={`budget-table-container ${showProgressBars ? 'is-expanded' : ''}`}>
      <div className="budget-table">
        {/* Table Header: Toolbar & Column Titles */}
        <div className="budget-table-header" role="rowgroup">
          {/* Action Toolbar */}
          <div className="budget-toolbar" role="row">
            <div role="cell">
              <button
                className="ghost-button primary type-body budget-toolbar-add-category"
                type="button"
                onClick={(e) => onAddCategoryGroup?.(e.currentTarget.getBoundingClientRect())}
              >
                <Icon name="plus_circle_fill" width={16} height={16} />
                Category Group
              </button>
            </div>
            <div role="cell">
              <span className="undo-redo-container js-undo-redo-container">
                <button
                  className="ghost-button primary type-body undo-button"
                  type="button"
                  onClick={onUndo}
                >
                  <Icon name="undo" width={12} height={12} />
                  Undo
                </button>
                <button
                  disabled
                  className="ghost-button primary type-body redo-button"
                  type="button"
                  onClick={onRedo}
                >
                  <Icon name="redo" width={12} height={12} />
                  Redo
                </button>
              </span>
            </div>
            <div role="cell">
              <span className="recent-moves-open-modal-container">
                <button
                  className="ghost-button primary type-body budget-toolbar-open-recent-moves"
                  type="button"
                  onClick={onRecentMoves}
                >
                  <Icon name="clock_arrow_back" width={16} height={16} />
                  <div id="js-recent-moves-title">Recent Moves</div>
                </button>
              </span>
            </div>
            <div role="cell">
              <div className="segmented-control iconOnlyOption progress-bars-toggle" role="tablist" tabIndex={0}>
                <button
                  className={`segmented-control-button ${showProgressBars ? 'selected' : ''}`}
                  aria-selected={showProgressBars}
                  role="tab"
                  tabIndex={-1}
                  title="Progress Bars On"
                  aria-label="Progress Bars On"
                  type="button"
                  onClick={onToggleProgressBars}
                >
                  <Icon name="progress_bars_on" width={12} height={12} />
                </button>
                <button
                  className={`segmented-control-button ${!showProgressBars ? 'selected' : ''}`}
                  aria-selected={!showProgressBars}
                  role="tab"
                  tabIndex={-1}
                  title="Progress Bars Off"
                  aria-label="Progress Bars Off"
                  type="button"
                  onClick={onToggleProgressBars}
                >
                  <Icon name="progress_bars_off" width={12} height={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Column Header Labels */}
          <div className="budget-table-header-labels budget-table-row-ul" role="row">
            <div className="budget-table-cell-margin-left budget-table-row-li" aria-hidden="true">&nbsp;</div>
            <div className="budget-table-cell-collapse budget-table-row-li" role="columnheader" aria-colindex={2}>
              <button
                className="js-budget-table-cell-collapse"
                aria-label="Collapse all"
                title="Collapse all"
                type="button"
                onClick={onCollapseAll}
              >
                <Icon name="chevron_down" width={10} height={10} />
              </button>
            </div>
            <div className="budget-table-cell-checkbox budget-table-row-li" role="columnheader" aria-colindex={1}>
              <button
                className={`ynab-checkbox ynab-checkbox-button ${isAllChecked ? 'is-checked' : ''}`}
                role="checkbox"
                aria-checked={isAllChecked}
                aria-label="Check all"
                type="button"
                onClick={onSelectAll}
              >
                <Icon
                  className={`ynab-checkbox-button-square ${isAllChecked ? 'is-checked' : ''}`}
                  name="check"
                  width={13}
                  height={13}
                  style={isAllChecked ? { color: '#ffffff', fill: '#ffffff' } : undefined}
                />
              </button>
            </div>
            <div className="budget-table-cell-name budget-table-row-li" role="columnheader" aria-colindex={3}>
              CATEGORY
            </div>
            <div
              className="budget-table-cell-budgeted budget-table-row-li"
              title="Add money to each category in this column. This is the fun part. Until the money runs out."
              role="columnheader"
              aria-colindex={4}
            >
              ASSIGNED
            </div>
            <div
              className="budget-table-cell-activity budget-table-row-li"
              title="It's the &quot;We spent how much on WHAT?!&quot; column."
              role="columnheader"
              aria-colindex={5}
            >
              ACTIVITY
            </div>
            <div
              className="budget-table-cell-available budget-table-row-li"
              title="Do I have enough to buy that handmade didgeridoo? With this column, now you know."
              role="columnheader"
              aria-colindex={6}
            >
              <strong>AVAILABLE</strong>
            </div>
            <div className="budget-table-cell-margin-right budget-table-row-li" aria-hidden="true">&nbsp;</div>
          </div>
        </div>

        {/* Draggable Row Groups */}
        <div className="budget-table-draggable">
          {groups.map((grp) => {
            const groupSubIds = grp.categories.map((c) => c.entityId);
            const isGroupSelected = groupSubIds.length > 0 && groupSubIds.every((id) => selectedCategoryIds.includes(id));
            return (
              <BudgetCategoryGroupSection
                key={grp.entityId}
                group={grp}
                selectedCategoryIds={selectedCategoryIds}
                isGroupSelected={isGroupSelected}
                onToggleCollapse={onToggleCollapseGroup}
                onSelectGroup={onSelectGroup}
                onSelectCategory={onSelectCategory}
                onUpdateAssigned={onUpdateAssigned}
                onOpenActivityModal={onOpenActivityModal}
                onOpenAddSubCategory={onOpenAddSubCategory}
                onOpenEditCategory={onOpenEditCategory}
                showProgressBars={showProgressBars}
              />
            );
          })}
        </div>

        {/* Clear Budget Filter Footer when filtered view is active */}
        {activeView !== 'all' && (
          <div className="clear-budget-filter">
            <hr />
            <span>Some categories are hidden by this view.</span>
            <button
              className="button button-link secondary"
              type="button"
              onClick={onResetViewToAll}
            >
              View All
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default BudgetTable;
