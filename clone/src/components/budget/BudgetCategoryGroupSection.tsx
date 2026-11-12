import React, { useState } from 'react';
import { Icon } from '../core/Icon';
import { MasterCategoryGroup } from './budgetData';
import { BudgetSubCategoryRow } from './BudgetSubCategoryRow';

export interface BudgetCategoryGroupSectionProps {
  group: MasterCategoryGroup;
  selectedCategoryIds: string[];
  isGroupSelected?: boolean;
  onToggleCollapse: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onSelectCategory: (catId: string) => void;
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
  showProgressBars?: boolean;
  isDraggingGroup?: boolean;
  isDragOverGroup?: boolean;
  onGroupDragStart?: (e: React.DragEvent) => void;
  onGroupDragOver?: (e: React.DragEvent) => void;
  onGroupDragLeave?: (e: React.DragEvent) => void;
  onGroupDrop?: (e: React.DragEvent) => void;
  onGroupDragEnd?: (e: React.DragEvent) => void;
  onReorderSubCategories?: (groupId: string, draggedCatId: string, targetCatId: string) => void;
  onMoveSubCategoryAcrossGroups?: (sourceGroupId: string, targetGroupId: string, catId: string) => void;
}

export function BudgetCategoryGroupSection({
  group,
  selectedCategoryIds,
  isGroupSelected = false,
  onToggleCollapse,
  onSelectGroup,
  onSelectCategory,
  onUpdateAssigned,
  onOpenActivityModal,
  onOpenAddSubCategory,
  onOpenEditCategory,
  showProgressBars = true,
  isDraggingGroup = false,
  isDragOverGroup = false,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  onGroupDragEnd,
  onReorderSubCategories,
  onMoveSubCategoryAcrossGroups,
}: BudgetCategoryGroupSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [draggedSubCatId, setDraggedSubCatId] = useState<string | null>(null);
  const [dropTargetSubCat, setDropTargetSubCat] = useState<{ catId: string; position: 'above' | 'below' } | null>(null);
  const isCollapsed = group.isCollapsed ?? false;

  // Aggregate totals for the group
  const totalAssigned = group.categories.reduce((sum, c) => sum + (c.assigned ?? 0), 0);
  const totalActivity = group.categories.reduce((sum, c) => sum + (c.activity ?? 0), 0);
  const totalAvailable = group.categories.reduce((sum, c) => sum + (c.available ?? 0), 0);

  const formattedAssigned = ((totalAssigned) / 1000).toFixed(2);
  const formattedActivity = ((Math.abs(totalActivity)) / 1000).toFixed(2);
  const activitySign = totalActivity < 0 ? '-' : totalActivity > 0 ? '+' : '';
  const formattedAvailable = ((Math.abs(totalAvailable)) / 1000).toFixed(2);
  const availableSign = totalAvailable < 0 ? '-' : '';

  return (
    <div className="budget-table-row-group">
      {/* Master Category Header Row */}
      <div
        draggable={!group.isDebtPaymentGroup}
        onDragStart={!group.isDebtPaymentGroup ? onGroupDragStart : undefined}
        onDragOver={!group.isDebtPaymentGroup ? onGroupDragOver : undefined}
        onDragLeave={!group.isDebtPaymentGroup ? onGroupDragLeave : undefined}
        onDrop={!group.isDebtPaymentGroup ? onGroupDrop : undefined}
        onDragEnd={!group.isDebtPaymentGroup ? onGroupDragEnd : undefined}
        className={`budget-table-row js-budget-table-row budget-table-row-ul is-master-category ${
          group.isDebtPaymentGroup ? 'is-debt-payment-category' : ''
        } ${isGroupSelected ? 'is-checked' : ''} ${isDraggingGroup ? 'is-original-dragging' : ''}`}
        role="row"
        aria-level={1}
        aria-expanded={!isCollapsed}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenEditCategory?.({
            id: group.entityId,
            name: group.name,
            isMasterCategory: true,
            canDelete: !group.isDebtPaymentGroup,
            canRename: !group.isDebtPaymentGroup,
          }, e.currentTarget.getBoundingClientRect());
        }}
      >
        <div className="budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li" aria-hidden="true">
          &nbsp;
        </div>
        <div className="budget-table-cell-collapse budget-table-row-li" role="cell" aria-colindex={2}>
          <button
            className="js-budget-table-cell-collapse"
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.name}`}
            type="button"
            onClick={() => onToggleCollapse(group.entityId)}
          >
            <Icon
              name={isCollapsed ? 'chevron_right' : 'chevron_down'}
              width={10}
              height={10}
            />
          </button>
        </div>
        <div className="budget-table-cell-checkbox budget-table-row-li" role="cell" aria-colindex={1}>
          <button
            className={`ynab-checkbox ynab-checkbox-button ${isGroupSelected ? 'is-checked' : ''}`}
            role="checkbox"
            aria-checked={isGroupSelected}
            aria-label={group.name}
            type="button"
            onClick={() => onSelectGroup(group.entityId)}
          >
            <Icon
              className={`ynab-checkbox-button-square ${isGroupSelected ? 'is-checked' : ''}`}
              name="check"
              width={13}
              height={13}
              style={isGroupSelected ? { color: '#ffffff', fill: '#ffffff' } : undefined}
            />
          </button>
        </div>
        <div className="budget-table-cell-name budget-table-row-li" role="rowheader" aria-colindex={3}>
          <button
            className="button budget-table-cell-button budget-table-cell-edit-category user-data"
            title={group.name}
            type="button"
            onClick={(e) => {
              onOpenEditCategory?.({
                id: group.entityId,
                name: group.name,
                isMasterCategory: true,
                canDelete: !group.isDebtPaymentGroup,
                canRename: !group.isDebtPaymentGroup,
              }, e.currentTarget.getBoundingClientRect());
            }}
          >
            {group.name}
          </button>

          {/* Plus button to add subcategory (appears on hover, unless debt payment) */}
          {!group.isDebtPaymentGroup && (
            <button
              className="button budget-table-cell-add-category budget-table-cell-button"
              aria-label="Add Category"
              title="Add Category"
              type="button"
              style={{ opacity: isHovered ? 1 : 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddSubCategory?.(group.entityId, e.currentTarget.getBoundingClientRect());
              }}
            >
              <Icon name="plus_circle_fill" width={14} height={14} />
            </button>
          )}
        </div>
        <div className="budget-table-cell-budgeted budget-table-row-li" role="cell" aria-colindex={4}>
          <button
            aria-disabled="true"
            tabIndex={-1}
            className={`user-data currency tabular-nums ${totalAssigned === 0 ? 'zero' : ''}`}
          >
            <bdi>$</bdi>
            {formattedAssigned}
          </button>
        </div>
        <div className="budget-table-cell-activity budget-table-cell-flexed budget-table-row-li" role="cell" aria-colindex={5}>
          <button
            className="budget-table-cell-category-moves js-budget-toolbar-open-category-moves"
            aria-hidden="true"
            tabIndex={-1}
            type="button"
          >
            <div className="category-moves-moves-icon-wrapper">
              <Icon name="clock_arrow_back" width={14} height={14} />
            </div>
          </button>
          <button
            className="budget-number user-data"
            title={`(${activitySign}$${formattedActivity}) View this category group's monthly activity.`}
            tabIndex={0}
            aria-disabled="true"
            type="button"
          >
            <span className={`user-data currency tabular-nums ${totalActivity === 0 ? 'zero' : ''}`}>
              <bdi>{activitySign}$</bdi>
              {formattedActivity}
            </span>
          </button>
        </div>
        <div className="budget-table-cell-available budget-table-row-li" role="cell" aria-colindex={6}>
          {group.isDebtPaymentGroup && (
            <button className="budget-table-cell-available-payment" type="button">
              <Icon name="question_mark_circle" width={12} height={12} />
              &nbsp;PAYMENT
            </button>
          )}
          <span
            className={`ynab-new-budget-available-number js-budget-available-number user-data ${
              totalAvailable === 0 ? 'zero' : totalAvailable > 0 ? 'positive' : 'negative'
            }`}
          >
            <bdi>{availableSign}$</bdi>
            {formattedAvailable}
          </span>
        </div>
        <div className="budget-table-cell-margin-right budget-table-row-li" aria-hidden="true">
          &nbsp;
        </div>
      </div>

      {/* Subcategory Rows */}
      {!isCollapsed &&
        group.categories.map((subCat, index) => {
          const isDropAbove = dropTargetSubCat?.catId === subCat.entityId && dropTargetSubCat?.position === 'above';
          const isDropBelow = dropTargetSubCat?.catId === subCat.entityId && dropTargetSubCat?.position === 'below';

          return (
            <React.Fragment key={subCat.entityId}>
              {isDropAbove && <div className="drag-placeholder" />}
              <BudgetSubCategoryRow
                category={subCat}
                isLast={index === group.categories.length - 1}
                isSelected={selectedCategoryIds.includes(subCat.entityId)}
                onSelectRow={onSelectCategory}
                onUpdateAssigned={onUpdateAssigned}
                onOpenActivityModal={onOpenActivityModal}
                onOpenEditCategory={(cat, rect) => onOpenEditCategory?.(cat, rect)}
                showProgressBars={showProgressBars}
                isDragging={draggedSubCatId === subCat.entityId}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', JSON.stringify({ groupId: group.entityId, catId: subCat.entityId }));
                  setDraggedSubCatId(subCat.entityId);
                }}
                onDragOver={(e) => {
                  if (draggedSubCatId === subCat.entityId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isTopHalf = e.clientY < rect.top + rect.height / 2;
                  const position = isTopHalf ? 'above' : 'below';
                  if (dropTargetSubCat?.catId !== subCat.entityId || dropTargetSubCat?.position !== position) {
                    setDropTargetSubCat({ catId: subCat.entityId, position });
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dropTargetSubCat?.catId === subCat.entityId) {
                    setDropTargetSubCat(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const raw = e.dataTransfer.getData('text/plain');
                    if (raw) {
                      const data = JSON.parse(raw);
                      if (data.catId) {
                        if (data.groupId === group.entityId) {
                          if (data.catId !== subCat.entityId) {
                            onReorderSubCategories?.(group.entityId, data.catId, subCat.entityId);
                          }
                        } else {
                          onMoveSubCategoryAcrossGroups?.(data.groupId, group.entityId, data.catId);
                        }
                      }
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                  setDraggedSubCatId(null);
                  setDropTargetSubCat(null);
                }}
                onDragEnd={() => {
                  setDraggedSubCatId(null);
                  setDropTargetSubCat(null);
                }}
              />
              {isDropBelow && <div className="drag-placeholder" />}
            </React.Fragment>
          );
        })}
    </div>
  );
}

export default BudgetCategoryGroupSection;
