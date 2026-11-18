//! Multi-step YNAB File Import Wizard (`FileImportModal`)
//! Supports `.ofx`, `.qfx`, `.qif`, `.csv`, and `.tsv` bank statements:
//! - Step 1: Pick file via `rfd` native dialog or file path + select target account
//! - Step 2: Preview & Options (`Swap Inflow/Outflow`, `Import Memos`, `Swap Payee/Memo`,
//!   summary counts of `New`, `Auto-Matched (<=10 days)`, `Duplicates Skipped`, and preview table)
//! - Step 3: Commit import into selected account with summary confirmation

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;
use std::path::Path;

use crate::state::{ActiveModal, ActiveWorkspace, AppStore};
use crate::ui::core::{Icon, YnabButton};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportRowStatus {
    New,
    AutoMatched,
    DuplicateSkipped,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportPreviewRowVm {
    pub date: String,
    pub payee: String,
    pub original_payee: String,
    pub memo: String,
    pub amount_milliunits: i64,
    pub import_id: String,
    pub status: ImportRowStatus,
    pub matched_summary: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ImportPreviewVm {
    pub format_label: String,
    pub total_rows: usize,
    pub new_count: usize,
    pub matched_count: usize,
    pub skipped_count: usize,
    pub rows: Vec<ImportPreviewRowVm>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ImportCommitResultVm {
    pub imported_count: usize,
    pub matched_count: usize,
    pub skipped_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileImportRequest {
    pub account_id: String,
    pub file_name: String,
    pub raw_contents: String,
    pub swap_inflow_outflow: bool,
    pub import_memos: bool,
    pub swap_payee_memo: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ImportStep {
    PickFile,
    Preview,
    Complete,
}

fn read_text_file_lossy(path: &Path) -> Result<(String, String), String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    if !matches!(ext.as_str(), "ofx" | "qfx" | "qif" | "csv" | "tsv") {
        return Err(
            "Unsupported file format. Please choose a .OFX, .QFX, .QIF, .CSV, or .TSV file."
                .to_string(),
        );
    }
    let bytes = std::fs::read(path).map_err(|e| format!("Could not read file: {e}"))?;
    let content = match String::from_utf8(bytes) {
        Ok(s) => s,
        Err(err) => String::from_utf8_lossy(err.as_bytes()).into_owned(),
    };
    if content.trim().is_empty() {
        return Err("The selected file is empty.".to_string());
    }
    let fname = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("statement")
        .to_string();
    Ok((fname, content))
}

fn detect_format_badge(file_name: &str) -> &'static str {
    let ext = Path::new(file_name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "ofx" => "OFX",
        "qfx" => "QFX",
        "qif" => "QIF",
        "tsv" => "TSV",
        "csv" => "CSV",
        _ => "FILE",
    }
}

fn build_import_request(
    target_account_id: Signal<String>,
    file_name: Signal<String>,
    raw_contents: Signal<String>,
    swap_inflow_outflow: Signal<bool>,
    import_memos: Signal<bool>,
    swap_payee_memo: Signal<bool>,
) -> FileImportRequest {
    FileImportRequest {
        account_id: target_account_id.read().clone(),
        file_name: file_name.read().clone(),
        raw_contents: raw_contents.read().clone(),
        swap_inflow_outflow: *swap_inflow_outflow.read(),
        import_memos: *import_memos.read(),
        swap_payee_memo: *swap_payee_memo.read(),
    }
}

#[allow(clippy::too_many_arguments)]
fn refresh_import_preview(
    store: &AppStore,
    target_account_id: Signal<String>,
    file_name: Signal<String>,
    raw_contents: Signal<String>,
    swap_inflow_outflow: Signal<bool>,
    import_memos: Signal<bool>,
    swap_payee_memo: Signal<bool>,
    mut preview_data: Signal<Option<ImportPreviewVm>>,
    mut error_msg: Signal<Option<String>>,
) -> bool {
    let req = build_import_request(
        target_account_id,
        file_name,
        raw_contents,
        swap_inflow_outflow,
        import_memos,
        swap_payee_memo,
    );
    match store.preview_file_import(&req) {
        Ok(vm) => {
            preview_data.set(Some(vm));
            error_msg.set(None);
            true
        }
        Err(err) => {
            error_msg.set(Some(err));
            false
        }
    }
}

#[component]
pub fn FileImportModal(initial_account_id: Option<String>) -> Element {
    let mut store = use_context::<AppStore>();
    let accounts = store.accounts.read().clone();
    let importable_accounts: Vec<_> = accounts.iter().filter(|a| !a.closed).cloned().collect();

    let default_acc_id = initial_account_id
        .filter(|id| importable_accounts.iter().any(|a| &a.id == id))
        .or_else(|| importable_accounts.first().map(|a| a.id.clone()))
        .unwrap_or_default();

    let mut step = use_signal(|| ImportStep::PickFile);
    let mut target_account_id = use_signal(|| default_acc_id);
    let mut file_path_input = use_signal(String::new);
    let mut file_name = use_signal(String::new);
    let mut raw_contents = use_signal(String::new);
    let mut swap_inflow_outflow = use_signal(|| false);
    let mut import_memos = use_signal(|| true);
    let mut swap_payee_memo = use_signal(|| false);
    let preview_data = use_signal(|| None::<ImportPreviewVm>);
    let mut commit_result = use_signal(|| None::<ImportCommitResultVm>);
    let mut error_msg = use_signal(|| None::<String>);

    let selected_acc_name = importable_accounts
        .iter()
        .find(|a| a.id == *target_account_id.read())
        .map(|a| a.name.clone())
        .unwrap_or_else(|| "Selected Account".to_string());

    let cur_step = *step.read();
    let is_csv_or_tsv = matches!(detect_format_badge(&file_name.read()), "CSV" | "TSV");

    let (overlay_cls, dialog_cls, modal_title) = match cur_step {
        ImportStep::PickFile => (
            "dialog-overlay active modal-file-import modal-import-choose-file",
            "dialog regular",
            "File Import — Select Statement",
        ),
        ImportStep::Preview => (
            "dialog-overlay active modal-file-import modal-import-review import-review",
            "dialog large",
            "File Import — Preview Transactions",
        ),
        ImportStep::Complete => (
            "dialog-overlay active modal-file-import modal-import-successful",
            "dialog regular",
            "Import Successful",
        ),
    };

    rsx! {
        div {
            class: "{overlay_cls}",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "{dialog_cls}",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "file-import-dialog-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "file-import-dialog-title", "{modal_title}" }
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
                        class: "dialog-body file-import-body",

                        // Step Progress Indicator
                        div {
                            class: "file-import-stepper",
                            span {
                                class: if cur_step == ImportStep::PickFile { "file-import-step is-active" } else { "file-import-step" },
                                "1. Choose File"
                            }
                            span { class: "file-import-step-sep", "›" }
                            span {
                                class: if cur_step == ImportStep::Preview { "file-import-step is-active" } else { "file-import-step" },
                                "2. Preview & Options"
                            }
                            span { class: "file-import-step-sep", "›" }
                            span {
                                class: if cur_step == ImportStep::Complete { "file-import-step is-active" } else { "file-import-step" },
                                "3. Complete"
                            }
                        }

                        if let Some(ref err) = *error_msg.read() {
                            div {
                                class: "modal-error-banner",
                                "{err}"
                            }
                        }

                        match cur_step {
                            ImportStep::PickFile => rsx! {
                                div {
                                    class: "file-import-pick-step legacy-form-fields",
                                    div {
                                        class: "file-import-field",
                                        label { r#for: "file-import-account-select", "Import into Account" }
                                        div {
                                            class: "x-select-container",
                                            select {
                                                id: "file-import-account-select",
                                                class: "user-data file-import-select",
                                                value: "{target_account_id}",
                                                onchange: move |e| target_account_id.set(e.value()),
                                                for acc in importable_accounts.iter() {
                                                    option { key: "{acc.id}", value: "{acc.id}", "{acc.name}" }
                                                }
                                            }
                                        }
                                    }

                                    div {
                                        class: "file-import-dropzone",
                                        Icon { name: "document_with_arrow_up", width: 28, height: 28 }
                                        div {
                                            class: "file-import-dropzone-title",
                                            "Choose a bank statement file to import"
                                        }
                                        div {
                                            class: "file-import-dropzone-sub",
                                            ".OFX, .QFX, .QIF, .CSV, and .TSV formats supported"
                                        }
                                        YnabButton {
                                            variant: "primary",
                                            onclick: move |_| {
                                                if let Some(path) = rfd::FileDialog::new()
                                                    .add_filter("Bank Statements", &["ofx", "qfx", "qif", "csv", "tsv"])
                                                    .pick_file()
                                                {
                                                    file_path_input.set(path.display().to_string());
                                                    match read_text_file_lossy(&path) {
                                                        Ok((fname, content)) => {
                                                            file_name.set(fname);
                                                            raw_contents.set(content);
                                                            error_msg.set(None);
                                                        }
                                                        Err(err) => {
                                                            raw_contents.set(String::new());
                                                            error_msg.set(Some(err));
                                                        }
                                                    }
                                                }
                                            },
                                            "Browse Computer..."
                                        }
                                        if !file_name.read().is_empty() {
                                            div {
                                                class: "file-import-loaded-badge",
                                                "Loaded: {file_name} ({detect_format_badge(&file_name.read())})"
                                            }
                                        }
                                    }

                                    div {
                                        class: "file-import-field",
                                        label { r#for: "file-import-path-input", "Or enter file path directly" }
                                        div {
                                            class: "file-import-path-row",
                                            input {
                                                id: "file-import-path-input",
                                                class: "user-data file-import-path-input",
                                                r#type: "text",
                                                value: "{file_path_input}",
                                                placeholder: "C:\\path\\to\\statement.ofx or .csv",
                                                oninput: move |e| {
                                                    file_path_input.set(e.value());
                                                    raw_contents.set(String::new());
                                                },
                                            }
                                            YnabButton {
                                                variant: "secondary",
                                                onclick: move |_| {
                                                    let p_str = file_path_input.read().trim().to_string();
                                                    match read_text_file_lossy(Path::new(&p_str)) {
                                                        Ok((fname, content)) => {
                                                            file_name.set(fname);
                                                            raw_contents.set(content);
                                                            error_msg.set(None);
                                                        }
                                                        Err(err) => {
                                                            raw_contents.set(String::new());
                                                            error_msg.set(Some(err));
                                                        }
                                                    }
                                                },
                                                "Load"
                                            }
                                        }
                                    }

                                    div {
                                        class: "ynab-helpbox",
                                        Icon { name: "info_circle_fill", width: 20, height: 20 }
                                        p {
                                            "YNAB matches incoming transactions within 10 days of existing entries and skips duplicate FITIDs automatically."
                                        }
                                    }
                                }
                            },
                            ImportStep::Preview => {
                                let vm = preview_data.read().clone().unwrap_or_default();
                                let is_swap_io = *swap_inflow_outflow.read();
                                let is_import_memos = *import_memos.read();
                                let is_swap_pm = *swap_payee_memo.read();
                                rsx! {
                                    div {
                                        class: "file-import-preview-step",
                                        p {
                                            class: "import-review__summary",
                                            strong { "{vm.total_rows}" }
                                            " transactions read from "
                                            strong { "{file_name}" }
                                            " ({vm.format_label}) into "
                                            strong { "{selected_acc_name}" }
                                        }

                                        // Summary Counts
                                        div {
                                            class: "file-import-summary-grid",
                                            div {
                                                class: "file-import-summary-card is-new",
                                                div { class: "file-import-summary-label", "New" }
                                                div { class: "file-import-summary-count tabular-nums", "{vm.new_count}" }
                                            }
                                            div {
                                                class: "file-import-summary-card is-matched",
                                                div { class: "file-import-summary-label", "Auto-Matched (<=10 days)" }
                                                div { class: "file-import-summary-count tabular-nums", "{vm.matched_count}" }
                                            }
                                            div {
                                                class: "file-import-summary-card is-skipped",
                                                div { class: "file-import-summary-label", "Duplicates Skipped" }
                                                div { class: "file-import-summary-count tabular-nums", "{vm.skipped_count}" }
                                            }
                                        }

                                        // Import Options
                                        div {
                                            class: "file-import-options-panel",
                                            b { "Import Options" }
                                            div {
                                                class: "import-options-checkboxes",
                                                if is_csv_or_tsv {
                                                    button {
                                                        r#type: "button",
                                                        role: "checkbox",
                                                        aria_checked: if is_swap_io { "true" } else { "false" },
                                                        class: if is_swap_io { "ynab-checkbox ynab-checkbox-button is-checked" } else { "ynab-checkbox ynab-checkbox-button" },
                                                        onclick: move |_| {
                                                            let cur = *swap_inflow_outflow.read();
                                                            swap_inflow_outflow.set(!cur);
                                                            refresh_import_preview(
                                                                &store,
                                                                target_account_id,
                                                                file_name,
                                                                raw_contents,
                                                                swap_inflow_outflow,
                                                                import_memos,
                                                                swap_payee_memo,
                                                                preview_data,
                                                                error_msg,
                                                            );
                                                        },
                                                        span {
                                                            class: if is_swap_io { "ynab-checkbox-button-square is-checked" } else { "ynab-checkbox-button-square" },
                                                            if is_swap_io {
                                                                Icon { name: "check", width: 10, height: 10 }
                                                            }
                                                        }
                                                        span { class: "label-checkbox", "Swap Inflow / Outflow" }
                                                    }
                                                }
                                                button {
                                                    r#type: "button",
                                                    role: "checkbox",
                                                    aria_checked: if is_import_memos { "true" } else { "false" },
                                                    class: if is_import_memos { "ynab-checkbox ynab-checkbox-button is-checked" } else { "ynab-checkbox ynab-checkbox-button" },
                                                    onclick: move |_| {
                                                        let cur = *import_memos.read();
                                                        import_memos.set(!cur);
                                                        refresh_import_preview(
                                                            &store,
                                                            target_account_id,
                                                            file_name,
                                                            raw_contents,
                                                            swap_inflow_outflow,
                                                            import_memos,
                                                            swap_payee_memo,
                                                            preview_data,
                                                            error_msg,
                                                        );
                                                    },
                                                    span {
                                                        class: if is_import_memos { "ynab-checkbox-button-square is-checked" } else { "ynab-checkbox-button-square" },
                                                        if is_import_memos {
                                                            Icon { name: "check", width: 10, height: 10 }
                                                        }
                                                    }
                                                    span { class: "label-checkbox", "Import Memos" }
                                                }
                                                button {
                                                    r#type: "button",
                                                    role: "checkbox",
                                                    aria_checked: if is_swap_pm { "true" } else { "false" },
                                                    class: if is_swap_pm { "ynab-checkbox ynab-checkbox-button is-checked" } else { "ynab-checkbox ynab-checkbox-button" },
                                                    onclick: move |_| {
                                                        let cur = *swap_payee_memo.read();
                                                        swap_payee_memo.set(!cur);
                                                        refresh_import_preview(
                                                            &store,
                                                            target_account_id,
                                                            file_name,
                                                            raw_contents,
                                                            swap_inflow_outflow,
                                                            import_memos,
                                                            swap_payee_memo,
                                                            preview_data,
                                                            error_msg,
                                                        );
                                                    },
                                                    span {
                                                        class: if is_swap_pm { "ynab-checkbox-button-square is-checked" } else { "ynab-checkbox-button-square" },
                                                        if is_swap_pm {
                                                            Icon { name: "check", width: 10, height: 10 }
                                                        }
                                                    }
                                                    span { class: "label-checkbox", "Swap Payee and Memo" }
                                                }
                                            }
                                        }

                                        // Preview Table
                                        div {
                                            class: "file-import-table-wrap",
                                            table {
                                                class: "ynab-table ynab-table-4-col file-import-table",
                                                thead {
                                                    class: "ynab-table-head",
                                                    tr {
                                                        class: "ynab-table-row",
                                                        th { class: "ynab-table-col", "Status" }
                                                        th { class: "ynab-table-col import-review__date", "Date" }
                                                        th { class: "ynab-table-col import-review__payee", "Payee" }
                                                        th { class: "ynab-table-col import-review__memo", "Memo" }
                                                        th { class: "ynab-table-col import-review__amount amount-column", "Outflow" }
                                                        th { class: "ynab-table-col import-review__amount amount-column", "Inflow" }
                                                    }
                                                }
                                                tbody {
                                                    class: "ynab-table-body import-review__rows",
                                                    for (idx, row) in vm.rows.iter().enumerate() {
                                                        {
                                                            let (badge_cls, badge_text) = match row.status {
                                                                ImportRowStatus::New => ("file-import-status-badge is-new", "New"),
                                                                ImportRowStatus::AutoMatched => ("file-import-status-badge is-matched", "Matched"),
                                                                ImportRowStatus::DuplicateSkipped => ("file-import-status-badge is-skipped", "Skipped"),
                                                            };
                                                            let is_out = row.amount_milliunits < 0;
                                                            let is_in = row.amount_milliunits > 0;
                                                            let renamed = !row.original_payee.is_empty()
                                                                && row.original_payee != row.payee;
                                                            let row_cls = if row.status == ImportRowStatus::DuplicateSkipped {
                                                                "ynab-table-row import-review__row file-import-row-skipped"
                                                            } else {
                                                                "ynab-table-row import-review__row"
                                                            };
                                                            rsx! {
                                                                tr {
                                                                    key: "imp-{idx}",
                                                                    class: "{row_cls}",
                                                                    td {
                                                                        class: "ynab-table-col file-import-cell-status",
                                                                        span {
                                                                            class: "{badge_cls}",
                                                                            "{badge_text}"
                                                                        }
                                                                    }
                                                                    td {
                                                                        class: "ynab-table-col user-data import-review__date",
                                                                        "{store.format_date(&row.date)}"
                                                                    }
                                                                    td {
                                                                        class: "ynab-table-col user-data import-review__payee",
                                                                        div { class: "file-import-payee-name", "{row.payee}" }
                                                                        if renamed {
                                                                            div {
                                                                                class: "file-import-renamed-note",
                                                                                "Imported as: {row.original_payee}"
                                                                            }
                                                                        }
                                                                        if let Some(ref m_sum) = row.matched_summary {
                                                                            div {
                                                                                class: "file-import-match-note",
                                                                                "{m_sum}"
                                                                            }
                                                                        }
                                                                    }
                                                                    td {
                                                                        class: "ynab-table-col user-data import-review__memo",
                                                                        "{row.memo}"
                                                                    }
                                                                    td {
                                                                        class: "ynab-table-col user-data import-review__amount amount-column tabular-nums",
                                                                        if is_out { "{store.format_money(row.amount_milliunits.abs())}" }
                                                                    }
                                                                    td {
                                                                        class: "ynab-table-col user-data import-review__amount amount-column tabular-nums file-import-inflow",
                                                                        if is_in { "{store.format_money(row.amount_milliunits)}" }
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
                            },
                            ImportStep::Complete => {
                                let res = commit_result.read().clone().unwrap_or_default();
                                rsx! {
                                    div {
                                        class: "file-import-complete",
                                        span {
                                            class: "file-import-complete-icon",
                                            Icon { name: "check_circle_fill", width: 36, height: 36 }
                                        }
                                        h3 { "Transactions Imported into {selected_acc_name}" }
                                        p {
                                            "{res.imported_count} new transaction(s) imported, {res.matched_count} transaction(s) matched, and {res.skipped_count} duplicate(s) skipped."
                                        }
                                    }
                                }
                            },
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    match cur_step {
                        ImportStep::PickFile => rsx! {
                            YnabButton {
                                variant: "secondary",
                                class: "button-cancel",
                                onclick: move |_| store.active_modal.set(ActiveModal::None),
                                "Cancel"
                            }
                            YnabButton {
                                variant: "primary",
                                disabled: target_account_id.read().is_empty()
                                    || (raw_contents.read().is_empty() && file_path_input.read().trim().is_empty()),
                                onclick: move |_| {
                                    if raw_contents.read().is_empty() {
                                        let p_str = file_path_input.read().trim().to_string();
                                        if p_str.is_empty() {
                                            error_msg.set(Some("Please pick or enter a statement file path.".to_string()));
                                            return;
                                        }
                                        match read_text_file_lossy(Path::new(&p_str)) {
                                            Ok((fname, content)) => {
                                                file_name.set(fname);
                                                raw_contents.set(content);
                                            }
                                            Err(e) => {
                                                error_msg.set(Some(e));
                                                return;
                                            }
                                        }
                                    }
                                    if refresh_import_preview(
                                        &store,
                                        target_account_id,
                                        file_name,
                                        raw_contents,
                                        swap_inflow_outflow,
                                        import_memos,
                                        swap_payee_memo,
                                        preview_data,
                                        error_msg,
                                    ) {
                                        step.set(ImportStep::Preview);
                                    }
                                },
                                "Next: Preview"
                            }
                        },
                        ImportStep::Preview => {
                            let actionable_count = preview_data
                                .read()
                                .as_ref()
                                .map(|p| p.new_count + p.matched_count)
                                .unwrap_or(0);
                            rsx! {
                                YnabButton {
                                    variant: "secondary",
                                    onclick: move |_| {
                                        error_msg.set(None);
                                        step.set(ImportStep::PickFile);
                                    },
                                    "Back"
                                }
                                YnabButton {
                                    variant: "primary",
                                    disabled: actionable_count == 0,
                                    onclick: move |_| {
                                        let req = build_import_request(
                                            target_account_id,
                                            file_name,
                                            raw_contents,
                                            swap_inflow_outflow,
                                            import_memos,
                                            swap_payee_memo,
                                        );
                                        match store.commit_file_import(&req) {
                                            Ok(res) => {
                                                commit_result.set(Some(res));
                                                error_msg.set(None);
                                                step.set(ImportStep::Complete);
                                            }
                                            Err(err) => {
                                                error_msg.set(Some(err));
                                            }
                                        }
                                    },
                                    "Import {actionable_count} Transactions"
                                }
                            }
                        },
                        ImportStep::Complete => rsx! {
                            YnabButton {
                                variant: "primary",
                                onclick: move |_| {
                                    let acc_id = target_account_id.read().clone();
                                    store.active_modal.set(ActiveModal::None);
                                    if !acc_id.is_empty() {
                                        store.navigate_to(ActiveWorkspace::Accounts(Some(acc_id)));
                                    }
                                },
                                "Done"
                            }
                        },
                    }
                }
            }
        }
    }
}
