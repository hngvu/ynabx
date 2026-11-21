//! Automated WebView2 DOM & Bounding-Box UI Audit (`--ui-audit`).
//! Launches on an isolated in-memory SQLite database seeded with realistic Vietnamese & English data,
//! cycles through all primary workspaces/modals, measures real WebView2 layout rects, writes
//! `ui_audit_report.json`, and exits without touching the user's real database.

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;
use rusqlite::Connection;
use std::path::PathBuf;

use crate::state::{ActiveModal, ActiveWorkspace, AppStore};
use ynab_core::ledger::transfers::SaveTransactionPayload;
use ynab_core::repo::{self, CreateAccountPayload};
use ynab_core::schema;
use ynab_core::seed::{self, DEFAULT_BUDGET_ID};

pub fn is_ui_audit_mode() -> bool {
    std::env::args().any(|a| a == "--ui-audit")
}

pub fn create_seeded_audit_connection() -> Connection {
    let mut conn = Connection::open_in_memory().expect("in-memory sqlite for ui-audit");
    let _ = schema::init_database(&conn);
    let _ = seed::seed_new_budget_if_needed(&mut conn, DEFAULT_BUDGET_ID, "Ngân sách Gia đình");
    let _ = seed::cleanup_duplicate_system_categories(&mut conn, DEFAULT_BUDGET_ID);

    let checking = repo::create_account(
        &conn,
        &CreateAccountPayload {
            name: "Vietcombank Checking".to_string(),
            account_type: "Checking".to_string(),
            balance_milliunits: 25_000_000,
            on_budget: Some(true),
            note: None,
        },
        Some(DEFAULT_BUDGET_ID),
    );
    let _cc = repo::create_account(
        &conn,
        &CreateAccountPayload {
            name: "Techcombank Visa".to_string(),
            account_type: "CreditCard".to_string(),
            balance_milliunits: -2_500_000,
            on_budget: Some(true),
            note: None,
        },
        Some(DEFAULT_BUDGET_ID),
    );
    let _loan = repo::create_account(
        &conn,
        &CreateAccountPayload {
            name: "Vay mua nhà".to_string(),
            account_type: "Mortgage".to_string(),
            balance_milliunits: -500_000_000,
            on_budget: Some(false),
            note: None,
        },
        Some(DEFAULT_BUDGET_ID),
    );

    if let Ok(acc) = checking {
        let _ = repo::create_subcategory(&conn, "cg-bills", "Mức sống", Some(DEFAULT_BUDGET_ID));
        let _ = repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id,
                date: chrono::Local::now().format("%Y-%m-%d").to_string(),
                payee_id: None,
                payee_name: Some("Siêu thị WinMart".to_string()),
                category_id: None,
                memo: Some("Đi chợ cuối tuần: ế, ệ, ờ, ử, ỹ".to_string()),
                amount_milliunits: -350_000,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: Some("green".to_string()),
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        );
    }

    conn
}

const AUDIT_MEASURE_JS: &str = r#"
    await new Promise(r => setTimeout(r, 140));
    const report = {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        overflows: [],
        zeroSized: [],
        gridColumnDeltas: [],
        budgetColumnDeltas: [],
    };

    const overflowSelectors = [
        'html', 'body', '.layout', '.content', '.content-min-break',
        '.accounts-toolbar', '.budget-table-and-inspector', '.ynab-grid-container',
        '.reflect-container'
    ];
    for (const sel of overflowSelectors) {
        const el = document.querySelector(sel);
        if (!el) continue;
        if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
            report.overflows.push({
                selector: sel,
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth
            });
        }
    }

    const visibleRequired = [
        'nav.sidebar', '.content', '.budget-table-container', '.budget-inspector',
        '.ynab-grid-header', '.reflect-container', '.modal-overlay.active > .modal'
    ];
    for (const sel of visibleRequired) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        if (st.display !== 'none' && (rect.width < 1 || rect.height < 1)) {
            report.zeroSized.push({ selector: sel, width: rect.width, height: rect.height });
        }
    }

    const hdrCells = Array.from(document.querySelectorAll('.ynab-grid-header .ynab-grid-header-cell'));
    const bodyRow = document.querySelector('.ynab-grid-body .ynab-grid-body-row');
    if (hdrCells.length > 0 && bodyRow) {
        const bodyCells = Array.from(bodyRow.querySelectorAll('.ynab-grid-cell'));
        const count = Math.min(hdrCells.length, bodyCells.length);
        for (let i = 0; i < count; i++) {
            const hr = hdrCells[i].getBoundingClientRect();
            const br = bodyCells[i].getBoundingClientRect();
            const dx = Math.abs(hr.left - br.left);
            const dw = Math.abs(hr.width - br.width);
            if (dx > 1.5 || dw > 1.5) {
                report.gridColumnDeltas.push({
                    col: hdrCells[i].getAttribute('data-column') || String(i),
                    hdrLeft: Math.round(hr.left),
                    bodyLeft: Math.round(br.left),
                    hdrWidth: Math.round(hr.width),
                    bodyWidth: Math.round(br.width)
                });
            }
        }
    }

    const bHdrCells = Array.from(document.querySelectorAll('.budget-table-header-labels > div'));
    const bBodyRow = document.querySelector('.budget-table-row.is-sub-category');
    if (bHdrCells.length > 0 && bBodyRow) {
        const bBodyCells = Array.from(bBodyRow.children);
        const count = Math.min(bHdrCells.length, bBodyCells.length);
        for (let i = 0; i < count; i++) {
            const hr = bHdrCells[i].getBoundingClientRect();
            const br = bBodyCells[i].getBoundingClientRect();
            const dx = Math.abs(hr.left - br.left);
            const dw = Math.abs(hr.width - br.width);
            if (dx > 1.5 || dw > 1.5) {
                report.budgetColumnDeltas.push({
                    index: i,
                    cls: bHdrCells[i].className,
                    hdrLeft: Math.round(hr.left),
                    bodyLeft: Math.round(br.left),
                    hdrWidth: Math.round(hr.width),
                    bodyWidth: Math.round(br.width)
                });
            }
        }
    }

    const rectOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) };
    };

    report.summary = {
        sidebar: rectOf('nav.sidebar'),
        content: rectOf('.content'),
        budgetTable: rectOf('.budget-table-container'),
        budgetInspector: rectOf('.budget-inspector'),
        gridHeader: rectOf('.ynab-grid-header'),
        gridBody: rectOf('.ynab-grid-body'),
        reflectContainer: rectOf('.reflect-container'),
        modal: rectOf('.modal-overlay.active > .modal, .dialog-overlay.active > .dialog'),
        fontFigtree: document.fonts ? document.fonts.check('14px "Figtree"') : null,
        fontBeVietnamPro: document.fonts ? document.fonts.check('14px "Be Vietnam Pro"') : null,
    };

    return report;
