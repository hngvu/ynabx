import React, { useState } from 'react';
import { formatMilliunits, NetWorthMonthPoint } from '../reflectDataEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  netWorthData: {
    currentNetWorth: number;
    totalAssets: number;
    totalDebts: number;
    change: number;
    percentage: number;
    history: NetWorthMonthPoint[];
  };
}

export const ChartImageExporterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  netWorthData,
}) => {
  const [hideAmounts, setHideAmounts] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentMonthPoint = netWorthData.history[netWorthData.history.length - 1];

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className="modal-fresh modal-chart-image-exporter"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          zIndex: 9999,
          width: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--separatorStandard, #e5e5e5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Share Your Progress</h3>
          <button
            type="button"
            className="ghost-button is-icon-only button-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg className="ynab-new-icon" width="12" height="12">
              <use href="#icon_sprite_close" />
            </svg>
          </button>
        </div>

        {/* Content Preview */}
        <div className="modal-content" style={{ padding: 24, overflowY: 'auto' }}>
          {/* Card Preview (YNAB style gradient background) */}
          <div
            style={{
              background: 'linear-gradient(180deg, #4c6ef5 0%, #3b5bdb 100%)',
              padding: '24px 20px',
              borderRadius: 12,
              color: '#fff',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(76, 110, 245, 0.3)',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              From worried to worth it.
            </h2>

            {/* Inner White Card */}
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: '20px 16px',
                color: '#222',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Net Worth</div>
              <div style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 16px', color: '#111' }}>
                {hideAmounts ? '••••••' : formatMilliunits(netWorthData.currentNetWorth)}
              </div>

              {/* Mini Stats Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16 }}>
                <div>
                  <span style={{ color: '#4c6ef5', fontWeight: 700 }}>■ Assets</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {hideAmounts ? '••••••' : formatMilliunits(netWorthData.totalAssets)}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#fa5252', fontWeight: 700 }}>■ Debts</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {hideAmounts ? '••••••' : formatMilliunits(-netWorthData.totalDebts)}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Change in Net Worth</span>
                  <div style={{ fontWeight: 600, color: '#2b8a3e', marginTop: 2 }}>
                    {hideAmounts ? '••••••' : formatMilliunits(netWorthData.change, true)} ↑ {netWorthData.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Mini trend visualization preview */}
              <div
                style={{
                  height: 100,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                  padding: '8px 0',
                  borderTop: '1px dashed #eee',
                }}
              >
                {netWorthData.history.slice(-6).map((pt, i) => {
                  const maxH = 80;
                  const ratio = Math.min(1, Math.max(0.2, (pt.assets / 1000) / 70000));
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${ratio * maxH}px`,
                          background: '#4c6ef5',
                          borderRadius: '3px 3px 0 0',
                        }}
                      />
                      <span style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{pt.month.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, fontWeight: 800, color: '#4c6ef5' }}>
                YNAB.
              </div>
            </div>
          </div>

          {/* Toggle Hide Amounts */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>Hide Monetary Amounts</span>
            <input
              type="checkbox"
              checked={hideAmounts}
              onChange={(e) => setHideAmounts(e.target.checked)}
              style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            background: '#fafafa',
          }}
        >
          <button
            type="button"
            className="ghost-button secondary"
            onClick={handleCopyLink}
            style={{ padding: '8px 16px', fontSize: 13, borderRadius: 6, cursor: 'pointer' }}
          >
            {copied ? 'Copied!' : 'Copy Referral Link'}
          </button>
          <button
            type="button"
            className="ynab-button primary"
            onClick={onClose}
            style={{ padding: '8px 20px', fontSize: 13, borderRadius: 6, cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
