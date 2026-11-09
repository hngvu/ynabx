import React from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'C', desc: 'Toggle Cleared status on selected transaction' },
  { key: 'A', desc: 'Add new transaction' },
  { key: 'M', desc: 'Move money between categories' },
  { key: 'Cmd/Ctrl + Z', desc: 'Undo last action' },
  { key: 'Cmd/Ctrl + Shift + Z', desc: 'Redo last action' },
  { key: 'Esc', desc: 'Close any active modal or popover' },
  { key: '/', desc: 'Search transactions / jump to category' },
];

/**
 * Exact decompiled from components/modals/keyboard-shortcuts/index.hbs
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <Modal className="modal-keyboard-shortcuts" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Keyboard Shortcuts</Modal.Header>
      <Modal.Body>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: '#475569' }}>Key</th>
                <th style={{ padding: '8px 12px', color: '#475569' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    <kbd style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                      {s.key}
                    </kbd>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} variant="primary">Done</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default KeyboardShortcutsModal;
