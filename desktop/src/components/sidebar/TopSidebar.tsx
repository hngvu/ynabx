import React from 'react';
import { SidebarNav, SidebarNavProps } from './SidebarNav';
import { Icon } from '../core/Icon';

export interface TopSidebarProps extends SidebarNavProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
}

/**
 * Exact decompiled from components/top-sidebar/index.hbs & class Y1 (wrapper-DkFKwf1z.js):
 *
 * SIDEBAR_RESIZE_MIN = 56
 * SIDEBAR_RESIZE_BREAKPOINT_COLLAPSED = 150
 *
 * When collapsed (width <= 150):
 * - nav receives class: `sidebar-resized-collapsed`
 * - width is set to 56px (SIDEBAR_RESIZE_MIN)
 * - CSS hides `.sidebar-nav-menu-budget`, `.navlink-label`, `.nav-accounts`, `.nav-add-accounts`
 * - CSS displays `.sidebar-nav-menu-collapsed` (the icon-only YNAB logo button inside `ul.nav-main`)
 * - CSS displays `.sidebar-expand`
 */
export function TopSidebar({
  isCollapsed = false,
  onToggleCollapse,
  width = 260,
  ...navProps
}: TopSidebarProps) {
  const currentWidth = isCollapsed ? 56 : width;
  const breakpointClass = isCollapsed ? 'sidebar-resized-collapsed' : '';

  return (
    <nav
      className={`ynab-u sidebar logged-in ${breakpointClass}`}
      style={{
        width: `${currentWidth}px`,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      role="navigation"
    >
      <div className="sidebar-left">
        <div className="sidebar-contents">
          <SidebarNav {...navProps} />
        </div>

        {/* Sidebar Bottom: Collapse / Expand controls */}
        <div className="sidebar-bottom">
          {isCollapsed ? (
            <button
              className="sidebar-expand"
              aria-label="Expand Sidebar"
              title="Expand Sidebar"
              type="button"
              onClick={onToggleCollapse}
            >
              <Icon name="sidebar_open" width="24" />
            </button>
          ) : (
            <button
              className="sidebar-collapse"
              aria-label="Collapse Sidebar"
              title="Collapse Sidebar"
              type="button"
              onClick={onToggleCollapse}
            >
              <Icon name="sidebar_close" width="24" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Resizer indicator (hidden when collapsed) */}
      {!isCollapsed && (
        <div className="sidebar-resizer">
          <div className="sidebar-resizer-indicator" />
        </div>
      )}
    </nav>
  );
}

export default TopSidebar;
