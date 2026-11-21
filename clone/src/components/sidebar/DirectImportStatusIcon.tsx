import React from 'react';
import { Icon } from '../core/Icon';

export interface DirectImportStatusIconProps {
  status?: 'good' | 'warning' | 'error' | 'syncing';
  showStatusText?: boolean;
  statusText?: string;
  showIcon?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Exact decompiled from components/direct-import-status-icon/index.hbs:
 * <span class="direct-status-import-icon nav-account-icons nav-account-icons-right">
 *   <svg class="ynab-new-icon" width="16" height="16">
 *     <use href="#icon_sprite_..." />
 *   </svg>
 * </span>
 */
export function DirectImportStatusIcon({
  status = 'good',
  showStatusText = false,
  statusText = '',
  showIcon = false,
  className = '',
  onClick,
}: DirectImportStatusIconProps) {
  const iconName =
    status === 'warning'
      ? 'exclamation_triangle'
      : status === 'error'
      ? 'exclamation_circle'
      : status === 'syncing'
      ? 'arrows_rotate'
      : '';

  return (
    <span
      className={`direct-status-import-icon nav-account-icons nav-account-icons-right ${className}`.trim()}
      onClick={onClick}
    >
      <svg className="ynab-new-icon" width={16} height={16}>
        {showIcon && iconName ? <use href={`#icon_sprite_${iconName}`} /> : null}
      </svg>
      {showStatusText && <span className="status-text">{statusText}</span>}
    </span>
  );
}

export default DirectImportStatusIcon;
