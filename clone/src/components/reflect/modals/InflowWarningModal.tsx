import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const InflowWarningModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-fresh mod-skinny spending-breakdown-inflow-warning-modal">
        <div className="modal-header">
          <h3>Positive Inflows</h3>
          <button type="button" className="button-close" onClick={onClose}>
            <svg className="ynab-new-icon" width="12" height="12">
              <use href="#icon_sprite_close" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p>
            You have income or refunds categorized directly to spending categories. They reduce your total spending in those categories and are displayed in the Positive Inflows card.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="button-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
