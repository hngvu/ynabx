import React from 'react';

export const ReflectLoadingState: React.FC = () => {
  return (
    <div className="reflect-syncing-backfill">
      <div className="ember-view ynab-new-settings-View-loading">
        <svg className="ynab-new-icon" width="24" height="24">
          <use href="#icon_sprite_refresh" />
        </svg>
      </div>
      <span className="loading-text">Calculating your reports...</span>
    </div>
  );
};
