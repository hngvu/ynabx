import React, { useState } from 'react';
import { BudgetHeader } from './BudgetHeader';
import { BudgetViewRow } from './BudgetViewRow';
import { BudgetTable } from './BudgetTable';
import { BudgetInspector } from './BudgetInspector';
import { AddMasterCategoryPopover } from './AddMasterCategoryPopover';
import { AddSubCategoryPopover } from './AddSubCategoryPopover';
import { EditCategoryPopover } from './EditCategoryPopover';
import { MoveMoneyModal } from './MoveMoneyModal';
import { INITIAL_CATEGORY_GROUPS, MasterCategoryGroup } from './budgetData';

export interface BudgetWorkspaceProps {
  onAddAccount?: () => void;
  onOpenSettings?: () => void;
}

export function BudgetWorkspace({
  onAddAccount,
  onOpenSettings,
}: BudgetWorkspaceProps) {
  const [currentMonth, setCurrentMonth] = useState('November');
  const [currentYear, setCurrentYear] = useState('2026');
  const [note, setNote] = useState('');
  const [readyToAssign, setReadyToAssign] = useState(500000); // $500.00 RTA initially
  const [activeView, setActiveView] = useState('all');
  const [showProgressBars, setShowProgressBars] = useState(true);

  const [categoryGroups, setCategoryGroups] = useState<MasterCategoryGroup[]>(INITIAL_CATEGORY_GROUPS);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Popovers state
  const [addMasterPopover, setAddMasterPopover] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

  const [addSubPopover, setAddSubPopover] = useState<{
    isOpen: boolean;
    groupId: string | null;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, groupId: null, triggerRect: null });

  const [editCategoryPopover, setEditCategoryPopover] = useState<{
    isOpen: boolean;
    category: {
      id: string;
      name: string;
      isMasterCategory?: boolean;
      canDelete?: boolean;
      canRename?: boolean;
      isCreditCardPaymentCategory?: boolean;
    } | null;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, category: null, triggerRect: null });

  // Move Money Modal state (used by Header Assign & Inspector Target Assign)
  const [moveMoneyModal, setMoveMoneyModal] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
    initialAmountMilliunits?: number;
    initialToCategoryId?: string;
    sourceCategory?: { id: string; name: string; isToBeBudgeted?: boolean } | null;
  }>({
    isOpen: false,
    triggerRect: null,
  });

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => (prev === 'November' ? 'October' : 'November'));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => (prev === 'November' ? 'December' : 'November'));
  };

  // Category selection handlers
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSelectGroup = (groupId: string) => {
    const grp = categoryGroups.find((g) => g.entityId === groupId);
    if (!grp) return;
    const catIds = grp.categories.map((c) => c.entityId);
    const allSelected = catIds.every((id) => selectedCategoryIds.includes(id));
    if (allSelected) {
      setSelectedCategoryIds((prev) => prev.filter((id) => !catIds.includes(id)));
    } else {
      setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...catIds])));
    }
  };

  const handleSelectAll = () => {
    const allIds = categoryGroups.flatMap((g) => g.categories.map((c) => c.entityId));
    if (selectedCategoryIds.length === allIds.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(allIds);
    }
  };

  const handleToggleCollapseGroup = (groupId: string) => {
    setCategoryGroups((prev) =>
      prev.map((g) =>
        g.entityId === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g
      )
    );
  };

  const handleCollapseAll = () => {
    const anyExpanded = categoryGroups.some((g) => !g.isCollapsed);
    setCategoryGroups((prev) =>
      prev.map((g) => ({ ...g, isCollapsed: anyExpanded }))
    );
  };

  // Assigned update handler (enforces zero-sum Ready to Assign calculation)
  const handleUpdateAssigned = (catId: string, newAssignedMilliunits: number) => {
    setCategoryGroups((prev) => {
      let diff = 0;
      const updated = prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) => {
          if (c.entityId === catId) {
            diff = (c.assigned ?? 0) - newAssignedMilliunits;
            const newAvailable = (c.available ?? 0) - diff;
            return {
              ...c,
              assigned: newAssignedMilliunits,
              available: newAvailable,
            };
          }
          return c;
        }),
      }));
      setReadyToAssign((rta) => rta + diff);
      return updated;
    });
  };

  // Quick move money between categories or from Ready to Assign
  const handleMoveMoney = (
    fromCatId: string | null,
    toCatId: string,
    amountMilliunits: number
  ) => {
    setCategoryGroups((prev) => {
      const updated = prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) => {
          if (fromCatId && c.entityId === fromCatId) {
            return {
              ...c,
              assigned: (c.assigned ?? 0) - amountMilliunits,
              available: (c.available ?? 0) - amountMilliunits,
            };
          }
          if (c.entityId === toCatId) {
            return {
              ...c,
              assigned: (c.assigned ?? 0) + amountMilliunits,
              available: (c.available ?? 0) + amountMilliunits,
            };
          }
          return c;
        }),
      }));
      if (!fromCatId) {
        // Moved from Ready to Assign
        setReadyToAssign((rta) => rta - amountMilliunits);
      }
      return updated;
    });
  };

  // Quick assign to single category (e.g. from Inspector target warning)
  const handleAssignToCategory = (catId: string, neededMilliunits: number) => {
    handleMoveMoney(null, catId, neededMilliunits);
  };

  // Add Master Category Group
  const handleAddMasterGroup = (name: string) => {
    const newGroup: MasterCategoryGroup = {
      entityId: `grp-${Date.now()}`,
      name,
      isCollapsed: false,
      categories: [],
    };
    setCategoryGroups((prev) => [...prev, newGroup]);
  };

  // Add Sub Category to a group
  const handleAddSubCategory = (groupId: string, name: string) => {
    setCategoryGroups((prev) =>
      prev.map((grp) => {
        if (grp.entityId === groupId) {
          const newSub = {
            entityId: `cat-${Date.now()}`,
            name,
            assigned: 0,
            activity: 0,
            available: 0,
          };
          return {
            ...grp,
            categories: [...grp.categories, newSub],
          };
        }
        return grp;
      })
    );
  };

  // Rename Category or Master Category
  const handleRenameCategory = (id: string, newName: string, isMaster?: boolean) => {
    setCategoryGroups((prev) =>
      prev.map((grp) => {
        if (isMaster && grp.entityId === id) {
          return { ...grp, name: newName };
        }
        return {
          ...grp,
          categories: grp.categories.map((c) =>
            c.entityId === id ? { ...c, name: newName } : c
          ),
        };
      })
    );
  };

  // Delete Category or Master Category
  const handleDeleteCategory = (id: string, isMaster?: boolean) => {
    setCategoryGroups((prev) => {
      if (isMaster) {
        return prev.filter((g) => g.entityId !== id);
      }
      return prev.map((grp) => ({
        ...grp,
        categories: grp.categories.filter((c) => c.entityId !== id),
      }));
    });
    setSelectedCategoryIds((prev) => prev.filter((catId) => catId !== id));
  };

  // Helper to determine if a subcategory is visible under the active focused view
  const isCategoryVisibleUnderView = (c: MasterCategoryGroup['categories'][0], view: string): boolean => {
    switch (view) {
      case 'all':
        return true;
      case 'overspent':
        return (c.available ?? 0) < 0;
      case 'underfunded': {
        if (!c.target || c.isDebtPayment) return false;
        const needed = Math.max(0, (c.target.targetAmount ?? 0) - (c.assigned ?? 0));
        return needed > 0 && !c.isGoalSnoozed;
      }
      case 'overfunded': {
        if (!c.target || c.isDebtPayment) return false;
        const overfunded = (c.assigned ?? 0) - (c.target.targetAmount ?? 0);
        return overfunded > 0;
      }
      case 'money-available':
        return (c.available ?? 0) > 0;
      case 'snoozed':
        return Boolean(c.isGoalSnoozed);
      default:
        return true;
    }
  };

  // Filter groups and categories based on activeView
  const visibleCategoryGroups = activeView === 'all'
    ? categoryGroups
    : categoryGroups
        .map((grp) => ({
          ...grp,
          categories: grp.categories.filter((c) => isCategoryVisibleUnderView(c, activeView)),
        }))
        .filter((grp) => grp.categories.length > 0);

  // Overspent count across all categories
  const allSubcategories = categoryGroups.flatMap((g) => g.categories);
  const overspentCategories = allSubcategories.filter((c) => (c.available ?? 0) < 0);
  const overspentCount = overspentCategories.length;
  const hasCashOverspending = overspentCategories.some((c) => !c.isDebtPayment);

  // Empty state content for filtered views
  const getEmptyStateContent = (view: string) => {
    switch (view) {
      case 'overspent':
        return {
          header: "That's a win!",
          subheader: "You've knocked out all overspent categories.",
        };
      case 'underfunded':
        return {
          subheader: "Cheers! You don't currently have any underfunded categories.",
        };
      case 'overfunded':
        return {
          subheader: "You don't currently have any overfunded targets.",
        };
      case 'money-available':
        return {
          subheader: "You don't currently have categories with money available.",
        };
      case 'snoozed':
        return {
          subheader: "You don't currently have categories with snoozed targets in this month.",
        };
      default:
        return {
          subheader: "There are no categories matching this view.",
        };
    }
  };

  const handleSelectView = (view: string) => {
    setActiveView((prev) => (prev === view ? 'all' : view));
    setSelectedCategoryIds([]);
  };

  return (
    <div className="content-min-break has-budget-views">
      {/* 1. Header (Month Nav + Ready to Assign banner + Share button) */}
      <BudgetHeader
        currentMonthName={`${currentMonth.slice(0, 3)} ${currentYear}`}
        note={note}
        readyToAssignMilliunits={readyToAssign}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onOpenMonthPicker={() => console.log('Open Month Picker')}
        onOpenNote={() => console.log('Open Note')}
        onAddMember={() => console.log('Add Member')}
        onOpenBreakdown={() => console.log('Open Breakdown')}
        onAutoAssign={(rect) => {
          const btn = document.querySelector('.to-be-budgeted-button');
          setMoveMoneyModal({
            isOpen: true,
            triggerRect: rect ?? btn?.getBoundingClientRect() ?? null,
            initialAmountMilliunits: readyToAssign > 0 ? readyToAssign : 0,
            sourceCategory: { id: '', name: 'Ready to Assign', isToBeBudgeted: true },
          });
        }}
      />

      {/* 2. Budget Views Row */}
      <BudgetViewRow
        activeView={activeView}
        overspentCount={overspentCount}
        hasCashOverspending={hasCashOverspending}
        onSelectView={handleSelectView}
        onOpenViewsMenu={() => console.log('Manage Views')}
      />

      {/* 3. Budget Table and Inspector Flexbox */}
      <div className="budget-table-and-inspector js-budget-table-and-inspector">
        {visibleCategoryGroups.length === 0 ? (
          <div className="budget-table">
            <div className="budget-views-empty-state">
              <div className="budget-views-empty-state-content">
                <div className="budget-views-empty-state-subheader">
                  {getEmptyStateContent(activeView).header && (
                    <div className="type-body-bold" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                      {getEmptyStateContent(activeView).header}
                    </div>
                  )}
                  <div>{getEmptyStateContent(activeView).subheader}</div>
                </div>
                <div className="body-views-empty-state-actions">
                  <button
                    className="button button-primary secondary"
                    type="button"
                    onClick={() => setActiveView('all')}
                  >
                    View All Categories
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <BudgetTable
            groups={visibleCategoryGroups}
            selectedCategoryIds={selectedCategoryIds}
            showProgressBars={showProgressBars}
            activeView={activeView}
            onResetViewToAll={() => setActiveView('all')}
            onToggleProgressBars={() => setShowProgressBars(!showProgressBars)}
            onToggleCollapseGroup={handleToggleCollapseGroup}
            onSelectGroup={handleSelectGroup}
            onSelectCategory={handleSelectCategory}
            onSelectAll={handleSelectAll}
            onCollapseAll={handleCollapseAll}
            onAddCategoryGroup={(rect) =>
              setAddMasterPopover({ isOpen: true, triggerRect: rect })
            }
            onOpenAddSubCategory={(groupId, rect) =>
              setAddSubPopover({ isOpen: true, groupId, triggerRect: rect })
            }
            onOpenEditCategory={(cat, rect) =>
              setEditCategoryPopover({ isOpen: true, category: cat, triggerRect: rect })
            }
            onUpdateAssigned={handleUpdateAssigned}
            onOpenActivityModal={(id) => console.log('Open activity for', id)}
          />
        )}

        <BudgetInspector
          groups={categoryGroups}
          selectedCategoryIds={selectedCategoryIds}
          currentMonthName={currentMonth}
          readyToAssignMilliunits={readyToAssign}
          onAutoAssign={() => {
            const btn = document.querySelector('.to-be-budgeted-button');
            setMoveMoneyModal({
              isOpen: true,
              triggerRect: btn?.getBoundingClientRect() ?? null,
              initialAmountMilliunits: readyToAssign > 0 ? readyToAssign : 0,
              sourceCategory: { id: '', name: 'Ready to Assign', isToBeBudgeted: true },
            });
          }}
          onClearSelection={() => setSelectedCategoryIds([])}
          onAssignToCategory={handleAssignToCategory}
          onOpenMoveMoneyModal={(catId, needed) => {
            const btn = document.querySelector('.to-be-budgeted-button');
            setMoveMoneyModal({
              isOpen: true,
              triggerRect: btn?.getBoundingClientRect() ?? null,
              initialAmountMilliunits: needed,
              initialToCategoryId: catId,
              sourceCategory: { id: '', name: 'Ready to Assign', isToBeBudgeted: true },
            });
          }}
          onEditCategory={(cat, rect) => {
            setEditCategoryPopover({
              isOpen: true,
              category: {
                id: cat.entityId,
                name: cat.name,
                canRename: true,
                canDelete: true,
                isCreditCardPaymentCategory: cat.isDebtPayment,
              },
              triggerRect: rect,
            });
          }}
        />
      </div>

      {/* Popovers for Category Group & Category Actions */}
      <AddMasterCategoryPopover
        isOpen={addMasterPopover.isOpen}
        triggerRect={addMasterPopover.triggerRect}
        onClose={() => setAddMasterPopover({ isOpen: false, triggerRect: null })}
        onAdd={handleAddMasterGroup}
      />

      <AddSubCategoryPopover
        isOpen={addSubPopover.isOpen}
        triggerRect={addSubPopover.triggerRect}
        groupId={addSubPopover.groupId}
        onClose={() => setAddSubPopover({ isOpen: false, groupId: null, triggerRect: null })}
        onAdd={handleAddSubCategory}
      />

      <EditCategoryPopover
        isOpen={editCategoryPopover.isOpen}
        triggerRect={editCategoryPopover.triggerRect}
        category={editCategoryPopover.category}
        onClose={() => setEditCategoryPopover({ isOpen: false, category: null, triggerRect: null })}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
        onHide={(id, isMaster) => handleDeleteCategory(id, isMaster)}
      />

      {/* Move Money & Auto-Assign Modal */}
      <MoveMoneyModal
        isOpen={moveMoneyModal.isOpen}
        triggerRect={moveMoneyModal.triggerRect}
        groups={categoryGroups}
        readyToAssignMilliunits={readyToAssign}
        initialAmountMilliunits={moveMoneyModal.initialAmountMilliunits}
        initialToCategoryId={moveMoneyModal.initialToCategoryId}
        sourceCategory={moveMoneyModal.sourceCategory}
        onClose={() => setMoveMoneyModal({ isOpen: false, triggerRect: null })}
        onMoveMoney={handleMoveMoney}
        onAutoAssignOption={(opt) => {
          console.log('Perform auto assign option:', opt);
          if (opt === 'underfunded') {
            // Underfunded auto assign across all underfunded categories
            setCategoryGroups((prev) => {
              let rta = readyToAssign;
              const updated = prev.map((grp) => ({
                ...grp,
                categories: grp.categories.map((c) => {
                  if (c.target && c.target.targetAmount > (c.assigned ?? 0) && rta > 0) {
                    const need = c.target.targetAmount - (c.assigned ?? 0);
                    const toAssign = Math.min(need, rta);
                    rta -= toAssign;
                    return {
                      ...c,
                      assigned: (c.assigned ?? 0) + toAssign,
                      available: (c.available ?? 0) + toAssign,
                    };
                  }
                  return c;
                }),
              }));
              setReadyToAssign(rta);
              return updated;
            });
          }
        }}
      />
    </div>
  );
}

export default BudgetWorkspace;
