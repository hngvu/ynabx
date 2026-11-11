import React, { useRef } from 'react';
import { Icon } from '../core/Icon';

export interface RegisterGridHeaderProps {
  areAllChecked: boolean;
  isPartiallyChecked: boolean;
  onToggleAll: () => void;
  showAccountColumn: boolean;
  onStartResize?: (column: string, startX: number, startWidth: number) => void;
}

export function RegisterGridHeader({
  areAllChecked,
  isPartiallyChecked,
  onToggleAll,
  showAccountColumn,
  onStartResize,
}: RegisterGridHeaderProps) {
  const headerRowRef = useRef<HTMLDivElement>(null);

  const handleResizeMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Find the cell element
    const handleEl = e.currentTarget as HTMLElement;
    const cellEl = handleEl.closest('.ynab-grid-header-cell') as HTMLElement;
    if (!cellEl) return;

    const startX = e.pageX;
    const startWidth = cellEl.getBoundingClientRect().width;

    onStartResize?.(column, startX, startWidth);
  };

  return (
    <div className="ynab-grid-header">
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

        {/* Image attachment column (fixed width 44px, no resize) */}
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

        {/* Account column (shown when All Accounts) */}
        {showAccountColumn && (
          <div
            className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-accountName"
            data-column="accountName"
            role="columnheader"
            style={{ position: 'relative' }}
          >
            <div className="ynab-grid-header-column-sort-area">ACCOUNT</div>
            <div
              className="ynab-grid-resize-handle js-ynab-grid-resize-handle"
              onMouseDown={(e) => handleResizeMouseDown(e, 'accountName')}
            />
          </div>
        )}

        {/* Date column */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-date"
          data-column="date"
          role="columnheader"
          style={{ position: 'relative' }}
        >
          <div className="ynab-grid-header-column-sort-area">
            <span>DATE</span>
            <Icon name="caret_down" width={8} height={8} style={{ marginLeft: '4px' }} />
          </div>
          <div
            className="ynab-grid-resize-handle js-ynab-grid-resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, 'date')}
          />
        </div>

        {/* Payee column */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-payeeName"
          data-column="payeeName"
          role="columnheader"
          style={{ position: 'relative' }}
        >
          <div className="ynab-grid-header-column-sort-area">PAYEE</div>
          <div
            className="ynab-grid-resize-handle js-ynab-grid-resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, 'payeeName')}
          />
        </div>

        {/* Category column */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-subCategoryName"
          data-column="subCategoryName"
          role="columnheader"
          style={{ position: 'relative' }}
        >
          <div className="ynab-grid-header-column-sort-area">CATEGORY</div>
          <div
            className="ynab-grid-resize-handle js-ynab-grid-resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, 'subCategoryName')}
          />
        </div>

        {/* Memo column */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-memo"
          data-column="memo"
          role="columnheader"
          style={{ position: 'relative' }}
        >
          <div className="ynab-grid-header-column-sort-area">MEMO</div>
          <div
            className="ynab-grid-resize-handle js-ynab-grid-resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, 'memo')}
          />
        </div>

        {/* Outflow column */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-outflow"
          data-column="outflow"
          role="columnheader"
          style={{ position: 'relative' }}
        >
          <div className="ynab-grid-header-column-sort-area">OUTFLOW</div>
          <div
            className="ynab-grid-resize-handle js-ynab-grid-resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, 'outflow')}
          />
        </div>

        {/* Inflow column */}
        <div
          className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-inflow"
          data-column="inflow"
          role="columnheader"
          style={{ position: 'relative' }}
        >
          <div className="ynab-grid-header-column-sort-area">INFLOW</div>
        </div>

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
