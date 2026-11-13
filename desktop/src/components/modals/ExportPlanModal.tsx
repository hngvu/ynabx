import React, { useState } from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';
import { Checkbox } from '../core/Checkbox';

export interface ExportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: () => void;
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
export function ExportPlanModal({ isOpen, onClose, onExport }: ExportPlanModalProps) {
  if (!isOpen) return null;

  const [dontRemindMe, setDontRemindMe] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      onExport?.();
      setIsExporting(false);
      onClose();
    }, 600);
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
