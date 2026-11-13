import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  totalNegativeActivity?: string;
  totalPositiveActivity?: string;
  totalSpending?: string;
}

export const InflowWarningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  totalNegativeActivity = '$2,520.50',
  totalPositiveActivity = '+$70.00',
  totalSpending = '$2,450.50'
}) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay active">
      <div className="modal-fresh mod-skinny spending-breakdown-inflow-warning-modal">
        <div className="modal-header">
          Understanding Your Spending
          <button type="button" className="ghost-button primary is-icon-only button-close" onClick={onClose}>
            <svg className="ynab-new-icon" width="12" height="12">
              <use href="#icon_sprite_close" />
            </svg>
          </button>
        </div>
        <div className="modal-content">
          Your net outflows were {totalNegativeActivity}, and you received {totalPositiveActivity} of net inflows to your categories. That makes your total spending {totalSpending}.
        </div>
        <div className="modal-actions">
          <a
            href="https://support.ynab.com/en_us/how-to-add-income-and-other-inflows-H1ZNjfZJi"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn More
          </a>
          <button type="button" className="ynab-button primary" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
