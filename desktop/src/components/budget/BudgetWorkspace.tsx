import React, { useState, useEffect } from 'react';
import { BudgetHeader } from './BudgetHeader';
import { BudgetViewRow } from './BudgetViewRow';
import { BudgetTable } from './BudgetTable';
import { BudgetInspector } from './BudgetInspector';
import { AddMasterCategoryPopover } from './AddMasterCategoryPopover';
import { AddSubCategoryPopover } from './AddSubCategoryPopover';
import { EditCategoryPopover } from './EditCategoryPopover';
import { MoveMoneyModal } from './MoveMoneyModal';
import { MonthPickerPopover } from './MonthPickerPopover';
import { CoverOverspendingPopover } from './CoverOverspendingPopover';
import { RtaBreakdownPopover } from './RtaBreakdownPopover';
import { ActivityTransactionsPopover } from './ActivityTransactionsPopover';
import { INITIAL_CATEGORY_GROUPS, MasterCategoryGroup } from './budgetData';
import { CategoryTarget } from './categoryTargetStatus';
import {
  KeyboardShortcut,
  keyboardShortcutsService,
  KBShortcutResult,
} from '../../services/keyboardShortcuts';
import { getBudgetMonth, setCategoryAssigned, applyQuickBudget } from '../../api/tauriBridge';

export interface BudgetWorkspaceProps {
  onAddAccount?: () => void;
  onOpenSettings?: () => void;
}

