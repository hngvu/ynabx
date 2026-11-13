import React, { useEffect, useRef, useState } from 'react';
import { Menu, MenuItem, MenuHeading, MenuSeparator } from '../menu';
import { Icon } from '../core/Icon';

export interface RecentBudgetInfo {
  budgetVersionId: string;
  budgetName: string;
}

export interface PlanMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect?: DOMRect | null;
  currentPlanName?: string;
  recentBudgets?: RecentBudgetInfo[];
  onOpenNewBudget?: () => void;
  onOpenPlan?: (budgetVersionId: string, budgetName: string) => void;
  onOpenPlanSettings?: () => void;
  onOpenManagePayees?: () => void;
  onOpenEditFlags?: () => void;
  onOpenDisplayOptions?: () => void;
  onOpenExportPlan?: () => void;
  onOpenFreshStart?: () => void;
  onOpenReferAFriend?: () => void;
  onOpenGiftYnab?: () => void;
  onToggleHideAmounts?: () => void;
  isHideAmountsEnabled?: boolean;
  onOpenYnabTogether?: () => void;
  onOpenAccountSettings?: () => void;
  onOpenManageConnections?: () => void;
  onOpenWorkshops?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onLogout?: () => void;
}

/**
 * Exact decompiled from components/menu/index.gts (Ist class) & components/settings-menu/index.hbs (Wct class)
 *
 * In original YNAB Ember:
 * - There is NO modal-overlay or modal-popup wrapper.
 * - Ist is a direct `<div class="menu js-menu ynab-new-settings-menu" role="menu">`
 * - Dimensions & Positioning computed by Ist:
 *     left = triggerRect.left (8px)
 *     top = triggerRect.bottom (54px)
 *     width = 240px (min-width: 15rem, matches trigger button)
 *     height calculation:
 *       naturalHeight + top > window.innerHeight
 *         ? height = `calc(100vh - 1rem - ${top}px)` (max-height clamped to viewport bottom)
 *         : height = 'auto'
 *     overflow = 'auto'
 * - Closes on click outside via window 'click' event.
 */
