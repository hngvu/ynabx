import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '../core/Icon';
import { AccountItem } from '../sidebar/NavAccountRow';
import { MasterCategoryGroup } from '../budget/budgetData';

export interface SearchRecommendation {
  type: string | null;
  label: string;
  filterPrefix?: string;
  filterValue?: string;
  isAmount?: boolean;
  isInflow?: boolean;
  isOutflow?: boolean;
}

export interface TransactionSearchProps {
  searchText: string;
  onSearchChange: (val: string) => void;
  accounts?: AccountItem[];
  categoryGroups?: MasterCategoryGroup[];
  payees?: string[];
  placeholder?: string;
}

export function TransactionSearch({
  searchText,
  onSearchChange,
  accounts = [],
  categoryGroups = [],
  payees = [],
  placeholder = 'Search All Accounts',
}: TransactionSearchProps) {
  const [isActive, setIsActive] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse recommendations based on user input
  const recommendations = useMemo<SearchRecommendation[]>(() => {
    const raw = searchText.trim();
    if (!raw) return [];

    const list: SearchRecommendation[] = [];
    const lower = raw.toLowerCase();

    // 1. Find in any field
    list.push({
      type: null,
      label: `Find "${raw}" in any field`,
      filterPrefix: '',
      filterValue: raw,
    });

    // 2. Field-specific text search: Payee, Category, Memo
    list.push({
      type: 'Payee',
      label: `Find "${raw}" in the Payee`,
      filterPrefix: 'payee',
      filterValue: raw,
    });

    list.push({
      type: 'Category',
      label: `Find "${raw}" in the Category`,
      filterPrefix: 'category',
      filterValue: raw,
    });

    list.push({
      type: 'Memo',
      label: `Find "${raw}" in the Memo`,
      filterPrefix: 'memo',
      filterValue: raw,
    });

    // 3. Amount search if number
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      const formatted = num.toFixed(2);
      list.push({
        type: 'Outflow',
        label: `Find Outflows of "$${formatted}"`,
        filterPrefix: 'outflow',
        filterValue: formatted,
        isOutflow: true,
      });

      list.push({
        type: 'Inflow',
        label: `Find Inflows of "$${formatted}"`,
        filterPrefix: 'inflow',
        filterValue: formatted,
        isInflow: true,
      });
    }

    // 4. Matched accounts
    accounts.forEach((acc) => {
      const name = acc.accountName || '';
      if (name.toLowerCase().includes(lower)) {
        list.push({
          type: 'Account',
          label: name,
          filterPrefix: 'account',
          filterValue: name,
        });
      }
    });

    // 5. Matched categories
    categoryGroups.forEach((group) => {
      group.categories.forEach((cat) => {
        if (cat.name.toLowerCase().includes(lower)) {
          list.push({
            type: 'Category',
            label: `${group.name}: ${cat.name}`,
            filterPrefix: 'category',
            filterValue: cat.name,
          });
        }
      });
    });

    // 6. Matched known payees
    payees.forEach((p) => {
      if (p.toLowerCase().includes(lower) && !list.some((r) => r.label === p)) {
        list.push({
          type: 'Payee',
          label: p,
          filterPrefix: 'payee',
          filterValue: p,
        });
      }
    });

    return list.slice(0, 8); // top 8 recommendations
  }, [searchText, accounts, categoryGroups, payees]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowRecommendations(false);
        if (!searchText) {
          setIsActive(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchText]);

  const handleFocus = () => {
    setIsActive(true);
    if (searchText.trim()) {
      setShowRecommendations(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);
    setShowRecommendations(val.trim().length > 0);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    onSearchChange('');
    setShowRecommendations(false);
    inputRef.current?.focus();
  };

  const handleSelectRecommendation = (rec: SearchRecommendation) => {
    if (rec.filterPrefix) {
      onSearchChange(`${rec.filterPrefix}: ${rec.filterValue}`);
    } else {
      onSearchChange(rec.filterValue || '');
    }
    setShowRecommendations(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showRecommendations || recommendations.length === 0) {
      if (e.key === 'Escape') {
        handleClear();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 >= recommendations.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 < 0 ? recommendations.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < recommendations.length) {
        handleSelectRecommendation(recommendations[selectedIndex]);
      } else {
        setShowRecommendations(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowRecommendations(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`transaction-search js-transaction-search ${isActive || searchText ? 'is-active' : ''} ${searchText ? 'has-clear-button' : ''}`}
    >
      <div className="transaction-search-inner">
        <div className="transaction-search-icon">
          <Icon name="search" width={12} height={12} />
        </div>

        <input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={searchText}
          onFocus={handleFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="user-data transaction-search-input"
        />

        {searchText && (
          <button
            type="button"
            className="transaction-search-cancel-icon js-transaction-search-cancel-icon"
            onClick={handleClear}
          >
            <Icon name="close_circle_fill" width={14} height={14} />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {showRecommendations && recommendations.length > 0 && (
        <ul
          className="transaction-search-recommendations"
          style={{
            position: 'absolute',
            top: '2.25rem',
            right: 0,
            width: '24rem',
            maxHeight: '20rem',
            backgroundColor: 'var(--backgroundPrimaryElevated, #ffffff)',
            borderRadius: '0.375rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08)',
            margin: 0,
            padding: '0.5rem 0',
            listStyle: 'none',
            overflowY: 'auto',
            zIndex: 10005,
          }}
        >
          {recommendations.map((rec, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <li key={idx} style={{ width: '100%', margin: 0, padding: 0 }}>
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => handleSelectRecommendation(rec)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.75rem',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: isSelected
                      ? 'var(--backgroundSecondaryElevated, #edf2fe)'
                      : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--labelPrimary, #1b1d48)',
                  }}
                >
                  {rec.type && (
                    <span
                      className="recommendation-type"
                      style={{
                        color: 'var(--labelSecondary, #727484)',
                        width: '28%',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textAlign: 'right',
                        paddingRight: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      {rec.type}:
                    </span>
                  )}
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginLeft: rec.type ? 0 : '0.5rem',
                    }}
                  >
                    {rec.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default TransactionSearch;