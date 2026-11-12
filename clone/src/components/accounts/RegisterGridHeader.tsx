import React, { useRef } from 'react';
import { Icon } from '../core/Icon';

export interface RegisterGridHeaderProps {
  areAllChecked: boolean;
  isPartiallyChecked: boolean;
  onToggleAll: () => void;
  showAccountColumn: boolean;
  showRunningBalance?: boolean;
  showFlags?: boolean;
  showImages?: boolean;
  isResizing?: boolean;
  sortFields?: Array<{ property: string; sortAscending: boolean }>;
  onSort?: (column: string) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export function RegisterGridHeader({
  areAllChecked,
  isPartiallyChecked,
  onToggleAll,
  showAccountColumn,
  showRunningBalance = false,
  showFlags = true,
  showImages = true,
  isResizing = false,
  sortFields = [],
  onSort,
  onMouseDown,
}: RegisterGridHeaderProps) {
  const headerRowRef = useRef<HTMLDivElement>(null);

  const primarySort = sortFields[0];
  const getSortDirection = (column: string): 'up' | 'down' | null => {
    if (!primarySort || primarySort.property !== column) return null;
    return primarySort.sortAscending ? 'up' : 'down';
  };

  const handleCellClick = (e: React.MouseEvent, column: string) => {
    // If clicking a resize handle, do not sort
    const target = e.target as HTMLElement;
    if (
      target.classList?.contains('js-ynab-grid-resize-handle') ||
      target.classList?.contains('ynab-grid-resize-handle')
    ) {
      return;
    }
    onSort?.(column);
  };

  return (
    <div
      className={`ynab-grid-header ${isResizing ? 'is-resizing' : ''}`}
      onMouseDown={onMouseDown}
    >
      <div ref={headerRowRef} className="ynab-grid-header-row" role="row">
        {/* Checkbox column (fixed, no resize) */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-checkbox"
          data-column="checkbox"
          role="columnheader"
        >
          <button
            className={`ynab-checkbox ynab-checkbox-button ${areAllChecked ? 'is-checked' : ''}`}
            type="button"
            onClick={onToggleAll}
            aria-label={areAllChecked ? 'Uncheck all' : 'Check all'}
          >
            <Icon
              className={`ynab-checkbox-button-square ${areAllChecked ? 'is-checked' : ''}`}
              name="check"
              width={13}
              height={13}
              style={areAllChecked ? { color: '#ffffff', fill: '#ffffff' } : undefined}
            />
          </button>
        </div>

        {/* Flag column (fixed width 42px, no resize) */}
        {showFlags && (
          <div
            className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-flag"
            data-column="flag"
            role="columnheader"
          >
            <div className="ynab-grid-header-column-sort-area">
              <span className="icon-wrapper">
                <Icon className="ynab-flag-header" name="flag_fill" width={16} height={16} />
              </span>
            </div>
          </div>
        )}

        {/* Image attachment column (fixed width 28px, no resize) */}
        {showImages && (
          <div
            className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-image"
            data-column="image"
            role="columnheader"
          >
            <div className="ynab-grid-header-column-sort-area">
              <span className="icon-wrapper">
                <Icon className="ynab-image-header" name="photo" width={16} height={16} />
              </span>
            </div>
          </div>
        )}

        {/* Account column (shown when All Accounts) */}
        {showAccountColumn && (
          <div
            className={`ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-accountName ${
              primarySort?.property === 'accountName' ? 'is-sorting' : ''
            }`}
            data-column="accountName"
            role="columnheader"
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={(e) => handleCellClick(e, 'accountName')}
          >
            <div className="ynab-grid-header-column-sort-area">
              <span>ACCOUNT</span>
              {getSortDirection('accountName') && (
                <Icon
                  className="sort-icon"
                  name={`caret_${getSortDirection('accountName')}`}
                  width={8}
                  height={8}
                  style={{ marginLeft: '4px' }}
                />
              )}
            </div>
            <div className="ynab-grid-resize-handle js-ynab-grid-resize-handle" />
          </div>
        )}

        {/* Date column */}
        <div
          className={`ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-date ${
            primarySort?.property === 'date' ? 'is-sorting' : ''
          }`}
          data-column="date"
          role="columnheader"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={(e) => handleCellClick(e, 'date')}
        >
          <div className="ynab-grid-header-column-sort-area">
            <span>DATE</span>
            {getSortDirection('date') && (
              <Icon
                className="sort-icon"
                name={`caret_${getSortDirection('date')}`}
                width={8}
                height={8}
                style={{ marginLeft: '4px' }}
              />
            )}
          </div>
          <div className="ynab-grid-resize-handle js-ynab-grid-resize-handle" />
        </div>

        {/* Payee column */}
        <div
          className={`ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-payeeName ${
            primarySort?.property === 'payeeName' ? 'is-sorting' : ''
          }`}
          data-column="payeeName"
          role="columnheader"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={(e) => handleCellClick(e, 'payeeName')}
        >
          <div className="ynab-grid-header-column-sort-area">
            <span>PAYEE</span>
            {getSortDirection('payeeName') && (
              <Icon
                className="sort-icon"
                name={`caret_${getSortDirection('payeeName')}`}
                width={8}
                height={8}
                style={{ marginLeft: '4px' }}
              />
            )}
          </div>
          <div className="ynab-grid-resize-handle js-ynab-grid-resize-handle" />
        </div>

        {/* Category column */}
        <div
          className={`ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-subCategoryName ${
            primarySort?.property === 'subCategoryName' ? 'is-sorting' : ''
          }`}
          data-column="subCategoryName"
          role="columnheader"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={(e) => handleCellClick(e, 'subCategoryName')}
        >
          <div className="ynab-grid-header-column-sort-area">
            <span>CATEGORY</span>
            {getSortDirection('subCategoryName') && (
              <Icon
                className="sort-icon"
                name={`caret_${getSortDirection('subCategoryName')}`}
                width={8}
                height={8}
                style={{ marginLeft: '4px' }}
              />
            )}
          </div>
          <div className="ynab-grid-resize-handle js-ynab-grid-resize-handle" />
        </div>

        {/* Memo column */}
        <div
          className={`ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-memo ${
            primarySort?.property === 'memo' ? 'is-sorting' : ''
          }`}
          data-column="memo"
          role="columnheader"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={(e) => handleCellClick(e, 'memo')}
        >
          <div className="ynab-grid-header-column-sort-area">
            <span>MEMO</span>
            {getSortDirection('memo') && (
              <Icon
                className="sort-icon"
                name={`caret_${getSortDirection('memo')}`}
                width={8}
                height={8}
                style={{ marginLeft: '4px' }}
              />
            )}
          </div>
          <div className="ynab-grid-resize-handle js-ynab-grid-resize-handle" />
        </div>

        {/* Outflow column */}
        <div
          className={`ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-outflow ${
            primarySort?.property === 'outflow' ? 'is-sorting' : ''
          }`}
          data-column="outflow"
          role="columnheader"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={(e) => handleCellClick(e, 'outflow')}
        >
          <div className="ynab-grid-header-column-sort-area">
            <span>OUTFLOW</span>
            {getSortDirection('outflow') && (
              <Icon
                className="sort-icon"
                name={`caret_${getSortDirection('outflow')}`}
                width={8}
                height={8}
                style={{ marginLeft: '4px' }}
              />
            )}
          </div>
          <div className="ynab-grid-resize-handle js-ynab-grid-resize-handle" />
        </div>

        {/* Inflow column (last resizable column before cleared) */}
        <div
          className={`ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-inflow ${
            primarySort?.property === 'inflow' ? 'is-sorting' : ''
          }`}
          data-column="inflow"
          role="columnheader"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={(e) => handleCellClick(e, 'inflow')}
        >
          <div className="ynab-grid-header-column-sort-area">
            <span>INFLOW</span>
            {getSortDirection('inflow') && (
              <Icon
                className="sort-icon"
                name={`caret_${getSortDirection('inflow')}`}
                width={8}
                height={8}
                style={{ marginLeft: '4px' }}
              />
            )}
          </div>
          {showRunningBalance && (
            <div className="ynab-grid-resize-handle js-ynab-grid-resize-handle" />
          )}
        </div>

        {/* Balance column (when enabled in View Options) */}
        {showRunningBalance && (
          <div
            className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-balance"
            data-column="balance"
            role="columnheader"
            style={{ position: 'relative' }}
          >
            <div className="ynab-grid-header-column-sort-area">BALANCE</div>
          </div>
        )}

        {/* Cleared icon column (fixed, no resize) */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-cleared"
          data-column="cleared"
          role="columnheader"
        >
          <Icon name="cleared_circle_fill" width={12} height={12} />
        </div>
      </div>
    </div>
  );
}

export default RegisterGridHeader;
