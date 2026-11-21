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
import { ActivityTransactionsPopover, ActivityTransaction } from './ActivityTransactionsPopover';
import { INITIAL_TRANSACTIONS, TransactionItem } from '../accounts/accountData';
import { RecentMovesModal } from './RecentMovesModal';
import { BudgetNoteModal } from './BudgetNoteModal';
import { HiddenCategoriesModal } from './HiddenCategoriesModal';
import { INITIAL_CATEGORY_GROUPS, MasterCategoryGroup } from './budgetData';
import { CategoryTarget } from './categoryTargetStatus';
import {
  addMonthsToKey,
  applyQuickBudgetMethod,
  computeCashAvailable,
  computeMonthRollover,
  computeQuickBudgetOptions,
  formatMonthKey,
  MoneyMoveRecord,
  MonthlyLedgerSnapshot,
  MonthKey,
  parseMonthKey,
  QuickBudgetMethod,
} from '../../services/slikBudgetEngine';
import {
  KeyboardShortcut,
  keyboardShortcutsService,
  KBShortcutResult,
} from '../../services/keyboardShortcuts';

export interface BudgetWorkspaceProps {
  onAddAccount?: () => void;
  onOpenSettings?: () => void;
  onAddMember?: () => void;
  transactions?: TransactionItem[];
}