"#;

pub fn resolve_audit_report_path() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let candidate = cwd.join("desktop/target/ui_audit_report.json");
    if candidate.parent().map(|p| p.exists()).unwrap_or(false) {
        return candidate;
    }
    let local = cwd.join("target/ui_audit_report.json");
    if let Some(p) = local.parent() {
        let _ = std::fs::create_dir_all(p);
    }
    local
}

pub fn use_ui_audit_runner(mut store: AppStore, enabled: bool) {
    use_effect(move || {
        if !enabled {
            return;
        }
        spawn(async move {
            let accounts = store.accounts.read().clone();
            let checking_id = accounts
                .iter()
                .find(|a| a.r#type == "Checking")
                .map(|a| a.id.clone());
            let loan_id = accounts
                .iter()
                .find(|a| a.r#type == "Mortgage")
                .map(|a| a.id.clone());

            let mut screens: Vec<serde_json::Value> = Vec::new();
            let mut total_issues = 0usize;

            let steps: Vec<(&str, ActiveWorkspace, ActiveModal, bool)> = vec![
                (
                    "plan_default",
                    ActiveWorkspace::Budget,
                    ActiveModal::None,
                    false,
                ),
                (
                    "all_accounts",
                    ActiveWorkspace::Accounts(None),
                    ActiveModal::None,
                    false,
                ),
                (
                    "all_accounts_adding",
                    ActiveWorkspace::Accounts(None),
                    ActiveModal::None,
                    true,
                ),
                (
                    "checking_account",
                    ActiveWorkspace::Accounts(checking_id),
                    ActiveModal::None,
                    false,
                ),
                (
                    "loan_account",
                    ActiveWorkspace::Accounts(loan_id),
                    ActiveModal::None,
                    false,
                ),
                (
                    "reflect",
                    ActiveWorkspace::Reflect,
                    ActiveModal::None,
                    false,
                ),
                (
                    "modal_add_account",
                    ActiveWorkspace::Budget,
                    ActiveModal::AddAccount,
                    false,
                ),
                (
                    "modal_manage_payees",
                    ActiveWorkspace::Budget,
                    ActiveModal::ManagePayees,
                    false,
                ),
                (
                    "modal_plan_settings",
                    ActiveWorkspace::Budget,
                    ActiveModal::PlanSettings { is_create: false },
                    false,
                ),
            ];

            for (name, ws, modal, adding) in steps {
                store.active_modal.set(modal);
                store.is_adding_tx.set(adding);
                store.workspace.set(ws);

                if let Ok(val) = dioxus::document::eval(AUDIT_MEASURE_JS).await {
                    let overflows = val
                        .get("overflows")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    let zero_sized = val
                        .get("zeroSized")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    let grid_deltas = val
                        .get("gridColumnDeltas")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    let budget_deltas = val
                        .get("budgetColumnDeltas")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    total_issues += overflows + zero_sized + grid_deltas + budget_deltas;
                    screens.push(serde_json::json!({
                        "screen": name,
                        "metrics": val,
                    }));
                }
            }

            let out = serde_json::json!({
                "totalIssues": total_issues,
                "screens": screens,
            });
            let path = resolve_audit_report_path();
            let _ = std::fs::write(
                &path,
                serde_json::to_string_pretty(&out).unwrap_or_default(),
            );
            std::process::exit(if total_issues == 0 { 0 } else { 1 });
        });
    });
}
