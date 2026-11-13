import React from 'react';
import { Icon } from '../core/Icon';

export interface BudgetViewItem {
  id: string;
  label: string;
  icon?: string;
  buttonClass?: string;
}

export interface BudgetViewRowProps {
  activeView: string;
  overspentCount?: number;
  hasCashOverspending?: boolean;
  onSelectView: (view: string) => void;
  onOpenViewsMenu?: () => void;
}

export function BudgetViewRow({
  activeView,
  overspentCount = 0,
  hasCashOverspending = false,
  onSelectView,
  onOpenViewsMenu,
}: BudgetViewRowProps) {
  const views: BudgetViewItem[] = [
    { id: 'all', label: 'All' },
  ];

  if (overspentCount > 0 || activeView === 'overspent') {
    const overspentClass = hasCashOverspending ? 'overspent-cash' : 'overspent-credit';
    views.push({
      id: 'overspent',
      label: `${overspentCount} Overspent`,
      icon: 'exclamation_mark_triangle_fill',
      buttonClass: `view-button-overspent ${overspentClass}`,
    });
  }

  views.push(
    { id: 'underfunded', label: 'Underfunded' },
    { id: 'overfunded', label: 'Overfunded' },
    { id: 'money-available', label: 'Money Available' },
    { id: 'snoozed', label: 'Snoozed' }
  );

  return (
    <section className="budget-view-row">
      <ul className="budget-view-buttons">
        {views.map((v, idx) => {
          const isSelected = activeView === v.id;
          return (
            <li
              key={v.id}
              className={`view-button-item index-${idx} condensed ${
                isSelected ? 'selected' : ''
              }`}
            >
              <button
                className={`view-button ${v.buttonClass || ''} ${
                  isSelected ? 'selected' : ''
                }`}
                type="button"
                onClick={() => onSelectView(v.id)}
              >
                {v.icon && (
                  <Icon
                    className="view-button-icon"
                    name={v.icon}
                    width={13}
                    height={13}
                  />
                )}
                {v.label}
              </button>
            </li>
          );
        })}
        <li className="view-button views-menu-button">
          <button
            aria-label="Manage Views"
            type="button"
            onClick={onOpenViewsMenu}
          >
            <Icon name="ellipsis_horizontal" width={16} />
          </button>
        </li>
      </ul>
    </section>
  );
}

export default BudgetViewRow;
