import React, { useState } from 'react';

interface Props {
  pageTitle?: string;
  shouldShowBreadcrumbs?: boolean;
  selectedGroupName?: string;
  onClearGroup?: () => void;
  hideActionButtons?: boolean;
  onShareProgress?: () => void;
  onExport?: () => void;
}

export const ReflectPageHeader: React.FC<Props> = ({
  pageTitle = 'Spending Breakdown',
  shouldShowBreadcrumbs,
  selectedGroupName,
  onClearGroup,
  hideActionButtons = false,
  onShareProgress,
  onExport
}) => {
  return (
    <div className="reflect-page-header-group">
      <h3 className="reflect-page-title">
        {shouldShowBreadcrumbs ? (
          <div className="reflect-breadcrumbs__selected-group-breadcrumbs">
            <button
              type="button"
              className="ghost-button primary all-groups-button"
              onClick={onClearGroup}
            >
              All Groups
            </button>
            <svg className="ynab-new-icon" width="12" height="12">
              <use href="#icon_sprite_chevron_right" />
            </svg>
            <button type="button" className="ghost-button group-name" disabled>
              {selectedGroupName}
            </button>
          </div>
        ) : (
          pageTitle
        )}
      </h3>

      {!hideActionButtons && (
        <div className="reflect-page-header-actions">
          {onShareProgress && (
            <button
              type="button"
              className="ynab-button primary reflect-share-progress-button"
              onClick={onShareProgress}
            >
              <svg className="ynab-new-icon" width="14" height="14">
                <use href="#icon_sprite_line_chart" />
              </svg>
              <span>Share Your Progress</span>
            </button>
          )}

          <button
            type="button"
            className="ghost-button primary type-body reflect-export-button"
            onClick={onExport}
          >
            <svg className="ynab-new-icon" width="14" height="14">
              <use href="#icon_sprite_document_with_arrow_down" />
            </svg>
            <span>Export</span>
          </button>
        </div>
      )}
    </div>
  );
};
