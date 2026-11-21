//! Accounts & Ledger Register Workspace (`AccountsWorkspace`, `AccountRegisterPanel`,
//! `AccountsHeader`, `AccountsToolbar`, `TransactionSearch`, `RegisterGridHeader`, `RegisterGridRow`,
//! `RegisterGridEditRow`, `RegisterActionBar`, `ReconcileWizardModalView`).
//! Supports single-account, All Accounts, and Loan account routing, split subtransactions,
//! transfers, expandable Scheduled Transactions (`Enter Now`, `Skip Next`, `Delete`,
//! Fabricated Scheduled Transfers), Imported & Matched Transaction UX (`link` badge,
//! `Imported as: ...`, `Match` & `Unmatch`), File Import trigger, structured `TransactionSearch`,
//! reconciliation 4-step wizard, running balance, and CSV export.

#![deny(clippy::float_arithmetic)]

use chrono::{Datelike, NaiveDate};
use dioxus::prelude::*;
use serde_json::json;
use std::collections::HashMap;

use crate::interaction::{
    adjust_iso_date_shortcut, filter_register_transactions, save_csv_file_dialog,
};
use crate::state::{ActiveModal, AppStore};
use crate::ui::core::{Icon, YnabButton};
use crate::ui::loan::{is_loan_account_type, LoanAccountWorkspace};
use ynab_core::calc::calculator::evaluate_formula_milliunits;
use ynab_core::format::{export_transactions_to_csv, ExportRegisterRow};
use ynab_core::ledger::scheduled::{SaveScheduledTransactionPayload, ScheduledTransactionDto};
use ynab_core::ledger::transfers::{SaveTransactionPayload, SubTransactionDto};
use ynab_core::repo::{is_credit_card_account, AccountDto, TransactionDto};
use ynab_core::seed::CAT_IMMEDIATE_INCOME;

#[derive(Debug, Clone, PartialEq, Eq)]
struct ScheduledRowVm {
    dto: ScheduledTransactionDto,
    source_scheduled_id: String,
    is_fabricated_transfer: bool,
    counterpart_label: Option<String>,
}

/// Returns true if a transaction is currently matched with an imported bank entry.
pub fn is_transaction_matched(tx: &TransactionDto) -> bool {
    tx.matched_transaction_id.is_some()
        || matches!(
            tx.source.as_deref(),
            Some("Matched") | Some("MatchedImport") | Some("MatchedPending")
        )
}

/// Returns true if a transaction originated from file/direct bank import.
pub fn is_transaction_imported(tx: &TransactionDto) -> bool {
    tx.import_id.is_some()
        || tx.imported_payee.is_some()
        || matches!(
            tx.source.as_deref(),
            Some("Imported") | Some("ImportedPending") | Some("RawImport") | Some("RawPending")
        )
}

/// Checks whether 2 selected transactions can be manually matched (`MATCH_MAX_DAYS_APART = 10`,
/// exact amount, same account, excluding transfers, one manual & one imported).
/// Returns `Some((manual_tx_id, imported_tx_id))` when compatible.
pub fn can_manually_match_pair(a: &TransactionDto, b: &TransactionDto) -> Option<(String, String)> {
    if a.id == b.id
        || a.account_id != b.account_id
        || a.amount_milliunits != b.amount_milliunits
        || a.transfer_account_id.is_some()
        || b.transfer_account_id.is_some()
        || a.cleared == "Reconciled"
        || b.cleared == "Reconciled"
        || is_transaction_matched(a)
        || is_transaction_matched(b)
    {
        return None;
    }

    let da = NaiveDate::parse_from_str(&a.date, "%Y-%m-%d").ok()?;
    let db = NaiveDate::parse_from_str(&b.date, "%Y-%m-%d").ok()?;
    let days_apart = da.signed_duration_since(db).num_days().abs();
    if days_apart > 10 {
        return None;
    }

    let a_imp = is_transaction_imported(a);
    let b_imp = is_transaction_imported(b);
    match (a_imp, b_imp) {
        (false, true) => Some((a.id.clone(), b.id.clone())),
        (true, false) => Some((b.id.clone(), a.id.clone())),
        _ => None,
    }
}

fn filter_register_extended(
    transactions: &[TransactionDto],
    search_query: &str,
    show_reconciled: bool,
    date_range_preset: &str,
) -> Vec<TransactionDto> {
    let base = filter_register_transactions(transactions, search_query, show_reconciled);
    let q_lower = search_query.to_ascii_lowercase();
    let require_matched = q_lower
        .split(',')
        .any(|p| p.trim() == "is: matched" || p.trim() == "is:matched");
    let require_imported = q_lower
        .split(',')
        .any(|p| p.trim() == "is: imported" || p.trim() == "is:imported");

    let today = chrono::Local::now().date_naive();
    let min_date_iso: Option<String> = match date_range_preset {
        "this-month" => Some(format!("{:04}-{:02}-01", today.year(), today.month())),
        "3-months" => {
            let mut y = today.year();
            let mut m = today.month() as i32 - 2;
            if m <= 0 {
                m += 12;
                y -= 1;
            }
            Some(format!("{y:04}-{m:02}-01"))
        }
        "this-year" => Some(format!("{:04}-01-01", today.year())),
        "last-year" => Some(format!("{:04}-01-01", today.year() - 1)),
        _ => None,
    };
    let max_date_iso: Option<String> = if date_range_preset == "last-year" {
        Some(format!("{:04}-12-31", today.year() - 1))
    } else {
        None
    };

    base.into_iter()
        .filter(|tx| {
            if require_matched && !is_transaction_matched(tx) {
                return false;
            }
            if require_imported && !is_transaction_imported(tx) {
                return false;
            }
            if let Some(ref min_d) = min_date_iso {
                if tx.date.as_str() < min_d.as_str() {
                    return false;
                }
            }
            if let Some(ref max_d) = max_date_iso {
                if tx.date.as_str() > max_d.as_str() {
                    return false;
                }
            }
            true
        })
        .collect()
}

fn collect_scheduled_rows_with_fabricated(
    store: &AppStore,
    accounts: &[AccountDto],
) -> Vec<ScheduledRowVm> {
    let view_rows = store.scheduled_view_rows.read().clone();
    view_rows
        .into_iter()
        .map(|row| {
            let st = row.scheduled;
            let source_id = row
                .source_scheduled_transaction_id
                .clone()
                .unwrap_or_else(|| st.id.clone());
            let counterpart_label = if row.is_fabricated {
                let src_name = st
                    .transfer_account_id
                    .as_ref()
                    .and_then(|src_id| accounts.iter().find(|a| &a.id == src_id))
                    .map(|a| a.name.as_str())
                    .or_else(|| {
                        st.payee_name
                            .as_deref()
                            .and_then(|s| s.strip_prefix("Transfer : "))
                    })
                    .unwrap_or("Source Account");
                Some(format!("Transfer from {src_name}"))
            } else if let Some(ref xfer_id) = st.transfer_account_id {
                let target_name = accounts
                    .iter()
                    .find(|a| &a.id == xfer_id)
                    .map(|a| a.name.as_str())
                    .unwrap_or("Account");
                Some(format!("Transfer : {target_name}"))
            } else {
                None
            };
            ScheduledRowVm {
                dto: st,
                source_scheduled_id: source_id,
                is_fabricated_transfer: row.is_fabricated,
                counterpart_label,
            }
        })
        .collect()
}

#[component]
pub fn AccountsWorkspace(selected_account_id: Option<String>) -> Element {
    let store = use_context::<AppStore>();
    let accounts = store.accounts.read().clone();
    let selected_account: Option<AccountDto> = selected_account_id
        .as_ref()
        .and_then(|id| accounts.iter().find(|a| &a.id == id).cloned());

    if let Some(ref acc) = selected_account {
        if is_loan_account_type(&acc.r#type) {
            return rsx! {
                LoanAccountWorkspace { account: acc.clone() }
            };
        }
    }

    rsx! {
        AccountRegisterPanel {
            selected_account_id: selected_account_id,
            embedded_in_loan: false,
        }
    }
}