export function BudgetWorkspace({
  onAddAccount,
  onOpenSettings,
  onAddMember,
  transactions = INITIAL_TRANSACTIONS,
}: BudgetWorkspaceProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 1)); // Default Nov 2026
  const initialMonthKey = formatMonthKey(new Date(2026, 10, 1));
  const [monthsLedger, setMonthsLedger] = useState<Record<MonthKey, MonthlyLedgerSnapshot>>(() => {
    const decKey = formatMonthKey(new Date(2026, 11, 1));
    const janKey = formatMonthKey(new Date(2027, 0, 1));
    // Mock future months data so Future Months totals and navigation can be fully tested
    const decGroups = INITIAL_CATEGORY_GROUPS.map((g) => ({
      ...g,
      categories: g.categories.map((c) => ({
        ...c,
        assigned: c.entityId === 'cat-rent' ? 1200000 : c.entityId === 'cat-groceries' ? 300000 : 0,
        available: c.entityId === 'cat-rent' ? 1200000 : c.entityId === 'cat-groceries' ? 300000 : 0,
      })),
    }));
    const janGroups = INITIAL_CATEGORY_GROUPS.map((g) => ({
      ...g,
      categories: g.categories.map((c) => ({
        ...c,
        assigned: c.entityId === 'cat-rent' ? 1200000 : 0,
        available: c.entityId === 'cat-rent' ? 1200000 : 0,
      })),
    }));
    return {
      [initialMonthKey]: {
        monthKey: initialMonthKey,
        groups: INITIAL_CATEGORY_GROUPS,
        readyToAssign: 500000,
        note: '',
      },
      [decKey]: {
        monthKey: decKey,
        groups: decGroups,
        readyToAssign: 200000,
        note: 'Planned ahead for December',
      },
      [janKey]: {
        monthKey: janKey,
        groups: janGroups,
        readyToAssign: 100000,
        note: '',
      },
    };
  });
  const [undoStack, setUndoStack] = useState<MonthlyLedgerSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<MonthlyLedgerSnapshot[]>([]);
  const [recentMoves, setRecentMoves] = useState<MoneyMoveRecord[]>([]);
  const [activeView, setActiveView] = useState('all');
  const [manageViewsOpen, setManageViewsOpen] = useState(false);
  const [showProgressBars, setShowProgressBars] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const currentMonthKey = formatMonthKey(currentDate);
  const currentSnapshot = monthsLedger[currentMonthKey] ?? {
    monthKey: currentMonthKey,
    groups: INITIAL_CATEGORY_GROUPS,
    readyToAssign: 500000,
    note: '',
  };
  const categoryGroups = currentSnapshot.groups;
  const readyToAssign = currentSnapshot.readyToAssign;
  const note = currentSnapshot.note;

  const setCategoryGroups = (updater: React.SetStateAction<MasterCategoryGroup[]>) => {
    setMonthsLedger((prev) => {
      const snap = prev[currentMonthKey] ?? currentSnapshot;
      const nextGroups = typeof updater === 'function' ? updater(snap.groups) : updater;
      return {
        ...prev,
        [currentMonthKey]: { ...snap, groups: nextGroups },
      };
    });
  };

  const setReadyToAssign = (updater: React.SetStateAction<number>) => {
    setMonthsLedger((prev) => {
      const snap = prev[currentMonthKey] ?? currentSnapshot;
      const nextRta = typeof updater === 'function' ? updater(snap.readyToAssign) : updater;
      return {
        ...prev,
        [currentMonthKey]: { ...snap, readyToAssign: nextRta },
      };
    });
  };

  const setNote = (nextNote: string) => {
    setMonthsLedger((prev) => {
      const snap = prev[currentMonthKey] ?? currentSnapshot;
      return {
        ...prev,
        [currentMonthKey]: { ...snap, note: nextNote },
      };
    });
  };

  const pushUndoSnapshot = () => {
    setUndoStack((prev) => [...prev.slice(-24), currentSnapshot]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevSnap = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, currentSnapshot]);
    setMonthsLedger((prev) => ({ ...prev, [prevSnap.monthKey]: prevSnap }));
    setCurrentDate(parseMonthKey(prevSnap.monthKey));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, currentSnapshot]);
    setMonthsLedger((prev) => ({ ...prev, [nextSnap.monthKey]: nextSnap }));
    setCurrentDate(parseMonthKey(nextSnap.monthKey));
  };

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

  const [recentMovesOpen, setRecentMovesOpen] = useState(false);

  const [budgetNoteModal, setBudgetNoteModal] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

  const [hiddenCategoriesModal, setHiddenCategoriesModal] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

  // Navigation handlers with multi-month rollover
  const switchToMonth = (targetDate: Date) => {
    const targetKey = formatMonthKey(targetDate);
    setMonthsLedger((prev) => {
      if (prev[targetKey]) return prev;
      const prevKey = addMonthsToKey(targetKey, -1);
      const sourceSnap = prev[prevKey] ?? currentSnapshot;
      const rolled = computeMonthRollover({
        prevGroups: sourceSnap.groups,
        prevReadyToAssign: sourceSnap.readyToAssign,
      });
      return {
        ...prev,
        [targetKey]: {
          monthKey: targetKey,
          groups: rolled.groups,
          readyToAssign: rolled.readyToAssign,
          note: '',
        },
      };
    });
    setCurrentDate(targetDate);
    setSelectedCategoryIds([]);
  };

  const handlePrevMonth = () => {
    switchToMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    switchToMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSelectMonthAndYear = (monthIdx: number, year: number) => {
    switchToMonth(new Date(year, monthIdx, 1));
  };

  const handleGoToToday = () => {
    switchToMonth(new Date(2026, 10, 1));
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
  const handleUpdateAssigned = (catId: string, newAssignedMilliunits: number) => {
    const targetCat = categoryGroups.flatMap((g) => g.categories).find((c) => c.entityId === catId);
    if (!targetCat || (targetCat.assigned ?? 0) === newAssignedMilliunits) return;
    pushUndoSnapshot();
    const diff = (targetCat.assigned ?? 0) - newAssignedMilliunits;
    const delta = -diff;
    setRecentMoves((prev) => [
      {
        id: `move-${Date.now()}-${catId}`,
        timestamp: new Date().toISOString(),
        monthKey: currentMonthKey,
        fromCategoryId: delta > 0 ? null : catId,
        fromCategoryName: delta > 0 ? 'Ready to Assign' : targetCat.name,
        toCategoryId: delta > 0 ? catId : null,
        toCategoryName: delta > 0 ? targetCat.name : 'Ready to Assign',
        amount: Math.abs(delta),
      },
      ...prev.slice(0, 49),
    ]);
    setCategoryGroups((prev) =>
      prev.map((grp) => ({
        ...grp,
        categories: grp.categories.map((c) => {
          if (c.entityId === catId) {
            return {
              ...c,
              assigned: newAssignedMilliunits,
              available: (c.available ?? 0) - diff,
            };
          }
          return c;
        }),
      }))
    );
    setReadyToAssign((rta) => rta + diff);
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
    if (amountMilliunits === 0) return;
    pushUndoSnapshot();
    const allCats = categoryGroups.flatMap((g) => g.categories);
    const fromCat = fromCatId ? allCats.find((c) => c.entityId === fromCatId) : null;
    const toCat = allCats.find((c) => c.entityId === toCatId);
    setRecentMoves((prev) => [
      {
        id: `move-${Date.now()}-${toCatId}`,
        timestamp: new Date().toISOString(),
        monthKey: currentMonthKey,
        fromCategoryId: fromCatId,
        fromCategoryName: fromCat ? fromCat.name : 'Ready to Assign',
        toCategoryId: toCatId,
        toCategoryName: toCat ? toCat.name : 'Category',
        amount: Math.abs(amountMilliunits),
      },
      ...prev.slice(0, 49),
    ]);
    setCategoryGroups((prev) =>
      prev.map((grp) => ({
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
      }))
    );
    if (!fromCatId) {
      setReadyToAssign((rta) => rta - amountMilliunits);
    }
  };

  const handlePerformQuickBudget = (method: QuickBudgetMethod) => {
    pushUndoSnapshot();
    const prevKey = addMonthsToKey(currentMonthKey, -1);
    const result = applyQuickBudgetMethod({
      groups: categoryGroups,
      targetCategoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : null,
      method,
      readyToAssign,
      monthKey: currentMonthKey,
      prevMonthGroups: monthsLedger[prevKey]?.groups,
    });
    if (result.moves.length > 0) {
      setRecentMoves((prev) => [...result.moves, ...prev].slice(0, 50));
    }
    setMonthsLedger((prev) => ({
      ...prev,
      [currentMonthKey]: {
        ...currentSnapshot,
        groups: result.groups,
        readyToAssign: result.readyToAssign,
      },
    }));
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
    g.categories.filter((c) => c.isHidden || g.isHidden)
  );
  const hiddenGroups = categoryGroups.filter((g) => g.isHidden);
  const totalHiddenCount = hiddenSubcategories.length + hiddenGroups.length;
  const hiddenBudgeted = hiddenSubcategories.reduce((sum, c) => sum + (c.assigned ?? 0), 0);
  const hiddenActivity = hiddenSubcategories.reduce((sum, c) => sum + (c.activity ?? 0), 0);
  const hiddenAvailable = hiddenSubcategories.reduce((sum, c) => sum + (c.available ?? 0), 0);

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

  const cashAvailableMilliunits = computeCashAvailable(nonHiddenGroups);
  const isNotViewingCurrentMonth = currentMonthKey !== initialMonthKey;
  const prevMonthKey = addMonthsToKey(currentMonthKey, -1);
  const selectedSubCategories = allSubcategories.filter((c) => selectedCategoryIds.includes(c.entityId));
  const quickBudgetOptions = computeQuickBudgetOptions({
    categories: selectedSubCategories.length > 0 ? selectedSubCategories : allSubcategories,
    leftToBudget: readyToAssign,
    hasExplicitSelection: selectedSubCategories.length > 0,
    prevMonthGroups: monthsLedger[prevMonthKey]?.groups,
  });

  // Calculate future months from monthsLedger
  const futureMonthsList = Object.keys(monthsLedger)
    .filter((k) => k > currentMonthKey)
    .sort()
    .map((k) => {
      const snap = monthsLedger[k];
      const d = parseMonthKey(k);
      const mLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const assignedSum = snap.groups.flatMap((g) => g.categories).reduce((s, c) => s + (c.assigned ?? 0), 0);
      const targetSum = snap.groups.flatMap((g) => g.categories).reduce((s, c) => s + (c.target?.targetAmount ?? 0), 0);
      const proportionOfFunding = targetSum > 0 ? Math.min(1, assignedSum / targetSum) : null;
      return {
        monthKey: k,
        monthDate: d,
        monthLabel: mLabel,
        assigned: assignedSum,
        readyToAssign: snap.readyToAssign,
        proportionOfFunding,
      };
    });

  return (
    <div className="content-min-break has-budget-views">
      {/* 1. Header (Month Nav + Ready to Assign banner + Share button) */}
      <BudgetHeader
        currentMonthName={monthHeaderLabel}
        note={note}
        readyToAssignMilliunits={readyToAssign}
        cashAvailableMilliunits={cashAvailableMilliunits}
        isNotViewingCurrentMonth={isNotViewingCurrentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onGoToToday={handleGoToToday}
        onOpenMonthPicker={(rect) => setMonthPickerPopover({ isOpen: true, triggerRect: rect })}
        onOpenNote={(rect) => setBudgetNoteModal({ isOpen: true, triggerRect: rect ?? null })}
        onAddMember={() => onAddMember?.()}
        onOpenAddAccount={onAddAccount}
        onOpenBreakdown={(rect) => setRtaBreakdownPopover({ isOpen: true, triggerRect: rect })}
        onAutoAssign={(rect) => {
          const btn = document.querySelector('.to-be-budgeted-button');
          const resolvedRect = rect ?? btn?.getBoundingClientRect() ?? null;
          if (readyToAssign < 0) {
            setCoverOverspendingPopover({
              isOpen: true,
              triggerRect: resolvedRect,
              category: { id: '', name: 'Ready to Assign', overspentAmount: Math.abs(readyToAssign) },
            });
          } else {
            setMoveMoneyModal({
              isOpen: true,
              triggerRect: resolvedRect,
              initialAmountMilliunits: readyToAssign > 0 ? readyToAssign : 0,
              sourceCategory: { id: '', name: 'Ready to Assign', isToBeBudgeted: true },
            });
          }
        }}
      />

      {/* 2. Budget Views Row */}
      <BudgetViewRow
        activeView={activeView}
        overspentCount={overspentCount}
        hasCashOverspending={hasCashOverspending}
        onSelectView={handleSelectView}
        onOpenViewsMenu={() => setManageViewsOpen(true)}
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
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            recentMovesCount={recentMoves.length}
            onRecentMoves={() => setRecentMovesOpen(true)}
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
            hiddenCount={totalHiddenCount}
            hiddenBudgeted={hiddenBudgeted}
            hiddenActivity={hiddenActivity}
            hiddenAvailable={hiddenAvailable}
            onOpenHiddenCategories={(rect) =>
              setHiddenCategoriesModal({ isOpen: true, triggerRect: rect })
            }
          />
        </div>

        <BudgetInspector
          groups={categoryGroups}
          selectedCategoryIds={selectedCategoryIds}
          currentMonthName={monthName}
          readyToAssignMilliunits={readyToAssign}
          futureMonths={futureMonthsList}
          isCurrentCalendarMonth={!isNotViewingCurrentMonth}
          onNavigateToMonth={(targetDate: Date) => switchToMonth(targetDate)}
          onCoverOverspending={() => {
            const btn = document.querySelector('.to-be-budgeted-button');
            setCoverOverspendingPopover({
              isOpen: true,
              triggerRect: btn?.getBoundingClientRect() ?? null,
              category: { id: '', name: 'Ready to Assign', overspentAmount: Math.abs(readyToAssign) },
            });
          }}
          quickBudgetOptions={quickBudgetOptions}
          onPerformQuickBudget={handlePerformQuickBudget}
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
          const map: Record<string, QuickBudgetMethod> = {
            underfunded: 'underfunded',
            assignedLastMonth: 'assignedLastMonth',
            spentLastMonth: 'spentLastMonth',
            resetAssigned: 'resetAssigned',
          };
          if (map[opt]) {
            handlePerformQuickBudget(map[opt]);
          }
        }}
      />

      {/* Recent Moves Modal */}
      <RecentMovesModal
        isOpen={recentMovesOpen}
        onClose={() => setRecentMovesOpen(false)}
        moves={recentMoves.filter((m) => m.monthKey === currentMonthKey)}
        monthName={monthName}
      />

      {/* Budget Month Note Modal */}
      <BudgetNoteModal
        isOpen={budgetNoteModal.isOpen}
        onClose={() => setBudgetNoteModal({ isOpen: false, triggerRect: null })}
        triggerRect={budgetNoteModal.triggerRect}
        monthName={monthName}
        initialNote={note}
        onSave={setNote}
      />

      {/* Hidden Categories Modal */}
      <HiddenCategoriesModal
        isOpen={hiddenCategoriesModal.isOpen}
        onClose={() => setHiddenCategoriesModal({ isOpen: false, triggerRect: null })}
        triggerRect={hiddenCategoriesModal.triggerRect}
        groups={categoryGroups}
        onUnhide={handleUnhideCategory}
        onUnhideAll={handleUnhideAllCategories}
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
        transactions={(() => {
          const cat = activityPopover.category;
          if (!cat) return [] as ActivityTransaction[];
          const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          const list: ActivityTransaction[] = [];
          for (const tx of transactions) {
            if (!tx.date.startsWith(monthPrefix)) continue;
            if (tx.isSplit && tx.subTransactions) {
              for (const sub of tx.subTransactions) {
                if (sub.subCategoryId === cat.id || sub.subCategoryName === cat.name) {
                  list.push({
                    id: sub.entityId,
                    accountName: tx.accountName,
                    date: tx.date,
                    payeeName: tx.payeeName,
                    memo: sub.memo || tx.memo,
                    amountMilliunits: sub.amount,
                  });
                }
              }
            } else if (tx.subCategoryId === cat.id || tx.subCategoryName === cat.name) {
              list.push({
                id: tx.entityId,
                accountName: tx.accountName,
                date: tx.date,
                payeeName: tx.payeeName,
                memo: tx.memo,
                amountMilliunits: tx.amount,
              });
            }
          }
          return list;
        })()}
        onClose={() => setActivityPopover({ isOpen: false, triggerRect: null, category: null })}
      />

      {manageViewsOpen && (
        <div
          className="modal-overlay active"
          style={{ position: 'fixed', inset: 0, zIndex: 10020, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setManageViewsOpen(false)}
        >
          <div
            className="modal-fresh mod-skinny"
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)', borderRadius: '0.5rem', width: '360px', padding: '1rem 1.25rem', boxShadow: '0 16px 48px rgba(0,0,0,0.22)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '15px', color: 'var(--labelPrimary)' }}>Manage Views</strong>
              <button type="button" aria-label="Close" onClick={() => setManageViewsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'overspent', label: 'Overspent' },
                { id: 'underfunded', label: 'Underfunded' },
                { id: 'overfunded', label: 'Overfunded' },
                { id: 'money-available', label: 'Money Available' },
                { id: 'snoozed', label: 'Snoozed' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`button ${activeView === v.id ? 'button-primary' : 'button-secondary'}`}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '13px' }}
                  onClick={() => {
                    setActiveView(v.id);
                    setManageViewsOpen(false);
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetWorkspace;
