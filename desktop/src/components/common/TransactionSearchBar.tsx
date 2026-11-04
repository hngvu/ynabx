import React, { useRef, useEffect } from "react";
import { YnabIcon } from "../common/YnabIcon";
import type { Category, Payee } from "../../api/types";

export interface SearchFilter {
  type: "any" | "payee" | "category" | "memo";
  query: string;
}

export interface TransactionSearchBarProps {
  accountName: string;
  activeFilter: SearchFilter | null;
  onFilterChange: (filter: SearchFilter | null) => void;
  categories: Category[];
  payees: Payee[];
}

export const TransactionSearchBar: React.FC<TransactionSearchBarProps> = ({
  accountName,
  activeFilter,
  onFilterChange,
  categories,
  payees,
}) => {
  const [inputValue, setInputValue] = React.useState<string>(activeFilter?.query ?? "");
  const [isFocused, setIsFocused] = React.useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeFilter) {
      setInputValue(activeFilter.query);
    } else {
      setInputValue("");
    }
  }, [activeFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = inputValue.trim();
  const showRecommendations = isFocused && trimmed.length > 0;

  // Matching exact categories or payees
  const matchedCategories = categories
    .filter((c) => !c.hidden && c.name.toLowerCase().includes(trimmed.toLowerCase()))
    .slice(0, 3);

  const matchedPayees = payees
    .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()))
    .slice(0, 3);

  const handleSelectFilter = (type: SearchFilter["type"], query: string) => {
    onFilterChange({ type, query });
    setIsFocused(false);
  };

  const handleClear = () => {
    setInputValue("");
    onFilterChange(null);
    inputRef.current?.focus();
  };

  const hasFilter = Boolean(activeFilter || inputValue);

  return (
    <div
      ref={containerRef}
      className={`transaction-search js-transaction-search ${
        isFocused || hasFilter ? "is-active" : ""
      } ${hasFilter ? "has-clear-button" : ""}`}
    >
      <div className="transaction-search-inner">
        <div className="transaction-search-icon">
          <YnabIcon name="search" size={12} />
        </div>

        <input
          ref={inputRef}
          className="ember-text-field ember-view transaction-search-input"
          placeholder={`Search ${accountName}`}
          aria-label="Find the transactions you're looking for..."
          title="Find the transactions you're looking for..."
          spellCheck={false}
          autoComplete="off"
          type="text"
          value={inputValue}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            const val = e.target.value;
            setInputValue(val);
            if (!val.trim()) {
              onFilterChange(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed) {
              handleSelectFilter("any", trimmed);
            } else if (e.key === "Escape") {
              setIsFocused(false);
            }
          }}
        />

        {hasFilter && (
          <button
            className="transaction-search-cancel-icon js-transaction-search-cancel-icon"
            type="button"
            onClick={handleClear}
            title="Clear search"
          >
            <YnabIcon name="close_circle_fill" size={12} />
          </button>
        )}

        {showRecommendations && (
          <ul className="transaction-search-recommendations" style={{ maxHeight: "400px" }}>
            {/* Direct matches for Categories */}
            {matchedCategories.map((cat) => (
              <li key={`cat-${cat.id}`}>
                <button
                  type="button"
                  tabIndex={0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectFilter("category", cat.name)}
                >
                  <div className="recommendation-type">Category:</div>
                  <span className="not-section-item">{cat.name}</span>
                </button>
              </li>
            ))}

            {/* Direct matches for Payees */}
            {matchedPayees.map((payee) => (
              <li key={`payee-${payee.id}`}>
                <button
                  type="button"
                  tabIndex={0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectFilter("payee", payee.name)}
                >
                  <div className="recommendation-type">Payee:</div>
                  <span className="not-section-item">{payee.name}</span>
                </button>
              </li>
            ))}

            {/* Standard Scraped Recommendation Options */}
            <li>
              <button
                type="button"
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectFilter("any", trimmed)}
              >
                <div className="recommendation-type">&nbsp;</div>
                <span>
                  Find "<strong>{trimmed}</strong>" in any field
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectFilter("payee", trimmed)}
              >
                <div className="recommendation-type">Payee:</div>
                <span>
                  Find "<strong>{trimmed}</strong>" in the Payee
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectFilter("category", trimmed)}
              >
                <div className="recommendation-type">Category:</div>
                <span>
                  Find "<strong>{trimmed}</strong>" in the Category
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectFilter("memo", trimmed)}
              >
                <div className="recommendation-type">Memo:</div>
                <span>
                  Find "<strong>{trimmed}</strong>" in the Memo
                </span>
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};
