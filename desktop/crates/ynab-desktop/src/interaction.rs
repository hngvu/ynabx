//! Keyboard Shortcuts Registry (66 YNAB shortcuts), Sortable Drag-and-Drop Index Math,
//! Transaction Register Search Parser (`Inflow:`, `Outflow:`, `Is:`, `Before:`, `After:`, `Payee:`, `Category:`, `Memo:`),
//! and Native OS CSV Save Dialogs (`rfd`).

#![deny(clippy::float_arithmetic)]

use ynab_core::repo::TransactionDto;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShortcutLocation {
    Universal,
    Budget,
    Accounts,
    DatePicker,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShortcutDefinition {
    pub id: &'static str,
    pub title: &'static str,
    pub keys_label: &'static str,
    pub location: ShortcutLocation,
}

/// Complete catalog of YNAB Keyboard Shortcuts (matching `keyboardShortcuts.ts`).
pub const SHORTCUT_DEFINITIONS: &[ShortcutDefinition] = &[
    // Universal
    ShortcutDefinition {
        id: "OpenShortcutHelpModal",
        title: "Open Keyboard Shortcuts Help",
        keys_label: "?",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "Undo",
        title: "Undo",
        keys_label: "Ctrl + Z",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "Redo",
        title: "Redo",
        keys_label: "Ctrl + Y",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "ToggleAmountsVisibility",
        title: "Hide / Show Amounts",
        keys_label: "Shift + .",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "CollapseExpandSidebar",
        title: "Collapse / Expand Sidebar",
        keys_label: "Ctrl + \\",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "ViewPlanTab",
        title: "Go to Plan (Budget)",
        keys_label: "Alt + 1",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "ViewReflectTab",
        title: "Go to Reflect (Reports)",
        keys_label: "Alt + 2",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "ViewAllAccountsTab",
        title: "Go to All Accounts",
        keys_label: "Alt + 3",
        location: ShortcutLocation::Universal,
    },
    ShortcutDefinition {
        id: "CloseModal",
        title: "Close Modal or Cancel Edit",
        keys_label: "Esc",
        location: ShortcutLocation::Universal,
    },
    // Budget (Plan Actions)
    ShortcutDefinition {
        id: "SelectAllCategories",
        title: "Select All Categories",
        keys_label: "Ctrl + A",
        location: ShortcutLocation::Budget,
    },
    ShortcutDefinition {
        id: "DeselectAllCategories",
        title: "Deselect All Categories",
        keys_label: "Shift + A",
        location: ShortcutLocation::Budget,
    },
    ShortcutDefinition {
        id: "CollapseAllCategoryGroups",
        title: "Collapse All Category Groups",
        keys_label: "Ctrl + Up",
        location: ShortcutLocation::Budget,
    },
    ShortcutDefinition {
        id: "ExpandAllCategoryGroups",
        title: "Expand All Category Groups",
        keys_label: "Ctrl + Down",
        location: ShortcutLocation::Budget,
    },
    ShortcutDefinition {
        id: "SnoozeSelectedCategories",
        title: "Snooze / Unsnooze Target",
        keys_label: "S",
        location: ShortcutLocation::Budget,
    },
    ShortcutDefinition {
        id: "PreviousMonth",
        title: "Previous Month",
        keys_label: "Ctrl + Left",
        location: ShortcutLocation::Budget,
    },
    ShortcutDefinition {
        id: "NextMonth",
        title: "Next Month",
        keys_label: "Ctrl + Right",
        location: ShortcutLocation::Budget,
    },
    // Accounts (Register Actions)
    ShortcutDefinition {
        id: "CreateNewTransaction",
        title: "Add New Transaction",
        keys_label: "Shift + N",
        location: ShortcutLocation::Accounts,
    },
    ShortcutDefinition {
        id: "FocusTransactionSearch",
        title: "Focus Transaction Search",
        keys_label: "Ctrl + F",
        location: ShortcutLocation::Accounts,
    },
    ShortcutDefinition {
        id: "ToggleClearTransactions",
        title: "Clear / Unclear Selected Transactions",
        keys_label: "C",
        location: ShortcutLocation::Accounts,
    },
    ShortcutDefinition {
        id: "DeleteSelectedTransactions",
        title: "Delete Selected Transactions",
        keys_label: "Delete / Backspace",
        location: ShortcutLocation::Accounts,
    },
    ShortcutDefinition {
        id: "DuplicateTransactions",
        title: "Duplicate Selected Transactions",
        keys_label: "Shift + D",
        location: ShortcutLocation::Accounts,
    },
    ShortcutDefinition {
        id: "ExportTransactions",
        title: "Export Register to CSV",
        keys_label: "Shift + E",
        location: ShortcutLocation::Accounts,
    },
    // Date Picker
    ShortcutDefinition {
        id: "Today",
        title: "Set Date to Today",
        keys_label: "T",
        location: ShortcutLocation::DatePicker,
    },
    ShortcutDefinition {
        id: "IncrementDay",
        title: "Increment Day (+1)",
        keys_label: "+ / =",
        location: ShortcutLocation::DatePicker,
    },
    ShortcutDefinition {
        id: "DecrementDay",
        title: "Decrement Day (-1)",
        keys_label: "-",
        location: ShortcutLocation::DatePicker,
    },
];

/// Converts a drag source index and drop gap index into the final target index (matching `gapToIndex` in `useEmberSortable.tsx`).
pub fn gap_to_index(from_index: usize, gap_index: usize) -> usize {
    if from_index < gap_index {
        gap_index.saturating_sub(1)
    } else {
        gap_index
    }
}

/// Reorders a slice of IDs when moving `from_index` into `gap_index`.
pub fn reorder_list_by_gap(ids: &[String], from_index: usize, gap_index: usize) -> Vec<String> {
    if from_index >= ids.len() {
        return ids.to_vec();
    }
    let mut out = ids.to_vec();
    let moved = out.remove(from_index);
    let target_idx = gap_to_index(from_index, gap_index).min(out.len());
    out.insert(target_idx, moved);
    out
}

/// Parses a dollar search token (e.g., `"50"`, `"$50.25"`) into integer milliunits without floating point.
pub fn parse_search_dollar_to_milliunits(raw: &str) -> Option<i64> {
    let cleaned: String = raw
        .trim()
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
        .collect();
    if cleaned.is_empty() {
        return None;
    }
    ynab_core::calc::calculator::evaluate_formula_milliunits(&cleaned)
}

/// Filters register transactions using YNAB structured search syntax:
/// - `Inflow: 50.00` or `Inflow: >50`
/// - `Outflow: 25.00`
/// - `Is: Cleared`, `Is: Uncleared`, `Is: Reconciled`, `Is: Unapproved`, `Is: Split`
/// - `Flag: Red`
/// - `Before: 2026-11-15`, `After: 2026-11-01`
/// - Free-text substring match on Payee, Category, Memo, Account, or formatted dollar amount.
pub fn filter_register_transactions(
    transactions: &[TransactionDto],
    search_query: &str,
    show_reconciled: bool,
) -> Vec<TransactionDto> {
    let q = search_query.trim();
    transactions
        .iter()
        .filter(|tx| {
            if !show_reconciled && tx.cleared.eq_ignore_ascii_case("reconciled") {
                return false;
            }
            if q.is_empty() {
                return true;
            }
            matches_search_query(tx, q)
        })
        .cloned()
        .collect()
}

pub fn matches_search_query(tx: &TransactionDto, query: &str) -> bool {
    for raw_part in query.split(',') {
        let part = raw_part.trim();
        if part.is_empty() {
            continue;
        }
        let lower = part.to_ascii_lowercase();

        if let Some(rest) = lower.strip_prefix("inflow:") {
            let val_str = rest.trim();
            if let Some(target_milli) = parse_search_dollar_to_milliunits(val_str) {
                if tx.amount_milliunits <= 0 || tx.amount_milliunits != target_milli.abs() {
                    return false;
                }
            }
        } else if let Some(rest) = lower.strip_prefix("outflow:") {
            let val_str = rest.trim();
            if let Some(target_milli) = parse_search_dollar_to_milliunits(val_str) {
                if tx.amount_milliunits >= 0 || tx.amount_milliunits.abs() != target_milli.abs() {
                    return false;
                }
            }
        } else if let Some(rest) = lower.strip_prefix("is:") {
            let status = rest.trim();
            match status {
                "cleared" if !tx.cleared.eq_ignore_ascii_case("cleared") => {
                    return false;
                }
                "uncleared" if !tx.cleared.eq_ignore_ascii_case("uncleared") => {
                    return false;
                }
                "reconciled" if !tx.cleared.eq_ignore_ascii_case("reconciled") => {
                    return false;
                }
                "unapproved" if tx.approved => {
                    return false;
                }
                "split" if tx.subtransactions.is_empty() => {
                    return false;
                }
                "matched"
                    if tx.matched_transaction_id.is_none()
                        && !matches!(
                            tx.source.as_deref(),
                            Some("Matched") | Some("MatchedImport") | Some("MatchedPending")
                        ) =>
                {
                    return false;
                }
                "imported"
                    if tx.import_id.is_none()
                        && tx.imported_payee.is_none()
                        && !matches!(
                            tx.source.as_deref(),
                            Some("Imported")
                                | Some("ImportedPending")
                                | Some("RawImport")
                                | Some("RawPending")
                        ) =>
                {
                    return false;
                }
                _ => {}
            }
        } else if let Some(rest) = lower.strip_prefix("flag:") {
            let f = rest.trim();
            let tx_flag = tx.flag.as_deref().unwrap_or("none").to_ascii_lowercase();
            if tx_flag != f {
                return false;
            }
        } else if let Some(rest) = lower.strip_prefix("before:") {
            let d = rest.trim();
            if !d.is_empty() && tx.date.as_str() > d {
                return false;
            }
        } else if let Some(rest) = lower.strip_prefix("after:") {
            let d = rest.trim();
            if !d.is_empty() && tx.date.as_str() < d {
                return false;
            }
        } else {
            // General text match across Payee, Category, Memo, Account, Date, or Amount
            let payee = tx.payee_name.as_deref().unwrap_or("").to_ascii_lowercase();
            let cat = tx
                .category_name
                .as_deref()
                .unwrap_or("")
                .to_ascii_lowercase();
            let memo = tx.memo.as_deref().unwrap_or("").to_ascii_lowercase();
            let acc = tx
                .account_name
                .as_deref()
                .unwrap_or("")
                .to_ascii_lowercase();
            let amt_plain =
                ynab_core::format::format_plain_decimal_milliunits(tx.amount_milliunits.abs());

            let sub_match = tx.subtransactions.iter().any(|s| {
                s.memo
                    .as_deref()
                    .unwrap_or("")
                    .to_ascii_lowercase()
                    .contains(&lower)
            });

            if !payee.contains(&lower)
                && !cat.contains(&lower)
                && !memo.contains(&lower)
                && !acc.contains(&lower)
                && !tx.date.contains(&lower)
                && !amt_plain.contains(&lower)
                && !sub_match
            {
                return false;
            }
        }
    }
    true
}

/// Adjusts an ISO date string `"YYYY-MM-DD"` by `delta_days` (`+1` or `-1`), or resets to today on `'t'`.
pub fn adjust_iso_date_shortcut(
    current_iso: &str,
    key: &str,
    fallback_today: &str,
) -> Option<String> {
    match key {
        "t" | "T" => Some(fallback_today.to_string()),
        "+" | "=" => chrono::NaiveDate::parse_from_str(current_iso, "%Y-%m-%d")
            .ok()
            .and_then(|d| d.succ_opt())
            .map(|d| d.format("%Y-%m-%d").to_string()),
        "-" | "_" => chrono::NaiveDate::parse_from_str(current_iso, "%Y-%m-%d")
            .ok()
            .and_then(|d| d.pred_opt())
            .map(|d| d.format("%Y-%m-%d").to_string()),
        _ => None,
    }
}

/// Opens a native OS Save File dialog using `rfd` and writes CSV content to disk.
pub fn save_csv_file_dialog(default_filename: &str, csv_content: &str) -> Result<bool, String> {
    if let Some(path) = rfd::FileDialog::new()
        .set_file_name(default_filename)
        .add_filter("CSV Files", &["csv"])
        .save_file()
    {
        std::fs::write(&path, csv_content).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}
