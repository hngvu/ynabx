import React from 'react';
import { Icon } from '../core/Icon';

export interface DirectImportStatusIconProps {
  status?: 'good' | 'warning' | 'error' | 'syncing';
  showStatusText?: boolean;
  statusText?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Exact decompiled from components/direct-import-status-icon/index.hbs:
 * <div className="direct-status-import-icon nav-account-icons nav-account-icons-right">
 *   <Icon name={iconName} width={16} />
 *   {showStatusText && <span className="status-text">{statusText}</span>}
 * </div>
 */
export function DirectImportStatusIcon({
  status = 'good',
  showStatusText = false,
  statusText = '',
  className = '',
  onClick,
}: DirectImportStatusIconProps) {
  const iconName =
    status === 'good'
      ? 'check_circle'
      : status === 'warning'
      ? 'exclamation_triangle'
      : status === 'error'
      ? 'exclamation_circle'
      : 'arrows_rotate';

  return (
    <div
      className={`direct-status-import-icon nav-account-icons nav-account-icons-right ${className}`.trim()}
      onClick={onClick}
    >
      <Icon name={iconName} width={16} />
      {showStatusText && <span className="status-text">{statusText}</span>}
    </div>
  );
}

export default DirectImportStatusIcon;
