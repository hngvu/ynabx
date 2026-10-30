import React, { useEffect, useRef } from "react";
import type {
  Category,
  CategoryGroup,
  CategoryMonthAllocation,
} from "../../api/types";
import { formatMilliunits } from "../../utils/currency";
import { YnabIcon } from "../common/YnabIcon";

export interface CategoryDropdownPopoverProps {
  isOpen: boolean;
  selectedCategoryId: string | null;
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  monthlyBudgets?: CategoryMonthAllocation[];
  searchQuery: string;
  anchorPosition?: {
    top: number;
    left: number;
    width?: number;
    height?: number;
    bottom?: number;
  } | null;
  onSelectCategory: (categoryId: string | null) => void;
  onOpenAddCategory?: () => void;
  onClose: () => void;
}

export const CategoryDropdownPopover: React.FC<CategoryDropdownPopoverProps> = ({
  isOpen,
  selectedCategoryId,
  categories,
  categoryGroups,
  monthlyBudgets,
  searchQuery,
  anchorPosition,
  onSelectCategory,
  onOpenAddCategory,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = (searchQuery || "").trim().toLowerCase();

  // Create lookup maps
  const groupNameById = new Map<string, string>();
  if (categoryGroups) {
    for (const g of categoryGroups) {
      groupNameById.set(g.id, g.name);
    }
  }

  const availableByCatId = new Map<string, number>();
  if (monthlyBudgets) {
    for (const alloc of monthlyBudgets) {
      availableByCatId.set(alloc.category_id, alloc.available_milliunits);
    }
  }

  // Filter categories by search
  const visibleCategories = categories.filter((c) => {
    if (c.hidden) return false;
    if (!q) return true;
    const grpName = groupNameById.get(c.group_id) ?? "";
    return (
      c.name.toLowerCase().includes(q) ||
      grpName.toLowerCase().includes(q)
    );
  });

  // Separate Inflow from regular categories
  const inflowCategories = visibleCategories.filter(
    (c) => c.is_inflow_category || c.name.toLowerCase().includes("ready to assign"),
  );
  const expenseCategories = visibleCategories.filter(
    (c) => !c.is_inflow_category && !c.name.toLowerCase().includes("ready to assign"),
  );

  // Group expense categories by group_id preserving group sort
  const groupsMap = new Map<string, Category[]>();
  for (const cat of expenseCategories) {
    const list = groupsMap.get(cat.group_id) ?? [];
    list.push(cat);
    groupsMap.set(cat.group_id, list);
  }

  // Determine sections
  interface Section {
    groupName: string;
    items: Category[];
  }
  const sections: Section[] = [];

  if (inflowCategories.length > 0) {
    sections.push({
      groupName: "Inflow",
      items: inflowCategories,
    });
  }

  // If categoryGroups prop is provided, preserve their order
  if (categoryGroups && categoryGroups.length > 0) {
    for (const grp of categoryGroups) {
      const items = groupsMap.get(grp.id);
      if (items && items.length > 0) {
        sections.push({
          groupName: grp.name,
          items,
        });
      }
    }
  } else {
    for (const [grpId, items] of groupsMap.entries()) {
      sections.push({
        groupName: groupNameById.get(grpId) ?? "Categories",
        items,
      });
    }
  }

  // Positioning
  const modalWidth = 320; // min-width: 272px, max-width: 408px
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const anchorTop =
    anchorPosition?.bottom ?? (anchorPosition ? anchorPosition.top + 28 : 300);
  const anchorLeft = anchorPosition?.left ?? 350;
  const anchorWidth = anchorPosition?.width ?? 120;

  const topPos = anchorTop + 6;
  const leftPos = Math.max(
    16,
    Math.min(windowWidth - modalWidth - 16, anchorLeft),
  );
  const anchorCenter = anchorLeft + anchorWidth / 2;
  const arrowLeft = Math.max(
    16,
    Math.min(modalWidth - 46, anchorCenter - leftPos - 15),
  );

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-account-dropdown modal-account-categories popover-anchor-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        backgroundColor: "transparent",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        pointerEvents: "auto",
        display: "block",
      }}
      onClick={onClose}
    >
      <div
        ref={popoverRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: `${topPos}px`,
          left: `${leftPos}px`,
          minWidth: "272px",
          maxWidth: "408px",
          width: `${modalWidth}px`,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: New Category */}
        <div className="modal-action-header">
          <button
            className="button open-create-category-modal-button"
            type="button"
            onClick={() => {
              if (onOpenAddCategory) onOpenAddCategory();
              onClose();
            }}
          >
            <YnabIcon
              name="plus_circle_fill"
              size={12}
              className="category-dropdown-icon"
            />
            New Category
          </button>
        </div>

        {/* Categories List */}
        <ul
          className="modal-list"
          style={{
            maxHeight: "320px",
            overflowY: "auto",
            margin: 0,
            padding: 0,
          }}
        >
          {sections.map((section) => (
            <React.Fragment key={section.groupName}>
              <li className="user-data section-item">
                <span className="modal-account-categories-section-item">
                  {section.groupName}
                </span>
              </li>
              {section.items.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const balance = availableByCatId.get(cat.id) ?? 0;
                const isPositive = balance >= 0;

                return (
                  <li key={cat.id} className="user-data">
                    <button
                      className="button-list existing-category"
                      type="button"
                      onClick={() => {
                        onSelectCategory(cat.id);
                        onClose();
                      }}
                    >
                      <div
                        className="modal-account-categories-category"
                        title={cat.name}
                      >
                        <span className="selected-icon-container">
                          {isSelected && (
                            <YnabIcon
                              name="check"
                              size={14}
                              className="selected-category-icon"
                            />
                          )}
                        </span>
                        <span className="modal-account-categories-category-name">
                          <span className="modal-account-categories-category-name-subcategory-name">
                            {cat.name}
                          </span>
                        </span>
                        <span
                          className={`user-data currency tabular-nums ${
                            balance === 0
                              ? "zero"
                              : isPositive
                              ? "positive"
                              : "negative"
                          }`}
                        >
                          <bdi>{formatMilliunits(balance)}</bdi>
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </React.Fragment>
          ))}

          {sections.length === 0 && (
            <li
              className="user-data"
              style={{
                padding: "1rem",
                textAlign: "center",
                color: "var(--labelSecondary)",
                fontSize: "0.85rem",
              }}
            >
              No categories found.
            </li>
          )}
        </ul>

        {/* Footer Actions */}
        <div className="modal-actions">
          <button
            className="ynab-button secondary button modal-account-categories-record-payment"
            type="button"
            onClick={onClose}
          >
            Payment/Transfer
          </button>
          <button
            className="ynab-button secondary button modal-account-categories-split-transaction"
            type="button"
            onClick={onClose}
          >
            Split
          </button>
        </div>

        {/* Modal Arrow */}
        <svg
          className="modal-arrow"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            left: `${arrowLeft}px`,
            bottom: "100%",
            height: "0.9375rem",
            width: "1.875rem",
          }}
        >
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z"></path>
        </svg>
      </div>
    </div>
  );
};
