import React, { useEffect, useState } from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';
import {
  KeyboardShortcut,
  SHORTCUT_DEFINITIONS,
  keyboardShortcutsService,
  KBShortcutResult,
} from '../../services/keyboardShortcuts';
import { ShortcutKeys } from '../core/ShortcutKeys';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * EXACT REVERSE-ENGINEERED FROM:
 * components/modals/keyboard-shortcuts/index.hbs (rut, out)
 * wrapper.renamed.js (lines 184305-184345)
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [shortcutsDisabled, setShortcutsDisabled] = useState(
    keyboardShortcutsService.disableKeyboardShortcuts
  );

  useEffect(() => {
    return keyboardShortcutsService.subscribe(() => {
      setShortcutsDisabled(keyboardShortcutsService.disableKeyboardShortcuts);
    });
  }, []);

  // Register Esc and ? to close modal via KeyboardShortcutsService
  useEffect(() => {
    if (!isOpen) return;

    const target = {};
    const handleClose = (e: { stopOtherShortcuts: () => void }) => {
      e.stopOtherShortcuts();
      onClose();
      return KBShortcutResult.Success;
    };

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.OpenShortcutHelpModal,
      target,
      handleClose
    );
    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.CloseModal,
      target,
      handleClose
    );

    return () => {
      keyboardShortcutsService.removeAllShortcutsForTarget(target);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filterShortcuts = (location: 'universal' | 'budget' | 'accounts' | 'datePicker') => {
    return (Object.keys(SHORTCUT_DEFINITIONS) as KeyboardShortcut[])
      .filter(k => SHORTCUT_DEFINITIONS[k].uiLocation === location)
      .map(k => ({
        constant: k,
        title: SHORTCUT_DEFINITIONS[k].title || k,
      }));
  };

  const universalShortcuts = filterShortcuts('universal');
  const budgetShortcuts = filterShortcuts('budget');
  const accountsShortcuts = filterShortcuts('accounts');
  const datePickerShortcuts = filterShortcuts('datePicker');

  const enableShortcuts = () => {
    keyboardShortcutsService.disableKeyboardShortcuts = false;
  };

  return (
    <Modal className="modal-keyboard-shortcuts" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Keyboard Shortcuts</Modal.Header>
      <Modal.Body>
        <div className="modal-keyboard-shortcuts-body js-focus-on-start" tabIndex={-1}>
          {shortcutsDisabled && (
            <div className="ynab-helpbox" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'var(--calloutNeutralBackground, #f1f5f9)', borderRadius: '0.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, color: 'var(--iconFillSecondary, #64748b)' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              <div>Keyboard shortcuts are disabled</div>
              <div className="helpbox-enable-shortcuts" style={{ marginLeft: 'auto' }}>
                <Button variant="primary" onClick={enableShortcuts}>
                  Enable Shortcuts
                </Button>
              </div>
            </div>
          )}

          <h3>Universal</h3>
          <ul>
            {universalShortcuts.map(s => (
              <li key={s.constant}>
                <span>{s.title}</span>
                <ShortcutKeys shortcut={s.constant} alwaysShow={true} />
              </li>
            ))}
          </ul>

          <h3>Plan Actions</h3>
          <ul>
            {budgetShortcuts.map(s => (
              <li key={s.constant}>
                <span>{s.title}</span>
                <ShortcutKeys shortcut={s.constant} alwaysShow={true} />
              </li>
            ))}
          </ul>

          <h3>Account Actions</h3>
          <ul>
            {accountsShortcuts.map(s => (
              <li key={s.constant}>
                <span>{s.title}</span>
                <ShortcutKeys shortcut={s.constant} alwaysShow={true} />
              </li>
            ))}
          </ul>

          <h3>Date Picker</h3>
          <ul>
            {datePickerShortcuts.map(s => (
              <li key={s.constant}>
                <span>{s.title}</span>
                <ShortcutKeys shortcut={s.constant} alwaysShow={true} />
              </li>
            ))}
          </ul>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
