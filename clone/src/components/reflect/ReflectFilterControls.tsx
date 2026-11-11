import React from 'react';

interface Props {
  timeframeLabel?: string;
  categoriesLabel?: string;
  accountsLabel?: string;
  categoriesPill?: string;
  accountsPill?: string;
  disableLeftArrow?: boolean;
  disableRightArrow?: boolean;
  showCategories?: boolean;
  showAccounts?: boolean;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenCategories?: () => void;
  onOpenAccounts?: () => void;
}

export const ReflectFilterControls: React.FC<Props> = ({
  timeframeLabel = 'Nov 2026',
  categoriesLabel = 'All Categories',
  accountsLabel = 'All Accounts',
  categoriesPill,
  accountsPill,
  disableLeftArrow = false,
  disableRightArrow = true,
  showCategories = true,
  showAccounts = true,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenCategories,
  onOpenAccounts
}) => {
  return (
    <div className="reflect-filter-controls">
      {/* Timeframe Button Group */}
      <div className="reflect-filter-button-group">
        <button
          className="ghost-button primary is-icon-only type-body filter-button filter-button__left-arrow"
          aria-label="Previous date range"
          type="button"
          disabled={disableLeftArrow}
          onClick={onPrevTimeframe}
        >
          <svg className="ynab-new-icon" width="12" height="12">
            <use href="#icon_sprite_chevron_left" />
          </svg>
          <div className="filter-button__divider" />
        </button>

        <button
          className="ghost-button primary type-body filter-button filter-button--middle-state filter-button-timeframe"
          type="button"
          onClick={onOpenTimeframe}
        >
          <svg className="ynab-new-icon" width="12" height="12">
            <use href="#icon_sprite_calendar" />
          </svg>
          {timeframeLabel}
        </button>

        <button
          disabled={disableRightArrow}
          className="ghost-button primary is-icon-only type-body filter-button filter-button__right-arrow"
          aria-label="Next date range"
          type="button"
          onClick={onNextTimeframe}
        >
          <div className="filter-button__divider" />
          <svg className="ynab-new-icon" width="12" height="12">
            <use href="#icon_sprite_chevron_right" />
          </svg>
        </button>
      </div>

      <div className="filter-controls-divider" />

      {/* Categories Button Group */}
      {showCategories && (
        <div className="reflect-filter-button-group">
          <button
            className="ghost-button primary is-dropdown type-body filter-button filter-button-categories"
            type="button"
            onClick={onOpenCategories}
          >
            {categoriesLabel}
            {categoriesPill && (
              <span className="filter-button__pill">{categoriesPill}</span>
            )}
            <svg className="ynab-new-icon" width="8" height="8">
              <use href="#icon_sprite_caret_down" />
            </svg>
          </button>
        </div>
      )}

      {/* Accounts Button Group */}
      {showAccounts && (
        <div className="reflect-filter-button-group">
          <button
            className="ghost-button primary is-dropdown type-body filter-button filter-button-accounts"
            type="button"
            onClick={onOpenAccounts}
          >
            {accountsLabel}
            {accountsPill && (
              <span className="filter-button__pill">{accountsPill}</span>
            )}
            <svg className="ynab-new-icon" width="8" height="8">
              <use href="#icon_sprite_caret_down" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
