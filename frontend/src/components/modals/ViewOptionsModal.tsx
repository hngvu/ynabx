import React, { useState, useRef, useEffect } from "react";
import { YnabIcon } from "../common/YnabIcon";

export interface ViewOptionsState {
  datePreset: "thismonth" | "lastmonth" | "latest3months" | "thisyear" | "lastyear" | "alldates";
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  showReconciled: boolean;
  showFlags: boolean;
}

export interface ViewOptionsModalProps {
  isOpen: boolean;
  anchorPosition: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width?: number;
    height?: number;
  } | null;
  currentOptions: ViewOptionsState;
  onApply: (options: ViewOptionsState) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 12 }, (_, i) => 2025 + i);

export const ViewOptionsModal: React.FC<ViewOptionsModalProps> = ({
  isOpen,
  anchorPosition,
  currentOptions,
  onApply,
  onClose,
}) => {
  const [draft, setDraft] = useState<ViewOptionsState>({ ...currentOptions });
  const modalRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(510);

  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      if (rect.width > 0 && Math.abs(rect.width - measuredWidth) > 2) {
        setMeasuredWidth(rect.width);
      }
    }
  }, [isOpen, draft]);

  if (!isOpen || !anchorPosition) return null;

  const handlePresetSelect = (preset: ViewOptionsState["datePreset"]) => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let fromMonth = 0;
    let fromYear = curYear;
    let toMonth = 11;
    let toYear = curYear;

    if (preset === "thismonth") {
      fromMonth = curMonth;
      fromYear = curYear;
      toMonth = curMonth;
      toYear = curYear;
    } else if (preset === "lastmonth") {
      fromMonth = curMonth === 0 ? 11 : curMonth - 1;
      fromYear = curMonth === 0 ? curYear - 1 : curYear;
      toMonth = fromMonth;
      toYear = fromYear;
    } else if (preset === "latest3months") {
      toMonth = curMonth;
      toYear = curYear;
      const start = new Date(curYear, curMonth - 2, 1);
      fromMonth = start.getMonth();
      fromYear = start.getFullYear();
    } else if (preset === "thisyear") {
      fromMonth = 0;
      fromYear = curYear;
      toMonth = 11;
      toYear = curYear;
    } else if (preset === "lastyear") {
      fromMonth = 0;
      fromYear = curYear - 1;
      toMonth = 11;
      toYear = curYear - 1;
    } else if (preset === "alldates") {
      fromMonth = 0;
      fromYear = 2025;
      toMonth = 11;
      toYear = 2036;
    }

    setDraft((prev) => ({
      ...prev,
      datePreset: preset,
      fromMonth,
      fromYear,
      toMonth,
      toYear,
    }));
  };

  const top = anchorPosition.bottom + 6;
  const modalWidth = measuredWidth;
  const buttonCenter =
    anchorPosition.width !== undefined
      ? anchorPosition.left + anchorPosition.width / 2
      : (anchorPosition.left + anchorPosition.right) / 2;

  // Align modal right edge flush with window padding (16px from window edge)
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const idealLeft = windowWidth - modalWidth - 16;
  const left = Math.max(16, idealLeft);

  // Center the 30px arrow on the View button center
  const arrowWidth = 30;
  const idealArrowLeft = buttonCenter - left - arrowWidth / 2;
  const arrowLeft = Math.max(16, Math.min(modalWidth - 46, idealArrowLeft));

  return (
    <div
      className="modal-overlay active ynab-u modal-popup modal-account-view-options"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        backgroundColor: "transparent",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: `${top}px`,
          left: `${left}px`,
          width: "max-content",
          minWidth: "490px",
          zIndex: 10006,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">View Options</div>

        <div className="modal-content">
          <div className="date-range">
            <ul className="date-range-dates">
              <li className={`thismonth ${draft.datePreset === "thismonth" ? "active" : ""}`}>
                <button type="button" onClick={() => handlePresetSelect("thismonth")}>
                  This Month
                </button>
              </li>
              <li className={`lastmonth ${draft.datePreset === "lastmonth" ? "active" : ""}`}>
                <button type="button" onClick={() => handlePresetSelect("lastmonth")}>
                  Last Month
                </button>
              </li>
              <li className={`latest3months ${draft.datePreset === "latest3months" ? "active" : ""}`}>
                <button type="button" onClick={() => handlePresetSelect("latest3months")}>
                  Latest 3 Months
                </button>
              </li>
              <li className={`thisyear ${draft.datePreset === "thisyear" ? "active" : ""}`}>
                <button type="button" onClick={() => handlePresetSelect("thisyear")}>
                  This Year
                </button>
              </li>
              <li className={`lastyear ${draft.datePreset === "lastyear" ? "active" : ""}`}>
                <button type="button" onClick={() => handlePresetSelect("lastyear")}>
                  Last Year
                </button>
              </li>
              <li className={`alldates ${draft.datePreset === "alldates" ? "active" : ""}`}>
                <button type="button" onClick={() => handlePresetSelect("alldates")}>
                  All Dates
                </button>
              </li>
            </ul>

            <hr />

            <ul className="date-range-from-to">
              <li className="date-range-from-label label">From:&nbsp;</li>
              <li className="date-range-from-months">
                <div className="x-select-container">
                  <select
                    className="js-x-select"
                    value={draft.fromMonth}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        fromMonth: parseInt(e.target.value, 10),
                      }))
                    }
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
              <li className="date-range-from-years">
                <div className="x-select-container">
                  <select
                    className="js-x-select"
                    value={draft.fromYear}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        fromYear: parseInt(e.target.value, 10),
                      }))
                    }
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
              <li className="date-range-to-label label">To:&nbsp;</li>
              <li className="date-range-to-months">
                <div className="x-select-container">
                  <select
                    className="js-x-select"
                    value={draft.toMonth}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        toMonth: parseInt(e.target.value, 10),
                      }))
                    }
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
              <li className="date-range-to-years">
                <div className="x-select-container">
                  <select
                    className="js-x-select"
                    value={draft.toYear}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        toYear: parseInt(e.target.value, 10),
                      }))
                    }
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            </ul>
          </div>

          <hr />

          <ul className="modal-account-view-options-status">
            <li>
              <button
                className={`ynab-checkbox ynab-checkbox-button modal-account-view-options-show-reconciled ${
                  draft.showReconciled ? "is-checked" : ""
                }`}
                role="checkbox"
                aria-checked={draft.showReconciled ? "true" : "false"}
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    showReconciled: !prev.showReconciled,
                  }))
                }
              >
                <YnabIcon
                  name="check"
                  size={13}
                  className={`ynab-checkbox-button-square ${
                    draft.showReconciled ? "is-checked" : ""
                  }`}
                />
                <div className="label-checkbox">Show Reconciled Transactions</div>
              </button>
            </li>
            <li>
              <button
                className={`ynab-checkbox ynab-checkbox-button modal-account-view-options-show-flag ${
                  draft.showFlags ? "is-checked" : ""
                }`}
                role="checkbox"
                aria-checked={draft.showFlags ? "true" : "false"}
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    showFlags: !prev.showFlags,
                  }))
                }
              >
                <YnabIcon
                  name="check"
                  size={13}
                  className={`ynab-checkbox-button-square ${
                    draft.showFlags ? "is-checked" : ""
                  }`}
                />
                <div className="label-checkbox">Show Flags</div>
              </button>
            </li>
          </ul>
        </div>

        <div className="modal-actions">
          <button className="ynab-button secondary button-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ynab-button primary"
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply
          </button>
        </div>

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
          <path d="M 0 100 L 50 0 L 100 100 L 0 100 Z" fill="var(--backgroundPrimaryElevated, #ffffff)" />
        </svg>
      </div>
    </div>
  );
};
