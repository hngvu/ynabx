import React, { useState } from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';

export interface DisplayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (options: { theme: string; progressBars: boolean; differentiateWithoutColor: boolean }) => void;
}

export function applyTheme(theme: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('theme-dark');
  if (theme === 'theme-dark') {
    root.classList.add('theme-dark');
  } else if (theme === 'theme-match-system') {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('theme-dark');
    }
  }
}

/**
 * Exact decompiled from components/theme-switcher/index.gts
 */
export function DisplayOptionsModal({ isOpen, onClose, onSave }: DisplayOptionsModalProps) {
  if (!isOpen) return null;

  const [theme, setTheme] = useState<'default' | 'theme-dark' | 'theme-match-system'>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ynab_theme') : null;
    if (stored === 'theme-dark' || stored === 'theme-match-system') return stored;
    return 'default';
  });
  const [progressBars, setProgressBars] = useState(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ynab_progress_bars') : null;
    return stored !== null ? stored === 'true' : true;
  });
  const [differentiateWithoutColor, setDifferentiateWithoutColor] = useState(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ynab_differentiate_colors') : null;
    return stored === 'true';
  });

  const handleSave = () => {
    applyTheme(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ynab_theme', theme);
      localStorage.setItem('ynab_progress_bars', String(progressBars));
      localStorage.setItem('ynab_differentiate_colors', String(differentiateWithoutColor));
    }
    onSave?.({
      theme: theme === 'default' ? '' : theme,
      progressBars,
      differentiateWithoutColor,
    });
    onClose();
  };

  return (
    <Modal className="ynab-new-theme-switcher modal-theme-switcher" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Display Options</Modal.Header>
      <Modal.Body>
        <div className="modal-content js-ynab-new-theme-switcher-themes" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Theme Option */}
          <div className="ynab-new-theme-switcher-option">
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>Theme</h3>
            <div className="ynab-new-theme-switcher-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <button
                type="button"
                className={`ynab-button secondary ${theme === 'default' ? 'active' : ''}`}
                style={{
                  border: theme === 'default' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}
                onClick={() => setTheme('default')}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Default</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Light mode</div>
              </button>

              <button
                type="button"
                className={`ynab-button secondary ${theme === 'theme-dark' ? 'active' : ''}`}
                style={{
                  border: theme === 'theme-dark' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                }}
                onClick={() => setTheme('theme-dark')}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Dark</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Dark mode</div>
              </button>

              <button
                type="button"
                className={`ynab-button secondary ${theme === 'theme-match-system' ? 'active' : ''}`}
                style={{
                  border: theme === 'theme-match-system' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}
                onClick={() => setTheme('theme-match-system')}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Match System</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Automatic</div>
              </button>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="ynab-new-theme-switcher-option ynab-new-theme-switcher-option-progress-bars">
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>Progress Bars</h3>
            <div className="ynab-new-theme-switcher-grid" style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`ynab-button secondary ${progressBars ? 'active' : ''}`}
                style={{
                  border: progressBars ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 24px',
                }}
                onClick={() => setProgressBars(true)}
              >
                On
              </button>
              <button
                type="button"
                className={`ynab-button secondary ${!progressBars ? 'active' : ''}`}
                style={{
                  border: !progressBars ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 24px',
                }}
                onClick={() => setProgressBars(false)}
              >
                Off
              </button>
            </div>
          </div>

          {/* Available Balance Style */}
          <div className="ynab-new-theme-switcher-option ynab-new-theme-switcher-option-available-balance-style">
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>Available Balance Style</h3>
            <div className="ynab-new-theme-switcher-grid" style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`ynab-button secondary ${!differentiateWithoutColor ? 'active' : ''}`}
                style={{
                  border: !differentiateWithoutColor ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                }}
                onClick={() => setDifferentiateWithoutColor(false)}
              >
                Default (Color pills)
              </button>
              <button
                type="button"
                className={`ynab-button secondary ${differentiateWithoutColor ? 'active' : ''}`}
                style={{
                  border: differentiateWithoutColor ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                }}
                onClick={() => setDifferentiateWithoutColor(true)}
              >
                Differentiate without color
              </button>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} variant="secondary">Cancel</Button>
        <Button onClick={handleSave} variant="primary">Apply</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DisplayOptionsModal;
