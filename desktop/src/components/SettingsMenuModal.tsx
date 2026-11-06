import React from "react";
import { YnabIcon } from "./YnabIcon.tsx";

interface SettingsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetName: string;
  onOpenBudgetSettings: () => void;
  onOpenManagePayees: () => void;
  onOpenThemeSwitcher: () => void;
  onNewBudget: () => void;
  onExportBudget: () => void;
}

export const SettingsMenuModal: React.FC<SettingsMenuModalProps> = ({
  isOpen,
  onClose,
  budgetName,
  onOpenBudgetSettings,
  onOpenManagePayees,
  onOpenThemeSwitcher,
  onNewBudget,
  onExportBudget,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="ynab-u modal-overlay ynab-new-settings-menu"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10001 }}
    >
      <div
        className="modal"
        role="dialog"
        aria-label="Settings Menu"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "3.25rem",
          left: "0.5rem",
          width: "15rem",
          backgroundColor: "var(--backgroundPrimaryElevated)",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--separatorSubdued)",
          overflow: "hidden",
        }}
      >
        <ul className="modal-list" role="menu">
          {/* New Budget */}
          <li>
            <button
              type="button"
              className="modal-select-budget-create"
              onClick={() => {
                onClose();
                onNewBudget();
              }}
            >
              <YnabIcon name="plus_circle_fill" width={16} height={16} />
              <span>New Plan...</span>
            </button>
          </li>

          <hr />

          <li className="modal-list-header">
            <strong>{budgetName}</strong>
          </li>

          {/* Plan Settings */}
          <li>
            <button
              type="button"
              className="modal-select-budget-settings"
              onClick={() => {
                onClose();
                onOpenBudgetSettings();
              }}
            >
              <YnabIcon name="wrench" width={16} height={16} />
              <span>Plan Settings...</span>
            </button>
          </li>

          {/* Manage Payees */}
          <li>
            <button
              type="button"
              className="modal-select-budget-manage-payees"
              onClick={() => {
                onClose();
                onOpenManagePayees();
              }}
            >
              <YnabIcon name="arrows_circle_fill" width={16} height={16} />
              <span>Manage Payees...</span>
            </button>
          </li>

          {/* Display Options */}
          <li>
            <button
              type="button"
              className="modal-select-theme-switcher"
              onClick={() => {
                onClose();
                onOpenThemeSwitcher();
              }}
            >
              <YnabIcon name="paint_roller" width={16} height={16} />
              <span>Display Options...</span>
            </button>
          </li>

          {/* Export Budget */}
          <li>
            <button
              type="button"
              className="modal-select-budget-export"
              onClick={() => {
                onClose();
                onExportBudget();
              }}
            >
              <YnabIcon name="document_with_arrow_down" width={16} height={16} />
              <span>Export Budget Data</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};
