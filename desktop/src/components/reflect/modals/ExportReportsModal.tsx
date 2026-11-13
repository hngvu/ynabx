import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportName: string;
  onExportConfirm: (dontRemind: boolean) => void;
}

export const ExportReportsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  reportName,
  onExportConfirm,
}) => {
  const [dontRemind, setDontRemind] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    onExportConfirm(dontRemind);
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className="modal-fresh mod-skinny modal-export-reports"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          zIndex: 9999,
          width: 420,
          border: '1px solid var(--separatorStandard, #e5e5e5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '16px 20px', fontWeight: 600, borderBottom: '1px solid #eee', fontSize: 16 }}>
          Export {reportName}
        </div>

        <div className="modal-content" style={{ padding: '16px 20px', fontSize: 13, color: '#444', lineHeight: 1.5 }}>
          Your report data will be exported as a CSV file matching the currently selected timeframe, categories, and accounts.
        </div>

        <div
          className="modal-actions"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafafa',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="checkbox-dont-show-again"
              checked={dontRemind}
              onChange={(e) => setDontRemind(e.target.checked)}
            />
            Don't show again
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ghost-button secondary"
              onClick={onClose}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ynab-button primary"
              onClick={handleExport}
              style={{ padding: '6px 16px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
