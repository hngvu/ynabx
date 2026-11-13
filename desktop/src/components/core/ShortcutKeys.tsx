import React, { useEffect, useState } from 'react';
import {
  KeyboardShortcut,
  SHORTCUT_DEFINITIONS,
  ShortcutPlatform,
  keyboardShortcutsService,
} from '../../services/keyboardShortcuts';

export interface ShortcutKeysProps {
  shortcut: KeyboardShortcut;
  alwaysShow?: boolean;
  className?: string;
}

/**
 * Port of components/keyboard-shortcuts/shortcut-keys/index.hbs (jP / zP)
 */
export function ShortcutKeys({ shortcut, alwaysShow = false, className = '' }: ShortcutKeysProps) {
  const [disabled, setDisabled] = useState(keyboardShortcutsService.disableKeyboardShortcuts);

  useEffect(() => {
    return keyboardShortcutsService.subscribe(() => {
      setDisabled(keyboardShortcutsService.disableKeyboardShortcuts);
    });
  }, []);

  if (!alwaysShow && disabled) {
    return null;
  }

  const def = SHORTCUT_DEFINITIONS[shortcut];
  if (!def) return null;

  const platform = keyboardShortcutsService.platform;
  const rawKeys =
    platform === ShortcutPlatform.Mac && def.uiMac ? def.uiMac : def.uiAll;

  if (!rawKeys || rawKeys.length === 0) {
    return null;
  }

  const items = rawKeys.map(k => ({
    key: k,
    isThen: k === 'then',
  }));

  return (
    <div className={`shortcut-keys ${className}`.trim()}>
      {items.map((item, idx) => (
        <span
          key={idx}
          className={`shortcut-key ${item.isThen ? 'shortcut-then-key' : ''}`}
        >
          {item.key}
        </span>
      ))}
    </div>
  );
}
