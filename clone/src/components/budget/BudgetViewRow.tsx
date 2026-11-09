import React from 'react';
import { Icon } from '../core/Icon';

export interface BudgetViewRowProps {
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenViewsMenu?: () => void;
}

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'underfunded', label: 'Underfunded' },
  { id: 'overfunded', label: 'Overfunded' },
  { id: 'money-available', label: 'Money Available' },
  { id: 'snoozed', label: 'Snoozed' },
];

export function BudgetViewRow({
  activeView,
  onSelectView,
  onOpenViewsMenu,
}: BudgetViewRowProps) {
  return (
    <section className="budget-view-row">
      <ul className="budget-view-buttons">
        {VIEWS.map((v, idx) => (
          <li
            key={v.id}
            className={`view-button-item index-${idx} condensed ${
              activeView === v.id ? 'selected' : ''
            }`}
          >
            <button
              className="view-button"
              type="button"
              onClick={() => onSelectView(v.id)}
            >
              {v.label}
            </button>
          </li>
        ))}
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
