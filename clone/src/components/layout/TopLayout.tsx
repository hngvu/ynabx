import React, { useState, useEffect } from 'react';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';

export interface TopLayoutProps {
  children: React.ReactNode;
  loggedIn?: boolean;
}

export function TopLayout({ children, loggedIn = true }: TopLayoutProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelpOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen]);

  return (
    <div className="layout">
      <style>{`
        .budget-inspector-content { padding-bottom: 4.5rem !important; }
        .reflect-content { padding-bottom: 4.5rem !important; }
      `}</style>
      <div className={`content-layout ${loggedIn ? 'user-logged-in' : 'user-logged-out'}`}>
        {children}
        {loggedIn && (
          <div className="chat-widget">
            <Button
              aria-label="?"
              title="Help"
              onClick={() => setHelpOpen((v) => !v)}
            >
              <Icon name="question_mark" width={24} />
            </Button>
            {helpOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="YNAB Help"
                style={{
                  position: 'fixed',
                  bottom: '4.5rem',
                  right: '1.25rem',
                  width: '300px',
                  backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
                  border: '1px solid var(--separatorStandard, #e2e8f0)',
                  borderRadius: '0.5rem',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                  padding: '1rem',
                  zIndex: 10010,
                  color: 'var(--labelPrimary, #1e293b)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '14px' }}>Help &amp; Resources</strong>
                  <button
                    type="button"
                    aria-label="Close Help"
                    onClick={() => setHelpOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--labelSecondary)' }}
                  >
                    ×
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--labelSecondary)', margin: '0 0 0.75rem' }}>
                  Need help with your budget, targets, or account reconciliation?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <a
                    href="https://support.ynab.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="button button-secondary"
                    style={{ textAlign: 'center', textDecoration: 'none', padding: '6px 10px', fontSize: '12px' }}
                  >
                    YNAB Help Center
                  </a>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => setHelpOpen(false)}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TopLayout;
