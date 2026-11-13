import React, { useState } from 'react';
import { MasterCategoryGroup } from '../../budget/budgetData';
import { AccountItem } from '../../sidebar/NavAccountRow';

interface FilterItemNode {
  id: string;
  name: string;
  isSection?: boolean;
  children?: FilterItemNode[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'categories' | 'accounts';
  categoryGroups?: MasterCategoryGroup[];
  accounts?: AccountItem[];
  selectedIds: Set<string>;
  onApply: (selectedIds: Set<string>) => void;
}

export const FilterItemsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  type,
  categoryGroups = [],
  accounts = [],
  selectedIds,
  onApply,
}) => {
  const [searchText, setSearchText] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set(selectedIds));

  // Sync temp selections when opening
  React.useEffect(() => {
    setTempSelectedIds(new Set(selectedIds));
    setSearchText('');
  }, [isOpen, selectedIds]);

  if (!isOpen) return null;

  // Build tree nodes
  const nodes: FilterItemNode[] = type === 'categories'
    ? categoryGroups.map((g) => ({
        id: g.entityId,
        name: g.name,
        isSection: true,
        children: g.categories.map((c) => ({
          id: c.entityId,
          name: c.name,
        })),
      }))
    : [
        {
          id: 'sec-budget-accounts',
          name: 'Budget Accounts',
          isSection: true,
          children: accounts
            .filter((a) => !a.isClosed && a.accountType !== 'tracking')
            .map((a) => ({ id: a.entityId, name: a.accountName })),
        },
        {
          id: 'sec-tracking-accounts',
          name: 'Tracking Accounts',
          isSection: true,
          children: accounts
            .filter((a) => !a.isClosed && a.accountType === 'tracking')
            .map((a) => ({ id: a.entityId, name: a.accountName })),
        },
      ];

  // All leaf ids
  const allLeafIds = nodes.flatMap((n) => (n.children || []).map((c) => c.id));

  const handleToggleLeaf = (id: string) => {
    setTempSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSection = (section: FilterItemNode) => {
    const childIds = (section.children || []).map((c) => c.id);
    const allChecked = childIds.every((id) => tempSelectedIds.has(id));

    setTempSelectedIds((prev) => {
      const next = new Set(prev);
      childIds.forEach((id) => {
        if (allChecked) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const handleSelectAll = () => {
    setTempSelectedIds(new Set(allLeafIds));
  };

  const handleSelectNone = () => {
    setTempSelectedIds(new Set());
  };

  const handleDone = () => {
    onApply(tempSelectedIds);
    onClose();
  };

  // Filtered by search text
  const filteredNodes = nodes
    .map((section) => {
      const filteredChildren = (section.children || []).filter((c) =>
        c.name.toLowerCase().includes(searchText.toLowerCase())
      );
      const sectionMatches = section.name.toLowerCase().includes(searchText.toLowerCase());
      if (sectionMatches) return section;
      if (filteredChildren.length > 0) {
        return { ...section, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean) as FilterItemNode[];

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className={`modal-generic modal-reports-${type}`}
        style={{
          position: 'fixed',
          top: 145,
          left: type === 'categories' ? 440 : 540,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          zIndex: 9999,
          width: 360,
          maxHeight: 520,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--separatorStandard, #e5e5e5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <div className="filter-items-search" style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={type === 'categories' ? 'Search Categories' : 'Search Accounts'}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 28px 6px 10px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 7,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#888',
                }}
              >
                <svg className="ynab-new-icon" width="12" height="12">
                  <use href="#icon_sprite_close" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tree List */}
        <div className="modal-content modal-overflow-area" style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          <ul className="modal-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filteredNodes.map((section) => {
              const childIds = (section.children || []).map((c) => c.id);
              const checkedCount = childIds.filter((id) => tempSelectedIds.has(id)).length;
              const isAllChecked = childIds.length > 0 && checkedCount === childIds.length;
              const isIndeterminate = checkedCount > 0 && checkedCount < childIds.length;

              return (
                <li key={section.id} style={{ marginBottom: 12 }}>
                  {/* Section Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 600,
                      fontSize: 13,
                      padding: '4px 0',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleSection(section)}
                  >
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={() => handleToggleSection(section)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{section.name}</span>
                  </div>

                  {/* Children Rows */}
                  {section.children && section.children.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: '4px 0 0 20px', padding: 0 }}>
                      {section.children.map((child) => {
                        const isChecked = tempSelectedIds.has(child.id);
                        return (
                          <li
                            key={child.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 13,
                              padding: '3px 0',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleToggleLeaf(child.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleLeaf(child.id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{child.name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafafa',
          }}
        >
          <div className="modal-action-group" style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="ghost-button secondary select-items-button"
              onClick={handleSelectAll}
              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
            >
              Select All
            </button>
            <button
              type="button"
              className="ghost-button secondary select-items-button"
              onClick={handleSelectNone}
              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
            >
              Select None
            </button>
          </div>

          <div className="modal-action-group" style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ghost-button secondary button-cancel"
              onClick={onClose}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ynab-button primary"
              onClick={handleDone}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