export function BudgetWorkspace({
  onAddAccount,
  onOpenSettings,
}: BudgetWorkspaceProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 1)); // Default Nov 2026
  const [note, setNote] = useState('');
  const [readyToAssign, setReadyToAssign] = useState(0);
  const [activeView, setActiveView] = useState('all');
  const [showProgressBars, setShowProgressBars] = useState(true);

  const [categoryGroups, setCategoryGroups] = useState<MasterCategoryGroup[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Format month to "YYYY-MM-01" for Tauri Rust backend
  const currentMonthIso = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => {
    async function fetchMonthData() {
      try {
        const res = await getBudgetMonth(currentMonthIso);
        if (res) {
          setReadyToAssign(res.readyToAssign);
          setCategoryGroups(res.categoryGroups);
        }
      } catch (err) {
        console.error('Failed to fetch budget month from Tauri:', err);
      }
    }
    fetchMonthData();
  }, [currentMonthIso]);

  // Month labels
  const currentMonthIdx = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const monthHeaderLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Popovers state
  const [monthPickerPopover, setMonthPickerPopover] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

  const [rtaBreakdownPopover, setRtaBreakdownPopover] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

  const [coverOverspendingPopover, setCoverOverspendingPopover] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
    category: { id: string; name: string; overspentAmount: number } | null;
  }>({ isOpen: false, triggerRect: null, category: null });

  const [activityPopover, setActivityPopover] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
    category: { id: string; name: string; activity: number } | null;
  }>({ isOpen: false, triggerRect: null, category: null });

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
    sourceCategory?: { id: string; name: string; available?: number; isToBeBudgeted?: boolean } | null;
  }>({
    isOpen: false,
    triggerRect: null,
  });

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleSelectMonthAndYear = (monthIdx: number, year: number) => {
    setCurrentDate(new Date(year, monthIdx, 1));
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

  // Drag and drop reordering handlers
  const handleReorderGroups = (orderedGroupIds: string[]) => {
    setCategoryGroups((prev) => {
      const byId = new Map(prev.map((g) => [g.entityId, g]));
      const next = orderedGroupIds.map((id) => byId.get(id)).filter((g): g is MasterCategoryGroup => !!g);
      return [...next, ...prev.filter((g) => !orderedGroupIds.includes(g.entityId))];
    });
  };

  const handleMoveSubCategory = (
    catId: string,
    fromGroupId: string,
    toGroupId: string,
    toIndex: number
  ) => {
    setCategoryGroups((prev) => {
      const movedCat = prev
        .find((g) => g.entityId === fromGroupId)
        ?.categories.find((c) => c.entityId === catId);
      if (!movedCat) return prev;

      return prev.map((grp) => {
        let cats = grp.categories;
        if (grp.entityId === fromGroupId) {
          cats = cats.filter((c) => c.entityId !== catId);
        }
        if (grp.entityId === toGroupId) {
          cats = [...cats];
          cats.splice(Math.min(toIndex, cats.length), 0, movedCat);
        }
        return cats === grp.categories ? grp : { ...grp, categories: cats };
      });
    });
  };

  // Keyboard Shortcuts for Budget Workspace
  useEffect(() => {
    const target = {};

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.SelectAllCategories,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        const allIds = categoryGroups.flatMap((g) => g.categories.map((c) => c.entityId));
        setSelectedCategoryIds(allIds);
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DeselectAllCategories,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        setSelectedCategoryIds([]);
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.CollapseAllCategoryGroups,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        setCategoryGroups((prev) => prev.map((g) => ({ ...g, isCollapsed: true })));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.ExpandAllCategoryGroups,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        setCategoryGroups((prev) => prev.map((g) => ({ ...g, isCollapsed: false })));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.SnoozeSelectedCategories,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        if (selectedCategoryIds.length > 0) {
          setCategoryGroups((prev) =>
            prev.map((grp) => ({
              ...grp,
              categories: grp.categories.map((c) => {
                if (selectedCategoryIds.includes(c.entityId)) {
                  return { ...c, isGoalSnoozed: !c.isGoalSnoozed };
                }
                return c;
              }),
            }))
          );
        }
        return KBShortcutResult.Success;
      }
    );

    return () => {
      keyboardShortcutsService.removeAllShortcutsForTarget(target);
    };
  }, [categoryGroups, selectedCategoryIds]);

  // Assigned update handler (enforces zero-sum Ready to Assign calculation)
  const handleUpdateAssigned = async (catId: string, newAssignedMilliunits: number) => {
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

    try {
      const res = await setCategoryAssigned(catId, currentMonthIso, newAssignedMilliunits);
      if (res) {
        setReadyToAssign(res.ready_to_assign_milliunits);
      }
    } catch (err) {
      console.error('Failed to update category assigned via Tauri:', err);
    }
  };

  // Update note on a category
  const handleUpdateNote = (catId: string, newNote: string) => {
    setCategoryGroups((prev) =>
      prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) =>
          c.entityId === catId ? { ...c, note: newNote } : c
        ),
      }))
    );
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

  // Target handlers: Save, Delete, Snooze
  const handleSaveTarget = (catId: string, newTarget: CategoryTarget) => {
    setCategoryGroups((prev) =>
      prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) =>
          c.entityId === catId
            ? { ...c, target: newTarget, isGoalSnoozed: false }
            : c
        ),
      }))
    );
  };

  const handleDeleteTarget = (catId: string) => {
    setCategoryGroups((prev) =>
      prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) =>
          c.entityId === catId
            ? { ...c, target: undefined, isGoalSnoozed: false }
            : c
        ),
      }))
    );
  };

  const handleToggleSnoozeTarget = (catId: string) => {
    setCategoryGroups((prev) =>
      prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) =>
          c.entityId === catId
            ? { ...c, isGoalSnoozed: !c.isGoalSnoozed }
            : c
        ),
      }))
    );
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

  // Hide Category or Master Category (set isHidden flag, don't delete)
  const handleHideCategory = (id: string, isMaster?: boolean) => {
    setCategoryGroups((prev) => {
      if (isMaster) {
        return prev.map((g) =>
          g.entityId === id ? { ...g, isHidden: true } : g
        );
      }
      return prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) =>
          c.entityId === id ? { ...c, isHidden: true } : c
        ),
      }));
    });
    setSelectedCategoryIds((prev) => prev.filter((catId) => catId !== id));
  };

  // Unhide Category or Master Category
  const handleUnhideCategory = (id: string, isMaster?: boolean) => {
    setCategoryGroups((prev) => {
      if (isMaster) {
        return prev.map((g) =>
          g.entityId === id ? { ...g, isHidden: false } : g
        );
      }
      return prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) =>
          c.entityId === id ? { ...c, isHidden: false } : c
        ),
      }));
    });
  };

  // Unhide all hidden categories
  const handleUnhideAllCategories = () => {
    setCategoryGroups((prev) =>
      prev.map((g) => ({
        ...g,
        isHidden: false,
        categories: g.categories.map((c) => ({ ...c, isHidden: false })),
      }))
    );
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

  // Filter out hidden groups and hidden subcategories from regular budget list
  const nonHiddenGroups = categoryGroups
    .filter((g) => !g.isHidden)
    .map((grp) => ({
      ...grp,
      categories: grp.categories.filter((c) => !c.isHidden),
    }));

  // Collect hidden items for Hidden Categories row
  const hiddenSubcategories = categoryGroups.flatMap((g) =>
    g.categories.filter((c) => c.isHidden)
  );
  const hiddenGroups = categoryGroups.filter((g) => g.isHidden);
  const totalHiddenCount = hiddenSubcategories.length + hiddenGroups.length;

  // Filter groups and categories based on activeView
  const visibleCategoryGroups = activeView === 'all'
    ? nonHiddenGroups
    : nonHiddenGroups
        .map((grp) => ({
          ...grp,
          categories: grp.categories.filter((c) => isCategoryVisibleUnderView(c, activeView)),
        }))
        .filter((grp) => grp.categories.length > 0);

  // Overspent count across all non-hidden categories
  const allSubcategories = nonHiddenGroups.flatMap((g) => g.categories);
  const overspentCategories = allSubcategories.filter((c) => (c.available ?? 0) < 0);
  const overspentCount = overspentCategories.length;
  const hasCashOverspending = overspentCategories.some((c) => !c.isDebtPayment);
  const totalAssignedAllCategories = allSubcategories.reduce((sum, c) => sum + (c.assigned ?? 0), 0);

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
        currentMonthName={monthHeaderLabel}
        note={note}
        readyToAssignMilliunits={readyToAssign}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onOpenMonthPicker={(rect) => setMonthPickerPopover({ isOpen: true, triggerRect: rect })}
        onOpenNote={() => console.log('Open Note')}
        onAddMember={() => console.log('Add Member')}
        onOpenBreakdown={(rect) => setRtaBreakdownPopover({ isOpen: true, triggerRect: rect })}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <BudgetTable
            groups={visibleCategoryGroups}
            emptyStateContent={
              visibleCategoryGroups.length === 0
                ? getEmptyStateContent(activeView)
                : null
            }
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
            onOpenActivityModal={(id, rect) => {
              const cat = allSubcategories.find((c) => c.entityId === id);
              if (cat) {
                setActivityPopover({
                  isOpen: true,
                  triggerRect: rect,
                  category: { id: cat.entityId, name: cat.name, activity: cat.activity ?? 0 },
                });
              }
            }}
            onOpenMoveMoney={(catId, avail, rect) => {
              const cat = allSubcategories.find((c) => c.entityId === catId);
              setMoveMoneyModal({
                isOpen: true,
                triggerRect: rect,
                initialAmountMilliunits: avail,
                sourceCategory: { id: catId, name: cat?.name ?? 'Category', available: avail },
              });
            }}
            onOpenCoverOverspending={(catId, overspentAmount, rect) => {
              const cat = allSubcategories.find((c) => c.entityId === catId);
              if (cat) {
                setCoverOverspendingPopover({
                  isOpen: true,
                  triggerRect: rect,
                  category: { id: cat.entityId, name: cat.name, overspentAmount },
                });
              }
            }}
            onReorderGroups={handleReorderGroups}
            onMoveSubCategory={handleMoveSubCategory}
          />

          {/* Hidden Categories Master Row (Ember parity: .budget-table-hidden-row) */}
          {totalHiddenCount > 0 && (
            <div className="budget-table-hidden-row-container" style={{ padding: '0 0.5rem 0.5rem' }}>
              <div
                className="budget-table-row js-budget-table-row budget-table-row-ul is-master-category budget-table-hidden-row"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--tableRowBackgroundSubdued, #f1f5f9)',
                  borderRadius: '0.25rem',
                  marginTop: '0.5rem',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>
                    Hidden Categories ({totalHiddenCount})
                  </span>
                </div>
                <button
                  className="button button-link secondary"
                  type="button"
                  style={{ fontSize: '12px', cursor: 'pointer' }}
                  onClick={handleUnhideAllCategories}
                >
                  Show All Hidden Categories
                </button>
              </div>
            </div>
          )}
        </div>

        <BudgetInspector
          groups={categoryGroups}
          selectedCategoryIds={selectedCategoryIds}
          currentMonthName={monthName}
          readyToAssignMilliunits={readyToAssign}
          onUpdateNote={handleUpdateNote}
          onSaveTarget={handleSaveTarget}
          onDeleteTarget={handleDeleteTarget}
          onToggleSnoozeTarget={handleToggleSnoozeTarget}
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
        onHide={handleHideCategory}
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

      {/* Month Picker Popover */}
      <MonthPickerPopover
        isOpen={monthPickerPopover.isOpen}
        triggerRect={monthPickerPopover.triggerRect}
        currentMonth={currentMonthIdx}
        currentYear={currentYear}
        onSelectMonth={handleSelectMonthAndYear}
        onClose={() => setMonthPickerPopover({ isOpen: false, triggerRect: null })}
      />

      {/* RTA Breakdown Popover */}
      <RtaBreakdownPopover
        isOpen={rtaBreakdownPopover.isOpen}
        triggerRect={rtaBreakdownPopover.triggerRect}
        readyToAssignMilliunits={readyToAssign}
        monthName={monthName}
        totalAssignedMilliunits={totalAssignedAllCategories}
        onClose={() => setRtaBreakdownPopover({ isOpen: false, triggerRect: null })}
      />

      {/* Cover Overspending Popover */}
      <CoverOverspendingPopover
        isOpen={coverOverspendingPopover.isOpen}
        triggerRect={coverOverspendingPopover.triggerRect}
        overspentCategory={coverOverspendingPopover.category}
        groups={categoryGroups}
        readyToAssignMilliunits={readyToAssign}
        onCoverOverspending={(fromId, toId, amount) => handleMoveMoney(fromId, toId, amount)}
        onClose={() => setCoverOverspendingPopover({ isOpen: false, triggerRect: null, category: null })}
      />

      {/* Activity Transactions Popover */}
      <ActivityTransactionsPopover
        isOpen={activityPopover.isOpen}
        triggerRect={activityPopover.triggerRect}
        categoryName={activityPopover.category?.name ?? 'Category'}
        activityMilliunits={activityPopover.category?.activity ?? 0}
        onClose={() => setActivityPopover({ isOpen: false, triggerRect: null, category: null })}
      />
    </div>
  );
}

export default BudgetWorkspace;
