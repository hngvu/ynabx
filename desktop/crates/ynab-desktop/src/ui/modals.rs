//! Global Application Modals (`PlanSettingsModalView`, `AddAccountModalView`, `EditAccountModalView`,
//! `CloseAccountModalView`, `ManagePayeesModalView`, `DisplayOptionsModalView`, `EditFlagsModalView`,
//! `ExportPlanModalView`, `FreshStartModalView`, `KeyboardShortcutsModalView`, `ActiveModalHost`).
//! Includes Loan account fields (APR, Minimum Payment, Escrow), Combine Payees & Auto-Rename Rules,
//! `FileImportModal`, and `EditLoanTermsModal`.
//! 100% integer milliunits and 1:1 YNAB Ember parity.

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

use crate::interaction::{save_csv_file_dialog, ShortcutLocation, SHORTCUT_DEFINITIONS};
use crate::state::{ActiveModal, ActiveWorkspace, AppStore};
use crate::ui::accounts::ReconcileWizardModalView;
use crate::ui::budget::{
    ActivityTransactionsModalView, AddMasterCategoryModalView, AddSubCategoryModalView,
    CoverOverspendingModalView, EditCategoryModalView, MonthPickerModalView, MoveMoneyModalView,
    RtaBreakdownModalView,
};
use crate::ui::core::{Icon, YnabButton};
use crate::ui::file_import::FileImportModal;
use crate::ui::loan::{
    format_apr_plain_input, is_loan_account_type, parse_apr_to_millipercent, EditLoanTermsModal,
    SaveLoanTermsPayload,
};
use crate::ui::recent_moves::RecentMovesModal;
use ynab_core::calc::calculator::evaluate_formula_milliunits;
use ynab_core::format::{
    export_to_csv_string, generate_budget_plan_csv_rows, CurrencyFormatConfig,
    ExportBudgetCategoryRow, DATE_FORMAT_PATTERNS, NUMBER_FORMATS,
};
use ynab_core::repo::{AccountDto, UpdatePlanSettingsPayload};

const RAW_CURRENCIES_JSON: &str = include_str!("../../../ynab-core/assets/currencies_exact.json");

#[derive(Debug, Clone, Deserialize)]
struct CurrencyMetaItem {
    iso_code: String,
    english_name: String,
}

/// View-model for a single payee auto-rename rule (`be_payee_rename_conditions`)
/// wired by `integrator` via `AppStore::get_payee_rename_rules`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PayeeRenameRuleVm {
    pub id: String,
    pub payee_id: String,
    /// One of `"Contains"`, `"Is"`, `"StartsWith"`, `"EndsWith"`.
    pub operator: String,
    pub operand: String,
}

fn format_rename_operator_label(op: &str) -> &'static str {
    match op {
        "Is" | "is" => "is",
        "StartsWith" | "starts_with" => "starts with",
        "EndsWith" | "ends_with" => "ends with",
        _ => "contains",
    }
}