export function PlanMenuPopover({
  isOpen,
  onClose,
  triggerRect,
  currentPlanName = 'My Personal Budget',
  recentBudgets = [
    { budgetVersionId: 'budget-1', budgetName: 'My Personal Budget' },
    { budgetVersionId: 'budget-2', budgetName: 'Family Vacation 2026' },
  ],
  onOpenNewBudget,
  onOpenPlan,
  onOpenPlanSettings,
  onOpenManagePayees,
  onOpenEditFlags,
  onOpenDisplayOptions,
  onOpenExportPlan,
  onOpenFreshStart,
  onOpenReferAFriend,
  onOpenGiftYnab,
  onToggleHideAmounts,
  isHideAmountsEnabled = false,
  onOpenYnabTogether,
  onOpenAccountSettings,
  onOpenManageConnections,
  onOpenWorkshops,
  onOpenKeyboardShortcuts,
  onLogout,
}: PlanMenuPopoverProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [submenuTop, setSubmenuTop] = useState(0);

  // Click outside to close (exact Ist logic)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicking trigger button itself, let trigger handler toggle it
      if (target.closest('.sidebar-nav-menu-budget')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    // Delay attach by 1 tick so opening click doesn't immediately close
    const timer = setTimeout(() => {
      window.addEventListener('click', handleWindowClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleWindowClick);
    };
  }, [isOpen, onClose]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Exact Ist position & size calculation
  const left = triggerRect ? triggerRect.left : 8;
  const top = triggerRect ? triggerRect.bottom : 54;
  const maxHeight = `calc(100vh - 1rem - ${top}px)`;

  return (
    <div
      ref={menuRef}
      className="menu js-menu ynab-new-settings-menu"
      role="menu"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: '240px',
        maxHeight,
        overflowY: 'auto',
        zIndex: 10006,
      }}
    >
      {/* 1. New Plan */}
      <MenuItem
        className="modal-select-budget-create"
        leadingIcon="plus_circle_fill"
        onClick={() => {
          onClose();
          onOpenNewBudget?.();
        }}
      >
        New Plan
      </MenuItem>

      {/* 2. Open Plan (with Submenu) */}
      <div
        className={`menu-item js-menu-item modal-select-budget-open has-submenu ${
          isSubmenuOpen ? 'is-submenu-visible' : ''
        }`}
        role="menuitem"
        style={{ position: 'relative' }}
        onMouseEnter={(e) => {
          const itemRect = e.currentTarget.getBoundingClientRect();
          setSubmenuTop(itemRect.top);
          setIsSubmenuOpen(true);
        }}
        onMouseLeave={() => setIsSubmenuOpen(false)}
      >
        <Icon name="folder" width={16} />
        Open Plan
        <Icon name="chevron_right" className="menu-item-disclosure" width={12} />

        {isSubmenuOpen && (
          <div
            className="menu js-menu settings-menu-recent-budgets"
            role="menu"
            style={{
              position: 'fixed',
              left: `${left + 240 + 4}px`,
              top: `${submenuTop}px`,
              minWidth: '220px',
              zIndex: 10007,
            }}
          >
            <MenuHeading>Recent Plans</MenuHeading>
            {recentBudgets.map((b) => (
              <MenuItem
                key={b.budgetVersionId}
                className="recent-budgets-budget-open"
                leadingIcon="document"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSubmenuOpen(false);
                  onClose();
                  onOpenPlan?.(b.budgetVersionId, b.budgetName);
                }}
              >
                {b.budgetName}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem
              className="recent-budgets-view-all"
              leadingIcon="folder"
              onClick={(e) => {
                e.stopPropagation();
                setIsSubmenuOpen(false);
                onClose();
              }}
            >
              View All Plans
            </MenuItem>
          </div>
        )}
      </div>

      <MenuSeparator />

      {/* 3. Current Plan Section */}
      <MenuHeading>Current Plan</MenuHeading>

      <MenuItem
        className="modal-select-budget-settings"
        leadingIcon="wrench"
        onClick={() => {
          onClose();
          onOpenPlanSettings?.();
        }}
      >
        Plan Settings
      </MenuItem>

      <MenuItem
        className="modal-select-budget-manage-payees"
        leadingIcon="arrows_circle_fill"
        onClick={() => {
          onClose();
          onOpenManagePayees?.();
        }}
      >
        Manage Payees
      </MenuItem>

      <MenuItem
        className="modal-select-budget-flag-names"
        leadingIcon="flag_fill"
        onClick={() => {
          onClose();
          onOpenEditFlags?.();
        }}
      >
        Edit Flags
      </MenuItem>

      <MenuItem
        className="modal-select-theme-switcher"
        leadingIcon="paint_roller"
        onClick={() => {
          onClose();
          onOpenDisplayOptions?.();
        }}
      >
        Display Options
      </MenuItem>

      <MenuItem
        className="modal-select-budget-export"
        leadingIcon="document_with_arrow_down"
        onClick={() => {
          onClose();
          onOpenExportPlan?.();
        }}
      >
        Export Plan
      </MenuItem>

      <MenuItem
        className="modal-select-budget-fresh-start"
        leadingIcon="leaf"
        onClick={() => {
          onClose();
          onOpenFreshStart?.();
        }}
      >
        Make a Fresh Start
      </MenuItem>

      <MenuSeparator />

      {/* 4. Share YNAB Section */}
      <MenuHeading>Share YNAB</MenuHeading>

      <MenuItem
        className="modal-select-refer-a-friend"
        leadingIcon="heart"
        onClick={() => {
          onClose();
          onOpenReferAFriend?.();
        }}
      >
        Refer a Friend
      </MenuItem>

      <MenuItem
        className="modal-select-gift-ynab"
        leadingIcon="gift"
        onClick={() => {
          onClose();
          onOpenGiftYnab?.();
        }}
      >
        Gift YNAB
      </MenuItem>

      <MenuItem
        className="modal-select-hide-amounts"
        leadingIcon="eye_slash"
        onClick={() => {
          onToggleHideAmounts?.();
        }}
      >
        {isHideAmountsEnabled ? 'Show Amounts' : 'Hide Amounts'}
        <span className="ynab-badge" style={{ marginLeft: 'auto', fontSize: '11px' }}>
          New
        </span>
      </MenuItem>

      <MenuItem
        className="modal-select-family"
        leadingIcon="together"
        onClick={() => {
          onClose();
          onOpenYnabTogether?.();
        }}
      >
        YNAB Together
      </MenuItem>

      <MenuSeparator />

      {/* 5. Account Section */}
      <MenuHeading>Account</MenuHeading>

      <MenuItem
        className="modal-select-budget-my-account"
        leadingIcon="user"
        onClick={() => {
          onClose();
          onOpenAccountSettings?.();
        }}
      >
        Account Settings
      </MenuItem>

      <MenuItem
        className="modal-select-budget-manage-connections"
        leadingIcon="bank"
        onClick={() => {
          onClose();
          onOpenManageConnections?.();
        }}
      >
        Manage Bank Connections
      </MenuItem>

      <MenuItem
        className="modal-select-budget-workshops"
        leadingIcon="graduation_hat"
        onClick={() => {
          onClose();
          onOpenWorkshops?.();
        }}
      >
        Join a Workshop
      </MenuItem>

      <MenuItem
        className="modal-select-budget-keyboard-shortcuts"
        leadingIcon="keyboard"
        onClick={() => {
          onClose();
          onOpenKeyboardShortcuts?.();
        }}
      >
        Keyboard Shortcuts
      </MenuItem>

      <MenuSeparator />

      {/* 6. Log Out */}
      <MenuItem
        leadingIcon="logout"
        onClick={() => {
          onClose();
          onLogout?.();
        }}
      >
        Log Out
      </MenuItem>

      <MenuSeparator />

      {/* 7. Legal Section */}
      <MenuHeading>Legal</MenuHeading>

      <MenuItem
        className="privacy"
        leadingIcon="document"
        href="https://www.ynab.com/privacy-policy/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </MenuItem>

      <MenuItem
        className="privacy"
        leadingIcon="document"
        href="https://www.ynab.com/california-privacy-disclosure/"
        target="_blank"
        rel="noopener noreferrer"
      >
        California Privacy Policy
      </MenuItem>

      <MenuItem
        className="modal-your-privacy-choices"
        leadingIcon="document"
        onClick={() => {
          alert('Your Privacy Choices (CCPA)');
        }}
      >
        Your Privacy Choices
        <Icon role="img" aria-label="Privacy choices icon" name="privacy_choices" width={20} />
      </MenuItem>
    </div>
  );
}

export default PlanMenuPopover;
