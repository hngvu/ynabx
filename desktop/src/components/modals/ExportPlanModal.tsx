import React, { useState } from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';
import { Checkbox } from '../core/Checkbox';
import { getBudgetMonth } from '../../api/tauriBridge';
import { exportToCSV } from '../reflect/reflectDataEngine';
import { MasterCategoryGroup } from '../budget/budgetData';

export interface ExportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: () => void;
  categoryGroups?: MasterCategoryGroup[];
}

export function generateBudgetPlanCsvRows(
  categoryGroups: MasterCategoryGroup[]
): string[][] {
  const rows: string[][] = [
    ['Category Group', 'Category', 'Budgeted', 'Activity', 'Available'],
  ];
  for (const grp of categoryGroups) {
    for (const cat of grp.categories) {
      rows.push([
        grp.name,
        cat.name,
        ((cat.assigned ?? 0) / 1000).toFixed(2),
        ((cat.activity ?? 0) / 1000).toFixed(2),
        ((cat.available ?? 0) / 1000).toFixed(2),
      ]);
    }
  }
  return rows;
}

/**
 * Exact decompiled from components/modals/export-budget.hbs (xlt class):
 * <Modal className="modal-budget-export">
 *   <Header>Export Plan</Header>
 *   <Body>Your data is just that—yours! All the requested data will be exported in CSV format...</Body>
 *   <Footer>
 *     <Checkbox className="checkbox-dont-show-again">Don't show again</Checkbox>
 *     <Button variant="secondary">Cancel</Button>
 *     <Button variant="primary">Export</Button>
 *   </Footer>
 * </Modal>
 */
export function ExportPlanModal({
  isOpen,
  onClose,
  onExport,
  categoryGroups,
}: ExportPlanModalProps) {
  const [dontRemindMe, setDontRemindMe] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let groups = categoryGroups;
      const now = new Date();
      const currentMonthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      if (!groups || groups.length === 0) {
        const res = await getBudgetMonth(currentMonthIso);
        groups = res?.categoryGroups ?? [];
      }
      const rows = generateBudgetPlanCsvRows(groups);
      exportToCSV(`budget_plan_${currentMonthIso.slice(0, 7)}.csv`, rows);
      onExport?.();
    } catch (err) {
      console.error('Failed to export budget plan:', err);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <Modal className="modal-budget-export" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Export Plan</Modal.Header>
      <Modal.Body>
        <p style={{ lineHeight: '1.5', color: '#334155' }}>
          Your data is just that—yours! All the requested data will be exported in CSV format so it's easy to open in other applications.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Checkbox
          className="checkbox-dont-show-again"
          isChecked={dontRemindMe}
          onChange={setDontRemindMe}
        >
          Don't show again
        </Checkbox>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button
          disabled={isExporting}
          onClick={handleExport}
          variant="primary"
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ExportPlanModal;
