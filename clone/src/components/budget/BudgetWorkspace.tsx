import React, { useState } from 'react';
import { BudgetHeader } from './BudgetHeader';
import { BudgetViewRow } from './BudgetViewRow';
import { BudgetTable } from './BudgetTable';
import { BudgetInspector } from './BudgetInspector';
import { AddMasterCategoryPopover } from './AddMasterCategoryPopover';
import { AddSubCategoryPopover } from './AddSubCategoryPopover';
import { EditCategoryPopover } from './EditCategoryPopover';
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
  const [readyToAssign, setReadyToAssign] = useState(0);
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
        onAutoAssign={() => console.log('Auto assign')}
      />

      {/* 2. Budget Views Row */}
      <BudgetViewRow
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        onOpenViewsMenu={() => console.log('Manage Views')}
      />

      {/* 3. Budget Table and Inspector Flexbox */}
      <div className="budget-table-and-inspector js-budget-table-and-inspector">
        <BudgetTable
          groups={categoryGroups}
          selectedCategoryIds={selectedCategoryIds}
          showProgressBars={showProgressBars}
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

        <BudgetInspector
          groups={categoryGroups}
          selectedCategoryIds={selectedCategoryIds}
          currentMonthName={currentMonth}
          onAutoAssign={() => console.log('Auto assign inspector')}
          onClearSelection={() => setSelectedCategoryIds([])}
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
    </div>
  );
}

export default BudgetWorkspace;