/// Host component that renders whichever modal or popover is currently active in `AppStore.active_modal`.
#[component]
pub fn ActiveModalHost() -> Element {
    let mut store = use_context::<AppStore>();
    let active = store.active_modal.read().clone();

    match active {
        ActiveModal::None => rsx! {},
        ActiveModal::PlanSettings { is_create } => rsx! {
            PlanSettingsModalView { is_create: is_create }
        },
        ActiveModal::AddAccount => rsx! {
            AddAccountModalView {}
        },
        ActiveModal::EditAccount(acc) => rsx! {
            EditAccountModalView { account: acc }
        },
        ActiveModal::CloseAccount(acc) => rsx! {
            CloseAccountModalView { account: acc }
        },
        ActiveModal::ManagePayees => rsx! {
            ManagePayeesModalView {}
        },
        ActiveModal::DisplayOptions => rsx! {
            DisplayOptionsModalView {}
        },
        ActiveModal::EditFlags => rsx! {
            EditFlagsModalView {}
        },
        ActiveModal::ExportPlan => rsx! {
            ExportPlanModalView {}
        },
        ActiveModal::FreshStart => rsx! {
            FreshStartModalView {}
        },
        ActiveModal::KeyboardShortcuts => rsx! {
            KeyboardShortcutsModalView {}
        },
        ActiveModal::ReconcileWizard(acc) => rsx! {
            ReconcileWizardModalView { account: acc }
        },
        ActiveModal::FileImport { account_id } => rsx! {
            FileImportModal { initial_account_id: account_id }
        },
        ActiveModal::EditLoanTerms(acc) => rsx! {
            EditLoanTermsModal { account: acc }
        },
        ActiveModal::RecentMoves => {
            let entries = store.recent_moves_entries(None);
            rsx! {
                RecentMovesModal {
                    entries: entries,
                    onclose: move |_| store.active_modal.set(ActiveModal::None),
                }
            }
        }
        ActiveModal::CategoryMoves {
            category_id,
            category_name,
        } => {
            let entries = store.recent_moves_entries(Some(&category_id));
            rsx! {
                RecentMovesModal {
                    entries: entries,
                    initial_category_filter: Some(category_name),
                    onclose: move |_| store.active_modal.set(ActiveModal::None),
                }
            }
        }
        ActiveModal::MoveMoney {
            from_category_id,
            from_category_name,
            to_category_id,
            initial_amount_milliunits,
        } => rsx! {
            MoveMoneyModalView {
                from_category_id: from_category_id,
                from_category_name: from_category_name,
                to_category_id: to_category_id,
                initial_amount_milliunits: initial_amount_milliunits,
            }
        },
        ActiveModal::CoverOverspending {
            category_id,
            category_name,
            overspent_milliunits,
        } => rsx! {
            CoverOverspendingModalView {
                category_id: category_id,
                category_name: category_name,
                overspent_milliunits: overspent_milliunits,
            }
        },
        ActiveModal::ActivityTransactions {
            category_id,
            category_name,
            activity_milliunits,
        } => rsx! {
            ActivityTransactionsModalView {
                category_id: category_id,
                category_name: category_name,
                activity_milliunits: activity_milliunits,
            }
        },
        ActiveModal::RtaBreakdown => rsx! {
            RtaBreakdownModalView {}
        },
        ActiveModal::MonthPicker => rsx! {
            MonthPickerModalView {}
        },
        ActiveModal::AddMasterCategory => rsx! {
            AddMasterCategoryModalView {}
        },
        ActiveModal::AddSubCategory {
            group_id,
            group_name,
        } => rsx! {
            AddSubCategoryModalView {
                group_id: group_id,
                group_name: group_name,
            }
        },
        ActiveModal::EditCategory {
            id,
            name,
            is_master,
            can_delete,
            can_rename,
            is_cc_payment,
        } => rsx! {
            EditCategoryModalView {
                id: id,
                name: name,
                is_master: is_master,
                can_delete: can_delete,
                can_rename: can_rename,
                is_cc_payment: is_cc_payment,
            }
        },
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AddAccountScreen {
    Form,
    SelectType,
}

#[component]
pub fn PlanSettingsModalView(is_create: bool) -> Element {
    let mut store = use_context::<AppStore>();
    let summary = store.plan_summary.read().clone();

    let all_currencies: Vec<CurrencyMetaItem> =
        serde_json::from_str(RAW_CURRENCIES_JSON).unwrap_or_default();

    let init_name = if is_create {
        "New Plan".to_string()
    } else {
        summary.name.clone()
    };
    let init_placement = if !summary.currency_display_symbol {
        "Symbol None".to_string()
    } else if summary.currency_symbol_first {
        "Symbol First".to_string()
    } else {
        "Symbol Last".to_string()
    };

    let mut budget_name = use_signal(|| init_name);
    let mut currency_code = use_signal(|| summary.currency_code.clone());
    let mut placement = use_signal(|| init_placement);
    let mut number_fmt = use_signal(|| summary.number_format.clone());
    let mut date_fmt = use_signal(|| summary.date_format.clone());

    let symbol_for_code = |iso: &str| -> &'static str {
        match iso {
            "EUR" => "€",
            "GBP" => "£",
            "JPY" | "CNY" => "¥",
            "VND" => "₫",
            "KRW" => "₩",
            "INR" => "₹",
            "CHF" => "CHF",
            _ => "$",
        }
    };

    let title_text = if is_create {
        "New Plan"
    } else {
        "Plan Settings"
    };

    rsx! {
        div {
            class: "dialog-overlay active modal-budget-settings",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog regular",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "plan-settings-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "plan-settings-dialog-title", "{title_text}" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body legacy-form-fields modal-budget-settings-body",
                        div {
                            class: "fieldset",
                            dl {
                                dt {
                                    class: "section-header",
                                    label { r#for: "modal-settings-budget-name", "Plan Name" }
                                }
                                dd {
                                    class: "user-data",
                                    input {
                                        id: "modal-settings-budget-name",
                                        class: "modal-budget-settings-name user-data",
                                        r#type: "text",
                                        autofocus: true,
                                        value: "{budget_name}",
                                        oninput: move |e| budget_name.set(e.value()),
                                    }
                                }
                            }

                            div {
                                class: "modal-budget-settings-currency-fields",
                                dl {
                                    dt {
                                        class: "section-header",
                                        label { r#for: "modal-settings-currency", "Currency" }
                                    }
                                    dd {
                                        class: "user-data x-select-container",
                                        select {
                                            id: "modal-settings-currency",
                                            class: "user-data",
                                            value: "{currency_code}",
                                            onchange: move |e| currency_code.set(e.value()),
                                            optgroup {
                                                label: "Common Currencies",
                                                option { value: "USD", "US Dollar–USD" }
                                                option { value: "EUR", "Euro–EUR" }
                                                option { value: "GBP", "UK Pound Sterling–GBP" }
                                                option { value: "CAD", "Canadian Dollar–CAD" }
                                                option { value: "AUD", "Australian Dollar–AUD" }
                                                option { value: "VND", "Vietnamese Dong–VND" }
                                            }
                                            optgroup {
                                                label: "All Currencies",
                                                for c in all_currencies.iter() {
                                                    option {
                                                        key: "{c.iso_code}",
                                                        value: "{c.iso_code}",
                                                        "{c.english_name}–{c.iso_code}"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                dl {
                                    dt {
                                        class: "section-header",
                                        label { r#for: "modal-settings-currency-placement", "Currency Placement" }
                                    }
                                    dd {
                                        class: "user-data x-select-container",
                                        select {
                                            id: "modal-settings-currency-placement",
                                            class: "user-data",
                                            value: "{placement}",
                                            onchange: move |e| placement.set(e.value()),
                                            option { value: "Symbol First", "Before amount ($123,456.78)" }
                                            option { value: "Symbol Last", "After amount (123,456.78$)" }
                                            option { value: "Symbol None", "Don't show (123,456.78)" }
                                        }
                                    }
                                }
                            }

                            dl {
                                dt {
                                    class: "section-header",
                                    label { r#for: "modal-settings-currency-format", "Number Format" }
                                }
                                dd {
                                    class: "user-data x-select-container",
                                    select {
                                        id: "modal-settings-currency-format",
                                        class: "user-data",
                                        value: "{number_fmt}",
                                        onchange: move |e| number_fmt.set(e.value()),
                                        for (fmt_str, _) in NUMBER_FORMATS.iter() {
                                            option { key: "{fmt_str}", value: "{fmt_str}", "{fmt_str}" }
                                        }
                                    }
                                }
                            }

                            dl {
                                dt {
                                    class: "section-header",
                                    label { r#for: "modal-settings-date-format", "Date Format" }
                                }
                                dd {
                                    class: "user-data x-select-container",
                                    select {
                                        id: "modal-settings-date-format",
                                        class: "user-data",
                                        value: "{date_fmt}",
                                        onchange: move |e| date_fmt.set(e.value()),
                                        for pat in DATE_FORMAT_PATTERNS.iter() {
                                            option { key: "{pat}", value: "{pat}", "{pat}" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "secondary",
                        class: "button-cancel",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let name = budget_name.read().trim().to_string();
                            if name.is_empty() {
                                return;
                            }
                            let iso = currency_code.read().clone();
                            let place = placement.read().clone();
                            let ex_fmt = number_fmt.read().clone();
                            let dt_fmt = date_fmt.read().clone();

                            let digits = NUMBER_FORMATS
                                .iter()
                                .find(|(fmt, _)| *fmt == ex_fmt.as_str())
                                .map(|(_, d)| *d)
                                .unwrap_or(2);
                            let (dec_sep, grp_sep) = if ex_fmt.contains(',') && ex_fmt.ends_with(",78") {
                                (",", ".")
                            } else if ex_fmt.contains(' ') {
                                (".", " ")
                            } else {
                                (".", ",")
                            };

                            let cfg = CurrencyFormatConfig {
                                iso_code: iso.clone(),
                                example_format: ex_fmt,
                                decimal_digits: digits,
                                decimal_separator: dec_sep.to_string(),
                                symbol_first: place != "Symbol Last",
                                group_separator: grp_sep.to_string(),
                                currency_symbol: symbol_for_code(&iso).to_string(),
                                display_symbol: place != "Symbol None",
                            };

                            let payload = UpdatePlanSettingsPayload {
                                name: name.clone(),
                                budget_id: Some(store.budget_id.read().clone()),
                                currency_format: Some(cfg),
                                date_format: Some(dt_fmt),
                            };

                            if is_create {
                                store.create_and_switch_budget(&name, payload);
                            } else {
                                store.update_plan_settings(payload);
                            }
                            store.active_modal.set(ActiveModal::None);
                        },
                        if is_create { "Create Plan" } else { "Apply Settings" }
                    }
                }
            }
        }
    }
}

#[component]
pub fn AddAccountModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let mut screen = use_signal(|| AddAccountScreen::Form);
    let mut nickname = use_signal(String::new);
    let mut account_type = use_signal(|| "Checking".to_string());
    let mut balance_str = use_signal(|| "0.00".to_string());
    let mut apr_str = use_signal(|| "6.50".to_string());
    let mut min_payment_str = use_signal(|| "0.00".to_string());
    let mut escrow_str = use_signal(|| "0.00".to_string());

    type AccountTypeItem<'a> = (&'a str, &'a str, &'a str);
    type AccountTypeGroup<'a> = (&'a str, &'a [AccountTypeItem<'a>]);

    let account_type_groups: [AccountTypeGroup<'_>; 4] = [
        (
            "Cash",
            &[
                (
                    "Checking",
                    "Checking",
                    "Everyday spending and direct deposits",
                ),
                (
                    "Savings",
                    "Savings",
                    "Emergency fund or short-term cash reserve",
                ),
                ("Cash", "Cash", "Physical wallet cash on hand"),
            ],
        ),
        (
            "Credit",
            &[
                (
                    "CreditCard",
                    "Credit Card",
                    "Paid-in-full or carried balance credit cards",
                ),
                (
                    "LineOfCredit",
                    "Line of Credit",
                    "Revolving personal or home equity lines",
                ),
            ],
        ),
        (
            "Mortgages and Loans",
            &[
                (
                    "mortgage",
                    "Mortgage",
                    "Home loan with interest and optional escrow",
                ),
                (
                    "autoLoan",
                    "Auto Loan",
                    "Vehicle financing tracked with payoff planner",
                ),
                (
                    "studentLoan",
                    "Student Loan",
                    "Education debt with interest simulator",
                ),
                (
                    "personalLoan",
                    "Personal Loan",
                    "Fixed-term installment loan",
                ),
                (
                    "medicalDebt",
                    "Medical Debt",
                    "Healthcare payment plan or balance",
                ),
                (
                    "otherDebt",
                    "Other Debt",
                    "Any other loan with balance and APR",
                ),
            ],
        ),
        (
            "Tracking",
            &[
                (
                    "OtherAsset",
                    "Asset (e.g. Investment)",
                    "Brokerage, 401(k), or property value",
                ),
                (
                    "OtherLiability",
                    "Liability",
                    "Non-loan debt tracked outside budget",
                ),
            ],
        ),
    ];

    let cur_type = account_type.read().clone();
    let selected_type_label = account_type_groups
        .iter()
        .flat_map(|(_, items)| items.iter())
        .find(|(val, _, _)| *val == cur_type.as_str())
        .map(|(_, label, _)| *label)
        .unwrap_or("Checking");
    let is_loan = is_loan_account_type(&cur_type);
    let cur_screen = *screen.read();

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-generic self-centered account-widget-modal",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal account-widget",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "add-account-widget-title",
                onclick: move |e| e.stop_propagation(),

                if cur_screen == AddAccountScreen::Form {
                    div {
                        class: "account-widget-screen account-widget-add-unlinked-account",
                        div {
                            class: "account-widget-header",
                            div {
                                class: "account-widget-header-back-spacer",
                                button {
                                    class: "account-widget-back-button is-hidden",
                                    r#type: "button",
                                    disabled: true,
                                    Icon { name: "chevron_left", width: 16, height: 16 }
                                }
                            }
                            div {
                                class: "account-widget-header-title",
                                h1 {
                                    id: "add-account-widget-title",
                                    class: "account-widget-header-title-single",
                                    "Add Unlinked Account"
                                }
                            }
                            button {
                                class: "account-widget-close-button",
                                r#type: "button",
                                title: "Close",
                                onclick: move |_| store.active_modal.set(ActiveModal::None),
                                Icon { name: "close", width: 16, height: 16 }
                            }
                        }

                        div {
                            class: "account-widget-body user-data account-widget-form-body",
                            div {
                                class: "y-form-field",
                                label { r#for: "unlinked-account-nickname", "Give it a nickname" }
                                input {
                                    id: "unlinked-account-nickname",
                                    class: "name-input user-data",
                                    r#type: "text",
                                    autofocus: true,
                                    value: "{nickname}",
                                    placeholder: if is_loan { "e.g. Home Mortgage" } else { "e.g. Chase Checking" },
                                    oninput: move |e| nickname.set(e.value()),
                                }
                            }

                            div {
                                class: "y-form-field",
                                label { "What type of account are you adding?" }
                                button {
                                    class: "account-type-select-button user-data",
                                    r#type: "button",
                                    onclick: move |_| screen.set(AddAccountScreen::SelectType),
                                    span { class: "account-type-select-button-label", "{selected_type_label}" }
                                    Icon { name: "caret_right", width: 14, height: 14 }
                                }
                            }

                            div {
                                class: "y-form-field currency-input-group",
                                label {
                                    r#for: "unlinked-account-balance",
                                    if is_loan {
                                        "What is your current loan balance owed?"
                                    } else {
                                        "What is your current account balance?"
                                    }
                                }
                                div {
                                    class: "ynab-new-currency-input is-editing legacy-currency-input",
                                    input {
                                        id: "unlinked-account-balance",
                                        class: "user-data",
                                        r#type: "text",
                                        value: "{balance_str}",
                                        oninput: move |e| balance_str.set(e.value()),
                                    }
                                }
                                if is_loan {
                                    small {
                                        class: "account-widget-helper-note",
                                        "Loan debt will be tracked automatically in the Loans section & Loan Planner."
                                    }
                                }
                            }

                            if is_loan {
                                div {
                                    class: "account-widget-loan-terms-group",
                                    div {
                                        class: "account-widget-section-heading",
                                        "Loan Terms"
                                    }
                                    div {
                                        class: "y-form-field",
                                        label { r#for: "add-loan-apr", "Interest Rate (APR %)" }
                                        input {
                                            id: "add-loan-apr",
                                            class: "user-data modal-account-settings-interest-rate",
                                            r#type: "text",
                                            value: "{apr_str}",
                                            placeholder: "e.g. 6.50",
                                            oninput: move |e| apr_str.set(e.value()),
                                        }
                                    }
                                    div {
                                        class: "account-widget-loan-terms-split",
                                        div {
                                            class: "y-form-field",
                                            label { r#for: "add-loan-min-pay", "Minimum Payment" }
                                            input {
                                                id: "add-loan-min-pay",
                                                class: "user-data modal-account-settings-minimum-payment",
                                                r#type: "text",
                                                value: "{min_payment_str}",
                                                placeholder: "0.00",
                                                oninput: move |e| min_payment_str.set(e.value()),
                                            }
                                        }
                                        div {
                                            class: "y-form-field",
                                            label { r#for: "add-loan-escrow", "Monthly Escrow" }
                                            input {
                                                id: "add-loan-escrow",
                                                class: "user-data modal-account-settings-escrow",
                                                r#type: "text",
                                                value: "{escrow_str}",
                                                placeholder: "0.00",
                                                oninput: move |e| escrow_str.set(e.value()),
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        div {
                            class: "account-widget-footer",
                            YnabButton {
                                variant: "primary",
                                is_large: true,
                                class: "account-widget-footer-primary",
                                disabled: nickname.read().trim().is_empty(),
                                onclick: move |_| {
                                    let name = nickname.read().trim().to_string();
                                    if name.is_empty() {
                                        return;
                                    }
                                    let acc_type = account_type.read().clone();
                                    let loan_selected = is_loan_account_type(&acc_type);
                                    let raw_bal = balance_str.read().clone();
                                    let parsed_milli = evaluate_formula_milliunits(&raw_bal).unwrap_or(0);
                                    // Loan accounts represent debt owed as a negative ledger balance
                                    let effective_bal = if loan_selected && parsed_milli > 0 {
                                        -parsed_milli
                                    } else {
                                        parsed_milli
                                    };

                                    if let Some(created) = store.create_account(&name, &acc_type, effective_bal) {
                                        if loan_selected {
                                            let apr_milli = parse_apr_to_millipercent(&apr_str.read()).unwrap_or(0);
                                            let min_pay = evaluate_formula_milliunits(&min_payment_str.read())
                                                .unwrap_or(0)
                                                .abs();
                                            let escrow = evaluate_formula_milliunits(&escrow_str.read())
                                                .unwrap_or(0)
                                                .abs();
                                            store.save_loan_terms(SaveLoanTermsPayload {
                                                account_id: created.id.clone(),
                                                original_balance_milliunits: effective_bal.abs(),
                                                apr_millipercent: apr_milli,
                                                minimum_payment_milliunits: min_pay,
                                                monthly_escrow_milliunits: escrow,
                                            });
                                        }
                                        store.navigate_to(ActiveWorkspace::Accounts(Some(created.id)));
                                    }
                                    store.active_modal.set(ActiveModal::None);
                                },
                                "Next"
                            }
                        }
                    }
                } else {
                    div {
                        class: "account-widget-screen account-widget-select-account-type",
                        div {
                            class: "account-widget-header",
                            div {
                                class: "account-widget-header-back-spacer",
                                button {
                                    class: "account-widget-back-button",
                                    r#type: "button",
                                    title: "Back",
                                    onclick: move |_| screen.set(AddAccountScreen::Form),
                                    Icon { name: "chevron_left", width: 16, height: 16 }
                                }
                            }
                            div {
                                class: "account-widget-header-title",
                                h1 {
                                    id: "add-account-widget-title",
                                    class: "account-widget-header-title-single",
                                    "Select Account Type"
                                }
                            }
                            button {
                                class: "account-widget-close-button",
                                r#type: "button",
                                title: "Close",
                                onclick: move |_| store.active_modal.set(ActiveModal::None),
                                Icon { name: "close", width: 16, height: 16 }
                            }
                        }

                        div {
                            class: "account-widget-body user-data account-type-select-list-body",
                            for (group_title, items) in account_type_groups {
                                div {
                                    key: "{group_title}",
                                    class: "account-type-select-group",
                                    div {
                                        class: "account-type-select-group-header",
                                        "{group_title}"
                                    }
                                    div {
                                        class: "account-type-select-group-cards",
                                        for (val, label, desc) in items {
                                            {
                                                let v = (*val).to_string();
                                                let is_sel = cur_type == *val;
                                                rsx! {
                                                    button {
                                                        key: "{val}",
                                                        r#type: "button",
                                                        class: if is_sel {
                                                            "account-widget-list-button is-selected"
                                                        } else {
                                                            "account-widget-list-button"
                                                        },
                                                        onclick: move |_| {
                                                            account_type.set(v.clone());
                                                            screen.set(AddAccountScreen::Form);
                                                        },
                                                        div {
                                                            class: "account-widget-list-button-text",
                                                            div { class: "account-widget-list-button-title", "{label}" }
                                                            div { class: "account-widget-list-button-desc", "{desc}" }
                                                        }
                                                        if is_sel {
                                                            span {
                                                                class: "account-widget-list-button-check",
                                                                Icon { name: "check_circle_fill", width: 16, height: 16 }
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
            }
        }
    }
}

#[component]
pub fn EditAccountModalView(account: AccountDto) -> Element {
    let mut store = use_context::<AppStore>();
    let init_name = account.name.clone();
    let init_note = account.note.clone().unwrap_or_default();
    let current_bal = account.balance_milliunits;
    let init_bal_str = store.format_plain_decimal(current_bal);

    let is_loan = is_loan_account_type(&account.r#type);
    let existing_terms = store.get_loan_terms(&account.id);
    let init_apr = format_apr_plain_input(existing_terms.apr_millipercent);
    let init_min_pay = store.format_plain_decimal(existing_terms.minimum_payment_milliunits);
    let init_escrow = store.format_plain_decimal(existing_terms.monthly_escrow_milliunits);
    let init_orig_bal = existing_terms.original_balance_milliunits;

    let mut account_name = use_signal(|| init_name);
    let mut note = use_signal(|| init_note);
    let mut balance_str = use_signal(|| init_bal_str);
    let mut apr_str = use_signal(|| init_apr);
    let mut min_payment_str = use_signal(|| init_min_pay);
    let mut escrow_str = use_signal(|| init_escrow);

    let acc_close = account.clone();
    let acc_id_save = account.id.clone();

    rsx! {
        div {
            class: "dialog-overlay active modal-popup account-modal",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog regular",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "edit-account-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "edit-account-dialog-title", "Edit Account" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body legacy-form-fields",
                        div {
                            class: "fieldset",
                            dl {
                                dt {
                                    class: "section-header",
                                    label { r#for: "edit-account-nickname", "Account Nickname" }
                                }
                                dd {
                                    class: "user-data",
                                    input {
                                        id: "edit-account-nickname",
                                        class: "user-data",
                                        r#type: "text",
                                        autofocus: true,
                                        value: "{account_name}",
                                        oninput: move |e| account_name.set(e.value()),
                                    }
                                }
                            }
                            dl {
                                dt {
                                    class: "section-header",
                                    label { r#for: "edit-account-notes", "Account Notes" }
                                }
                                dd {
                                    class: "user-data",
                                    textarea {
                                        id: "edit-account-notes",
                                        class: "user-data",
                                        rows: 2,
                                        value: "{note}",
                                        oninput: move |e| note.set(e.value()),
                                    }
                                }
                            }

                            hr {}

                            dl {
                                dt {
                                    class: "section-header",
                                    label { r#for: "edit-account-balance", "Working Balance" }
                                }
                                dd {
                                    class: "user-data ynab-new-currency-input is-editing legacy-currency-input",
                                    input {
                                        id: "edit-account-balance",
                                        class: "user-data",
                                        r#type: "text",
                                        value: "{balance_str}",
                                        oninput: move |e| balance_str.set(e.value()),
                                    }
                                    small {
                                        class: "account-modal-helper-text",
                                        "An adjustment transaction will be created automatically if you change this amount."
                                    }
                                }
                            }

                            if is_loan {
                                hr {}
                                div {
                                    class: "split-fieldset edit-account-loan-terms",
                                    dl {
                                        dt {
                                            class: "section-header",
                                            label { r#for: "edit-loan-apr", "Interest Rate (APR %)" }
                                        }
                                        dd {
                                            class: "user-data",
                                            input {
                                                id: "edit-loan-apr",
                                                class: "user-data modal-account-settings-interest-rate",
                                                r#type: "text",
                                                value: "{apr_str}",
                                                placeholder: "6.50",
                                                oninput: move |e| apr_str.set(e.value()),
                                            }
                                        }
                                    }
                                    dl {
                                        dt {
                                            class: "section-header",
                                            label { r#for: "edit-loan-min-pay", "Minimum Monthly Payment" }
                                        }
                                        dd {
                                            class: "user-data ynab-new-currency-input is-editing legacy-currency-input",
                                            input {
                                                id: "edit-loan-min-pay",
                                                class: "user-data modal-account-settings-minimum-payment",
                                                r#type: "text",
                                                value: "{min_payment_str}",
                                                placeholder: "0.00",
                                                oninput: move |e| min_payment_str.set(e.value()),
                                            }
                                        }
                                    }
                                    dl {
                                        dt {
                                            class: "section-header",
                                            label { r#for: "edit-loan-escrow", "Monthly Escrow" }
                                        }
                                        dd {
                                            class: "user-data ynab-new-currency-input is-editing legacy-currency-input",
                                            input {
                                                id: "edit-loan-escrow",
                                                class: "user-data modal-account-settings-escrow modal-account-settings-escrow-amount",
                                                r#type: "text",
                                                value: "{escrow_str}",
                                                placeholder: "0.00",
                                                oninput: move |e| escrow_str.set(e.value()),
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "destructive",
                        class: "left-button",
                        onclick: move |_| {
                            store.active_modal.set(ActiveModal::CloseAccount(acc_close.clone()));
                        },
                        "Close Account"
                    }
                    YnabButton {
                        variant: "secondary",
                        class: "button-cancel",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        class: "js-primary-action save-account-button",
                        onclick: move |_| {
                            let name = account_name.read().trim().to_string();
                            if !name.is_empty() {
                                let note_val = note.read().clone();
                                let new_bal = evaluate_formula_milliunits(&balance_str.read()).unwrap_or(current_bal);
                                let delta = new_bal - current_bal;
                                store.update_account(
                                    &acc_id_save,
                                    &name,
                                    if note_val.is_empty() { None } else { Some(note_val) },
                                    if delta != 0 { Some(delta) } else { None },
                                );
                                if is_loan {
                                    let apr_milli = parse_apr_to_millipercent(&apr_str.read()).unwrap_or(0);
                                    let min_pay = evaluate_formula_milliunits(&min_payment_str.read())
                                        .unwrap_or(0)
                                        .abs();
                                    let escrow = evaluate_formula_milliunits(&escrow_str.read())
                                        .unwrap_or(0)
                                        .abs();
                                    let orig_bal = if init_orig_bal > 0 {
                                        init_orig_bal
                                    } else {
                                        new_bal.abs()
                                    };
                                    store.save_loan_terms(SaveLoanTermsPayload {
                                        account_id: acc_id_save.clone(),
                                        original_balance_milliunits: orig_bal,
                                        apr_millipercent: apr_milli,
                                        minimum_payment_milliunits: min_pay,
                                        monthly_escrow_milliunits: escrow,
                                    });
                                }
                            }
                            store.active_modal.set(ActiveModal::None);
                        },
                        "Save"
                    }
                }
            }
        }
    }
}

#[component]
pub fn CloseAccountModalView(account: AccountDto) -> Element {
    let mut store = use_context::<AppStore>();
    let has_bal = account.balance_milliunits != 0;
    let formatted_adj = store.format_money(account.balance_milliunits.abs());
    let acc_id = account.id.clone();

    rsx! {
        div {
            class: "dialog-overlay active modal-close-account",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog regular",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "close-account-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "close-account-dialog-title", "Close Account" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body modal-close-account-body",
                        if has_bal {
                            div {
                                class: "ynab-helpbox",
                                Icon { name: "info_circle_fill", width: 24, height: 24 }
                                p {
                                    "Before you can close this account, the balance will have to be zeroed out. An adjustment transaction will be created for "
                                    strong { "{formatted_adj}" }
                                    "."
                                }
                            }
                        } else {
                            p {
                                "Are you sure you want to close "
                                strong { "{account.name}" }
                                "?"
                            }
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "secondary",
                        class: "button-cancel",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            store.close_account(&acc_id);
                            store.active_modal.set(ActiveModal::None);
                        },
                        if has_bal { "Adjust Balance & Close" } else { "Finish Closing Account" }
                    }
                }
            }
        }
    }
}

#[component]
pub fn ManagePayeesModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let payees = store.payees.read().clone();
    let mut search = use_signal(String::new);

    let regular_payees: Vec<_> = payees
        .iter()
        .filter(|p| p.account_id.is_none() && p.internal_name.is_none())
        .cloned()
        .collect();
    let transfer_payees: Vec<_> = payees
        .iter()
        .filter(|p| p.account_id.is_some())
        .cloned()
        .collect();

    let first_payee = regular_payees.first().or_else(|| payees.first());
    let mut selected_id = use_signal(|| first_payee.map(|p| p.id.clone()).unwrap_or_default());
    let mut draft_name = use_signal(|| first_payee.map(|p| p.name.clone()).unwrap_or_default());
    let mut checked_ids = use_signal(HashSet::<String>::new);
    let mut combine_target_name = use_signal(String::new);
    let mut rule_operator = use_signal(|| "Contains".to_string());
    let mut rule_operand = use_signal(String::new);
    let mut status_msg = use_signal(|| None::<(bool, String)>);

    let q = search.read().to_ascii_lowercase();
    let filtered_regular: Vec<_> = regular_payees
        .iter()
        .filter(|p| p.name.to_ascii_lowercase().contains(&q))
        .cloned()
        .collect();
    let filtered_transfers: Vec<_> = transfer_payees
        .iter()
        .filter(|p| p.name.to_ascii_lowercase().contains(&q))
        .cloned()
        .collect();

    let active_payee = payees
        .iter()
        .find(|p| p.id == *selected_id.read())
        .or_else(|| filtered_regular.first())
        .or_else(|| filtered_transfers.first())
        .cloned();

    let checked_set = checked_ids.read().clone();
    let checked_payees: Vec<_> = regular_payees
        .iter()
        .filter(|p| checked_set.contains(&p.id))
        .cloned()
        .collect();
    let is_combine_mode = checked_payees.len() >= 2;

    let active_rules: Vec<PayeeRenameRuleVm> = active_payee
        .as_ref()
        .map(|ap| store.get_payee_rename_rules(&ap.id))
        .unwrap_or_default();

    rsx! {
        div {
            class: "dialog-overlay active modal-payees",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog x-large",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "manage-payees-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header modal-payees-header-text",
                    div {
                        class: "dialog-title",
                        h1 { id: "manage-payees-dialog-title", "Manage Payees" }
                    }
                    button {
                        class: "dialog-close modal-payees-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body",
                        div {
                            class: "legacy-form-fields",
                            div {
                                class: "manage-payees",

                                // Left Payee Directory Column
                                div {
                                    class: "modal-payees-list",
                                    div {
                                        class: "manage-payees-search",
                                        span {
                                            class: "manage-payees-search-icon",
                                            Icon { name: "search", width: 14, height: 14 }
                                        }
                                        input {
                                            class: "manage-payees-search-input user-data",
                                            r#type: "text",
                                            placeholder: "Search Payees...",
                                            value: "{search}",
                                            oninput: move |e| search.set(e.value()),
                                        }
                                        if !search.read().is_empty() {
                                            button {
                                                class: "manage-payees-search-clear",
                                                r#type: "button",
                                                title: "Clear search",
                                                onclick: move |_| search.set(String::new()),
                                                Icon { name: "close_circle_fill", width: 14, height: 14 }
                                            }
                                        }
                                    }

                                    if !checked_payees.is_empty() {
                                        div {
                                            class: "manage-payees-selection-bar",
                                            span {
                                                class: "manage-payees-selection-count",
                                                "{checked_payees.len()} Selected"
                                            }
                                            button {
                                                class: "button-link manage-payees-clear-selection",
                                                r#type: "button",
                                                onclick: move |_| checked_ids.write().clear(),
                                                "Clear selection"
                                            }
                                        }
                                    }

                                    ul {
                                        class: "modal-payees-list-items",
                                        if !filtered_regular.is_empty() {
                                            li {
                                                class: "manage-payees-group-header",
                                                "Saved Payees"
                                            }
                                        }
                                        for p in filtered_regular.iter() {
                                            {
                                                let pid = p.id.clone();
                                                let pid_chk = p.id.clone();
                                                let pname = p.name.clone();
                                                let pname_chk = p.name.clone();
                                                let is_sel = !is_combine_mode
                                                    && active_payee.as_ref().map(|a| &a.id) == Some(&p.id);
                                                let is_chk = checked_set.contains(&p.id);
                                                let row_cls = if is_sel || is_chk {
                                                    "modal-payee-list-item is-selected"
                                                } else {
                                                    "modal-payee-list-item"
                                                };
                                                rsx! {
                                                    li {
                                                        key: "{pid}",
                                                        class: "{row_cls}",
                                                        button {
                                                            r#type: "button",
                                                            role: "checkbox",
                                                            aria_checked: if is_chk { "true" } else { "false" },
                                                            class: if is_chk {
                                                                "ynab-checkbox ynab-checkbox-button is-checked"
                                                            } else {
                                                                "ynab-checkbox ynab-checkbox-button"
                                                            },
                                                            onclick: move |evt| {
                                                                evt.stop_propagation();
                                                                let mut set = checked_ids.write();
                                                                if set.contains(&pid_chk) {
                                                                    set.remove(&pid_chk);
                                                                } else {
                                                                    set.insert(pid_chk.clone());
                                                                    if combine_target_name.read().trim().is_empty() {
                                                                        combine_target_name.set(pname_chk.clone());
                                                                    }
                                                                }
                                                                status_msg.set(None);
                                                            },
                                                            span {
                                                                class: if is_chk {
                                                                    "ynab-checkbox-button-square is-checked"
                                                                } else {
                                                                    "ynab-checkbox-button-square"
                                                                },
                                                                if is_chk {
                                                                    Icon { name: "check", width: 10, height: 10 }
                                                                }
                                                            }
                                                        }
                                                        button {
                                                            r#type: "button",
                                                            class: "modal-payee-list-button",
                                                            onclick: move |_| {
                                                                selected_id.set(pid.clone());
                                                                draft_name.set(pname.clone());
                                                                status_msg.set(None);
                                                            },
                                                            "{p.name}"
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        if !filtered_transfers.is_empty() {
                                            li {
                                                class: "manage-payees-group-header",
                                                "Transfer Payees"
                                            }
                                            for tp in filtered_transfers.iter() {
                                                {
                                                    let tpid = tp.id.clone();
                                                    let tpname = tp.name.clone();
                                                    let is_sel = !is_combine_mode
                                                        && active_payee.as_ref().map(|a| &a.id) == Some(&tp.id);
                                                    let row_cls = if is_sel {
                                                        "modal-payee-list-item modal-payee-list-item-transfer is-selected"
                                                    } else {
                                                        "modal-payee-list-item modal-payee-list-item-transfer"
                                                    };
                                                    rsx! {
                                                        li {
                                                            key: "{tpid}",
                                                            class: "{row_cls}",
                                                            button {
                                                                r#type: "button",
                                                                class: "modal-payee-list-button",
                                                                onclick: move |_| {
                                                                    selected_id.set(tpid.clone());
                                                                    draft_name.set(tpname.clone());
                                                                    status_msg.set(None);
                                                                },
                                                                "{tp.name}"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Right Details / Combine / Rename Rules Column
                                div {
                                    class: "modal-payees-main",
                                    if let Some((is_err, ref msg)) = *status_msg.read() {
                                        div {
                                            class: if is_err {
                                                "modal-status-banner is-error"
                                            } else {
                                                "modal-status-banner is-success"
                                            },
                                            "{msg}"
                                        }
                                    }

                                    if is_combine_mode {
                                        {
                                            let source_ids: Vec<String> = checked_payees.iter().map(|p| p.id.clone()).collect();
                                            rsx! {
                                                div {
                                                    class: "card modal-payees-detail-card",
                                                    div {
                                                        class: "card-body modal-payees-multiple-combine",
                                                        div {
                                                            class: "modal-payees-multiple-header",
                                                            h2 { "Combine {checked_payees.len()} Payees?" }
                                                        }
                                                        p {
                                                            class: "modal-payees-transfer-note",
                                                            "Combining these payees merges all existing transactions and scheduled transactions into one payee and preserves auto-rename rules for future imports."
                                                        }
                                                        div {
                                                            class: "modal-payees-chips-section",
                                                            div {
                                                                class: "modal-payees-field-label",
                                                                "Selected Payees to Merge"
                                                            }
                                                            div {
                                                                class: "modal-payees-multiple-chips",
                                                                for cp in checked_payees.iter() {
                                                                    {
                                                                        let cname = cp.name.clone();
                                                                        rsx! {
                                                                            button {
                                                                                key: "chip-{cp.id}",
                                                                                r#type: "button",
                                                                                title: "Use as target name",
                                                                                class: "modal-payees-chip",
                                                                                onclick: move |_| combine_target_name.set(cname.clone()),
                                                                                "{cp.name}"
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "modal-payees-field-block",
                                                            label {
                                                                r#for: "combine-payees-target-input",
                                                                class: "modal-payees-field-label",
                                                                "Combine and Rename To"
                                                            }
                                                            input {
                                                                id: "combine-payees-target-input",
                                                                class: "user-data",
                                                                r#type: "text",
                                                                value: "{combine_target_name}",
                                                                placeholder: "Enter combined payee name...",
                                                                oninput: move |e| combine_target_name.set(e.value()),
                                                            }
                                                        }
                                                        div {
                                                            class: "modal-payees-combine-actions",
                                                            YnabButton {
                                                                variant: "primary",
                                                                onclick: move |_| {
                                                                    let tgt = combine_target_name.read().trim().to_string();
                                                                    if tgt.is_empty() {
                                                                        status_msg.set(Some((true, "Please enter a target payee name.".to_string())));
                                                                        return;
                                                                    }
                                                                    match store.combine_payees(&source_ids, &tgt) {
                                                                        Ok(()) => {
                                                                            checked_ids.write().clear();
                                                                            combine_target_name.set(String::new());
                                                                            status_msg.set(Some((false, format!("Combined into \"{tgt}\" successfully."))));
                                                                        }
                                                                        Err(err) => {
                                                                            status_msg.set(Some((true, err)));
                                                                        }
                                                                    }
                                                                },
                                                                "Combine Payees"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } else if let Some(ap) = active_payee {
                                        {
                                            let ap_id_rename = ap.id.clone();
                                            let ap_id_rule = ap.id.clone();
                                            let ap_id_del = ap.id.clone();
                                            let is_system_or_transfer = ap.account_id.is_some() || ap.internal_name.is_some();
                                            rsx! {
                                                div {
                                                    class: "card modal-payees-detail-card",
                                                    div {
                                                        class: "card-body modal-payees-single-detail",
                                                        div {
                                                            class: if is_system_or_transfer {
                                                                "modal-payees-transfer-header"
                                                            } else {
                                                                "modal-payees-selected-header"
                                                            },
                                                            h2 { "Payee Details" }
                                                        }
                                                        if is_system_or_transfer {
                                                            p {
                                                                class: "modal-payees-transfer-note",
                                                                "Transfer and system payees are managed automatically by YNAB and cannot be renamed, deleted, or combined."
                                                            }
                                                        } else {
                                                            div {
                                                                class: "modal-payees-field-block",
                                                                label {
                                                                    r#for: "manage-payees-name-input",
                                                                    class: "modal-payees-field-label",
                                                                    "Payee Name"
                                                                }
                                                                div {
                                                                    class: "modal-payees-rename-row",
                                                                    input {
                                                                        id: "manage-payees-name-input",
                                                                        class: "user-data",
                                                                        r#type: "text",
                                                                        value: "{draft_name}",
                                                                        oninput: move |e| draft_name.set(e.value()),
                                                                    }
                                                                    YnabButton {
                                                                        variant: "secondary",
                                                                        onclick: move |_| {
                                                                            let trimmed = draft_name.read().trim().to_string();
                                                                            if !trimmed.is_empty() {
                                                                                store.update_payee(&ap_id_rename, &trimmed);
                                                                                status_msg.set(Some((false, format!("Payee renamed to \"{trimmed}\"."))));
                                                                            }
                                                                        },
                                                                        "Save Name"
                                                                    }
                                                                }
                                                            }

                                                            // Auto-Rename Rules Section
                                                            div {
                                                                class: "manage-payees-renaming-rules modal-payees-renaming-rules",
                                                                div {
                                                                    class: "manage-payees-renaming-rules-header",
                                                                    h4 { "Auto-Rename Rules" }
                                                                    div {
                                                                        class: "manage-payees-renaming-rules-subtitle",
                                                                        "Imported payees that match these rules will be renamed to \"{ap.name}\"."
                                                                    }
                                                                }

                                                                if active_rules.is_empty() {
                                                                    div {
                                                                        class: "manage-payees-renaming-rules-empty",
                                                                        "No renaming rules configured yet."
                                                                    }
                                                                } else {
                                                                    div {
                                                                        class: "manage-payees-renaming-rules-list",
                                                                        for rule in active_rules.iter() {
                                                                            {
                                                                                let rid = rule.id.clone();
                                                                                rsx! {
                                                                                    div {
                                                                                        key: "{rid}",
                                                                                        class: "manage-payees-renaming-rule",
                                                                                        span {
                                                                                            class: "manage-payees-renaming-rule-text",
                                                                                            "If imported payee "
                                                                                            strong { "{format_rename_operator_label(&rule.operator)}" }
                                                                                            " \""
                                                                                            strong { "{rule.operand}" }
                                                                                            "\" → rename to "
                                                                                            strong { "{ap.name}" }
                                                                                        }
                                                                                        div {
                                                                                            class: "manage-payees-renaming-rule-actions",
                                                                                            button {
                                                                                                r#type: "button",
                                                                                                class: "manage-payees-renaming-rule-remove",
                                                                                                title: "Remove renaming rule",
                                                                                                onclick: move |_| {
                                                                                                    let _ = store.delete_payee_rename_rule(&rid);
                                                                                                },
                                                                                                Icon { name: "subtract", width: 12, height: 12 }
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }

                                                                // Add Renaming Rule Builder
                                                                div {
                                                                    class: "manage-payees-renaming-rule-builder",
                                                                    span {
                                                                        class: "manage-payees-builder-prefix",
                                                                        "If imported payee"
                                                                    }
                                                                    div {
                                                                        class: "x-select-container",
                                                                        select {
                                                                            value: "{rule_operator}",
                                                                            onchange: move |e| rule_operator.set(e.value()),
                                                                            option { value: "Contains", "Contains" }
                                                                            option { value: "Is", "Is" }
                                                                            option { value: "StartsWith", "Starts With" }
                                                                            option { value: "EndsWith", "Ends With" }
                                                                        }
                                                                    }
                                                                    input {
                                                                        class: "user-data manage-payees-builder-input",
                                                                        r#type: "text",
                                                                        value: "{rule_operand}",
                                                                        placeholder: "e.g. AMZN MKTP",
                                                                        oninput: move |e| rule_operand.set(e.value()),
                                                                    }
                                                                    YnabButton {
                                                                        variant: "secondary",
                                                                        onclick: move |_| {
                                                                            let op = rule_operator.read().clone();
                                                                            let val = rule_operand.read().trim().to_string();
                                                                            if val.is_empty() {
                                                                                status_msg.set(Some((true, "Enter text to match for the renaming rule.".to_string())));
                                                                                return;
                                                                            }
                                                                            match store.add_payee_rename_rule(&ap_id_rule, &op, &val) {
                                                                                Ok(()) => {
                                                                                    rule_operand.set(String::new());
                                                                                    status_msg.set(Some((false, "Auto-rename rule added.".to_string())));
                                                                                }
                                                                                Err(err) => {
                                                                                    status_msg.set(Some((true, err)));
                                                                                }
                                                                            }
                                                                        },
                                                                        "+ Add Rule"
                                                                    }
                                                                }
                                                            }

                                                            div {
                                                                class: "modal-payees-delete-row",
                                                                YnabButton {
                                                                    variant: "destructive",
                                                                    onclick: move |_| {
                                                                        store.delete_payee(&ap_id_del);
                                                                        selected_id.set(String::new());
                                                                        draft_name.set(String::new());
                                                                        status_msg.set(Some((false, "Payee deleted.".to_string())));
                                                                    },
                                                                    "Delete Payee"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        div {
                                            class: "modal-payees-empty-state",
                                            "Select a payee to edit."
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    span {
                        class: "modal-payees-footer-hint",
                        if checked_payees.is_empty() {
                            "Check 2 or more payees to combine them, or select a payee to manage auto-rename rules."
                        } else {
                            "{checked_payees.len()} payee(s) selected"
                        }
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Done"
                    }
                }
            }
        }
    }
}

#[component]
pub fn DisplayOptionsModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let init_theme = store.theme.read().clone();
    let init_bars = *store.show_progress_bars.read();
    let init_diff = *store.differentiate_without_color.read();

    let mut theme = use_signal(|| init_theme);
    let mut progress_bars = use_signal(|| init_bars);
    let mut diff_colors = use_signal(|| init_diff);

    let sample_neg = store.format_money(-10_000);
    let sample_pos = store.format_money(10_000);

    rsx! {
        div {
            class: "dialog-overlay active ynab-new-theme-switcher modal-theme-switcher",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog large",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "display-options-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "display-options-dialog-title", "Display Options" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body",
                        div {
                            class: "modal-content js-ynab-new-theme-switcher-themes ynab-theme-switcher-stack",

                            // Theme Option Cards
                            div {
                                class: "ynab-new-theme-switcher-option",
                                h3 { "Theme" }
                                div {
                                    class: "ynab-new-theme-switcher-grid",
                                    for (t_val, t_label, extra_cls, thumb_cls) in [
                                        ("", "Default (Light)", "", "ynab-theme-thumb ynab-theme-thumb-light"),
                                        ("theme-dark", "Dark", "ynab-new-theme-switcher-dark", "ynab-theme-thumb ynab-theme-thumb-dark"),
                                        ("theme-match-system", "Match System", "ynab-new-theme-switcher-match-system", "ynab-theme-thumb ynab-theme-thumb-system"),
                                    ] {
                                        {
                                            let tv = t_val.to_string();
                                            let is_sel = *theme.read() == tv;
                                            let btn_cls = match (is_sel, extra_cls.is_empty()) {
                                                (true, true) => "active".to_string(),
                                                (false, true) => String::new(),
                                                (true, false) => format!("active {extra_cls}"),
                                                (false, false) => extra_cls.to_string(),
                                            };
                                            rsx! {
                                                button {
                                                    key: "{tv}",
                                                    r#type: "button",
                                                    class: "{btn_cls}",
                                                    onclick: move |_| theme.set(tv.clone()),
                                                    div {
                                                        class: "example",
                                                        svg {
                                                            class: "{thumb_cls}",
                                                            view_box: "0 0 190 113",
                                                            width: "190",
                                                            height: "113",
                                                            rect { class: "theme-preview-bg", x: "0", y: "0", width: "190", height: "113" }
                                                            rect { class: "theme-preview-sidebar", x: "0", y: "0", width: "44", height: "113" }
                                                            rect { class: "theme-preview-nav-pill", x: "7", y: "14", width: "30", height: "7", rx: "3" }
                                                            rect { class: "theme-preview-nav-item", x: "7", y: "28", width: "26", height: "5", rx: "2" }
                                                            rect { class: "theme-preview-nav-item", x: "7", y: "39", width: "22", height: "5", rx: "2" }
                                                            rect { class: "theme-preview-header", x: "44", y: "0", width: "146", height: "26" }
                                                            rect { class: "theme-preview-rta", x: "54", y: "7", width: "46", height: "12", rx: "4" }
                                                            rect { class: "theme-preview-row", x: "54", y: "35", width: "126", height: "10", rx: "3" }
                                                            rect { class: "theme-preview-pill-pos", x: "144", y: "37", width: "30", height: "6", rx: "3" }
                                                            rect { class: "theme-preview-row", x: "54", y: "51", width: "126", height: "10", rx: "3" }
                                                            rect { class: "theme-preview-pill-warn", x: "144", y: "53", width: "30", height: "6", rx: "3" }
                                                            rect { class: "theme-preview-row", x: "54", y: "67", width: "126", height: "10", rx: "3" }
                                                            rect { class: "theme-preview-pill-pos", x: "144", y: "69", width: "30", height: "6", rx: "3" }
                                                            if t_val == "theme-match-system" {
                                                                rect { class: "theme-preview-split-dark", x: "95", y: "0", width: "95", height: "113" }
                                                            }
                                                        }
                                                        div {
                                                            class: "ynab-new-theme-switcher-radio-selection",
                                                            span {
                                                                class: if is_sel {
                                                                    "ynab-checkbox ynab-checkbox-button is-checked"
                                                                } else {
                                                                    "ynab-checkbox ynab-checkbox-button"
                                                                },
                                                                span {
                                                                    class: if is_sel {
                                                                        "ynab-checkbox-button-square is-checked"
                                                                    } else {
                                                                        "ynab-checkbox-button-square"
                                                                    },
                                                                    if is_sel {
                                                                        Icon { name: "check", width: 10, height: 10 }
                                                                    }
                                                                }
                                                            }
                                                            p { class: "ynab-new-theme-switcher-label", "{t_label}" }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Progress Bars Cards
                            div {
                                class: "ynab-new-theme-switcher-option ynab-new-theme-switcher-option-progress-bars",
                                h3 { "Progress Bars" }
                                div {
                                    class: "ynab-new-theme-switcher-grid",
                                    for (pb_val, pb_label, show_bar_graphic) in [(true, "On", true), (false, "Off", false)] {
                                        {
                                            let is_sel = *progress_bars.read() == pb_val;
                                            rsx! {
                                                button {
                                                    key: "pb-{pb_label}",
                                                    r#type: "button",
                                                    class: if is_sel { "active" } else { "" },
                                                    onclick: move |_| progress_bars.set(pb_val),
                                                    div {
                                                        class: "example",
                                                        svg {
                                                            class: "ynab-progress-bars-thumb",
                                                            view_box: "0 0 336 63",
                                                            width: "336",
                                                            height: "63",
                                                            rect { class: "pb-preview-line", x: "8", y: "8", width: "67", height: "6", rx: "3" }
                                                            rect { class: "pb-preview-line", x: "133", y: "8", width: "111", height: "6", rx: "3" }
                                                            rect { class: "pb-preview-pill", x: "303", y: "8", width: "22", height: "12", rx: "6" }
                                                            if show_bar_graphic {
                                                                rect { class: "pb-preview-bar-bg", x: "8", y: "20", width: "236", height: "6", rx: "3" }
                                                                rect { class: "pb-preview-bar-fill", x: "8", y: "20", width: "160", height: "6", rx: "3" }
                                                            }
                                                            rect { class: "pb-preview-line", x: "8", y: "40", width: "67", height: "6", rx: "3" }
                                                            rect { class: "pb-preview-line", x: "133", y: "40", width: "111", height: "6", rx: "3" }
                                                            rect { class: "pb-preview-pill", x: "303", y: "40", width: "22", height: "12", rx: "6" }
                                                            if show_bar_graphic {
                                                                rect { class: "pb-preview-bar-bg", x: "8", y: "51", width: "236", height: "6", rx: "3" }
                                                                rect { class: "pb-preview-bar-fill-warn", x: "8", y: "51", width: "204", height: "6", rx: "3" }
                                                            }
                                                        }
                                                        div {
                                                            class: "ynab-new-theme-switcher-radio-selection",
                                                            span {
                                                                class: if is_sel {
                                                                    "ynab-checkbox ynab-checkbox-button is-checked"
                                                                } else {
                                                                    "ynab-checkbox ynab-checkbox-button"
                                                                },
                                                                span {
                                                                    class: if is_sel {
                                                                        "ynab-checkbox-button-square is-checked"
                                                                    } else {
                                                                        "ynab-checkbox-button-square"
                                                                    },
                                                                    if is_sel {
                                                                        Icon { name: "check", width: 10, height: 10 }
                                                                    }
                                                                }
                                                            }
                                                            p { class: "ynab-new-theme-switcher-label", "{pb_label}" }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Available Balance Style Cards
                            div {
                                class: "ynab-new-theme-switcher-option ynab-new-theme-switcher-option-available-balance-style",
                                h3 { "Available Balance Style" }
                                div {
                                    class: "ynab-new-theme-switcher-grid",
                                    for (alt_val, alt_label) in [
                                        (false, "Default (Color pills)"),
                                        (true, "Differentiate without color"),
                                    ] {
                                        {
                                            let is_sel = *diff_colors.read() == alt_val;
                                            let pill_suffix = if alt_val { " alternative" } else { "" };
                                            rsx! {
                                                button {
                                                    key: "abs-{alt_label}",
                                                    r#type: "button",
                                                    class: if is_sel { "active" } else { "" },
                                                    onclick: move |_| diff_colors.set(alt_val),
                                                    div {
                                                        class: "example",
                                                        div {
                                                            class: "balance-pills",
                                                            div {
                                                                class: "ynab-new-budget-available-number negative{pill_suffix}",
                                                                "{sample_neg}"
                                                            }
                                                            div {
                                                                class: "ynab-new-budget-available-number cautious{pill_suffix}",
                                                                "{sample_pos}"
                                                            }
                                                            div {
                                                                class: "ynab-new-budget-available-number positive{pill_suffix}",
                                                                "{sample_pos}"
                                                            }
                                                        }
                                                        div {
                                                            class: "ynab-new-theme-switcher-radio-selection",
                                                            span {
                                                                class: if is_sel {
                                                                    "ynab-checkbox ynab-checkbox-button is-checked"
                                                                } else {
                                                                    "ynab-checkbox ynab-checkbox-button"
                                                                },
                                                                span {
                                                                    class: if is_sel {
                                                                        "ynab-checkbox-button-square is-checked"
                                                                    } else {
                                                                        "ynab-checkbox-button-square"
                                                                    },
                                                                    if is_sel {
                                                                        Icon { name: "check", width: 10, height: 10 }
                                                                    }
                                                                }
                                                            }
                                                            p { class: "ynab-new-theme-switcher-label", "{alt_label}" }
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

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "secondary",
                        class: "button-cancel",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let t = theme.read().clone();
                            let b = *progress_bars.read();
                            let d = *diff_colors.read();
                            store.save_display_options(&t, b, d);
                            store.active_modal.set(ActiveModal::None);
                        },
                        "Apply"
                    }
                }
            }
        }
    }
}

#[component]
pub fn EditFlagsModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let init_flags = store.flag_names.read().clone();
    let mut flags = use_signal(|| init_flags);

    let colors = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"];

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-fresh modal-flag-names",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "edit-flags-modal-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "modal-fresh-header",
                    div {
                        id: "edit-flags-modal-title",
                        class: "modal-fresh-title",
                        "Edit Flags"
                    }
                    button {
                        class: "modal-fresh-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "modal-fresh-body",
                    div {
                        class: "fieldset flag-names-fieldset",
                        for color in colors {
                            {
                                let col_key = color.to_string();
                                let col_lower = color.to_ascii_lowercase();
                                let input_id = format!("flag-name_{col_lower}");
                                let val = flags.read().get(color).cloned().unwrap_or_else(|| color.to_string());
                                rsx! {
                                    div {
                                        key: "{col_key}",
                                        class: "flag-name-input-group",
                                        label {
                                            r#for: "{input_id}",
                                            Icon {
                                                class: "ynab-flag-icon {col_lower} flag-pill-icon-{col_lower}",
                                                name: "flag_fill",
                                                width: 22,
                                                height: 22,
                                            }
                                        }
                                        input {
                                            id: "{input_id}",
                                            class: "user-data",
                                            r#type: "text",
                                            value: "{val}",
                                            placeholder: "{color}",
                                            oninput: move |e| {
                                                flags.write().insert(col_key.clone(), e.value());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                div {
                    class: "modal-fresh-footer",
                    div { class: "footer-spacer" }
                    div {
                        class: "modal-fresh-footer-buttons",
                        YnabButton {
                            variant: "secondary",
                            class: "button-cancel",
                            onclick: move |_| store.active_modal.set(ActiveModal::None),
                            "Cancel"
                        }
                        YnabButton {
                            variant: "primary",
                            onclick: move |_| {
                                let map: HashMap<String, String> = flags.read().clone();
                                store.save_flag_names(map);
                                store.active_modal.set(ActiveModal::None);
                            },
                            "Done"
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn ExportPlanModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let month_iso = store.current_month.read().clone();
    let summary = store.month_summary.read().clone();

    rsx! {
        div {
            class: "dialog-overlay active modal-budget-export",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog regular",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "export-plan-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "export-plan-dialog-title", "Export Plan" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-hero modal-budget-export-hero",
                        Icon { name: "document_with_arrow_down", width: 32, height: 32 }
                    }
                    div {
                        class: "dialog-body modal-budget-export-body",
                        p {
                            "Your data is just that—yours! All the requested plan data will be exported in RFC 4180 CSV format so it's easy to open in other applications."
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "secondary",
                        class: "button-cancel",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let mut cat_rows = Vec::new();
                            for g in &summary.category_groups {
                                for c in &g.categories {
                                    cat_rows.push(ExportBudgetCategoryRow {
                                        group_name: g.name.clone(),
                                        category_name: c.name.clone(),
                                        assigned_milliunits: c.assigned_milliunits,
                                        activity_milliunits: c.activity_milliunits,
                                        available_milliunits: c.available_milliunits,
                                    });
                                }
                            }
                            let rows = generate_budget_plan_csv_rows(&cat_rows);
                            let csv = export_to_csv_string(&rows);
                            let filename = format!("budget_plan_{}.csv", &month_iso[0..7]);
                            let _ = save_csv_file_dialog(&filename, &csv);
                            store.active_modal.set(ActiveModal::None);
                        },
                        "Export"
                    }
                }
            }
        }
    }
}

#[component]
pub fn FreshStartModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let current_name = store.plan_summary.read().name.clone();
    let mut new_name = use_signal(|| format!("{current_name} (Fresh Start)"));

    rsx! {
        div {
            class: "dialog-overlay active skinny modal-budget-fresh-start",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog regular",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "fresh-start-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "fresh-start-dialog-title", "Make a Fresh Start" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-hero modal-budget-fresh-start-hero",
                        Icon { name: "leaf", width: 32, height: 32 }
                    }
                    div {
                        class: "dialog-body fresh-start-modal-scroll-body legacy-form-fields",
                        p {
                            class: "fresh-start-details",
                            "Starting fresh lets you start planning from today with your current account balances preserved while clearing prior transactions and monthly assignments."
                        }
                        div {
                            class: "fieldset",
                            label { r#for: "fresh-start-plan-name", "New Plan Name" }
                            input {
                                id: "fresh-start-plan-name",
                                class: "user-data",
                                r#type: "text",
                                value: "{new_name}",
                                oninput: move |e| new_name.set(e.value()),
                            }
                        }
                        div {
                            class: "ynab-helpbox",
                            Icon { name: "info_circle_fill", width: 20, height: 20 }
                            p {
                                "Your existing plan will remain untouched in case you ever want to look back at past months."
                            }
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "secondary",
                        class: "button-cancel",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let name = new_name.read().trim().to_string();
                            if !name.is_empty() {
                                store.make_fresh_start(&name);
                            }
                            store.active_modal.set(ActiveModal::None);
                        },
                        "Make a Fresh Start"
                    }
                }
            }
        }
    }
}

#[component]
pub fn KeyboardShortcutsModalView() -> Element {
    let mut store = use_context::<AppStore>();

    let sections = [
        ("Universal", ShortcutLocation::Universal),
        ("Plan Actions", ShortcutLocation::Budget),
        ("Account Actions", ShortcutLocation::Accounts),
        ("Date Picker", ShortcutLocation::DatePicker),
    ];

    rsx! {
        div {
            class: "dialog-overlay active modal-keyboard-shortcuts",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog large",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "keyboard-shortcuts-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "keyboard-shortcuts-dialog-title", "Keyboard Shortcuts" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body modal-keyboard-shortcuts-body",
                        for (sec_title, sec_loc) in sections {
                            div {
                                key: "{sec_title}",
                                class: "modal-keyboard-shortcuts-section",
                                h3 { "{sec_title}" }
                                ul {
                                    for def in SHORTCUT_DEFINITIONS.iter().filter(|d| d.location == sec_loc) {
                                        li {
                                            key: "{def.id}",
                                            span { class: "shortcut-description", "{def.title}" }
                                            span {
                                                class: "shortcut-keys",
                                                for (kidx, key_part) in def.keys_label.split(" + ").enumerate() {
                                                    kbd {
                                                        key: "k-{kidx}",
                                                        class: "shortcut-key",
                                                        "{key_part}"
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

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "OK"
                    }
                }
            }
        }
    }
}
