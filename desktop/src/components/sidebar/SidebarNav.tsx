import React from 'react';
import { Icon } from '../core/Icon';
import { AccountsList, AccountsListProps } from './AccountsList';

export interface SidebarNavProps extends AccountsListProps {
  budgetName: string;
  email: string;
  activeRoute: 'budget' | 'reflect' | 'accounts';
  onNavigate: (route: 'budget' | 'reflect' | 'accounts') => void;
  onOpenSidebarMenu: () => void;
}

/**
 * Exact decompiled from components/sidebar/sidebar-nav/index.hbs (KQ class)
 */
export function SidebarNav({
  budgetName,
  email,
  activeRoute,
  onNavigate,
  onOpenSidebarMenu,
  ...accountsProps
}: SidebarNavProps) {
  return (
    <div className="sidebar-nav">
      <button
        className="sidebar-nav-menu sidebar-nav-menu-budget js-sidebar-nav-menu user-data"
        type="button"
        onClick={onOpenSidebarMenu}
      >
        <Icon className="sidebar-nav-ynab" name="ynab_logo" width={24}>
          <title>{budgetName}</title>
        </Icon>
        <div className="sidebar-nav-budget-email">
          <span className="sidebar-nav-budget-email-budget">{budgetName}</span>
          <span className="sidebar-nav-budget-email-email button-truncate">{email}</span>
        </div>
        <Icon className="sidebar-nav-arrow" name="caret_down" width={12} />
      </button>

      <ul className="nav-main">
        <li className="navlink sidebar-nav-menu-collapsed">
          <button className="js-sidebar-nav-menu" type="button" onClick={onOpenSidebarMenu}>
            <Icon name="ynab_logo" width={24}>
              <title>{budgetName}</title>
            </Icon>
          </button>
        </li>
        <li className={`navlink navlink-budget ${activeRoute === 'budget' ? 'active' : ''}`}>
          <a
            href="/budget"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('budget');
            }}
          >
            <Icon name="cash_in_envelope" width={20} />
            <div className="navlink-label">Plan</div>
          </a>
        </li>
        <li className={`navlink navlink-reports ${activeRoute === 'reflect' ? 'active' : ''}`}>
          <a
            href="/reflect"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('reflect');
            }}
          >
            <Icon name="bar_chart" width={20} />
            <div className="navlink-label">Reflect</div>
          </a>
        </li>
        <li className={`navlink navlink-accounts ${activeRoute === 'accounts' ? 'active' : ''}`}>
          <a
            href="/accounts"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('accounts');
            }}
          >
            <Icon name="bank" width={20} />
            <div className="navlink-label">All Accounts</div>
          </a>
        </li>
      </ul>

      <AccountsList {...accountsProps} />
    </div>
  );
}

export default SidebarNav;
