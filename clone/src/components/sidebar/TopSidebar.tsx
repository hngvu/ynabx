import React, { useEffect, useState } from 'react';
import { SidebarNav, SidebarNavProps } from './SidebarNav';
import { Icon } from '../core/Icon';

export interface TopSidebarProps extends SidebarNavProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const SIDEBAR_RESIZE_DEFAULT = 260;
const SIDEBAR_RESIZE_MIN = 56;
const SIDEBAR_RESIZE_MAX = 400;
const SIDEBAR_RESIZE_BREAKPOINT_COLLAPSED = 150;
const SIDEBAR_RESIZE_BREAKPOINT_ACCOUNT_VALUE_AND_REFER_LABEL_COLLAPSED = 210;
const SIDEBAR_WIDTH_STORAGE_KEY = 'ynabx_sidebar_width';

/**
 * Exact decompiled from components/top-sidebar/index.hbs & class Y1 (wrapper-DkFKwf1z.js):
 * - Mouse drag-resizing via `.sidebar-resizer`
 * - Breakpoint classes:
 *   - `<= 150px`: `sidebar-resized-collapsed` (snaps to 56px)
 *   - `<= 210px`: `sidebar-resized-account-value-and-refer-label-collapsed`
 * - Persists preferred width to localStorage (`ynabx_sidebar_width`)
 */
export function TopSidebar({
  isCollapsed = false,
  onToggleCollapse,
  width: widthProp,
  onWidthChange,
  ...navProps
}: TopSidebarProps) {
  const [preferredWidth, setPreferredWidth] = useState<number>(() => {
    if (typeof widthProp === 'number') return widthProp;
    try {
      const saved = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed > SIDEBAR_RESIZE_BREAKPOINT_COLLAPSED) {
          return Math.min(SIDEBAR_RESIZE_MAX, parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
    return SIDEBAR_RESIZE_DEFAULT;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar on Ctrl+\ or Cmd+\
      if ((e.ctrlKey || e.metaKey) && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault();
        onToggleCollapse?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const clamped = Math.max(
        SIDEBAR_RESIZE_MIN,
        Math.min(SIDEBAR_RESIZE_MAX, e.clientX)
      );
      if (clamped <= SIDEBAR_RESIZE_BREAKPOINT_COLLAPSED) {
        if (!isCollapsed) onToggleCollapse?.();
      } else {
        if (isCollapsed) onToggleCollapse?.();
        const effectivePreferred = Math.max(SIDEBAR_RESIZE_DEFAULT, clamped);
        setPreferredWidth(clamped);
        onWidthChange?.(clamped);
        try {
          window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(effectivePreferred));
        } catch {
          // ignore
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('is-resizing');
    };

    document.body.classList.add('is-resizing');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.classList.remove('is-resizing');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isCollapsed, onToggleCollapse, onWidthChange]);

  const effectivePreferredWidth = Math.max(SIDEBAR_RESIZE_DEFAULT, preferredWidth);
  const currentWidth = isCollapsed ? SIDEBAR_RESIZE_MIN : effectivePreferredWidth;
  const breakpointClass =
    currentWidth <= SIDEBAR_RESIZE_BREAKPOINT_COLLAPSED
      ? 'sidebar-resized-collapsed'
      : currentWidth <= SIDEBAR_RESIZE_BREAKPOINT_ACCOUNT_VALUE_AND_REFER_LABEL_COLLAPSED
      ? 'sidebar-resized-account-value-and-refer-label-collapsed'
      : '';

  return (
    <nav
      className={`ynab-u sidebar logged-in ${breakpointClass} ${isResizing ? 'is-resizing' : ''}`.trim()}
      style={{
        width: `${currentWidth}px`,
        transition: isResizing ? undefined : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
              title="Expand Sidebar (Ctrl+\\)"
              type="button"
              onClick={onToggleCollapse}
            >
              <Icon name="sidebar_open" width="24" />
            </button>
          ) : (
            <button
              className="sidebar-collapse"
              aria-label="Collapse Sidebar"
              title="Collapse Sidebar (Ctrl+\\)"
              type="button"
              onClick={onToggleCollapse}
            >
              <Icon name="sidebar_close" width="24" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Resizer handle */}
      <div
        className="sidebar-resizer"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing(true);
        }}
      >
        <div className="sidebar-resizer-indicator" />
      </div>
    </nav>
  );
}

export default TopSidebar;
