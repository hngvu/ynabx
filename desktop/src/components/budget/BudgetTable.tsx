import React from 'react';
import { Icon } from '../core/Icon';
import { MasterCategoryGroup } from './budgetData';
import { BudgetCategoryGroupSection } from './BudgetCategoryGroupSection';
import { useEmberSortable, gapToIndex } from '../../hooks/useEmberSortable';

const GROUPS_LIST = 'groups';

export interface BudgetTableProps {
  groups: MasterCategoryGroup[];
  selectedCategoryIds: string[];
  showProgressBars: boolean;
  activeView?: string;
  emptyStateContent?: { header?: string; subheader: string } | null;
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
  onOpenActivityModal: (catId: string, triggerRect: DOMRect) => void;
  onOpenMoveMoney?: (catId: string, available: number, triggerRect: DOMRect) => void;
  onOpenCoverOverspending?: (catId: string, overspentAmount: number, triggerRect: DOMRect) => void;
  onOpenAddSubCategory?: (groupId: string, triggerRect: DOMRect) => void;
  onOpenEditCategory?: (category: {
    id: string;
    name: string;
    isMasterCategory?: boolean;
    canDelete?: boolean;
    canRename?: boolean;
    isCreditCardPaymentCategory?: boolean;
  }, triggerRect: DOMRect) => void;
  /** New full ordering of category group ids. */
  onReorderGroups?: (orderedGroupIds: string[]) => void;
  /** Move a category to final index 	oIndex in 	oGroupId (may equal romGroupId). */
  onMoveSubCategory?: (catId: string, fromGroupId: string, toGroupId: string, toIndex: number) => void;
}

export function BudgetTable({
  groups,
  selectedCategoryIds,
  showProgressBars,
  activeView = 'all',
  emptyStateContent,
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
  onOpenMoveMoney,
  onOpenCoverOverspending,
  onOpenAddSubCategory,
  onOpenEditCategory,
  onReorderGroups,
  onMoveSubCategory,
}: BudgetTableProps) {
  const groupById = (id: string) => groups.find((g) => g.entityId === id);

  // Ember-style sortables (ports YNAB's NQ mixin): animated placeholder gap, source keeps its slot.
  const groupSort = useEmberSortable({
    canDrop: (_d, gap) => !(gap.index === 0 && groups[0]?.isDebtPaymentGroup),
    onDrop: (d, gap) => {
      const ids = groups.map((g) => g.entityId);
      const [moved] = ids.splice(d.index, 1);
      ids.splice(gapToIndex(d.index, gap.index), 0, moved);
      onReorderGroups?.(ids);
    },
  });
  const subSort = useEmberSortable({
    canDrop: (d, gap) => {
      const from = groupById(d.listId);
      const to = groupById(gap.listId);
      return !!from && !!to && !!from.isDebtPaymentGroup === !!to.isDebtPaymentGroup;
    },
    onDrop: (d, gap) => {
      const toIndex = d.listId === gap.listId ? gapToIndex(d.index, gap.index) : gap.index;
      onMoveSubCategory?.(d.id, d.listId, gap.listId, toIndex);
    },
  });

  const allSubCategoryIds = groups.flatMap((g) => g.categories.map((c) => c.entityId));
  const isAllChecked = allSubCategoryIds.length > 0 && allSubCategoryIds.every((id) => selectedCategoryIds.includes(id));

  return (
    <section className={`budget-table-container ${showProgressBars ? 'is-expanded' : ''} ${emptyStateContent ? 'zero-visible-categories' : ''}`}>
      <div className={`budget-table ${groupSort.isDragging ? 'master-category-is-dragging' : ''}`}>
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

        {/* Draggable Row Groups or Empty State */}
        {emptyStateContent ? (
          <div className="budget-views-empty-state">
            <div className="budget-views-empty-state-content">
              <div className="budget-views-empty-state-subheader">
                {emptyStateContent.header && (
                  <div className="type-body-bold" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    {emptyStateContent.header}
                  </div>
                )}
                <div>{emptyStateContent.subheader}</div>
              </div>
              <div className="body-views-empty-state-actions">
                <button
                  className="button button-primary secondary"
                  type="button"
                  onClick={onResetViewToAll}
                >
                  View All Categories
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="budget-table-draggable">
            {groups.map((grp, groupIndex) => {
              const groupSubIds = grp.categories.map((c) => c.entityId);
              const isGroupSelected = groupSubIds.length > 0 && groupSubIds.every((id) => selectedCategoryIds.includes(id));
              // While a subcategory is dragged the master row means "top of this group";
              // otherwise it is a sortable group item (Credit Card Payments is pinned).
              const groupDndProps = subSort.isDragging
                ? { ...subSort.getTargetProps(() => ({ listId: grp.entityId, index: 0 })), draggable: false }
                : groupSort.getItemProps(
                    { listId: GROUPS_LIST, id: grp.entityId, index: groupIndex },
                    { disabled: grp.isDebtPaymentGroup }
                  );

              return (
                <React.Fragment key={grp.entityId}>
                  {groupSort.renderPlaceholder(GROUPS_LIST, groupIndex)}
                  <BudgetCategoryGroupSection
                    group={grp}
                    selectedCategoryIds={selectedCategoryIds}
                    isGroupSelected={isGroupSelected}
                    onToggleCollapse={onToggleCollapseGroup}
                    onSelectGroup={onSelectGroup}
                    onSelectCategory={onSelectCategory}
                    onUpdateAssigned={onUpdateAssigned}
                    onOpenActivityModal={onOpenActivityModal}
                    onOpenMoveMoney={onOpenMoveMoney}
                    onOpenCoverOverspending={onOpenCoverOverspending}
                    onOpenAddSubCategory={onOpenAddSubCategory}
                    onOpenEditCategory={onOpenEditCategory}
                    showProgressBars={showProgressBars}
                    groupDragClassName={groupSort.itemClassName({ id: grp.entityId })}
                    groupDndProps={groupDndProps}
                    subSort={subSort}
                    subDisabled={groupSort.isDragging}
                  />
                </React.Fragment>
              );
            })}
            {groupSort.renderPlaceholder(GROUPS_LIST, groups.length)}
          </div>
        )}

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