#[component]
pub fn AccountRegisterPanel(
    selected_account_id: Option<String>,
    #[props(default = false)] embedded_in_loan: bool,
) -> Element {
    let mut store = use_context::<AppStore>();
    let accounts = store.accounts.read().clone();
    let selected_account: Option<AccountDto> = selected_account_id
        .as_ref()
        .and_then(|id| accounts.iter().find(|a| &a.id == id).cloned());

    let mut date_range_preset = use_signal(|| "all".to_string());
    let mut scheduled_expanded = use_signal(|| true);

    let show_account_col = selected_account.is_none();
    let show_running_bal = *store.show_running_balance.read();
    let show_flags = *store.show_flags.read();
    let show_images = *store.show_images.read();
    let show_reconciled = *store.show_reconciled.read();
    let show_scheduled = *store.show_scheduled.read();
    let search_q = store.search_text.read().clone();
    let sort_col = store.sort_column.read().clone();
    let sort_asc = *store.sort_ascending.read();

    // Calculate cleared / uncleared / working balances
    let (cleared_bal, uncleared_bal, working_bal) = if let Some(ref acc) = selected_account {
        (
            acc.cleared_balance_milliunits,
            acc.uncleared_balance_milliunits,
            acc.balance_milliunits,
        )
    } else {
        let c: i64 = accounts
            .iter()
            .filter(|a| !a.closed)
            .map(|a| a.cleared_balance_milliunits)
            .sum();
        let u: i64 = accounts
            .iter()
            .filter(|a| !a.closed)
            .map(|a| a.uncleared_balance_milliunits)
            .sum();
        let w: i64 = accounts
            .iter()
            .filter(|a| !a.closed)
            .map(|a| a.balance_milliunits)
            .sum();
        (c, u, w)
    };

    // Filter and sort transactions
    let raw_txs = store.transactions.read().clone();
    let mut filtered_txs = filter_register_extended(
        &raw_txs,
        &search_q,
        show_reconciled,
        &date_range_preset.read(),
    );

    // Precompute chronological running balance map per transaction
    let mut running_balance_map: HashMap<String, i64> = HashMap::new();
    {
        let mut chrono_txs = raw_txs.clone();
        chrono_txs.sort_by(|a, b| a.date.cmp(&b.date).then_with(|| a.id.cmp(&b.id)));
        let mut running: i64 = 0;
        for tx in chrono_txs {
            running += tx.amount_milliunits;
            running_balance_map.insert(tx.id, running);
        }
    }

    filtered_txs.sort_by(|a, b| {
        let ord = match sort_col.as_str() {
            "accountName" => a
                .account_name
                .as_deref()
                .unwrap_or("")
                .cmp(b.account_name.as_deref().unwrap_or("")),
            "payeeName" => a
                .payee_name
                .as_deref()
                .unwrap_or("")
                .cmp(b.payee_name.as_deref().unwrap_or("")),
            "subCategoryName" => a
                .category_name
                .as_deref()
                .unwrap_or("")
                .cmp(b.category_name.as_deref().unwrap_or("")),
            "memo" => a
                .memo
                .as_deref()
                .unwrap_or("")
                .cmp(b.memo.as_deref().unwrap_or("")),
            "outflow" => a
                .amount_milliunits
                .min(0)
                .abs()
                .cmp(&b.amount_milliunits.min(0).abs()),
            "inflow" => a.amount_milliunits.max(0).cmp(&b.amount_milliunits.max(0)),
            _ => a.date.cmp(&b.date),
        };
        if sort_asc {
            ord
        } else {
            ord.reverse()
        }
    });

    let selected_ids = store.selected_tx_ids.read().clone();
    let selected_txs: Vec<TransactionDto> = filtered_txs
        .iter()
        .filter(|t| selected_ids.contains(&t.id))
        .cloned()
        .collect();
    let selected_count = selected_txs.len();
    let selected_total: i64 = selected_txs.iter().map(|t| t.amount_milliunits).sum();

    let all_visible_ids: Vec<String> = filtered_txs.iter().map(|t| t.id.clone()).collect();
    let are_all_checked =
        !all_visible_ids.is_empty() && all_visible_ids.iter().all(|id| selected_ids.contains(id));

    let scheduled_items = collect_scheduled_rows_with_fabricated(&store, &accounts);

    let is_adding = *store.is_adding_tx.read();
    let editing_id = store.editing_tx_id.read().clone();
    let is_sched_open = *scheduled_expanded.read();
    let is_cc = is_credit_card_account(selected_account.as_ref().map(|a| a.r#type.as_str()));
    let has_search = !search_q.trim().is_empty();
    let grid_cls = format!(
        "ynab-grid{}{}",
        if is_cc {
            " ynab-grid-is-credit-card"
        } else {
            ""
        },
        if has_search { " is-search-active" } else { "" }
    );
    let default_acc_id = selected_account.as_ref().map(|a| a.id.clone());

    let register_content = rsx! {
        div {
            class: if embedded_in_loan {
                "content-min-break register-flex-columns accounts-register-embedded"
            } else {
                "content-min-break register-flex-columns"
            },
            if !embedded_in_loan {
                AccountsHeader {
                    selected_account: selected_account.clone(),
                    cleared_balance: cleared_bal,
                    uncleared_balance: uncleared_bal,
                    working_balance: working_bal,
                    selected_count: selected_count,
                    selected_total: selected_total,
                }
            }
            AccountsToolbar {
                selected_account: selected_account.clone(),
                visible_transactions: filtered_txs.clone(),
                date_range_preset: date_range_preset.read().clone(),
                on_change_date_range: move |preset| date_range_preset.set(preset),
            }
            div {
                class: "{grid_cls}",
                RegisterGridHeader {
                    are_all_checked: are_all_checked,
                    show_account_column: show_account_col,
                    show_running_balance: show_running_bal,
                    show_flags: show_flags,
                    show_images: show_images,
                    on_toggle_all: move |_| {
                        let mut sel = store.selected_tx_ids.write();
                        if are_all_checked {
                            sel.clear();
                        } else {
                            for id in &all_visible_ids {
                                sel.insert(id.clone());
                            }
                        }
                    },
                }

                // Inline Add New Transaction Table Section (authentic Ember `.ynab-grid-add-rows`)
                if is_adding {
                    div {
                        class: "ynab-grid-add-rows",
                        RegisterGridEditRow {
                            initial_tx: None,
                            default_account_id: default_acc_id.clone(),
                            show_account_column: show_account_col,
                            show_running_balance: show_running_bal,
                            show_flags: show_flags,
                            show_images: show_images,
                        }
                    }

                }

                div {
                    class: "ynab-grid-container register-scroll-container",
                    div {
                        class: "ynab-grid-body",

                        // Expandable Scheduled Transactions Section (including Fabricated Scheduled Transfers)
                        if show_scheduled && !scheduled_items.is_empty() {
                            div {
                                class: if is_sched_open {
                                    "ynab-grid-body-row ynab-grid-collapsible-transactions-toggle"
                                } else {
                                    "ynab-grid-body-row ynab-grid-collapsible-transactions-toggle is-toggled"
                                },
                                role: "row",
                                div { class: "ynab-grid-cell ynab-grid-cell-checkbox" }
                                div { class: "ynab-grid-cell ynab-grid-cell-notification" }
                                if show_flags {
                                    div { class: "ynab-grid-cell ynab-grid-cell-flag" }
                                }
                                if show_images {
                                    div { class: "ynab-grid-cell ynab-grid-cell-image" }
                                }
                                if show_account_col {
                                    div { class: "ynab-grid-cell ynab-grid-cell-accountName" }
                                }
                                div {
                                    class: "ynab-grid-cell ynab-grid-cell-date ynab-grid-cell-long",
                                    button {
                                        r#type: "button",
                                        class: "scheduled-toggle-button",
                                        onclick: move |_| scheduled_expanded.set(!is_sched_open),
                                        Icon { class: "header-icon", name: "calendar", width: 12, height: 12 }
                                        span { "Scheduled Transactions ({scheduled_items.len()})" }
                                        Icon { class: "toggle-icon", name: "chevron_right", width: 10, height: 10 }
                                    }
                                }
                                div { class: "ynab-grid-cell ynab-grid-cell-payeeName" }
                                div { class: "ynab-grid-cell ynab-grid-cell-subCategoryName" }
                                div { class: "ynab-grid-cell ynab-grid-cell-memo" }
                                div { class: "ynab-grid-cell ynab-grid-cell-outflow" }
                                div { class: "ynab-grid-cell ynab-grid-cell-inflow" }
                                if show_running_bal {
                                    div { class: "ynab-grid-cell ynab-grid-cell-balance" }
                                }
                                div { class: "ynab-grid-cell ynab-grid-cell-cleared" }
                            }
                            if is_sched_open {
                                for item in scheduled_items.iter() {
                                    {
                                        let st = &item.dto;
                                        let st_id_enter = item.source_scheduled_id.clone();
                                        let st_id_skip = item.source_scheduled_id.clone();
                                        let st_id_del = item.source_scheduled_id.clone();
                                        let is_out = st.amount_milliunits < 0;
                                        let is_fab = item.is_fabricated_transfer;
                                        rsx! {
                                            div {
                                                key: "{st.id}",
                                                class: if is_fab {
                                                    "ynab-grid-body-row is-scheduled repeating fabricated-transfer"
                                                } else {
                                                    "ynab-grid-body-row is-scheduled repeating"
                                                },
                                                role: "row",
                                                div { class: "ynab-grid-cell ynab-grid-cell-checkbox" }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-notification",
                                                    if is_fab {
                                                        span {
                                                            class: "ynab-grid-transfer",
                                                            title: "Fabricated Scheduled Transfer Counterpart",
                                                            Icon {
                                                                class: "ynab-grid-jump-to-transfer-transaction",
                                                                name: "arrows_horizontal",
                                                                width: 12,
                                                                height: 12,
                                                            }
                                                        }
                                                    } else {
                                                        Icon { name: "repeat", width: 12, height: 12 }
                                                    }
                                                }
                                                if show_flags {
                                                    div { class: "ynab-grid-cell ynab-grid-cell-flag" }
                                                }
                                                if show_images {
                                                    div { class: "ynab-grid-cell ynab-grid-cell-image" }
                                                }
                                                if show_account_col {
                                                    div {
                                                        class: "ynab-grid-cell ynab-grid-cell-accountName user-data",
                                                        "{st.account_name.as_deref().unwrap_or(\"\")}"
                                                    }
                                                }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-date user-data",
                                                    span {
                                                        class: "date-string",
                                                        "{store.format_date(&st.date)} ({st.frequency})"
                                                    }
                                                }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-payeeName user-data",
                                                    div {
                                                        class: "ynab-grid-cell-inner",
                                                        span {
                                                            class: "ynab-grid-cell-inner-payee-name",
                                                            "{st.payee_name.as_deref().unwrap_or(\"\")}"
                                                        }
                                                        if is_fab {
                                                            span {
                                                                class: "scheduled-transfer-badge",
                                                                "Scheduled Transfer"
                                                            }
                                                        }
                                                    }
                                                }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-subCategoryName user-data",
                                                    if st.transfer_account_id.is_some() {
                                                        span { class: "category-not-needed indent", "Category not needed" }
                                                    } else {
                                                        span { class: "indent", "{st.category_name.as_deref().unwrap_or(\"\")}" }
                                                    }
                                                }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-memo user-data",
                                                    if let Some(ref c_lbl) = item.counterpart_label {
                                                        if st.memo.as_deref().unwrap_or("").is_empty() {
                                                            span { class: "scheduled-counterpart-memo", "{c_lbl}" }
                                                        } else {
                                                            "{st.memo.as_deref().unwrap_or(\"\")}"
                                                        }
                                                    } else {
                                                        "{st.memo.as_deref().unwrap_or(\"\")}"
                                                    }
                                                }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-outflow user-data",
                                                    if is_out {
                                                        span {
                                                            class: "currency tabular-nums",
                                                            "{store.format_money(st.amount_milliunits.abs())}"
                                                        }
                                                    }
                                                }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-inflow user-data",
                                                    if !is_out {
                                                        span {
                                                            class: "currency tabular-nums",
                                                            "{store.format_money(st.amount_milliunits)}"
                                                        }
                                                    }
                                                }
                                                if show_running_bal {
                                                    div { class: "ynab-grid-cell ynab-grid-cell-balance" }
                                                }
                                                div {
                                                    class: "ynab-grid-cell ynab-grid-cell-cleared scheduled-actions-cell",
                                                    div {
                                                        class: "scheduled-row-actions",
                                                        button {
                                                            r#type: "button",
                                                            class: "scheduled-action-btn scheduled-action-btn--enter",
                                                            title: "Enter Now",
                                                            onclick: move |_| store.enter_scheduled_now(&st_id_enter),
                                                            "Enter Now"
                                                        }
                                                        button {
                                                            r#type: "button",
                                                            class: "scheduled-action-btn scheduled-action-btn--skip",
                                                            title: "Skip Next Occurrence",
                                                            onclick: move |_| store.skip_scheduled_occurrence(&st_id_skip),
                                                            "Skip"
                                                        }
                                                        button {
                                                            r#type: "button",
                                                            class: "scheduled-action-btn scheduled-action-btn--delete",
                                                            title: "Delete Scheduled",
                                                            onclick: move |_| store.delete_scheduled(&st_id_del),
                                                            Icon { name: "close", width: 10, height: 10 }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                div {
                                    class: "ynab-grid-body-row ynab-grid-spacer",
                                    role: "row",
                                    div { class: "ynab-grid-cell" }
                                }
                            }
                        }

                        // Active Ledger Transaction Rows
                        for tx in filtered_txs.iter() {
                            if editing_id.as_deref() == Some(tx.id.as_str()) {
                                RegisterGridEditRow {
                                    key: "edit-{tx.id}",
                                    initial_tx: Some(tx.clone()),
                                    default_account_id: Some(tx.account_id.clone()),
                                    show_account_column: show_account_col,
                                    show_running_balance: show_running_bal,
                                    show_flags: show_flags,
                                    show_images: show_images,
                                }
                            } else {
                                RegisterGridRow {
                                    key: "{tx.id}",
                                    transaction: tx.clone(),
                                    show_account_column: show_account_col,
                                    show_running_balance: show_running_bal,
                                    show_flags: show_flags,
                                    show_images: show_images,
                                    running_balance: running_balance_map.get(&tx.id).copied().unwrap_or(0),
                                }
                            }
                        }

                        if filtered_txs.is_empty() && !is_adding && (!show_scheduled || scheduled_items.is_empty()) {
                            div {
                                class: "ynab-grid-body-row ynab-grid-body-empty",
                                role: "row",
                                div {
                                    class: "ynab-grid-cell ynab-grid-cell-checkbox",
                                    "data-register-area": "none",
                                }
                                div { class: "ynab-grid-cell ynab-grid-cell-notification" }
                                if show_flags {
                                    div { class: "ynab-grid-cell ynab-grid-cell-flag" }
                                }
                                if show_images {
                                    div { class: "ynab-grid-cell ynab-grid-cell-image" }
                                }
                                if show_account_col {
                                    div { class: "ynab-grid-cell ynab-grid-cell-accountName" }
                                }
                                div { class: "ynab-grid-cell ynab-grid-cell-date" }
                                div { class: "ynab-grid-cell ynab-grid-cell-payeeName" }
                                div { class: "ynab-grid-cell ynab-grid-cell-subCategoryName" }
                                div { class: "ynab-grid-cell ynab-grid-cell-memo" }
                                div { class: "ynab-grid-cell ynab-grid-cell-outflow" }
                                div { class: "ynab-grid-cell ynab-grid-cell-inflow" }
                                if show_running_bal {
                                    div { class: "ynab-grid-cell ynab-grid-cell-balance" }
                                }
                                div { class: "ynab-grid-cell ynab-grid-cell-cleared" }
                            }
                        }
                    }

                    if filtered_txs.is_empty() && !is_adding && (!show_scheduled || scheduled_items.is_empty()) {
                        div {
                            class: "ynab-grid-empty-state",
                            h3 {
                                class: "ynab-grid-empty-state-title",
                                "No transactions yet"
                            }
                            p {
                                class: "ynab-grid-empty-state-subtitle",
                                "Add an account or click Add Transaction above to start recording your activity."
                            }
                        }
                    }
                }

                if selected_count > 0 {
                    RegisterActionBar {
                        selected_transactions: selected_txs,
                    }
                }
            }
        }
    };

    if embedded_in_loan {
        register_content
    } else {
        rsx! {
            div {
                class: "ynab-u content",
                {register_content}
            }
        }
    }
}

fn account_type_icon(account_type: &str) -> &'static str {
    match account_type {
        "CreditCard" | "LineOfCredit" => "credit_card",
        "Loan" | "Mortgage" | "AutoLoan" | "StudentLoan" | "PersonalLoan" | "MedicalDebt"
        | "OtherDebt" => "line_chart_down",
        "OtherAsset" | "Investment" => "line_chart_up",
        _ => "cash",
    }
}

#[component]
fn AccountsHeader(
    selected_account: Option<AccountDto>,
    cleared_balance: i64,
    uncleared_balance: i64,
    working_balance: i64,
    selected_count: usize,
    selected_total: i64,
) -> Element {
    let mut store = use_context::<AppStore>();
    let acc_name = selected_account
        .as_ref()
        .map(|a| a.name.clone())
        .unwrap_or_else(|| "All Accounts".to_string());
    let is_all = selected_account.is_none();
    let is_cc = is_credit_card_account(selected_account.as_ref().map(|a| a.r#type.as_str()));

    // Find linked Credit Card Payment category Available balance if CC account
    let cc_payment_available: i64 = if let Some(ref acc) = selected_account {
        store
            .month_summary
            .read()
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| {
                c.credit_card_account_id.as_deref() == Some(acc.id.as_str())
                    || (c.is_credit_card_payment && c.name == acc.name)
            })
            .map(|c| c.available_milliunits)
            .unwrap_or(0)
    } else {
        0
    };

    let is_adj_mode = *store.is_adjustment_mode.read();
    let adj_target = *store.adjustment_target_balance.read();
    let adj_diff = adj_target - cleared_balance;

    let acc_edit = selected_account.clone();
    let acc_rec = selected_account.clone();
    let acc_adj_id = selected_account.as_ref().map(|a| a.id.clone());

    let cc_pill_cls = if cc_payment_available > 0 {
        "currency tabular-nums positive"
    } else if cc_payment_available < 0 {
        "currency tabular-nums negative"
    } else {
        "currency tabular-nums zero"
    };

    rsx! {
        header {
            class: if is_adj_mode { "accounts-header adjustment-mode" } else { "accounts-header" },
            div {
                class: "accounts-header-top",
                div {
                    class: "accounts-header-total user-data",
                    span {
                        class: "js-accounts-header-account-name",
                        title: "{acc_name}",
                        "{acc_name}"
                    }
                    if let Some(ref acc) = selected_account {
                        div {
                            class: "account-info-small-text-container accounts-header-meta",
                            small {
                                class: "js-account-type-small-text accounts-header-meta-item",
                                Icon { name: account_type_icon(&acc.r#type), width: 12, height: 12 }
                                span { "{acc.r#type.to_uppercase()}" }
                            }
                            small {
                                class: "js-reconciled-small-text accounts-header-meta-item",
                                Icon { name: "lock", width: 10, height: 10 }
                                span {
                                    match acc.last_reconciled_at.as_deref() {
                                        Some(ts) => format!("Last reconciled: {}", &ts[..ts.len().min(10)]),
                                        None => "Not yet reconciled".to_string(),
                                    }
                                }
                            }
                        }
                    }

                }

                div {
                    class: "accounts-header-actions",
                    if !is_all {
                        div {
                            class: "reconcile-button-and-label",
                            button {
                                class: "ynab-button secondary accounts-header-edit-account",
                                r#type: "button",
                                title: "Edit Account",
                                onclick: move |_| {
                                    if let Some(ref a) = acc_edit {
                                        store.active_modal.set(ActiveModal::EditAccount(a.clone()));
                                    }
                                },
                                Icon { name: "pencil", width: 16, height: 16 }
                            }
                            button {
                                class: "ynab-button primary accounts-header-reconcile",
                                r#type: "button",
                                onclick: move |_| {
                                    if let Some(ref a) = acc_rec {
                                        store.active_modal.set(ActiveModal::ReconcileWizard(a.clone()));
                                    }
                                },
                                "Reconcile"
                            }
                        }
                    }

                }
            }

            hr { class: "standard" }

            if is_adj_mode {
                div {
                    class: "accounts-adjustment account-flash-notification accounts-adjustment-between",
                    span {
                        class: "accounts-adjustment-label user-data",
                        if adj_diff == 0 {
                            "Your cleared balance matches your bank statement!"
                        } else {
                            "There's a difference of {store.format_money(adj_diff)} between your bank statement and cleared balance."
                        }
                    }
                    div {
                        class: "accounts-adjustment-actions",
                        YnabButton {
                            variant: "secondary",
                            onclick: move |_| store.is_adjustment_mode.set(false),
                            "Cancel"
                        }
                        YnabButton {
                            variant: "primary",
                            onclick: move |_| {
                                if let Some(ref aid) = acc_adj_id {
                                    store.reconcile_account(aid, adj_target, adj_diff != 0);
                                }
                            },
                            if adj_diff == 0 { "Finish Reconciling" } else { "Create Adjustment & Finish" }
                        }
                    }

                }
            }

            div {
                class: "accounts-header-balances",
                div {
                    class: "accounts-header-balances-amount accounts-header-balances-cleared",
                    span {
                        class: "user-data",
                        span {
                            class: if cleared_balance < 0 { "currency tabular-nums negative" } else { "currency tabular-nums" },
                            "{store.format_money(cleared_balance)}"
                        }
                    }
                    div {
                        class: "accounts-header-label",
                        Icon { name: "cleared_circle_fill", width: 12, height: 12 }
                        "Cleared Balance"
                    }
                }
                i { "+" }
                div {
                    class: "accounts-header-balances-amount accounts-header-balances-uncleared",
                    span {
                        class: "user-data",
                        span {
                            class: if uncleared_balance < 0 { "currency tabular-nums negative" } else { "currency tabular-nums" },
                            "{store.format_money(uncleared_balance)}"
                        }
                    }
                    div {
                        class: "accounts-header-label",
                        Icon { name: "cleared_circle", width: 12, height: 12 }
                        "Uncleared Balance"
                    }
                }
                i { "=" }
                div {
                    class: "accounts-header-balances-amount accounts-header-balances-working",
                    span {
                        class: "user-data",
                        span {
                            class: if working_balance < 0 { "currency tabular-nums negative" } else { "currency tabular-nums" },
                            "{store.format_money(working_balance)}"
                        }
                    }
                    div {
                        class: "accounts-header-label",
                        "Working Balance"
                    }
                }

                div {
                    class: "accounts-header-balances-right",
                    if is_cc {
                        div {
                            class: "overspending-and-payment",
                            div {
                                class: "accounts-header-payment",
                                span {
                                    class: "user-data header-currency-label",
                                    span {
                                        class: "{cc_pill_cls}",
                                        "{store.format_money(cc_payment_available)}"
                                    }
                                }
                                span {
                                    class: "accounts-header-label",
                                    "Payment"
                                }
                            }
                        }
                    }
                    if selected_count > 0 {
                        div {
                            class: "accounts-header-balances-amount accounts-header-selected-total",
                            span {
                                class: "user-data",
                                span {
                                    class: if selected_total < 0 { "currency tabular-nums negative" } else { "currency tabular-nums" },
                                    "{store.format_money(selected_total)}"
                                }
                            }
                            div {
                                class: "accounts-header-label",
                                "{selected_count} Selected Total"
                            }
                        }
                    }

                }
            }
        }
    }
}

#[component]
fn AccountsToolbar(
    selected_account: Option<AccountDto>,
    visible_transactions: Vec<TransactionDto>,
    date_range_preset: String,
    on_change_date_range: EventHandler<String>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let ur = store.undo_redo.read().clone();
    let is_cc = is_credit_card_account(selected_account.as_ref().map(|a| a.r#type.as_str()));
    let mut view_menu_open = use_signal(|| false);

    let show_reconciled = *store.show_reconciled.read();
    let show_scheduled = *store.show_scheduled.read();
    let show_running_bal = *store.show_running_balance.read();
    let show_flags = *store.show_flags.read();
    let show_images = *store.show_images.read();

    let placeholder = match &selected_account {
        Some(acc) => format!("Search {}", acc.name),
        None => "Search All Accounts".to_string(),
    };

    let import_acc_id = selected_account.as_ref().map(|a| a.id.clone());
    let cc_acc_id = selected_account.as_ref().map(|a| a.id.clone());
    let rec_acc = selected_account.clone();

    rsx! {
        div {
            class: "accounts-toolbar",
            div {
                class: "accounts-toolbar-left",
                button {
                    class: "ghost-button primary type-body add-transaction",
                    r#type: "button",
                    onclick: move |_| {
                        store.editing_tx_id.set(None);
                        store.is_adding_tx.set(true);
                    },
                    Icon { name: "plus_circle_fill", width: 16, height: 16 }
                    span { "Add Transaction" }
                }

                button {
                    class: "ghost-button primary type-body accounts-toolbar-file-import-transactions js-accounts-toolbar-file-import-transactions",
                    r#type: "button",
                    title: "Import OFX, QFX, QIF, CSV, or TSV statement",
                    onclick: move |_| {
                        store.active_modal.set(ActiveModal::FileImport {
                            account_id: import_acc_id.clone(),
                        });
                    },
                    Icon { name: "document_with_arrow_up", width: 16, height: 16 }
                    span { "File Import" }
                }

                if is_cc {
                    button {
                        class: "ghost-button primary type-body accounts-toolbar-record-payment js-record-payment",
                        r#type: "button",
                        onclick: move |_| {
                            let checking = store
                                .accounts
                                .read()
                                .iter()
                                .find(|a| !a.closed && !is_credit_card_account(Some(&a.r#type)))
                                .cloned();
                            if let (Some(chk), Some(ref cc_id)) = (checking, &cc_acc_id) {
                                let b_id = store.budget_id.read().clone();
                                let today = chrono::Local::now().format("%Y-%m-%d").to_string();
                                store.save_transaction(SaveTransactionPayload {
                                    id: None,
                                    budget_id: b_id,
                                    account_id: cc_id.clone(),
                                    payee_id: None,
                                    payee_name: Some(format!("Transfer : {}", chk.name)),
                                    category_id: None,
                                    date: today,
                                    amount_milliunits: 100_000,
                                    memo: Some("Credit Card Payment".to_string()),
                                    cleared: Some("Cleared".to_string()),
                                    approved: Some(true),
                                    flag: None,
                                    transfer_account_id: Some(chk.id),
                                    subtransactions: Vec::new(),
                                    allow_reconciled_mutation: false,
                                });
                            } else {
                                store.is_adding_tx.set(true);
                            }
                        },
                        Icon { name: "credit_card", width: 16, height: 16 }
                        span { "Record Payment" }
                    }
                }

                if let Some(ref acc) = rec_acc {
                    {
                        let acc_c = acc.clone();
                        rsx! {
                            button {
                                class: "ghost-button primary type-body accounts-toolbar-reconcile",
                                r#type: "button",
                                title: "Reconcile Account",
                                onclick: move |_| {
                                    store.active_modal.set(ActiveModal::ReconcileWizard(acc_c.clone()));
                                },
                                Icon { name: "lock", width: 14, height: 14 }
                                span { "Reconcile" }
                            }
                        }
                    }

                }

                button {
                    class: "ghost-button primary type-body accounts-toolbar-export-csv",
                    r#type: "button",
                    title: "Export Visible Transactions to CSV",
                    onclick: move |_| {
                        let rows: Vec<ExportRegisterRow> = visible_transactions
                            .iter()
                            .map(|t| ExportRegisterRow {
                                date: t.date.clone(),
                                account_name: t.account_name.clone().unwrap_or_default(),
                                payee_name: t.payee_name.clone().unwrap_or_default(),
                                category_name: t.category_name.clone().unwrap_or_default(),
                                memo: t.memo.clone().unwrap_or_default(),
                                amount_milliunits: t.amount_milliunits,
                            })
                            .collect();
                        let csv = export_transactions_to_csv(&rows);
                        let _ = save_csv_file_dialog("ynab_register_transactions.csv", &csv);
                    },
                    Icon { name: "document_with_arrow_down", width: 16, height: 16 }
                    span { "Export CSV" }
                }

                hr {}

                div {
                    class: "undo-redo-container js-undo-redo-container",
                    button {
                        class: "ghost-button primary type-body undo-button",
                        r#type: "button",
                        disabled: !ur.can_undo,
                        onclick: move |_| store.undo(),
                        Icon { name: "undo", width: 12, height: 12 }
                        span { "Undo" }
                    }
                    button {
                        class: "ghost-button primary type-body redo-button",
                        r#type: "button",
                        disabled: !ur.can_redo,
                        onclick: move |_| store.redo(),
                        Icon { name: "redo", width: 12, height: 12 }
                        span { "Redo" }
                    }
                }
            }

            div {
                class: "accounts-toolbar-right",
                button {
                    class: if *view_menu_open.read() {
                        "ghost-button primary is-dropdown type-body accounts-toolbar-view-options active"
                    } else {
                        "ghost-button primary is-dropdown type-body accounts-toolbar-view-options"
                    },
                    r#type: "button",
                    title: "View Options",
                    onclick: move |_| {
                        let cur = *view_menu_open.read();
                        view_menu_open.set(!cur);
                    },
                    span { "View" }
                    Icon { name: "caret_down", width: 8, height: 8 }
                }

                if *view_menu_open.read() {
                    div {
                        class: "ynab-u modal-overlay modal-generic modal-account-view-options active",
                        onclick: move |_| view_menu_open.set(false),
                        div {
                            class: "modal is-rendered active accounts-view-options-modal",
                            onclick: move |e| e.stop_propagation(),
                            svg {
                                class: "modal-arrow accounts-view-options-arrow",
                                view_box: "0 0 100 100",
                                path { d: "M 0 100 L 50 0 L 100 100 Z" }
                            }
                            div { class: "modal-header", "View Options" }
                            div {
                                class: "modal-content",
                                ul {
                                    class: "date-range-dates accounts-view-options-dates",
                                    for (preset_id, preset_lbl) in [
                                        ("all", "All Dates"),
                                        ("this-month", "This Month"),
                                        ("3-months", "Latest 3 Months"),
                                        ("this-year", "This Year"),
                                        ("last-year", "Last Year"),
                                    ] {
                                        {
                                            let pid = preset_id.to_string();
                                            let is_act = date_range_preset == preset_id;
                                            rsx! {
                                                li {
                                                    key: "{pid}",
                                                    class: if is_act { "active" } else { "" },
                                                    button {
                                                        r#type: "button",
                                                        onclick: move |_| on_change_date_range.call(pid.clone()),
                                                        "{preset_lbl}"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                hr {}
                                ul {
                                    class: "modal-account-view-options-status",
                                    li {
                                        div {
                                            class: "ynab-checkbox accounts-view-options-checkbox-row",
                                            onclick: move |_| store.show_reconciled.set(!show_reconciled),
                                            button {
                                                r#type: "button",
                                                class: if show_reconciled {
                                                    "ynab-checkbox-button is-checked"
                                                } else {
                                                    "ynab-checkbox-button"
                                                },
                                                Icon {
                                                    class: if show_reconciled {
                                                        "ynab-checkbox-button-square is-checked"
                                                    } else {
                                                        "ynab-checkbox-button-square"
                                                    },
                                                    name: "check",
                                                    width: 13,
                                                    height: 13,
                                                }
                                            }
                                            span { class: "label-checkbox", "Show Reconciled Transactions" }
                                        }
                                    }
                                    li {
                                        div {
                                            class: "ynab-checkbox accounts-view-options-checkbox-row",
                                            onclick: move |_| store.show_scheduled.set(!show_scheduled),
                                            button {
                                                r#type: "button",
                                                class: if show_scheduled {
                                                    "ynab-checkbox-button is-checked"
                                                } else {
                                                    "ynab-checkbox-button"
                                                },
                                                Icon {
                                                    class: if show_scheduled {
                                                        "ynab-checkbox-button-square is-checked"
                                                    } else {
                                                        "ynab-checkbox-button-square"
                                                    },
                                                    name: "check",
                                                    width: 13,
                                                    height: 13,
                                                }
                                            }
                                            span { class: "label-checkbox", "Show Scheduled Transactions" }
                                        }
                                    }
                                    li {
                                        div {
                                            class: "ynab-checkbox accounts-view-options-checkbox-row",
                                            onclick: move |_| store.show_running_balance.set(!show_running_bal),
                                            button {
                                                r#type: "button",
                                                class: if show_running_bal {
                                                    "ynab-checkbox-button is-checked"
                                                } else {
                                                    "ynab-checkbox-button"
                                                },
                                                Icon {
                                                    class: if show_running_bal {
                                                        "ynab-checkbox-button-square is-checked"
                                                    } else {
                                                        "ynab-checkbox-button-square"
                                                    },
                                                    name: "check",
                                                    width: 13,
                                                    height: 13,
                                                }
                                            }
                                            span { class: "label-checkbox", "Show Running Balance" }
                                        }
                                    }
                                    li {
                                        div {
                                            class: "ynab-checkbox accounts-view-options-checkbox-row",
                                            onclick: move |_| store.show_flags.set(!show_flags),
                                            button {
                                                r#type: "button",
                                                class: if show_flags {
                                                    "ynab-checkbox-button is-checked"
                                                } else {
                                                    "ynab-checkbox-button"
                                                },
                                                Icon {
                                                    class: if show_flags {
                                                        "ynab-checkbox-button-square is-checked"
                                                    } else {
                                                        "ynab-checkbox-button-square"
                                                    },
                                                    name: "check",
                                                    width: 13,
                                                    height: 13,
                                                }
                                            }
                                            span { class: "label-checkbox", "Show Flags" }
                                        }
                                    }
                                    li {
                                        div {
                                            class: "ynab-checkbox accounts-view-options-checkbox-row",
                                            onclick: move |_| store.show_images.set(!show_images),
                                            button {
                                                r#type: "button",
                                                class: if show_images {
                                                    "ynab-checkbox-button is-checked"
                                                } else {
                                                    "ynab-checkbox-button"
                                                },
                                                Icon {
                                                    class: if show_images {
                                                        "ynab-checkbox-button-square is-checked"
                                                    } else {
                                                        "ynab-checkbox-button-square"
                                                    },
                                                    name: "check",
                                                    width: 13,
                                                    height: 13,
                                                }
                                            }
                                            span { class: "label-checkbox", "Show Images" }
                                        }
                                    }
                                }
                            }
                        }
                    }

                }

                TransactionSearch { placeholder: placeholder }
            }
        }
    }
}

#[component]
fn TransactionSearch(placeholder: String) -> Element {
    let mut store = use_context::<AppStore>();
    let search_q = store.search_text.read().clone();
    let mut search_focused = use_signal(|| false);

    let payees = store.payees.read().clone();
    let q_lower = search_q.trim().to_ascii_lowercase();
    let structured_suggestions: Vec<(&'static str, &'static str, &'static str, &'static str)> = vec![
        ("Is", "Cleared", "Is: Cleared", ""),
        ("Is", "Uncleared", "Is: Uncleared", ""),
        ("Is", "Reconciled", "Is: Reconciled", ""),
        ("Is", "Unapproved", "Is: Unapproved", ""),
        ("Is", "Split", "Is: Split", ""),
        ("Is", "Matched", "Is: Matched", ""),
        ("Is", "Imported", "Is: Imported", ""),
        ("Outflow", "e.g. Outflow: 50.00", "Outflow: ", "outflow"),
        ("Inflow", "e.g. Inflow: 100.00", "Inflow: ", "inflow"),
        ("Flag", "Red", "Flag: Red", ""),
        ("After", "2026-11-01", "After: 2026-11-01", "calendar"),
        ("Before", "2026-11-30", "Before: 2026-11-30", "calendar"),
    ];
    let matching_payees: Vec<String> = if q_lower.is_empty() {
        Vec::new()
    } else {
        payees
            .iter()
            .filter(|p| p.name.to_ascii_lowercase().contains(&q_lower))
            .take(5)
            .map(|p| p.name.clone())
            .collect()
    };

    let search_cls = format!(
        "transaction-search js-transaction-search{}{}",
        if *search_focused.read() || !search_q.is_empty() {
            " is-active"
        } else {
            ""
        },
        if !search_q.is_empty() {
            " has-clear-button"
        } else {
            ""
        }
    );

    rsx! {
        div {
            class: "{search_cls}",
            div {
                class: "transaction-search-inner",
                div {
                    class: "transaction-search-icon",
                    Icon { name: "search", width: 12, height: 12 }
                }
                input {
                    class: "ember-text-field transaction-search-input user-data",
                    r#type: "text",
                    placeholder: "{placeholder}",
                    aria_label: "Search transactions",
                    value: "{search_q}",
                    onfocusin: move |_| search_focused.set(true),
                    onfocusout: move |_| search_focused.set(false),
                    oninput: move |e| store.search_text.set(e.value()),
                }
                if !search_q.is_empty() {
                    button {
                        class: "transaction-search-cancel-icon js-transaction-search-cancel-icon",
                        r#type: "button",
                        title: "Clear Search",
                        onclick: move |_| store.search_text.set(String::new()),
                        Icon { name: "close_circle_fill", width: 12, height: 12 }
                    }
                }
                if *search_focused.read() {
                    ul {
                        class: "transaction-search-recommendations search-recommendations",
                        for (kind, lbl, insert_val, kind_mod) in structured_suggestions.iter() {
                            {
                                let kind_s = *kind;
                                let lbl_s = *lbl;
                                let mod_s = *kind_mod;
                                let ins = (*insert_val).to_string();
                                let rec_cls = if mod_s.is_empty() {
                                    "recommendation-type".to_string()
                                } else {
                                    format!("recommendation-type {mod_s}")
                                };
                                rsx! {
                                    li {
                                        key: "{kind_s}-{lbl_s}",
                                        button {
                                            r#type: "button",
                                            class: "transaction-search-rec-btn",
                                            onmousedown: move |evt| {
                                                evt.prevent_default();
                                                let cur = store.search_text.read().trim().to_string();
                                                let next = if cur.is_empty() {
                                                    ins.clone()
                                                } else if cur.ends_with(',') {
                                                    format!("{cur} {ins}")
                                                } else {
                                                    format!("{cur}, {ins}")
                                                };
                                                store.search_text.set(next);
                                            },
                                            div {
                                                class: "{rec_cls}",
                                                "{kind_s}:"
                                            }
                                            span { class: "transaction-search-rec-label", "{lbl_s}" }
                                        }
                                    }
                                }
                            }
                        }
                        if !matching_payees.is_empty() {
                            li {
                                class: "transaction-search-rec-group-header",
                                "Payees"
                            }
                            for pname in matching_payees.iter() {
                                {
                                    let pn = pname.clone();
                                    rsx! {
                                        li {
                                            key: "rec-payee-{pn}",
                                            button {
                                                r#type: "button",
                                                class: "transaction-search-rec-btn",
                                                onmousedown: move |evt| {
                                                    evt.prevent_default();
                                                    store.search_text.set(pn.clone());
                                                    search_focused.set(false);
                                                },
                                                span { "{pn}" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                }
            }
        }
    }
}

#[component]
fn RegisterGridHeader(
    are_all_checked: bool,
    show_account_column: bool,
    show_running_balance: bool,
    show_flags: bool,
    show_images: bool,
    on_toggle_all: EventHandler<MouseEvent>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let sort_col = store.sort_column.read().clone();
    let sort_asc = *store.sort_ascending.read();

    let mut set_sort = move |col: &str| {
        let cur = store.sort_column.read().clone();
        if cur == col {
            let asc = *store.sort_ascending.read();
            store.sort_ascending.set(!asc);
        } else {
            store.sort_column.set(col.to_string());
            store.sort_ascending.set(col != "date");
        }
    };

    let caret_for = |col: &str| -> Option<&'static str> {
        if sort_col == col {
            Some(if sort_asc { "caret_up" } else { "caret_down" })
        } else {
            None
        }
    };

    let mut sortable_cols: Vec<(&'static str, &'static str)> = Vec::new();
    if show_account_column {
        sortable_cols.push(("accountName", "ACCOUNT"));
    }
    sortable_cols.extend_from_slice(&[
        ("date", "DATE"),
        ("payeeName", "PAYEE"),
        ("subCategoryName", "CATEGORY"),
        ("memo", "MEMO"),
        ("outflow", "OUTFLOW"),
        ("inflow", "INFLOW"),
    ]);

    rsx! {
        div {
            class: "ynab-grid-header",
            div {
                class: "ynab-grid-header-row",
                role: "row",
                div {
                    class: "ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-checkbox",
                    "data-column": "checkbox",
                    role: "columnheader",
                    button {
                        class: if are_all_checked {
                            "ynab-checkbox ynab-checkbox-button is-checked"
                        } else {
                            "ynab-checkbox ynab-checkbox-button"
                        },
                        r#type: "button",
                        onclick: move |evt| on_toggle_all.call(evt),
                        Icon {
                            class: if are_all_checked {
                                "ynab-checkbox-button-square is-checked"
                            } else {
                                "ynab-checkbox-button-square"
                            },
                            name: "check",
                            width: 13,
                            height: 13,
                        }
                    }

                }
                div {
                    class: "ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-notification",
                    "data-column": "notification",
                    role: "columnheader",
                    Icon { name: "info_circle_fill", width: 12, height: 12 }
                }
                if show_flags {
                    div {
                        class: "ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-flag",
                        "data-column": "flag",
                        role: "columnheader",
                        div {
                            class: "ynab-grid-header-column-sort-area",
                            span {
                                class: "icon-wrapper",
                                Icon { class: "ynab-flag ynab-flag-header", name: "flag_fill", width: 16, height: 10 }
                            }
                        }
                        div { class: "ynab-grid-resize-handle js-ynab-grid-resize-handle" }
                    }
                }
                if show_images {
                    div {
                        class: "ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-image",
                        "data-column": "image",
                        role: "columnheader",
                        div {
                            class: "ynab-grid-header-column-sort-area",
                            span {
                                class: "icon-wrapper",
                                Icon { class: "ynab-image-header", name: "photo", width: 16, height: 16 }
                            }
                        }
                        div { class: "ynab-grid-resize-handle js-ynab-grid-resize-handle" }
                    }
                }
                for (col_key, col_label) in sortable_cols.iter() {
                    {
                        let key_s = *col_key;
                        let lbl_s = *col_label;
                        let is_sorting = sort_col == key_s;
                        let cell_cls = if is_sorting {
                            format!("ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-{key_s} ynab-grid-header-cell-sortable is-sorting")
                        } else {
                            format!("ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-{key_s} ynab-grid-header-cell-sortable")
                        };
                        rsx! {
                            div {
                                key: "{key_s}",
                                class: "{cell_cls}",
                                "data-column": "{key_s}",
                                role: "columnheader",
                                onclick: move |_| set_sort(key_s),
                                div {
                                    class: "ynab-grid-header-column-sort-area",
                                    span { class: "label", "{lbl_s}" }
                                    if let Some(c) = caret_for(key_s) {
                                        Icon { class: "sort-icon", name: "{c}", width: 8, height: 8 }
                                    }
                                }
                                div { class: "ynab-grid-resize-handle js-ynab-grid-resize-handle" }
                            }
                        }
                    }

                }
                if show_running_balance {
                    div {
                        class: "ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-balance",
                        "data-column": "balance",
                        role: "columnheader",
                        div {
                            class: "ynab-grid-header-column-sort-area",
                            span { class: "label", "BALANCE" }
                        }
                        div { class: "ynab-grid-resize-handle js-ynab-grid-resize-handle" }
                    }
                }
                div {
                    class: "ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-cleared",
                    "data-column": "cleared",
                    role: "columnheader",
                    div {
                        class: "ynab-grid-header-column-sort-area",
                        Icon { name: "cleared_circle_fill", width: 12, height: 12 }
                    }
                }
            }
        }
    }
}

#[component]
fn RegisterGridRow(
    transaction: TransactionDto,
    show_account_column: bool,
    show_running_balance: bool,
    show_flags: bool,
    show_images: bool,
    running_balance: i64,
) -> Element {
    let mut store = use_context::<AppStore>();
    let is_selected = store.selected_tx_ids.read().contains(&transaction.id);
    let is_split = !transaction.subtransactions.is_empty();
    let is_split_expanded = store.expanded_split_tx_ids.read().contains(&transaction.id);

    let is_matched = is_transaction_matched(&transaction);
    let is_imported = is_transaction_imported(&transaction);

    let is_outflow = transaction.amount_milliunits < 0;
    let is_inflow = transaction.amount_milliunits > 0;
    let formatted_outflow = if is_outflow {
        store.format_money(transaction.amount_milliunits.abs())
    } else {
        String::new()
    };
    let formatted_inflow = if is_inflow {
        store.format_money(transaction.amount_milliunits)
    } else {
        String::new()
    };
    let formatted_date = store.format_date(&transaction.date);
    let payee_str = transaction.payee_name.clone().unwrap_or_default();
    let imported_payee_opt = transaction
        .imported_payee
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string);
    let payee_tooltip = match &imported_payee_opt {
        Some(imp) => format!("{payee_str}\nImported as: {imp}"),
        None => payee_str.clone(),
    };
    let is_transfer =
        transaction.transfer_account_id.is_some() || payee_str.starts_with("Transfer :");
    let flag_lower = transaction
        .flag
        .as_deref()
        .unwrap_or("none")
        .to_ascii_lowercase();

    let cleared_btn_cls = if transaction.cleared.eq_ignore_ascii_case("cleared") {
        "ynab-cleared ynab-new-cleared is-cleared"
    } else if transaction.cleared.eq_ignore_ascii_case("reconciled") {
        "ynab-cleared ynab-new-cleared is-reconciled"
    } else {
        "ynab-cleared ynab-new-cleared is-uncleared"
    };

    let tx_id = transaction.id.clone();
    let tx_id_click = transaction.id.clone();
    let tx_id_check = transaction.id.clone();
    let tx_id_dbl = transaction.id.clone();
    let tx_id_split = transaction.id.clone();
    let tx_id_clear = transaction.id.clone();
    let tx_cleared_val = transaction.cleared.clone();

    rsx! {
        div {
            class: format!(
                "ynab-grid-body-row ynab-grid-body-parent{}{}",
                if is_selected { " is-checked" } else { "" },
                if !transaction.approved { " needs-approved" } else { "" }
            ),
            "data-row-id": "{tx_id}",
            role: "row",
            onclick: move |_| {
                let mut sel = store.selected_tx_ids.write();
                if sel.contains(&tx_id_click) {
                    sel.remove(&tx_id_click);
                } else {
                    sel.insert(tx_id_click.clone());
                }
            },
            ondoubleclick: move |_| {
                store.is_adding_tx.set(false);
                store.editing_tx_id.set(Some(tx_id_dbl.clone()));
            },

            // Checkbox
            div {
                class: "ynab-grid-cell ynab-grid-cell-checkbox",
                role: "gridcell",
                button {
                    class: if is_selected {
                        "ynab-checkbox ynab-checkbox-button is-checked"
                    } else {
                        "ynab-checkbox ynab-checkbox-button"
                    },
                    r#type: "button",
                    onclick: move |evt| {
                        evt.stop_propagation();
                        let mut sel = store.selected_tx_ids.write();
                        if sel.contains(&tx_id_check) {
                            sel.remove(&tx_id_check);
                        } else {
                            sel.insert(tx_id_check.clone());
                        }
                    },
                    Icon {
                        class: if is_selected {
                            "ynab-checkbox-button-square is-checked"
                        } else {
                            "ynab-checkbox-button-square"
                        },
                        name: "check",
                        width: 13,
                        height: 13,
                    }
                }
            }

            // Notification (Matched / Imported `link` sprite badge + Approval indicator)
            div {
                class: "ynab-grid-cell ynab-grid-cell-notification",
                role: "gridcell",
                if is_matched {
                    span {
                        class: "transaction-notification transaction-notification-info",
                        title: match &imported_payee_opt {
                            Some(imp) => format!("Matched transaction (Imported as: {imp})"),
                            None => "This transaction has a matched transaction".to_string(),
                        },
                        Icon {
                            class: "icon_sprite_link is-matched-icon",
                            name: "link",
                            width: 13,
                            height: 13,
                        }
                    }

                } else if is_imported {
                    span {
                        class: "transaction-notification transaction-notification-secondary",
                        title: match &imported_payee_opt {
                            Some(imp) => format!("Imported as: {imp}"),
                            None => "Imported from bank statement".to_string(),
                        },
                        Icon {
                            class: "icon_sprite_link is-imported-icon",
                            name: "link",
                            width: 12,
                            height: 12,
                        }
                    }

                } else if !transaction.approved {
                    span {
                        class: "transaction-notification transaction-notification-info",
                        title: "This transaction needs approval",
                        Icon {
                            class: "is-unapproved-icon",
                            name: "info_circle_fill",
                            width: 12,
                            height: 12,
                        }
                    }

                }
            }

            // Flag
            if show_flags {
                div {
                    class: "ynab-grid-cell ynab-grid-cell-flag",
                    role: "gridcell",
                    button {
                        class: "ynab-flag-pill ynab-flag-pill-{flag_lower} ynab-flag-icon-only",
                        r#type: "button",
                        span {
                            class: "flag-pill-icon-container",
                            Icon {
                                class: "ynab-flag flag-pill-icon-{flag_lower}",
                                name: if transaction.flag.is_some() { "flag_fill" } else { "flag" },
                                width: 16,
                                height: 10,
                            }
                        }
                    }

                }
            }

            // Image
            if show_images {
                div {
                    class: "ynab-grid-cell ynab-grid-cell-image",
                    role: "gridcell",
                    button {
                        class: "transaction-image-add-button",
                        r#type: "button",
                        title: "Attachments",
                        onclick: move |evt| evt.stop_propagation(),
                        Icon { class: "transaction-image-placeholder", name: "photo", width: 14, height: 14 }
                    }
                }
            }

            // Account
            if show_account_column {
                div {
                    class: "ynab-grid-cell ynab-grid-cell-accountName user-data",
                    role: "gridcell",
                    span { "{transaction.account_name.as_deref().unwrap_or(\"\")}" }
                }
            }

            // Date
            div {
                class: "ynab-grid-cell ynab-grid-cell-date user-data",
                role: "gridcell",
                span { class: "date-string", "{formatted_date}" }
            }

            // Payee (with Imported as subtitle & Matched/Transfer indicator)
            div {
                class: "ynab-grid-cell ynab-grid-cell-payeeName user-data",
                role: "gridcell",
                title: "{payee_tooltip}",
                div {
                    class: "ynab-grid-cell-inner register-payee-cell-inner",
                    div {
                        class: "register-payee-main-row",
                        span {
                            class: "ynab-grid-cell-inner-payee-name",
                            title: "{payee_tooltip}",
                            "{payee_str}"
                        }
                        if is_matched {
                            span {
                                class: "matched-transaction-badge",
                                title: "Matched bank transaction",
                                "Matched"
                            }
                        } else if is_transfer {
                            span {
                                class: "ynab-grid-transfer",
                                title: "Transfer transaction",
                                Icon {
                                    class: "ynab-grid-jump-to-transfer-transaction",
                                    name: "arrows_horizontal",
                                    width: 14,
                                    height: 12,
                                }
                            }
                        }
                    }
                    if let Some(ref imp_payee) = imported_payee_opt {
                        div {
                            class: "imported-payee-subtitle",
                            title: "Imported as: {imp_payee}",
                            "Imported as: {imp_payee}"
                        }
                    }

                }
            }

            // Category
            div {
                class: if is_split {
                    "ynab-grid-cell ynab-grid-cell-subCategoryName user-data is-split"
                } else {
                    "ynab-grid-cell ynab-grid-cell-subCategoryName user-data"
                },
                role: "gridcell",
                if is_split {
                    div {
                        class: "split-category-wrapper",
                        button {
                            class: if is_split_expanded {
                                "collapse-split-button"
                            } else {
                                "collapse-split-button is-collapsed"
                            },
                            r#type: "button",
                            onclick: move |evt| {
                                evt.stop_propagation();
                                let mut set = store.expanded_split_tx_ids.write();
                                if set.contains(&tx_id_split) {
                                    set.remove(&tx_id_split);
                                } else {
                                    set.insert(tx_id_split.clone());
                                }
                            },
                            Icon {
                                name: if is_split_expanded { "chevron_down" } else { "chevron_right" },
                                width: 10,
                                height: 10,
                            }
                        }
                        div {
                            class: "ynab-grid-cell-subCategoryName-overflow",
                            span {
                                class: "split-category-text",
                                "Split (Multiple Categories)..."
                            }
                        }
                    }

                } else if is_transfer {
                    span {
                        class: "category-not-needed indent",
                        "Category not needed"
                    }
                } else if let Some(ref cname) = transaction.category_name {
                    span { title: "{cname}", "{cname}" }
                } else {
                    span {
                        class: "needs-category",
                        span { class: "label", "This needs a category" }
                    }
                }
            }

            // Memo
            div {
                class: "ynab-grid-cell ynab-grid-cell-memo user-data",
                role: "gridcell",
                span { "{transaction.memo.as_deref().unwrap_or(\"\")}" }
            }

            // Outflow
            div {
                class: "ynab-grid-cell ynab-grid-cell-outflow user-data",
                role: "gridcell",
                span { class: "currency tabular-nums", "{formatted_outflow}" }
            }

            // Inflow
            div {
                class: "ynab-grid-cell ynab-grid-cell-inflow user-data",
                role: "gridcell",
                span { class: "currency tabular-nums", "{formatted_inflow}" }
            }

            // Balance
            if show_running_balance {
                div {
                    class: "ynab-grid-cell ynab-grid-cell-balance user-data",
                    role: "gridcell",
                    span {
                        class: if running_balance < 0 { "currency tabular-nums negative" } else { "currency tabular-nums" },
                        "{store.format_money(running_balance)}"
                    }
                }
            }

            // Cleared Status
            div {
                class: "ynab-grid-cell ynab-grid-cell-cleared",
                role: "gridcell",
                onclick: move |evt| {
                    evt.stop_propagation();
                    store.toggle_cleared(&tx_id_clear, &tx_cleared_val);
                },
                button {
                    class: "{cleared_btn_cls}",
                    r#type: "button",
                    title: "Status: {transaction.cleared}",
                    if transaction.cleared.eq_ignore_ascii_case("cleared") {
                        Icon { class: "is-cleared-icon", name: "cleared_circle_fill", width: 12, height: 12 }
                    } else if transaction.cleared.eq_ignore_ascii_case("reconciled") {
                        Icon { class: "is-reconciled-icon", name: "lock", width: 12, height: 12 }
                    } else {
                        Icon { class: "is-uncleared-icon", name: "cleared_circle", width: 12, height: 12 }
                    }
                }
            }
        }

        // Expanded Split Subtransaction Rows
        if is_split && is_split_expanded {
            for (s_idx, sub) in transaction.subtransactions.iter().enumerate() {
                {
                    let sub_out = sub.amount_milliunits < 0;
                    let sub_in = sub.amount_milliunits > 0;
                    rsx! {
                        div {
                            key: "{sub.id.as_deref().unwrap_or(\"sub\")}-{s_idx}",
                            class: "ynab-grid-body-row ynab-grid-body-sub",
                            role: "row",
                            div { class: "ynab-grid-cell ynab-grid-cell-checkbox" }
                            div { class: "ynab-grid-cell ynab-grid-cell-notification" }
                            if show_flags {
                                div { class: "ynab-grid-cell ynab-grid-cell-flag" }
                            }
                            if show_images {
                                div { class: "ynab-grid-cell ynab-grid-cell-image" }
                            }
                            if show_account_column {
                                div { class: "ynab-grid-cell ynab-grid-cell-accountName" }
                            }
                            div { class: "ynab-grid-cell ynab-grid-cell-date" }
                            div { class: "ynab-grid-cell ynab-grid-cell-payeeName" }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-subCategoryName user-data",
                                span {
                                    class: "indent",
                                    "{sub.category_name.as_deref().or(sub.category_id.as_deref()).unwrap_or(\"Split Item\")}"
                                }
                            }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-memo user-data",
                                "{sub.memo.as_deref().unwrap_or(\"\")}"
                            }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-outflow user-data",
                                if sub_out {
                                    span {
                                        class: "currency tabular-nums",
                                        "{store.format_money(sub.amount_milliunits.abs())}"
                                    }
                                }
                            }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-inflow user-data",
                                if sub_in {
                                    span {
                                        class: "currency tabular-nums",
                                        "{store.format_money(sub.amount_milliunits)}"
                                    }
                                }
                            }
                            if show_running_balance {
                                div { class: "ynab-grid-cell ynab-grid-cell-balance" }
                            }
                            div { class: "ynab-grid-cell ynab-grid-cell-cleared" }
                        }
                    }

                }
            }
        }
    }
}

#[component]
fn RegisterGridEditRow(
    initial_tx: Option<TransactionDto>,
    default_account_id: Option<String>,
    show_account_column: bool,
    show_running_balance: bool,
    show_flags: bool,
    show_images: bool,
) -> Element {
    let mut store = use_context::<AppStore>();
    let accounts = store.accounts.read().clone();
    let groups = store.month_summary.read().category_groups.clone();
    let payees = store.payees.read().clone();

    let flat_cats: Vec<(String, String)> = groups
        .iter()
        .flat_map(|g| {
            g.categories
                .iter()
                .map(move |c| (c.id.clone(), format!("{}: {}", g.name, c.name)))
        })
        .collect();

    let first_acc_id = default_account_id
        .or_else(|| accounts.first().map(|a| a.id.clone()))
        .unwrap_or_default();

    let init_acc = initial_tx
        .as_ref()
        .map(|t| t.account_id.clone())
        .unwrap_or(first_acc_id);
    let init_date = initial_tx
        .as_ref()
        .map(|t| t.date.clone())
        .unwrap_or_else(|| "2026-11-18".to_string());
    let init_payee = initial_tx
        .as_ref()
        .and_then(|t| t.payee_name.clone())
        .unwrap_or_default();
    let init_cat = initial_tx
        .as_ref()
        .and_then(|t| t.category_id.clone())
        .unwrap_or_default();
    let init_memo = initial_tx
        .as_ref()
        .and_then(|t| t.memo.clone())
        .unwrap_or_default();
    let init_flag = initial_tx
        .as_ref()
        .and_then(|t| t.flag.clone())
        .unwrap_or_default();
    let init_cleared = initial_tx
        .as_ref()
        .map(|t| t.cleared.clone())
        .unwrap_or_else(|| "Cleared".to_string());
    let init_amt = initial_tx
        .as_ref()
        .map(|t| t.amount_milliunits)
        .unwrap_or(0);
    let init_out = if init_amt < 0 {
        store.format_plain_decimal(init_amt.abs())
    } else {
        String::new()
    };
    let init_in = if init_amt > 0 {
        store.format_plain_decimal(init_amt)
    } else {
        String::new()
    };
    let init_splits = initial_tx
        .as_ref()
        .map(|t| t.subtransactions.clone())
        .unwrap_or_default();
    let init_is_split = !init_splits.is_empty();

    let mut account_id = use_signal(|| init_acc);
    let mut date_iso = use_signal(|| init_date);
    let mut payee_name = use_signal(|| init_payee);
    let mut category_id = use_signal(|| init_cat);
    let mut memo = use_signal(|| init_memo);
    let mut flag = use_signal(|| init_flag);
    let mut cleared = use_signal(|| init_cleared);
    let mut outflow_str = use_signal(|| init_out);
    let mut inflow_str = use_signal(|| init_in);
    let mut frequency = use_signal(|| "Never".to_string());
    let mut is_split = use_signal(|| init_is_split);
    let mut splits = use_signal(|| {
        if init_is_split {
            init_splits
        } else {
            vec![SubTransactionDto::default(), SubTransactionDto::default()]
        }
    });

    let existing_id = initial_tx.as_ref().map(|t| t.id.clone());

    let mut save_and_close = move |keep_adding: bool| {
        let b_id = store.budget_id.read().clone();
        let acc_id = account_id.read().clone();
        let d_iso = date_iso.read().clone();
        let p_name = payee_name.read().clone();
        let c_id = category_id.read().clone();
        let m_str = memo.read().clone();
        let f_str = flag.read().clone();
        let cl_str = cleared.read().clone();
        let freq = frequency.read().clone();

        let out_milli = evaluate_formula_milliunits(&outflow_str.read())
            .unwrap_or(0)
            .abs();
        let in_milli = evaluate_formula_milliunits(&inflow_str.read())
            .unwrap_or(0)
            .abs();
        let amount = if out_milli > 0 { -out_milli } else { in_milli };

        let transfer_acc_id = if let Some(target_acc_name) = p_name.strip_prefix("Transfer : ") {
            store
                .accounts
                .read()
                .iter()
                .find(|a| a.name == target_acc_name.trim() && a.id != acc_id)
                .map(|a| a.id.clone())
        } else {
            None
        };

        let resolved_cat_id: Option<String> = if c_id == CAT_IMMEDIATE_INCOME
            || c_id == "00000000-0000-0000-0000-000000000021"
        {
            let conn_rc = store.conn.read().clone();
            let conn = conn_rc.borrow();
            conn.query_row(
                "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2 AND is_tombstone = 0 LIMIT 1",
                rusqlite::params![b_id, CAT_IMMEDIATE_INCOME],
                |r| r.get::<_, String>(0),
            )
            .ok()
        } else if c_id.is_empty() {
            None
        } else {
            Some(c_id)
        };

        let cat_opt = if *is_split.read() || transfer_acc_id.is_some() {
            None
        } else {
            resolved_cat_id
        };

        if freq != "Never" && existing_id.is_none() {
            store.save_scheduled(SaveScheduledTransactionPayload {
                id: None,
                budget_id: b_id,
                account_id: acc_id,
                payee_id: None,
                category_id: cat_opt,
                date: d_iso,
                frequency: freq,
                amount_milliunits: amount,
                memo: if m_str.is_empty() { None } else { Some(m_str) },
                flag: if f_str.is_empty() { None } else { Some(f_str) },
                transfer_account_id: transfer_acc_id,
            });
        } else {
            let sub_vec = if *is_split.read() {
                splits.read().clone()
            } else {
                Vec::new()
            };
            store.save_transaction(SaveTransactionPayload {
                id: existing_id.clone(),
                budget_id: b_id,
                account_id: acc_id,
                payee_id: None,
                payee_name: if p_name.is_empty() {
                    None
                } else {
                    Some(p_name)
                },
                category_id: cat_opt,
                date: d_iso,
                amount_milliunits: amount,
                memo: if m_str.is_empty() { None } else { Some(m_str) },
                cleared: Some(cl_str),
                approved: Some(true),
                flag: if f_str.is_empty() { None } else { Some(f_str) },
                transfer_account_id: transfer_acc_id,
                subtransactions: sub_vec,
                allow_reconciled_mutation: false,
            });
        }

        if keep_adding {
            payee_name.set(String::new());
            memo.set(String::new());
            outflow_str.set(String::new());
            inflow_str.set(String::new());
            is_split.set(false);
        } else {
            store.is_adding_tx.set(false);
            store.editing_tx_id.set(None);
        }
    };

    let cleared_is_cleared = cleared.read().eq_ignore_ascii_case("cleared");
    let splits_snapshot = splits.read().clone();
    let splits_len = splits_snapshot.len();

    rsx! {
        div {
            class: if initial_tx.is_none() {
                "ynab-grid-body-row is-editing is-checked is-adding"
            } else {
                "ynab-grid-body-row is-editing is-checked"
            },
            role: "row",
            div {
                class: "ynab-grid-cell ynab-grid-cell-checkbox",
                button {
                    class: "ynab-checkbox ynab-checkbox-button is-checked",
                    r#type: "button",
                    disabled: true,
                    Icon {
                        class: "ynab-checkbox-button-square is-checked",
                        name: "check",
                        width: 13,
                        height: 13,
                    }
                }
            }
            div { class: "ynab-grid-cell ynab-grid-cell-notification" }
            if show_flags {
                div {
                    class: "ynab-grid-cell ynab-grid-cell-flag",
                    select {
                        class: "accounts-text-field ember-text-field dropdown-text-field edit-flag-select",
                        value: "{flag}",
                        onchange: move |e| flag.set(e.value()),
                        option { value: "", "None" }
                        option { value: "Red", "Red" }
                        option { value: "Orange", "Orange" }
                        option { value: "Yellow", "Yellow" }
                        option { value: "Green", "Green" }
                        option { value: "Blue", "Blue" }
                        option { value: "Purple", "Purple" }
                    }
                }
            }
            if show_images {
                div { class: "ynab-grid-cell ynab-grid-cell-image" }
            }
            if show_account_column {
                div {
                    class: "ynab-grid-cell ynab-grid-cell-accountName",
                    select {
                        class: "accounts-text-field ember-text-field dropdown-text-field edit-field-control user-data",
                        value: "{account_id}",
                        onchange: move |e| account_id.set(e.value()),
                        for acc in accounts.iter() {
                            option { key: "{acc.id}", value: "{acc.id}", "{acc.name}" }
                        }
                    }

                }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-date",
                div {
                    class: "edit-date-stack",
                    input {
                        class: "accounts-text-field ember-text-field edit-field-control user-data",
                        r#type: "text",
                        value: "{date_iso}",
                        placeholder: "YYYY-MM-DD",
                        oninput: move |e| date_iso.set(e.value()),
                        onkeydown: move |e| {
                            let key_val = e.key();
                            let k = match key_val {
                                Key::Character(ref c) => c.as_str(),
                                _ => "",
                            };
                            let cur = date_iso.read().clone();
                            if let Some(next_d) = adjust_iso_date_shortcut(&cur, k, "2026-11-18") {
                                e.prevent_default();
                                date_iso.set(next_d);
                            }
                        }
                    }
                    select {
                        class: "accounts-text-field ember-text-field dropdown-text-field edit-field-control edit-frequency-select",
                        value: "{frequency}",
                        title: "Repeat Frequency",
                        onchange: move |e| frequency.set(e.value()),
                        option { value: "Never", "Once" }
                        option { value: "Monthly", "Monthly" }
                        option { value: "Weekly", "Weekly" }
                        option { value: "EveryOtherWeek", "Biweekly" }
                        option { value: "TwiceAMonth", "Twice a Month" }
                        option { value: "Yearly", "Yearly" }
                    }
                }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-payeeName",
                input {
                    class: "accounts-text-field ember-text-field edit-field-control user-data",
                    r#type: "text",
                    list: "ynab-payees-datalist",
                    placeholder: "Payee or Transfer : Account",
                    value: "{payee_name}",
                    oninput: move |e| {
                        let val = e.value();
                        if category_id.read().is_empty() {
                            if let Some(found) = payees.iter().find(|p| p.name.eq_ignore_ascii_case(&val)) {
                                if let Some(ref auto_cat) = found.auto_fill_subcategory_id {
                                    category_id.set(auto_cat.clone());
                                }
                            }
                        }
                        payee_name.set(val);
                    },
                }
                datalist {
                    id: "ynab-payees-datalist",
                    for acc in accounts.iter() {
                        option { key: "xfer-{acc.id}", value: "Transfer : {acc.name}" }
                    }
                    for p in payees.iter() {
                        option { key: "payee-{p.id}", value: "{p.name}" }
                    }
                }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-subCategoryName",
                div {
                    class: "edit-category-cell",
                    if *is_split.read() {
                        span { class: "split-category-text edit-category-select", "Split (Multiple)" }
                    } else {
                        select {
                            class: "accounts-text-field ember-text-field dropdown-text-field edit-category-select user-data",
                            value: "{category_id}",
                            onchange: move |e| category_id.set(e.value()),
                            option { value: "", "Select Category..." }
                            option {
                                value: "{CAT_IMMEDIATE_INCOME}",
                                "Inflow: Ready to Assign"
                            }
                            for (cid, clabel) in flat_cats.iter() {
                                option { key: "{cid}", value: "{cid}", "{clabel}" }
                            }
                        }
                    }
                    button {
                        r#type: "button",
                        class: "ynab-button secondary split-toggle-btn",
                        title: "Toggle Split Transaction",
                        onclick: move |_| {
                            let cur = *is_split.read();
                            is_split.set(!cur);
                        },
                        "Split"
                    }
                }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-memo",
                input {
                    class: "accounts-text-field ember-text-field edit-field-control user-data",
                    r#type: "text",
                    placeholder: "Memo",
                    value: "{memo}",
                    oninput: move |e| memo.set(e.value()),
                }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-outflow",
                input {
                    class: "accounts-text-field ember-text-field edit-field-control edit-amount-input user-data",
                    r#type: "text",
                    placeholder: "Outflow",
                    value: "{outflow_str}",
                    oninput: move |e| {
                        let val = e.value();
                        if !val.is_empty() {
                            inflow_str.set(String::new());
                        }
                        outflow_str.set(val);
                    },
                }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-inflow",
                input {
                    class: "accounts-text-field ember-text-field edit-field-control edit-amount-input user-data",
                    r#type: "text",
                    placeholder: "Inflow",
                    value: "{inflow_str}",
                    oninput: move |e| {
                        let val = e.value();
                        if !val.is_empty() {
                            outflow_str.set(String::new());
                        }
                        inflow_str.set(val);
                    },
                }
            }
            if show_running_balance {
                div { class: "ynab-grid-cell ynab-grid-cell-balance" }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-cleared",
                button {
                    class: if cleared_is_cleared {
                        "ynab-cleared ynab-new-cleared is-cleared"
                    } else {
                        "ynab-cleared ynab-new-cleared is-uncleared"
                    },
                    r#type: "button",
                    onclick: move |_| {
                        let cur = cleared.read().clone();
                        if cur.eq_ignore_ascii_case("cleared") {
                            cleared.set("Uncleared".to_string());
                        } else {
                            cleared.set("Cleared".to_string());
                        }
                    },
                    if cleared_is_cleared {
                        Icon { class: "is-cleared-icon", name: "cleared_circle_fill", width: 12, height: 12 }
                    } else {
                        Icon { class: "is-uncleared-icon", name: "cleared_circle", width: 12, height: 12 }
                    }
                }
            }
        }

        // Split Subtransaction Editor Rows
        if *is_split.read() {
            for (idx, sub_item) in splits_snapshot.iter().enumerate() {
                {
                    let s_cat = sub_item.category_id.clone().unwrap_or_default();
                    let s_memo = sub_item.memo.clone().unwrap_or_default();
                    let s_amt = store.format_plain_decimal(sub_item.amount_milliunits);
                    rsx! {
                        div {
                            key: "split-edit-{idx}",
                            class: "ynab-grid-body-row ynab-grid-body-sub is-editing is-checked",
                            role: "row",
                            div { class: "ynab-grid-cell ynab-grid-cell-checkbox" }
                            div { class: "ynab-grid-cell ynab-grid-cell-notification" }
                            if show_flags {
                                div { class: "ynab-grid-cell ynab-grid-cell-flag" }
                            }
                            if show_images {
                                div { class: "ynab-grid-cell ynab-grid-cell-image" }
                            }
                            if show_account_column {
                                div { class: "ynab-grid-cell ynab-grid-cell-accountName" }
                            }
                            div { class: "ynab-grid-cell ynab-grid-cell-date" }
                            div { class: "ynab-grid-cell ynab-grid-cell-payeeName" }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-subCategoryName",
                                select {
                                    class: "accounts-text-field ember-text-field dropdown-text-field edit-field-control user-data",
                                    value: "{s_cat}",
                                    onchange: move |e| {
                                        let v = e.value();
                                        let mut list = splits.write();
                                        if let Some(item) = list.get_mut(idx) {
                                            item.category_id = if v.is_empty() { None } else { Some(v) };
                                        }
                                    },
                                    option { value: "", "Split Category..." }
                                    option {
                                        value: "{CAT_IMMEDIATE_INCOME}",
                                        "Inflow: Ready to Assign"
                                    }
                                    for (cid, clabel) in flat_cats.iter() {
                                        option { key: "{cid}", value: "{cid}", "{clabel}" }
                                    }
                                }
                            }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-memo",
                                input {
                                    class: "accounts-text-field ember-text-field edit-field-control user-data",
                                    r#type: "text",
                                    placeholder: "Split Memo",
                                    value: "{s_memo}",
                                    oninput: move |e| {
                                        let v = e.value();
                                        let mut list = splits.write();
                                        if let Some(item) = list.get_mut(idx) {
                                            item.memo = if v.is_empty() { None } else { Some(v) };
                                        }
                                    },
                                }
                            }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-outflow",
                                input {
                                    class: "accounts-text-field ember-text-field edit-field-control edit-amount-input user-data",
                                    r#type: "text",
                                    placeholder: "Amount (-50.00)",
                                    value: "{s_amt}",
                                    oninput: move |e| {
                                        if let Some(milli) = evaluate_formula_milliunits(&e.value()) {
                                            let mut list = splits.write();
                                            if let Some(item) = list.get_mut(idx) {
                                                item.amount_milliunits = milli;
                                            }
                                        }
                                    },
                                }
                            }
                            div { class: "ynab-grid-cell ynab-grid-cell-inflow" }
                            if show_running_balance {
                                div { class: "ynab-grid-cell ynab-grid-cell-balance" }
                            }
                            div {
                                class: "ynab-grid-cell ynab-grid-cell-cleared",
                                if splits_len > 2 {
                                    button {
                                        r#type: "button",
                                        class: "ghost-button is-icon-only ynab-grid-sub-remove",
                                        title: "Remove Split Row",
                                        onclick: move |_| {
                                            let mut list = splits.write();
                                            if list.len() > 2 && idx < list.len() {
                                                list.remove(idx);
                                            }
                                        },
                                        Icon { name: "subtract_circle_fill", width: 14, height: 14 }
                                    }
                                }
                            }
                        }
                    }

                }
            }
            div {
                class: "ynab-grid-body-row ynab-grid-body-split is-editing is-checked",
                role: "row",
                div { class: "ynab-grid-cell ynab-grid-cell-checkbox" }
                div { class: "ynab-grid-cell ynab-grid-cell-notification" }
                if show_flags {
                    div { class: "ynab-grid-cell ynab-grid-cell-flag" }
                }
                if show_images {
                    div { class: "ynab-grid-cell ynab-grid-cell-image" }
                }
                if show_account_column {
                    div { class: "ynab-grid-cell ynab-grid-cell-accountName" }
                }
                div { class: "ynab-grid-cell ynab-grid-cell-date" }
                div {
                    class: "ynab-grid-cell ynab-grid-cell-payeeName",
                    button {
                        r#type: "button",
                        class: "ghost-button primary type-body ynab-grid-split-add-sub-transaction",
                        onclick: move |_| {
                            splits.write().push(SubTransactionDto::default());
                        },
                        Icon { name: "plus_circle", width: 12, height: 12 }
                        span { "Add Another Split" }
                    }
                }
                div { class: "ynab-grid-cell ynab-grid-cell-subCategoryName" }
                div { class: "ynab-grid-cell ynab-grid-cell-memo" }
                div { class: "ynab-grid-cell ynab-grid-cell-outflow" }
                div { class: "ynab-grid-cell ynab-grid-cell-inflow" }
                if show_running_balance {
                    div { class: "ynab-grid-cell ynab-grid-cell-balance" }
                }
                div { class: "ynab-grid-cell ynab-grid-cell-cleared" }
            }
        }

        // Save / Cancel Action Footer Row
        div {
            class: "ynab-grid-body-row ynab-grid-actions ynab-grid-actions-row-spacer",
            role: "row",
            div { class: "ynab-grid-cell ynab-grid-cell-checkbox" }
            div { class: "ynab-grid-cell ynab-grid-cell-notification" }
            if show_flags {
                div { class: "ynab-grid-cell ynab-grid-cell-flag" }
            }
            if show_images {
                div { class: "ynab-grid-cell ynab-grid-cell-image" }
            }
            if show_account_column {
                div { class: "ynab-grid-cell ynab-grid-cell-accountName" }
            }
            div { class: "ynab-grid-cell ynab-grid-cell-date" }
            div { class: "ynab-grid-cell ynab-grid-cell-payeeName" }
            div { class: "ynab-grid-cell ynab-grid-cell-subCategoryName" }
            div { class: "ynab-grid-cell ynab-grid-cell-memo" }
            div { class: "ynab-grid-cell ynab-grid-cell-outflow" }
            div { class: "ynab-grid-cell ynab-grid-cell-inflow" }
            if show_running_balance {
                div { class: "ynab-grid-cell ynab-grid-cell-balance" }
            }
            div {
                class: "ynab-grid-cell ynab-grid-cell-cleared buttons-container",
                div {
                    class: "ynab-grid-actions-buttons",
                    button {
                        r#type: "button",
                        class: "button button-cancel-small",
                        onclick: move |_| {
                            store.is_adding_tx.set(false);
                            store.editing_tx_id.set(None);
                        },
                        "Cancel"
                    }
                    if initial_tx.is_none() {
                        {
                            let mut sc_again = save_and_close.clone();
                            rsx! {
                                button {
                                    r#type: "button",
                                    class: "button button-primary-small button-another",
                                    onclick: move |_| sc_again(true),
                                    "Save and add another"
                                }
                            }
                        }
                    }
                    button {
                        r#type: "button",
                        class: "button button-primary-small button-save",
                        onclick: move |_| save_and_close(false),
                        "Save"
                    }
                }
            }
        }
    }
}

#[component]
fn RegisterActionBar(selected_transactions: Vec<TransactionDto>) -> Element {
    let mut store = use_context::<AppStore>();
    let selected_count = selected_transactions.len();
    let count_label = if selected_count == 1 {
        "1 Transaction".to_string()
    } else {
        format!("{selected_count} Transactions")
    };

    let match_pair = if selected_count == 2 {
        can_manually_match_pair(&selected_transactions[0], &selected_transactions[1])
    } else {
        None
    };

    let matched_ids: Vec<String> = selected_transactions
        .iter()
        .filter(|t| is_transaction_matched(t) && t.cleared != "Reconciled")
        .map(|t| t.id.clone())
        .collect();
    let can_unmatch = !matched_ids.is_empty();
    let has_unapproved = selected_transactions.iter().any(|t| !t.approved);

    let groups = store.month_summary.read().category_groups.clone();
    let flat_cats: Vec<(String, String)> = groups
        .iter()
        .flat_map(|g| {
            g.categories
                .iter()
                .map(move |c| (c.id.clone(), format!("{}: {}", g.name, c.name)))
        })
        .collect();

    let mut show_cat_picker = use_signal(|| false);
    let mut show_flag_picker = use_signal(|| false);
    let mut show_more_menu = use_signal(|| false);

    rsx! {
        div {
            class: "register-action-bar-container show",
            div {
                class: "register-action-bar-inner show",
                button {
                    class: "ghost-button contrast action-bar-button action-bar-uncheck-button",
                    r#type: "button",
                    onclick: move |_| store.selected_tx_ids.write().clear(),
                    Icon { name: "close", class: "close-action-bar-icon", width: 8, height: 8 }
                    "{count_label}"
                }

                hr {}

                if has_unapproved {
                    button {
                        class: "ghost-button contrast action-bar-button js-action-bar-approve-button",
                        r#type: "button",
                        onclick: move |_| {
                            store.bulk_update_selected("approve", json!(null));
                        },
                        Icon { name: "check_circle_fill", width: 12, height: 12 }
                        "Approve"
                    }
                }

                button {
                    class: "ghost-button contrast action-bar-button js-action-bar-categories-menu-button",
                    r#type: "button",
                    onclick: move |_| {
                        let cur = *show_cat_picker.read();
                        show_cat_picker.set(!cur);
                        show_flag_picker.set(false);
                        show_more_menu.set(false);
                    },
                    Icon { name: "checkmark_inbox", width: 12, height: 12 }
                    "Categorize"
                }

                button {
                    class: "ghost-button contrast action-bar-button js-action-bar-flags-menu-button",
                    r#type: "button",
                    onclick: move |_| {
                        let cur = *show_flag_picker.read();
                        show_flag_picker.set(!cur);
                        show_cat_picker.set(false);
                        show_more_menu.set(false);
                    },
                    Icon { name: "flag_fill", width: 12, height: 12 }
                    "Flag"
                }

                button {
                    class: "ghost-button contrast action-bar-button js-action-bar-clear-button",
                    r#type: "button",
                    onclick: move |_| {
                        store.bulk_update_selected("clear", json!(null));
                    },
                    Icon { name: "cleared_circle", width: 12, height: 12 }
                    "Clear"
                }

                if let Some((manual_id, imported_id)) = match_pair {
                    button {
                        class: "ghost-button contrast action-bar-button js-action-bar-match-button",
                        r#type: "button",
                        title: "Match selected manual and imported transactions",
                        onclick: move |_| {
                            store.match_transactions(&manual_id, &imported_id);
                        },
                        Icon { name: "link", width: 12, height: 12 }
                        "Match"
                    }
                }

                if can_unmatch {
                    button {
                        class: "ghost-button contrast action-bar-button js-action-bar-unmatch-button",
                        r#type: "button",
                        title: "Unmatch selected transactions",
                        onclick: move |_| {
                            store.unmatch_transactions(&matched_ids);
                        },
                        Icon { name: "link_broken", width: 12, height: 12 }
                        "Unmatch"
                    }
                }

                hr {}

                button {
                    class: "ghost-button contrast action-bar-button js-action-bar-more-menu-button",
                    r#type: "button",
                    onclick: move |_| {
                        let cur = *show_more_menu.read();
                        show_more_menu.set(!cur);
                        show_cat_picker.set(false);
                        show_flag_picker.set(false);
                    },
                    Icon { name: "more_horizontal", width: 12, height: 12 }
                    "More"
                }

                button {
                    class: "ghost-button contrast action-bar-button js-action-bar-delete-button",
                    r#type: "button",
                    onclick: move |_| store.delete_selected_transactions(),
                    Icon { name: "trash_can", width: 12, height: 12 }
                    "Delete"
                }
            }

            if *show_cat_picker.read() {
                div {
                    class: "modal-overlay active ynab-u modal-popup modal-account-register-action-bar register-action-bar-popover",
                    onclick: move |_| show_cat_picker.set(false),
                    div {
                        class: "modal modal-popup active is-rendered register-action-bar-popover-modal register-action-bar-popover-modal--categorize",
                        onclick: move |e| e.stop_propagation(),
                        div {
                            class: "modal-content modal-account-edit-subcategories",
                            ul {
                                class: "modal-list action-bar-menu",
                                for (cid, clabel) in flat_cats.iter() {
                                    {
                                        let cid_c = cid.clone();
                                        rsx! {
                                            li {
                                                key: "{cid_c}",
                                                button {
                                                    r#type: "button",
                                                    class: "button-list",
                                                    onclick: move |_| {
                                                        store.bulk_update_selected("categorize", json!({ "category_id": cid_c }));
                                                        show_cat_picker.set(false);
                                                    },
                                                    "{clabel}"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        svg {
                            class: "modal-arrow register-action-bar-arrow",
                            view_box: "0 0 100 100",
                            path { d: "M 0 0 L 50 100 L 100 0 Z" }
                        }
                    }

                }
            }

            if *show_flag_picker.read() {
                div {
                    class: "modal-overlay active ynab-u modal-popup modal-account-register-action-bar modal-account-flags register-action-bar-popover",
                    onclick: move |_| show_flag_picker.set(false),
                    div {
                        class: "modal modal-popup active is-rendered register-action-bar-popover-modal register-action-bar-popover-modal--flags",
                        onclick: move |e| e.stop_propagation(),
                        ul {
                            class: "flags-menu flags-list",
                            for (f_val, f_label, f_lower) in [
                                ("", "No Flag", "none"),
                                ("Red", "Red", "red"),
                                ("Orange", "Orange", "orange"),
                                ("Yellow", "Yellow", "yellow"),
                                ("Green", "Green", "green"),
                                ("Blue", "Blue", "blue"),
                                ("Purple", "Purple", "purple"),
                            ] {
                                {
                                    let fc = f_val.to_string();
                                    let fl_cls = f_lower;
                                    let fl_lbl = f_label;
                                    let key_id = if fc.is_empty() { "none" } else { fc.as_str() };
                                    rsx! {
                                        li {
                                            key: "{key_id}",
                                            button {
                                                r#type: "button",
                                                class: "ynab-flag-pill ynab-flag-pill-{fl_cls}",
                                                onclick: move |_| {
                                                    store.bulk_update_selected("flag", json!({ "flag": fc }));
                                                    show_flag_picker.set(false);
                                                },
                                                span {
                                                    class: "flag-pill-icon-container",
                                                    Icon {
                                                        class: "ynab-flag flag-pill-icon-{fl_cls}",
                                                        name: if f_val.is_empty() { "flag" } else { "flag_fill" },
                                                        width: 16,
                                                        height: 10,
                                                    }
                                                }
                                                span { class: "label primary", "{fl_lbl}" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        svg {
                            class: "modal-arrow register-action-bar-arrow",
                            view_box: "0 0 100 100",
                            path { d: "M 0 0 L 50 100 L 100 0 Z" }
                        }
                    }

                }
            }

            if *show_more_menu.read() {
                div {
                    class: "modal-overlay active ynab-u modal-popup modal-account-register-action-bar register-action-bar-popover",
                    onclick: move |_| show_more_menu.set(false),
                    div {
                        class: "modal modal-popup active is-rendered register-action-bar-popover-modal register-action-bar-popover-modal--more",
                        onclick: move |e| e.stop_propagation(),
                        ul {
                            class: "modal-list action-bar-menu",
                            li {
                                button {
                                    r#type: "button",
                                    class: "button-list",
                                    onclick: move |_| {
                                        store.bulk_update_selected("unclear", json!(null));
                                        show_more_menu.set(false);
                                    },
                                    "Mark as Uncleared"
                                }
                            }
                            li {
                                button {
                                    r#type: "button",
                                    class: "button-list",
                                    onclick: move |_| {
                                        store.bulk_update_selected("approve", json!(null));
                                        show_more_menu.set(false);
                                    },
                                    "Approve"
                                }
                            }
                            li {
                                button {
                                    r#type: "button",
                                    class: "button-list",
                                    onclick: move |_| {
                                        store.bulk_update_selected("reject", json!(null));
                                        show_more_menu.set(false);
                                    },
                                    "Reject"
                                }
                            }
                            li {
                                button {
                                    r#type: "button",
                                    class: "button-list",
                                    onclick: move |_| {
                                        store.bulk_update_selected("duplicate", json!(null));
                                        show_more_menu.set(false);
                                    },
                                    "Duplicate"
                                }
                            }
                        }
                        svg {
                            class: "modal-arrow register-action-bar-arrow",
                            view_box: "0 0 100 100",
                            path { d: "M 0 0 L 50 100 L 100 0 Z" }
                        }
                    }

                }
            }
        }
    }
}

#[component]
pub fn ReconcileWizardModalView(account: AccountDto) -> Element {
    let mut store = use_context::<AppStore>();
    let cleared_bal = account.cleared_balance_milliunits;
    let init_str = store.format_plain_decimal(cleared_bal);

    let mut step = use_signal(|| "current".to_string()); // "current" | "enter-balance" | "difference" | "reconciled"
    let mut statement_input = use_signal(|| init_str);
    let mut statement_milli = use_signal(|| cleared_bal);

    let acc_id_yes = account.id.clone();
    let acc_id_enter = account.id.clone();
    let acc_id_adj = account.id.clone();

    let diff_milli = *statement_milli.read() - cleared_bal;
    let is_difference_step = *step.read() == "difference";
    let overlay_cls = if is_difference_step {
        "modal-overlay active ynab-u modal-generic modal-account-reconcile modal-account-reconcile-wide reconcile-wizard-overlay"
    } else {
        "modal-overlay active ynab-u modal-generic modal-account-reconcile reconcile-wizard-overlay"
    };

    rsx! {
        div {
            class: "{overlay_cls}",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal is-rendered active reconcile-wizard-modal",
                onclick: move |e| e.stop_propagation(),
                svg {
                    class: "modal-arrow reconcile-wizard-arrow",
                    view_box: "0 0 100 100",
                    path { d: "M 0 100 L 50 0 L 100 100 Z" }
                }
                if *step.read() == "current" {
                    div {
                        class: "modal-account-reconcile-current",
                        div {
                            class: "modal-account-reconcile-cleared-balance",
                            div {
                                class: "modal-account-reconcile-cleared-balance-label",
                                "Is your current account balance"
                            }
                            div {
                                class: "modal-account-reconcile-cleared-balance-amount tabular-nums",
                                "{store.format_money(cleared_bal)}?"
                            }
                        }
                        div {
                            class: "modal-account-reconcile-full-width-buttons",
                            YnabButton {
                                variant: "secondary",
                                onclick: move |_| step.set("enter-balance".to_string()),
                                "No"
                            }
                            YnabButton {
                                variant: "primary",
                                onclick: move |_| {
                                    store.reconcile_account(&acc_id_yes, cleared_bal, false);
                                    step.set("reconciled".to_string());
                                },
                                "Yes"
                            }
                        }
                    }

                } else if *step.read() == "enter-balance" {
                    div {
                        class: "modal-account-reconcile-enter-balance",
                        h3 { "Reconcile {account.name}" }
                        p {
                            class: "reconcile-wizard-lead",
                            "Enter the balance shown on your bank statement or banking app today:"
                        }
                        div {
                            class: "ynab-new-currency-input",
                            input {
                                class: "ember-text-field user-data reconcile-wizard-input",
                                r#type: "text",
                                autofocus: true,
                                value: "{statement_input}",
                                oninput: move |e| statement_input.set(e.value()),
                            }
                        }
                        div {
                            class: "modal-account-reconcile-right-buttons reconcile-wizard-right-actions",
                            YnabButton {
                                variant: "secondary",
                                onclick: move |_| step.set("current".to_string()),
                                "Back"
                            }
                            YnabButton {
                                variant: "primary",
                                onclick: move |_| {
                                    let raw = statement_input.read().clone();
                                    let val = evaluate_formula_milliunits(&raw).unwrap_or(cleared_bal);
                                    statement_milli.set(val);
                                    if val == cleared_bal {
                                        store.reconcile_account(&acc_id_enter, val, false);
                                        step.set("reconciled".to_string());
                                    } else {
                                        step.set("difference".to_string());
                                    }
                                },
                                "Next"
                            }
                        }
                    }

                } else if *step.read() == "difference" {
                    div {
                        class: "modal-account-reconcile-difference",
                        div {
                            class: "modal-account-reconcile-difference-header",
                            div {
                                class: "modal-account-reconcile-cleared-balance-label",
                                "Difference"
                            }
                            div {
                                class: "modal-account-reconcile-cleared-balance-amount tabular-nums reconcile-wizard-diff-amount",
                                "{store.format_money(diff_milli)}"
                            }
                        }
                        p {
                            class: "reconcile-wizard-diff-copy",
                            "Your bank statement doesn't match your cleared balance. You can search for missing transactions or create an adjustment transaction right now."
                        }
                        div {
                            class: "modal-account-reconcile-info",
                            Icon { name: "info_circle_fill", width: 20, height: 20 }
                            p { "You can also finish later with the difference banner active." }
                        }
                        div {
                            class: "modal-account-reconcile-difference-actions reconcile-wizard-diff-actions",
                            YnabButton {
                                variant: "primary",
                                class: "modal-account-reconcile-button-full-width",
                                onclick: move |_| {
                                    let target = *statement_milli.read();
                                    store.reconcile_account(&acc_id_adj, target, true);
                                    step.set("reconciled".to_string());
                                },
                                "Create Adjustment & Finish"
                            }
                            YnabButton {
                                variant: "secondary",
                                class: "modal-account-reconcile-button-full-width",
                                onclick: move |_| {
                                    store.adjustment_target_balance.set(*statement_milli.read());
                                    store.is_adjustment_mode.set(true);
                                    store.active_modal.set(ActiveModal::None);
                                },
                                "Finish Later (Keep Difference Banner)"
                            }
                        }
                    }

                } else {
                    div {
                        class: "modal-account-reconcile-reconciled",
                        div {
                            class: "reconcile-wizard-badge",
                            Icon { name: "check_circle_fill", width: 36, height: 36 }
                        }
                        p {
                            class: "reconciled-message-title",
                            "Account Reconciled!"
                        }
                        p {
                            "Time to do your reconciliation dance. All cleared transactions are now locked."
                        }
                        div {
                            class: "modal-account-reconcile-fallback",
                            YnabButton {
                                variant: "primary",
                                class: "modal-account-reconcile-button-full-width",
                                onclick: move |_| store.active_modal.set(ActiveModal::None),
                                "Continue"
                            }
                        }
                    }

                }
            }
        }
    }
}
