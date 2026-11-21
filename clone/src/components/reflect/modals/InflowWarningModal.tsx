import React, { useEffect } from 'react';

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
  totalNegativeActivity = '$0.00',
  totalPositiveActivity = '+$0.00',
  totalSpending = '$0.00'
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      className="modal-overlay active"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10010,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
      }}
    >
      <div
        className="modal-fresh mod-skinny spending-breakdown-inflow-warning-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
          borderRadius: '0.5rem',
          width: '400px',
          maxWidth: '90vw',
          padding: '1.25rem',
          boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
          opacity: 1,
        }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '16px', marginBottom: '0.75rem' }}>
          <span>Understanding Your Spending</span>
          <button type="button" className="ghost-button primary is-icon-only button-close" onClick={onClose} aria-label="Close">
            <svg className="ynab-new-icon" width="12" height="12">
              <use href="#icon_sprite_close" />
            </svg>
          </button>
        </div>
        <div className="modal-content" style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--labelSecondary, #475569)', marginBottom: '1rem' }}>
          Your net outflows were <strong>{totalNegativeActivity}</strong>, and you received <strong>{totalPositiveActivity}</strong> of net inflows to your categories. That makes your total spending <strong>{totalSpending}</strong>.
        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href="https://support.ynab.com/en_us/how-to-add-income-and-other-inflows-H1ZNjfZJi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '13px', color: 'var(--actionPrimary, #2563eb)' }}
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
