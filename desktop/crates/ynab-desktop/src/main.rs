#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![deny(clippy::float_arithmetic)]

pub mod head_assets;
pub mod interaction;
pub mod state;
pub mod ui;

use dioxus::desktop::{Config, WindowBuilder};
use dioxus::prelude::*;
use rusqlite::Connection;
use std::path::PathBuf;

pub use head_assets::build_embedded_head_html;

use crate::state::{ActiveModal, ActiveWorkspace, AppStore};
use crate::ui::accounts::AccountsWorkspace;
use crate::ui::budget::BudgetWorkspace;
use crate::ui::core::SvgIconSprite;
use crate::ui::modals::ActiveModalHost;
use crate::ui::reflect::ReflectWorkspace;
use crate::ui::shell::{TopLayout, TopSidebar};
use ynab_core::{schema, seed};

/// Resolves the SQLite database path in the OS local application data directory
/// (`com.ynabx.desktop/ynab_desktop.sqlite`).
pub fn resolve_database_path() -> PathBuf {
    let base_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
        .join("com.ynabx.desktop");
    let _ = std::fs::create_dir_all(&base_dir);
    base_dir.join("ynab_desktop.sqlite")
}

/// Initializes a SQLite connection at `db_path`, applies schema migrations, seeds the default
/// budget if empty, and cleans up any legacy duplicate system categories.
pub fn init_sqlite_connection(db_path: &PathBuf) -> Result<Connection, String> {
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    schema::init_database(&conn).map_err(|e| e.to_string())?;
    seed::seed_new_budget_if_needed(&mut conn, seed::DEFAULT_BUDGET_ID, "My Personal Budget")
        .map_err(|e| e.to_string())?;
    let _ = seed::cleanup_duplicate_system_categories(&mut conn, seed::DEFAULT_BUDGET_ID);
    Ok(conn)
}

fn main() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .try_init();

    let head_html = build_embedded_head_html();
    let window = WindowBuilder::new()
        .with_title("YNAB Desktop")
        .with_inner_size(dioxus::desktop::LogicalSize::new(1366.0, 850.0))
        .with_min_inner_size(dioxus::desktop::LogicalSize::new(1024.0, 680.0))
        .with_resizable(true);

    let cfg = Config::new()
        .with_window(window)
        .with_menu(None)
        .with_custom_head(head_html)
        .with_disable_drag_drop_handler(true);

    LaunchBuilder::desktop().with_cfg(cfg).launch(App);
}

#[component]
pub fn App() -> Element {
    let mut store = use_context_provider(|| {
        let db_path = resolve_database_path();
        let conn = init_sqlite_connection(&db_path).unwrap_or_else(|_| {
            let mut mem = Connection::open_in_memory().expect("in-memory sqlite fallback");
            let _ = schema::init_database(&mem);
            let _ = seed::seed_new_budget_if_needed(
                &mut mem,
                seed::DEFAULT_BUDGET_ID,
                "My Personal Budget",
            );
            mem
        });
        AppStore::new(conn)
    });

    let active_ws = store.workspace.read().clone();

    rsx! {
        div {
            class: "ember-view",
            tabindex: 0,
            onkeydown: move |e| {
                let key = e.key();
                let mods = e.modifiers();
                let is_ctrl = mods.ctrl() || mods.meta();
                let is_shift = mods.shift();
                let is_alt = mods.alt();

                if key == Key::Escape {
                    if *store.active_modal.read() != ActiveModal::None {
                        store.active_modal.set(ActiveModal::None);
                    } else if *store.plan_menu_open.read() {
                        store.plan_menu_open.set(false);
                    } else {
                        store.is_adding_tx.set(false);
                        store.editing_tx_id.set(None);
                    }
                    return;
                }

                if is_ctrl {
                    match key {
                        Key::Character(ref c) if c.eq_ignore_ascii_case("z") => {
                            e.prevent_default();
                            if is_shift {
                                store.redo();
                            } else {
                                store.undo();
                            }
                        }
                        Key::Character(ref c) if c.eq_ignore_ascii_case("y") => {
                            e.prevent_default();
                            store.redo();
                        }
                        Key::Character(ref c) if c == "\\" => {
                            e.prevent_default();
                            let cur = *store.sidebar_collapsed.read();
                            store.sidebar_collapsed.set(!cur);
                        }
                        Key::ArrowLeft => {
                            if matches!(*store.workspace.read(), ActiveWorkspace::Budget) {
                                e.prevent_default();
                                store.prev_month();
                            }
                        }
                        Key::ArrowRight => {
                            if matches!(*store.workspace.read(), ActiveWorkspace::Budget) {
                                e.prevent_default();
                                store.next_month();
                            }
                        }
                        _ => {}
                    }
                } else if is_alt {
                    match key {
                        Key::Character(ref c) if c == "1" => {
                            e.prevent_default();
                            store.navigate_to(ActiveWorkspace::Budget);
                        }
                        Key::Character(ref c) if c == "2" => {
                            e.prevent_default();
                            store.navigate_to(ActiveWorkspace::Reflect);
                        }
                        Key::Character(ref c) if c == "3" => {
                            e.prevent_default();
                            store.navigate_to(ActiveWorkspace::Accounts(None));
                        }
                        _ => {}
                    }
                } else {
                    match key {
                        Key::Character(ref c) if c == "?" => {
                            if *store.active_modal.read() == ActiveModal::None {
                                store.active_modal.set(ActiveModal::KeyboardShortcuts);
                            }
                        }
                        Key::Character(ref c) if c == ">" || (is_shift && c == ".") => {
                            store.toggle_hide_amounts();
                        }
                        Key::Character(ref c) if is_shift && c.eq_ignore_ascii_case("n") => {
                            if matches!(*store.workspace.read(), ActiveWorkspace::Accounts(_)) {
                                e.prevent_default();
                                store.is_adding_tx.set(true);
                            }
                        }
                        _ => {}
                    }
                }
            },

            SvgIconSprite {}

            TopLayout {
                TopSidebar {}
                match active_ws {
                    ActiveWorkspace::Budget => rsx! {
                        BudgetWorkspace {}
                    },
                    ActiveWorkspace::Reflect => rsx! {
                        ReflectWorkspace {}
                    },
                    ActiveWorkspace::Accounts(acc_id) => rsx! {
                        AccountsWorkspace { selected_account_id: acc_id }
                    },
                }
            }

            ActiveModalHost {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::interaction::{
        adjust_iso_date_shortcut, filter_register_transactions, gap_to_index, matches_search_query,
        parse_search_dollar_to_milliunits, reorder_list_by_gap, ShortcutLocation,
        SHORTCUT_DEFINITIONS,
    };
    use crate::state::{
        filter_categories_by_view, filter_category_monthly_transactions, GroupedAccounts,
    };
    use crate::ui::reflect::{build_donut_arc_path, circle_point_promille, int_sin_promille};
    use ynab_core::changeset::{redo_last_changeset, undo_last_changeset};
    use ynab_core::ledger::transfers::{SaveTransactionPayload, SubTransactionDto};
    use ynab_core::repo::{
        self, AccountDto, AccountGroup, CategoryDto, CategoryGroupDto, CreateAccountPayload,
        SetAssignedPayload, SetGoalPayload, SnoozeGoalPayload, TransactionDto,
    };
    use ynab_core::seed::DEFAULT_BUDGET_ID;

    #[allow(clippy::too_many_arguments)]
    fn make_tx(
        id: &str,
        date: &str,
        payee: &str,
        cat: &str,
        memo: &str,
        amount: i64,
        cleared: &str,
        flag: Option<&str>,
    ) -> TransactionDto {
        TransactionDto {
            id: id.to_string(),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: "acc-1".to_string(),
            account_name: Some("Checking".to_string()),
            account_name_camel: Some("Checking".to_string()),
            payee_id: Some("payee-1".to_string()),
            payee_name: Some(payee.to_string()),
            category_id: Some("cat-1".to_string()),
            category_name: Some(cat.to_string()),
            date: date.to_string(),
            amount_milliunits: amount,
            memo: Some(memo.to_string()),
            cleared: cleared.to_string(),
            approved: true,
            flag: flag.map(|s| s.to_string()),
            transfer_account_id: None,
            transfer_transaction_id: None,
            import_id: None,
            imported_payee: None,
            matched_transaction_id: None,
            source: None,
            subtransactions: Vec::new(),
        }
    }

    #[test]
    fn test_ui_01_embedded_head_html_contains_figtree_and_stylesheets() {
        let head = build_embedded_head_html();
        assert!(head.contains("@font-face"));
        assert!(head.contains("data:font/woff2;base64,"));
        assert!(head.contains(".budget-header"));
        assert!(head.contains(".ynab-grid-header"));
        assert!(head.contains(".bb-chart-arc"));
    }

    #[test]
    fn test_ui_02_gap_to_index_and_reorder_list() {
        assert_eq!(gap_to_index(0, 2), 1);
        assert_eq!(gap_to_index(2, 0), 0);
        assert_eq!(gap_to_index(1, 1), 1);

        let list = vec![
            "a".to_string(),
            "b".to_string(),
            "c".to_string(),
            "d".to_string(),
        ];
        let moved_down = reorder_list_by_gap(&list, 0, 3);
        assert_eq!(moved_down, vec!["b", "c", "a", "d"]);

        let moved_up = reorder_list_by_gap(&list, 3, 1);
        assert_eq!(moved_up, vec!["a", "d", "b", "c"]);
    }

    #[test]
    fn test_ui_03_parse_search_dollar_to_milliunits() {
        assert_eq!(parse_search_dollar_to_milliunits("50"), Some(50_000));
        assert_eq!(parse_search_dollar_to_milliunits("$125.45"), Some(125_450));
        assert_eq!(parse_search_dollar_to_milliunits("  $0.99 "), Some(990));
        assert_eq!(parse_search_dollar_to_milliunits(""), None);
    }

    #[test]
    fn test_ui_04_search_query_inflow_and_outflow_matching() {
        let outflow_tx = make_tx(
            "t1",
            "2026-11-10",
            "Whole Foods",
            "Groceries",
            "Weekly food",
            -75_500,
            "Cleared",
            Some("Green"),
        );
        let inflow_tx = make_tx(
            "t2",
            "2026-11-15",
            "Acme Payroll",
            "Inflow: Ready to Assign",
            "Salary",
            2_500_000,
            "Uncleared",
            None,
        );

        assert!(matches_search_query(&outflow_tx, "Outflow: 75.50"));
        assert!(!matches_search_query(&outflow_tx, "Inflow: 75.50"));
        assert!(matches_search_query(&inflow_tx, "Inflow: 2500.00"));
        assert!(!matches_search_query(&inflow_tx, "Outflow: 2500.00"));
    }

    #[test]
    fn test_ui_05_search_query_status_and_flag_matching() {
        let tx = make_tx(
            "t1",
            "2026-11-10",
            "Netflix",
            "Subscriptions",
            "Monthly plan",
            -15_990,
            "Cleared",
            Some("Red"),
        );
        assert!(matches_search_query(&tx, "Is: Cleared"));
        assert!(!matches_search_query(&tx, "Is: Uncleared"));
        assert!(matches_search_query(&tx, "Flag: Red"));
        assert!(!matches_search_query(&tx, "Flag: Blue"));
    }

    #[test]
    fn test_ui_06_search_query_before_after_and_combined() {
        let tx = make_tx(
            "t1",
            "2026-11-12",
            "Shell Oil",
            "Gas",
            "Fuel",
            -42_000,
            "Cleared",
            Some("Orange"),
        );
        assert!(matches_search_query(
            &tx,
            "After: 2026-11-01, Before: 2026-11-15, Is: Cleared, Shell"
        ));
        assert!(!matches_search_query(&tx, "Before: 2026-11-10"));
        assert!(!matches_search_query(&tx, "After: 2026-11-20"));
    }

    #[test]
    fn test_ui_07_filter_register_transactions_reconciled_toggle() {
        let t1 = make_tx(
            "t1",
            "2026-11-01",
            "Payee A",
            "Cat A",
            "",
            -10_000,
            "Reconciled",
            None,
        );
        let t2 = make_tx(
            "t2",
            "2026-11-02",
            "Payee B",
            "Cat B",
            "",
            -20_000,
            "Cleared",
            None,
        );
        let list = vec![t1, t2];

        let with_rec = filter_register_transactions(&list, "", true);
        assert_eq!(with_rec.len(), 2);

        let without_rec = filter_register_transactions(&list, "", false);
        assert_eq!(without_rec.len(), 1);
        assert_eq!(without_rec[0].id, "t2");
    }

    #[test]
    fn test_ui_08_adjust_iso_date_shortcut_plus_minus_today() {
        assert_eq!(
            adjust_iso_date_shortcut("2026-11-18", "+", "2026-11-01"),
            Some("2026-11-19".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2026-11-18", "-", "2026-11-01"),
            Some("2026-11-17".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2026-11-18", "t", "2026-11-01"),
            Some("2026-11-01".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2026-11-18", "x", "2026-11-01"),
            None
        );
    }

    #[test]
    fn test_ui_09_svg_donut_integer_trigonometry_and_arc_paths() {
        // sin(0) = 0, sin(250 = 90deg) = 10000, sin(500 = 180deg) = 0, sin(750 = 270deg) = -10000
        assert_eq!(int_sin_promille(0), 0);
        assert_eq!(int_sin_promille(250), 10_000);
        assert_eq!(int_sin_promille(500), 0);
        assert_eq!(int_sin_promille(750), -10_000);

        let (x_top, y_top) = circle_point_promille(160, 140, 100, 0);
        assert_eq!((x_top, y_top), (160, 40));

        let (x_right, y_right) = circle_point_promille(160, 140, 100, 250);
        assert_eq!((x_right, y_right), (260, 140));

        let quarter_arc = build_donut_arc_path(160, 140, 110, 66, 0, 250);
        assert!(quarter_arc.starts_with("M 160 30 A 110 110 0 0 1"));

        let full_arc = build_donut_arc_path(160, 140, 110, 66, 0, 1000);
        assert!(full_arc.contains("A 110 110 0 1 1"));
    }

    #[test]
    fn test_ui_10_grouped_accounts_classification() {
        let mk_acc = |id: &str, r#type: &str, closed: bool| AccountDto {
            id: id.to_string(),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            name: id.to_string(),
            r#type: r#type.to_string(),
            on_budget: true,
            closed,
            balance_milliunits: 100_000,
            cleared_balance_milliunits: 100_000,
            uncleared_balance_milliunits: 0,
            note: None,
            last_reconciled_at: None,
            sort_order: 0,
        };

        let accs = vec![
            mk_acc("a1", "checking", false),
            mk_acc("a2", "creditCard", false),
            mk_acc("a3", "mortgage", false),
            mk_acc("a4", "otherAsset", false),
            mk_acc("a5", "checking", true),
        ];

        assert_eq!(accs[0].sidebar_group(), AccountGroup::Cash);
        assert_eq!(accs[1].sidebar_group(), AccountGroup::Credit);
        assert_eq!(accs[2].sidebar_group(), AccountGroup::Loan);
        assert_eq!(accs[3].sidebar_group(), AccountGroup::Tracking);
        assert_eq!(accs[4].sidebar_group(), AccountGroup::Closed);

        let grouped = GroupedAccounts::from_accounts(&accs);
        assert_eq!(grouped.cash.len(), 1);
        assert_eq!(grouped.credit.len(), 1);
        assert_eq!(grouped.loan.len(), 1);
        assert_eq!(grouped.tracking.len(), 1);
        assert_eq!(grouped.closed.len(), 1);
    }

    #[test]
    fn test_ui_11_filter_categories_by_budget_focus_views() {
        let mk_cat = |id: &str,
                      assigned: i64,
                      avail: i64,
                      underfunded: i64,
                      target: Option<i64>,
                      snoozed: bool| CategoryDto {
            id: id.to_string(),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            group_id: "g1".to_string(),
            name: id.to_string(),
            note: None,
            r#type: "DFT".to_string(),
            internal_name: None,
            is_credit_card_payment: false,
            credit_card_account_id: None,
            hidden: false,
            sort_order: 0,
            assigned_milliunits: assigned,
            activity_milliunits: 0,
            available_milliunits: avail,
            from_previous_month_milliunits: 0,
            cash_overspent_milliunits: if avail < 0 { avail.abs() } else { 0 },
            credit_overspent_milliunits: 0,
            goal_type: target.map(|_| "NEED".to_string()),
            goal_target_amount: target,
            goal_target_date: None,
            goal_cadence: Some(1),
            goal_cadence_frequency: Some(1),
            goal_day: None,
            goal_needs_whole_amount: Some(false),
            goal_under_funded: Some(underfunded),
            goal_percentage_complete: Some(0),
            is_snoozed: snoozed,
            budgeted_last_month: 0,
            spent_last_month: 0,
            paid_last_month: 0,
            average_budgeted: 0,
            average_spent: 0,
            average_paid: 0,
        };

        let grp = CategoryGroupDto {
            id: "g1".to_string(),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            name: "Group 1".to_string(),
            is_system: false,
            internal_name: None,
            hidden: false,
            sort_order: 0,
            categories: vec![
                mk_cat("overspent", 0, -25_000, 0, None, false),
                mk_cat("underfunded", 20_000, 20_000, 30_000, Some(50_000), false),
                mk_cat("overfunded", 80_000, 80_000, 0, Some(50_000), false),
                mk_cat("snoozed", 0, 0, 50_000, Some(50_000), true),
            ],
        };

        let groups = vec![grp];
        assert_eq!(
            filter_categories_by_view(&groups, "overspent", false)[0]
                .categories
                .len(),
            1
        );
        assert_eq!(
            filter_categories_by_view(&groups, "underfunded", false)[0]
                .categories
                .len(),
            1
        );
        assert_eq!(
            filter_categories_by_view(&groups, "overfunded", false)[0]
                .categories
                .len(),
            1
        );
        assert_eq!(
            filter_categories_by_view(&groups, "money-available", false)[0]
                .categories
                .len(),
            2
        );
        assert_eq!(
            filter_categories_by_view(&groups, "snoozed", false)[0]
                .categories
                .len(),
            1
        );
    }

    #[test]
    fn test_ui_12_filter_category_monthly_transactions_includes_splits() {
        let mut split_tx = make_tx(
            "tx-split",
            "2026-11-12",
            "Target",
            "Split",
            "",
            -100_000,
            "Cleared",
            None,
        );
        split_tx.category_id = None;
        split_tx.subtransactions = vec![SubTransactionDto {
            id: Some("sub-1".to_string()),
            payee_id: None,
            payee_name: None,
            category_id: Some("cat-groceries".to_string()),
            category_name: Some("Groceries".to_string()),
            amount_milliunits: -60_000,
            memo: Some("Food".to_string()),
            transfer_account_id: None,
        }];

        let list = vec![split_tx];
        let matched = filter_category_monthly_transactions(&list, "cat-groceries", "2026-11-01");
        assert_eq!(matched.len(), 1);
        assert_eq!(matched[0].id, "tx-split");

        let other_month =
            filter_category_monthly_transactions(&list, "cat-groceries", "2026-12-01");
        assert!(other_month.is_empty());
    }

    #[test]
    fn test_ui_13_shortcut_definitions_catalog_completeness() {
        assert!(SHORTCUT_DEFINITIONS.len() >= 20);
        assert!(SHORTCUT_DEFINITIONS
            .iter()
            .any(|d| d.location == ShortcutLocation::Universal && d.id == "Undo"));
        assert!(SHORTCUT_DEFINITIONS
            .iter()
            .any(|d| d.location == ShortcutLocation::Budget && d.id == "SnoozeSelectedCategories"));
        assert!(SHORTCUT_DEFINITIONS
            .iter()
            .any(|d| d.location == ShortcutLocation::Accounts && d.id == "CreateNewTransaction"));
        assert!(SHORTCUT_DEFINITIONS
            .iter()
            .any(|d| d.location == ShortcutLocation::DatePicker && d.id == "Today"));
    }

    #[test]
    fn test_ui_14_sqlite_init_and_end_to_end_workflow() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let mut conn = init_sqlite_connection(&path).expect("init sqlite");

        // 1. Verify default seeded plan summary and accounts
        let summary = repo::get_plan_summary(&conn, Some(DEFAULT_BUDGET_ID)).expect("summary");
        assert!(!summary.name.is_empty());
        assert_eq!(summary.currency_code, "USD");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Primary Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 5_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("create account");
        assert_eq!(acc.balance_milliunits, 5_000_000);

        // 2. Verify RTA updates and category assignment + Undo/Redo
        let month_before =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("month");
        let first_cat_id = month_before.category_groups[1].categories[0].id.clone();

        let month_after = repo::set_category_assigned(
            &conn,
            &SetAssignedPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: first_cat_id.clone(),
                month: "2026-11-01".to_string(),
                assigned_milliunits: 1_200_000,
            },
        )
        .expect("assign");
        assert_eq!(
            month_after.ready_to_assign_milliunits,
            month_before.ready_to_assign_milliunits - 1_200_000
        );

        undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo");
        let month_undone =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("undone");
        assert_eq!(
            month_undone.ready_to_assign_milliunits,
            month_before.ready_to_assign_milliunits
        );

        redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("redo");
        let month_redone =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("redone");
        assert_eq!(
            month_redone.ready_to_assign_milliunits,
            month_after.ready_to_assign_milliunits
        );

        // 3. Verify Goal creation and Snooze
        repo::set_category_goal(
            &conn,
            &SetGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: first_cat_id.clone(),
                goal_type: Some("NEED".to_string()),
                target_amount: 1_500_000,
                target_date: None,
                cadence: Some(1),
                cadence_frequency: Some(1),
                day_of_week: None,
                needs_whole_amount: Some(false),
            },
        )
        .expect("set goal");

        let snoozed_month = repo::snooze_category_goal(
            &conn,
            &SnoozeGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: first_cat_id.clone(),
                month: "2026-11-01".to_string(),
                snooze: true,
            },
        )
        .expect("snooze");
        let snoozed_cat = snoozed_month
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == first_cat_id)
            .expect("cat");
        assert!(snoozed_cat.is_snoozed);
    }

    #[test]
    fn test_ui_15_credit_card_spending_and_payment_transfer_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let checking = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 3_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let visa = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Visa Card".to_string(),
                account_type: "creditCard".to_string(),
                balance_milliunits: 0,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("visa");

        let month_init =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("month");
        let groceries_id = month_init.category_groups[1].categories[0].id.clone();

        // Fund Groceries with $500
        repo::set_category_assigned(
            &conn,
            &SetAssignedPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: groceries_id.clone(),
                month: "2026-11-01".to_string(),
                assigned_milliunits: 500_000,
            },
        )
        .expect("fund groceries");

        // Spend $120 on Groceries using Visa Card
        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: visa.id.clone(),
                payee_id: None,
                payee_name: Some("Supermarket".to_string()),
                category_id: Some(groceries_id.clone()),
                date: "2026-11-10".to_string(),
                amount_milliunits: -120_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("cc spend");

        let month_after_spend =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID))
                .expect("after spend");
        let cc_cat = month_after_spend
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.credit_card_account_id.as_deref() == Some(visa.id.as_str()))
            .expect("cc payment category");
        assert_eq!(cc_cat.available_milliunits, 120_000);

        let _ = checking;
    }

    #[test]
    fn test_ui_16_search_query_split_subtransaction_memo_match() {
        let mut tx = make_tx(
            "t-split",
            "2026-11-18",
            "Costco",
            "Split",
            "Main trip",
            -150_000,
            "Cleared",
            None,
        );
        tx.subtransactions = vec![SubTransactionDto {
            id: Some("s1".to_string()),
            payee_id: None,
            payee_name: None,
            category_id: Some("c1".to_string()),
            category_name: Some("Household".to_string()),
            amount_milliunits: -150_000,
            memo: Some("Paper towels bulk".to_string()),
            transfer_account_id: None,
        }];
        assert!(matches_search_query(&tx, "Is: Split, towels"));
        assert!(!matches_search_query(&tx, "Is: Split, nonexistent"));
    }

    #[test]
    fn test_ui_17_search_query_unapproved_and_uncleared() {
        let mut tx = make_tx(
            "t-unapp",
            "2026-11-18",
            "Amazon",
            "Shopping",
            "Gadget",
            -29_990,
            "Uncleared",
            None,
        );
        tx.approved = false;
        assert!(matches_search_query(&tx, "Is: Unapproved, Is: Uncleared"));
        assert!(!matches_search_query(&tx, "Is: Cleared"));
    }

    #[test]
    fn test_ui_18_search_query_case_insensitive_payee_and_category() {
        let tx = make_tx(
            "t-case",
            "2026-11-18",
            "Starbucks Coffee",
            "Dining Out",
            "Latte",
            -6_500,
            "Cleared",
            Some("Purple"),
        );
        assert!(matches_search_query(&tx, "STARBUCKS"));
        assert!(matches_search_query(&tx, "dining out"));
        assert!(matches_search_query(&tx, "latte"));
        assert!(matches_search_query(&tx, "6.50"));
    }

    #[test]
    fn test_ui_19_search_query_empty_and_whitespace_tokens() {
        let tx = make_tx(
            "t-ws",
            "2026-11-18",
            "Trader Joe's",
            "Groceries",
            "",
            -40_000,
            "Cleared",
            None,
        );
        assert!(matches_search_query(&tx, "   ,  ,   "));
        assert!(matches_search_query(&tx, "Trader, , Groceries"));
    }

    #[test]
    fn test_ui_20_adjust_iso_date_shortcut_month_and_year_rollover() {
        assert_eq!(
            adjust_iso_date_shortcut("2026-11-30", "+", "2026-11-18"),
            Some("2026-12-01".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2026-12-31", "=", "2026-11-18"),
            Some("2027-01-01".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2027-01-01", "-", "2026-11-18"),
            Some("2026-12-31".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2026-03-01", "_", "2026-11-18"),
            Some("2026-02-28".to_string())
        );
    }

    #[test]
    fn test_ui_21_adjust_iso_date_shortcut_leap_year_feb_29() {
        assert_eq!(
            adjust_iso_date_shortcut("2028-02-28", "+", "2026-11-18"),
            Some("2028-02-29".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2028-02-29", "+", "2026-11-18"),
            Some("2028-03-01".to_string())
        );
        assert_eq!(
            adjust_iso_date_shortcut("2028-03-01", "-", "2026-11-18"),
            Some("2028-02-29".to_string())
        );
    }

    #[test]
    fn test_ui_22_adjust_iso_date_shortcut_malformed_date_returns_none() {
        assert_eq!(
            adjust_iso_date_shortcut("not-a-date", "+", "2026-11-18"),
            None
        );
        assert_eq!(
            adjust_iso_date_shortcut("2026-13-45", "-", "2026-11-18"),
            None
        );
        assert_eq!(
            adjust_iso_date_shortcut("not-a-date", "T", "2026-11-18"),
            Some("2026-11-18".to_string())
        );
    }

    #[test]
    fn test_ui_23_reorder_list_by_gap_out_of_bounds_and_single_element() {
        let single = vec!["only".to_string()];
        assert_eq!(reorder_list_by_gap(&single, 0, 0), vec!["only"]);
        assert_eq!(reorder_list_by_gap(&single, 5, 0), vec!["only"]);

        let empty: Vec<String> = Vec::new();
        assert!(reorder_list_by_gap(&empty, 0, 0).is_empty());
    }

    #[test]
    fn test_ui_24_svg_donut_arc_zero_span_and_large_arc_flag() {
        assert_eq!(build_donut_arc_path(160, 140, 110, 66, 200, 200), "");
        assert_eq!(build_donut_arc_path(160, 140, 110, 66, 300, 100), "");

        // 60% arc (> 500 promille) sets large_arc = 1
        let large = build_donut_arc_path(160, 140, 110, 66, 0, 600);
        assert!(large.contains("A 110 110 0 1 1"));

        // 40% arc (<= 500 promille) sets large_arc = 0
        let small = build_donut_arc_path(160, 140, 110, 66, 0, 400);
        assert!(small.contains("A 110 110 0 0 1"));
    }

    #[test]
    fn test_ui_25_int_sin_promille_symmetry_and_bounds() {
        for p in 0..1000 {
            let s = int_sin_promille(p);
            assert!(
                (-10_000..=10_000).contains(&s),
                "sin out of range at {p}: {s}"
            );
            let opp = int_sin_promille(p + 500);
            assert_eq!(s, -opp, "anti-symmetry failed at {p}");
        }
    }

    #[test]
    fn test_ui_26_circle_point_promille_cardinal_directions() {
        let (x0, y0) = circle_point_promille(100, 100, 50, 0);
        assert_eq!((x0, y0), (100, 50)); // 12 o'clock

        let (x250, y250) = circle_point_promille(100, 100, 50, 250);
        assert_eq!((x250, y250), (150, 100)); // 3 o'clock

        let (x500, y500) = circle_point_promille(100, 100, 50, 500);
        assert_eq!((x500, y500), (100, 150)); // 6 o'clock

        let (x750, y750) = circle_point_promille(100, 100, 50, 750);
        assert_eq!((x750, y750), (50, 100)); // 9 o'clock
    }

    #[test]
    fn test_ui_27_filter_categories_by_view_hidden_toggle() {
        let hidden_cat = CategoryDto {
            id: "c-hidden".to_string(),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            group_id: "g1".to_string(),
            name: "Secret".to_string(),
            note: None,
            r#type: "DFT".to_string(),
            internal_name: None,
            is_credit_card_payment: false,
            credit_card_account_id: None,
            hidden: true,
            sort_order: 0,
            assigned_milliunits: 10_000,
            activity_milliunits: 0,
            available_milliunits: 10_000,
            from_previous_month_milliunits: 0,
            cash_overspent_milliunits: 0,
            credit_overspent_milliunits: 0,
            goal_type: None,
            goal_target_amount: None,
            goal_target_date: None,
            goal_cadence: None,
            goal_cadence_frequency: None,
            goal_day: None,
            goal_needs_whole_amount: None,
            goal_under_funded: None,
            goal_percentage_complete: None,
            is_snoozed: false,
            budgeted_last_month: 0,
            spent_last_month: 0,
            paid_last_month: 0,
            average_budgeted: 0,
            average_spent: 0,
            average_paid: 0,
        };
        let grp = CategoryGroupDto {
            id: "g1".to_string(),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            name: "Group".to_string(),
            is_system: false,
            internal_name: None,
            hidden: false,
            sort_order: 0,
            categories: vec![hidden_cat],
        };
        let groups = vec![grp];

        let without_hidden = filter_categories_by_view(&groups, "all", false);
        assert!(without_hidden[0].categories.is_empty());

        let with_hidden = filter_categories_by_view(&groups, "all", true);
        assert_eq!(with_hidden[0].categories.len(), 1);
    }

    #[test]
    fn test_ui_28_multi_budget_creation_and_isolation_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let mut conn = init_sqlite_connection(&path).expect("init sqlite");

        let new_b_id = repo::create_new_budget(&mut conn, "Vacation Plan 2026").expect("new plan");
        let all_budgets = repo::list_budgets(&conn).expect("list budgets");
        assert_eq!(all_budgets.len(), 2);
        assert!(all_budgets
            .iter()
            .any(|(id, name)| id == &new_b_id && name == "Vacation Plan 2026"));

        let new_summary = repo::get_plan_summary(&conn, Some(&new_b_id)).expect("summary");
        assert_eq!(new_summary.name, "Vacation Plan 2026");

        let new_accounts = repo::get_accounts(&conn, Some(&new_b_id)).expect("accounts");
        assert!(new_accounts.is_empty());
    }

    #[test]
    fn test_ui_29_settings_persistence_roundtrip_in_sqlite() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        repo::set_setting(&conn, DEFAULT_BUDGET_ID, "theme", "theme-dark").expect("save theme");
        repo::set_setting(&conn, DEFAULT_BUDGET_ID, "hide_amounts", "true").expect("save hide");
        repo::set_setting(
            &conn,
            DEFAULT_BUDGET_ID,
            "flag_names",
            r#"{"Red":"Urgent","Blue":"Tax"}"#,
        )
        .expect("save flags");

        assert_eq!(
            repo::get_setting(&conn, DEFAULT_BUDGET_ID, "theme").expect("get theme"),
            Some("theme-dark".to_string())
        );
        assert_eq!(
            repo::get_setting(&conn, DEFAULT_BUDGET_ID, "hide_amounts").expect("get hide"),
            Some("true".to_string())
        );
    }

    #[test]
    fn test_ui_30_all_13_account_types_sidebar_grouping() {
        let pairs = [
            ("Checking", AccountGroup::Cash),
            ("Savings", AccountGroup::Cash),
            ("Cash", AccountGroup::Cash),
            ("CreditCard", AccountGroup::Credit),
            ("LineOfCredit", AccountGroup::Credit),
            ("Mortgage", AccountGroup::Loan),
            ("AutoLoan", AccountGroup::Loan),
            ("StudentLoan", AccountGroup::Loan),
            ("PersonalLoan", AccountGroup::Loan),
            ("MedicalDebt", AccountGroup::Loan),
            ("OtherDebt", AccountGroup::Loan),
            ("OtherAsset", AccountGroup::Tracking),
            ("OtherLiability", AccountGroup::Tracking),
        ];

        for (raw, expected_grp) in pairs {
            let parsed = repo::AccountType::from_str_loose(raw);
            assert_eq!(
                parsed.sidebar_group(false),
                expected_grp,
                "failed for {raw}"
            );
            assert_eq!(
                parsed.sidebar_group(true),
                AccountGroup::Closed,
                "closed override failed for {raw}"
            );
        }
    }

    #[test]
    fn test_ui_31_scheduled_transaction_create_list_and_enter_now_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("acc");

        let sched_id = ynab_core::ledger::scheduled::save_scheduled_transaction(
            &conn,
            &ynab_core::ledger::scheduled::SaveScheduledTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id.clone(),
                payee_id: None,
                category_id: None,
                date: "2026-12-01".to_string(),
                frequency: "Monthly".to_string(),
                amount_milliunits: -50_000,
                memo: Some("Internet bill".to_string()),
                flag: Some("Blue".to_string()),
                transfer_account_id: None,
            },
        )
        .expect("save scheduled");

        let list = ynab_core::ledger::scheduled::get_scheduled_transactions(
            &conn,
            DEFAULT_BUDGET_ID,
            Some(&acc.id),
        )
        .expect("list scheduled");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, sched_id);

        let tx_id = ynab_core::ledger::scheduled::enter_scheduled_transaction_now(&conn, &sched_id)
            .expect("enter now");
        assert!(!tx_id.is_empty());

        let after_list = ynab_core::ledger::scheduled::get_scheduled_transactions(
            &conn,
            DEFAULT_BUDGET_ID,
            Some(&acc.id),
        )
        .expect("after list");
        assert!(after_list.is_empty());
    }

    #[test]
    fn test_ui_32_date_format_patterns_and_number_formats_constants() {
        assert_eq!(ynab_core::format::DATE_FORMAT_PATTERNS.len(), 7);
        assert_eq!(ynab_core::format::NUMBER_FORMATS.len(), 12);
        for pat in ynab_core::format::DATE_FORMAT_PATTERNS {
            let formatted = ynab_core::format::format_date_with_pattern("2026-11-18", pat);
            assert!(formatted.contains("2026"));
            assert!(formatted.contains("11"));
            assert!(formatted.contains("18"));
        }
    }

    #[test]
    fn test_ui_33_csv_plan_and_register_export_roundtrip() {
        let plan_rows = ynab_core::format::generate_budget_plan_csv_rows(&[
            ynab_core::format::ExportBudgetCategoryRow {
                group_name: "Immediate Obligations".to_string(),
                category_name: "Rent/Mortgage".to_string(),
                assigned_milliunits: 1_500_000,
                activity_milliunits: -1_500_000,
                available_milliunits: 0,
            },
        ]);
        let csv_str = ynab_core::format::export_to_csv_string(&plan_rows);
        assert!(csv_str.contains(
            "\"Immediate Obligations\",\"Rent/Mortgage\",\"1500.00\",\"-1500.00\",\"0.00\""
        ));
    }

    #[test]
    fn test_ui_34_parse_search_dollar_arithmetic_and_negatives() {
        assert_eq!(parse_search_dollar_to_milliunits("-45.67"), Some(-45_670));
        assert_eq!(
            parse_search_dollar_to_milliunits("1000.00"),
            Some(1_000_000)
        );
        assert_eq!(parse_search_dollar_to_milliunits("   "), None);
    }

    #[test]
    fn test_ui_35_filter_category_monthly_transactions_empty_guards() {
        let tx = make_tx(
            "t1",
            "2026-11-10",
            "Store",
            "Groceries",
            "",
            -10_000,
            "Cleared",
            None,
        );
        assert!(
            filter_category_monthly_transactions(std::slice::from_ref(&tx), "", "2026-11-01")
                .is_empty()
        );
        assert!(filter_category_monthly_transactions(&[tx], "cat-1", "2026").is_empty());
    }

    #[test]
    fn test_ui_36_quick_budget_underfunded_and_reset_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 4_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let month_init =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("month");
        let cat_id = month_init.category_groups[1].categories[0].id.clone();

        repo::set_category_goal(
            &conn,
            &SetGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_id.clone(),
                goal_type: Some("NEED".to_string()),
                target_amount: 800_000,
                target_date: None,
                cadence: Some(1),
                cadence_frequency: Some(1),
                day_of_week: None,
                needs_whole_amount: Some(false),
            },
        )
        .expect("goal");

        let after_qb = repo::apply_quick_budget(
            &conn,
            &repo::ApplyQuickBudgetPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                month: "2026-11-01".to_string(),
                quick_budget_type: "Underfunded".to_string(),
                category_ids: Some(vec![cat_id.clone()]),
            },
        )
        .expect("quick budget");

        let funded_cat = after_qb
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == cat_id)
            .expect("cat");
        assert_eq!(funded_cat.assigned_milliunits, 800_000);
    }

    #[test]
    fn test_ui_37_reconcile_account_exact_and_with_adjustment_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let rec = repo::reconcile_account(
            &conn,
            &repo::ReconcileAccountPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                account_id: acc.id.clone(),
                target_balance_milliunits: 1_250_000,
                create_adjustment: true,
            },
        )
        .expect("reconcile");
        assert_eq!(rec.adjustment_amount_milliunits, 250_000);

        let updated_accs = repo::get_accounts(&conn, Some(DEFAULT_BUDGET_ID)).expect("accs");
        let found = updated_accs.iter().find(|a| a.id == acc.id).expect("found");
        assert_eq!(found.cleared_balance_milliunits, 1_250_000);
        assert!(found.last_reconciled_at.is_some());
    }

    #[test]
    fn test_ui_38_category_create_rename_hide_delete_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let grp_id = repo::create_category_group(&conn, "Custom Group", Some(DEFAULT_BUDGET_ID))
            .expect("create group");
        let sub_id =
            repo::create_subcategory(&conn, &grp_id, "Custom Sub", Some(DEFAULT_BUDGET_ID))
                .expect("create sub");

        repo::rename_category(&conn, &sub_id, "Renamed Sub", false).expect("rename sub");
        repo::update_category_note(&conn, &sub_id, "Important note").expect("update note");
        repo::hide_category(&conn, &sub_id, false, true).expect("hide sub");

        let month =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("month");
        let found = month
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == sub_id)
            .expect("found sub");
        assert_eq!(found.name, "Renamed Sub");
        assert_eq!(found.note.as_deref(), Some("Important note"));
        assert!(found.hidden);

        repo::delete_category(&conn, &sub_id, false).expect("delete sub");
    }

    #[test]
    fn test_ui_39_plan_settings_currency_and_date_format_roundtrip_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        repo::update_plan_settings(
            &conn,
            &repo::UpdatePlanSettingsPayload {
                name: "Euro Plan".to_string(),
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                currency_format: Some(ynab_core::format::CurrencyFormatConfig {
                    iso_code: "EUR".to_string(),
                    example_format: "123.456,78".to_string(),
                    decimal_digits: 2,
                    decimal_separator: ",".to_string(),
                    symbol_first: false,
                    group_separator: ".".to_string(),
                    currency_symbol: "€".to_string(),
                    display_symbol: true,
                }),
                date_format: Some("DD/MM/YYYY".to_string()),
            },
        )
        .expect("update plan settings");

        let summary = repo::get_plan_summary(&conn, Some(DEFAULT_BUDGET_ID)).expect("summary");
        assert_eq!(summary.name, "Euro Plan");
        assert_eq!(summary.currency_code, "EUR");
        assert_eq!(summary.currency_symbol, "€");
        assert!(!summary.currency_symbol_first);
        assert_eq!(summary.date_format, "DD/MM/YYYY");
    }

    #[test]
    fn test_ui_40_account_transfer_between_checking_and_savings_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 2_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let sav = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Savings".to_string(),
                account_type: "savings".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("savings");

        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: None,
                payee_name: Some("Transfer : Savings".to_string()),
                category_id: None,
                date: "2026-11-15".to_string(),
                amount_milliunits: -500_000,
                memo: Some("Move to savings".to_string()),
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: Some(sav.id.clone()),
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("transfer");

        let accs = repo::get_accounts(&conn, Some(DEFAULT_BUDGET_ID)).expect("accs");
        let chk_after = accs.iter().find(|a| a.id == chk.id).expect("chk");
        let sav_after = accs.iter().find(|a| a.id == sav.id).expect("sav");
        assert_eq!(chk_after.balance_milliunits, 1_500_000);
        assert_eq!(sav_after.balance_milliunits, 1_500_000);
    }

    #[test]
    fn test_ui_41_bulk_transaction_flag_clear_and_delete_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let mut conn = init_sqlite_connection(&path).expect("init sqlite");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("acc");

        let tx1 = repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id.clone(),
                payee_id: None,
                payee_name: Some("Cafe".to_string()),
                category_id: None,
                date: "2026-11-15".to_string(),
                amount_milliunits: -10_000,
                memo: None,
                cleared: Some("Uncleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("tx1");

        repo::bulk_update_transactions_in_db(
            &mut conn,
            std::slice::from_ref(&tx1),
            "flag",
            &serde_json::json!({ "flag": "Green" }),
        )
        .expect("bulk flag");
        repo::bulk_update_transactions_in_db(
            &mut conn,
            std::slice::from_ref(&tx1),
            "clear",
            &serde_json::Value::Null,
        )
        .expect("bulk clear");

        let txs =
            repo::get_transactions(&conn, Some(&acc.id), Some(DEFAULT_BUDGET_ID)).expect("txs");
        let found = txs.iter().find(|t| t.id == tx1).expect("found");
        assert_eq!(found.flag.as_deref(), Some("Green"));
        assert!(found.cleared.eq_ignore_ascii_case("cleared"));

        repo::delete_transactions(
            &conn,
            &repo::DeleteTransactionsPayload {
                ids: vec![tx1.clone()],
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                allow_reconciled: false,
            },
        )
        .expect("delete");

        let txs_after =
            repo::get_transactions(&conn, Some(&acc.id), Some(DEFAULT_BUDGET_ID)).expect("txs");
        assert!(!txs_after.iter().any(|t| t.id == tx1));
    }

    #[test]
    fn test_ui_42_fresh_start_preserves_working_balance_and_clears_assignments_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let mut conn = init_sqlite_connection(&path).expect("init sqlite");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 2_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("acc");

        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id.clone(),
                payee_id: None,
                payee_name: Some("Store".to_string()),
                category_id: None,
                date: "2026-11-15".to_string(),
                amount_milliunits: -250_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("spend");

        repo::make_fresh_start(
            &mut conn,
            &repo::FreshStartPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                new_name: Some("Fresh Budget".to_string()),
                preserve_current_balance_as_starting: Some(true),
            },
        )
        .expect("fresh start");

        let accs_after = repo::get_accounts(&conn, Some(DEFAULT_BUDGET_ID)).expect("accs");
        let found = accs_after.iter().find(|a| a.id == acc.id).expect("found");
        assert_eq!(found.balance_milliunits, 1_750_000);
    }

    #[test]
    fn test_ui_43_resolve_database_path_returns_valid_sqlite_filename() {
        let p = resolve_database_path();
        assert_eq!(
            p.file_name().and_then(|s| s.to_str()),
            Some("ynab_desktop.sqlite")
        );
    }

    #[test]
    fn test_ui_44_payee_rename_and_delete_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 500_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("acc");

        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id,
                payee_id: None,
                payee_name: Some("Old Payee Name".to_string()),
                category_id: None,
                date: "2026-11-15".to_string(),
                amount_milliunits: -15_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("tx");

        let payees = repo::get_payees(&conn, Some(DEFAULT_BUDGET_ID)).expect("payees");
        let custom_payee = payees
            .iter()
            .find(|p| p.name == "Old Payee Name")
            .expect("custom payee");

        repo::update_payee(&conn, &custom_payee.id, "New Payee Name").expect("rename payee");
        let payees_after = repo::get_payees(&conn, Some(DEFAULT_BUDGET_ID)).expect("payees");
        assert!(payees_after.iter().any(|p| p.name == "New Payee Name"));

        repo::delete_payee(&conn, &custom_payee.id).expect("delete payee");
        let payees_final = repo::get_payees(&conn, Some(DEFAULT_BUDGET_ID)).expect("payees");
        assert!(!payees_final.iter().any(|p| p.id == custom_payee.id));
    }

    #[test]
    fn test_ui_45_close_account_with_nonzero_balance_creates_adjustment_and_closes() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Old Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 350_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("acc");

        repo::close_account_in_db(&conn, &acc.id).expect("close account");

        let accs = repo::get_accounts(&conn, Some(DEFAULT_BUDGET_ID)).expect("accs");
        let closed_acc = accs.iter().find(|a| a.id == acc.id).expect("found");
        assert!(closed_acc.closed);
        assert_eq!(closed_acc.balance_milliunits, 0);
        assert_eq!(closed_acc.sidebar_group(), AccountGroup::Closed);
    }

    #[test]
    fn test_ui_46_undo_redo_goal_update_and_snooze_preserves_metadata_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let mut conn = init_sqlite_connection(&path).expect("init sqlite");

        let m0 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m0");
        let cat_id = m0.category_groups[1].categories[0].id.clone();

        // 1. Set initial weekly goal
        repo::set_category_goal(
            &conn,
            &SetGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_id.clone(),
                goal_type: Some("NEED".to_string()),
                target_amount: 100_000,
                target_date: None,
                cadence: Some(2),
                cadence_frequency: Some(1),
                day_of_week: Some(5),
                needs_whole_amount: Some(true),
            },
        )
        .expect("goal 1");

        // 2. Update to TBD goal with target_date
        repo::set_category_goal(
            &conn,
            &SetGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_id.clone(),
                goal_type: Some("TBD".to_string()),
                target_amount: 500_000,
                target_date: Some("2026-12-01".to_string()),
                cadence: Some(1),
                cadence_frequency: Some(1),
                day_of_week: None,
                needs_whole_amount: Some(false),
            },
        )
        .expect("goal 2");

        // 3. Undo goal 2 -> should restore goal 1 including cadence=2, day_of_week=5, needs_whole_amount=true
        assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo goal 2"));
        let m_undone =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m_undone");
        let cat_undone = m_undone
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == cat_id)
            .expect("cat");
        assert_eq!(cat_undone.goal_type.as_deref(), Some("NEED"));
        assert_eq!(cat_undone.goal_cadence, Some(2));
        assert_eq!(cat_undone.goal_day, Some(5));
        assert_eq!(cat_undone.goal_needs_whole_amount, Some(true));

        // 4. Redo goal 2 -> should restore TBD goal with target_date="2026-12-01"
        assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("redo goal 2"));
        let m_redone =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m_redone");
        let cat_redone = m_redone
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == cat_id)
            .expect("cat");
        assert_eq!(cat_redone.goal_type.as_deref(), Some("TBD"));
        assert_eq!(cat_redone.goal_target_date.as_deref(), Some("2026-12-01"));

        // 5. Snooze goal and Undo snooze
        repo::snooze_category_goal(
            &conn,
            &SnoozeGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_id.clone(),
                month: "2026-11-01".to_string(),
                snooze: true,
            },
        )
        .expect("snooze");
        assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo snooze"));
        let m_unsnoozed =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m_un");
        let cat_un = m_unsnoozed
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == cat_id)
            .expect("cat");
        assert!(!cat_un.is_snoozed);
    }

    #[test]
    fn test_ui_47_undo_redo_transaction_save_delete_toggle_cleared_and_category_rename_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let mut conn = init_sqlite_connection(&path).expect("init sqlite");

        // 1. Create account with starting balance $1,000 -> 1 atomic changeset
        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("acc");

        // Undo create_account -> account and starting balance tx both tombstoned in 1 undo!
        assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo create acc"));
        let accs_undone = repo::get_accounts(&conn, Some(DEFAULT_BUDGET_ID)).expect("accs");
        assert!(!accs_undone.iter().any(|a| a.id == acc.id));

        assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("redo create acc"));
        let accs_redone = repo::get_accounts(&conn, Some(DEFAULT_BUDGET_ID)).expect("accs");
        assert_eq!(
            accs_redone
                .iter()
                .find(|a| a.id == acc.id)
                .unwrap()
                .balance_milliunits,
            1_000_000
        );

        // 2. Save transaction with Category/__ImmediateIncome__ symbolic internal_name
        let tx_id = repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id.clone(),
                payee_id: None,
                payee_name: Some("Employer".to_string()),
                category_id: Some("Category/__ImmediateIncome__".to_string()),
                date: "2026-11-15".to_string(),
                amount_milliunits: 500_000,
                memo: Some("Bonus".to_string()),
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("save tx");

        let m_with_income =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m");
        assert_eq!(m_with_income.ready_to_assign_milliunits, 1_500_000);

        // Undo save_transaction -> RTA drops back to $1,000
        assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo save tx"));
        let m_after_undo_tx =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m");
        assert_eq!(m_after_undo_tx.ready_to_assign_milliunits, 1_000_000);

        // Redo save_transaction -> RTA back to $1,500
        assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("redo save tx"));
        let m_after_redo_tx =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m");
        assert_eq!(m_after_redo_tx.ready_to_assign_milliunits, 1_500_000);

        // 3. Toggle cleared and Undo
        repo::toggle_transaction_cleared(
            &conn,
            &repo::ToggleClearedPayload {
                id: tx_id.clone(),
                cleared: "Uncleared".to_string(),
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                allow_reconciled: false,
            },
        )
        .expect("toggle");
        assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo toggle"));
        let txs = repo::get_transactions(&conn, Some(&acc.id), Some(DEFAULT_BUDGET_ID)).expect("t");
        assert_eq!(
            txs.iter().find(|t| t.id == tx_id).unwrap().cleared,
            "Cleared"
        );

        // 4. Delete transaction and Undo
        repo::delete_transactions(
            &conn,
            &repo::DeleteTransactionsPayload {
                ids: vec![tx_id.clone()],
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                allow_reconciled: false,
            },
        )
        .expect("del");
        assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo del"));
        let txs_restored =
            repo::get_transactions(&conn, Some(&acc.id), Some(DEFAULT_BUDGET_ID)).expect("t");
        assert!(txs_restored.iter().any(|t| t.id == tx_id));
    }

    #[test]
    fn test_ui_48_split_transaction_with_uncategorized_subtransaction_preserves_sub_amount() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let path = tmp.path().to_path_buf();
        let conn = init_sqlite_connection(&path).expect("init sqlite");

        let acc = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("acc");

        let m0 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m0");
        let groc_id = m0.category_groups[1].categories[0].id.clone();

        // Parent transaction has category_id = Some(groc_id), and 2 split legs:
        // Leg 1: -$60 on Groceries, Leg 2: -$40 uncategorized (None)
        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id,
                payee_id: None,
                payee_name: Some("Superstore".to_string()),
                category_id: Some(groc_id.clone()),
                date: "2026-11-15".to_string(),
                amount_milliunits: -100_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: vec![
                    SubTransactionDto {
                        id: None,
                        payee_id: None,
                        payee_name: None,
                        category_id: Some(groc_id.clone()),
                        category_name: None,
                        amount_milliunits: -60_000,
                        memo: Some("Food".to_string()),
                        transfer_account_id: None,
                    },
                    SubTransactionDto {
                        id: None,
                        payee_id: None,
                        payee_name: None,
                        category_id: None,
                        category_name: None,
                        amount_milliunits: -40_000,
                        memo: Some("Unassigned split leg".to_string()),
                        transfer_account_id: None,
                    },
                ],
                allow_reconciled_mutation: false,
            },
        )
        .expect("save split");

        // Groceries activity must be -$60.00 (-60_000), NOT -$100.00 (-100_000)!
        let m1 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m1");
        let groc = m1
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == groc_id)
            .expect("groc");
        assert_eq!(groc.activity_milliunits, -60_000);
    }

    #[test]
    fn test_ui_49_file_import_ofx_dedup_and_10_day_auto_match_e2e() {
        use crate::ui::accounts::{is_transaction_imported, is_transaction_matched};
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let mut conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let m0 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m0");
        let cat_id = m0.category_groups[1].categories[0].id.clone();

        // Manual uncleared transaction on 2026-11-10 for -$45.25
        let manual_id = repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: None,
                payee_name: Some("Local Grocer".to_string()),
                category_id: Some(cat_id),
                date: "2026-11-10".to_string(),
                amount_milliunits: -45_250,
                memo: Some("Manual entry".to_string()),
                cleared: Some("Uncleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("manual tx");

        let ofx_content = r#"OFXHEADER:100
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261118
<TRNAMT>-45.25
<FITID>FIT-1
<NAME>LOCAL GROCER #44
<MEMO>Card purchase
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261119
<TRNAMT>-12.50
<FITID>FIT-2
<NAME>CORNER BAKERY
<MEMO>Pastry
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>"#;

        let opts = repo::ImportOptions::default();
        let preview = repo::preview_file_import(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("statement.ofx"),
            ofx_content,
            &opts,
        )
        .expect("preview ofx");
        assert_eq!(preview.format, repo::ImportFileFormat::Ofx);
        assert_eq!(preview.total_parsed, 2);
        assert_eq!(preview.matched_count, 1);
        assert_eq!(preview.new_count, 1);
        assert_eq!(preview.duplicate_count, 0);

        let commit = repo::commit_file_import(
            &mut conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("statement.ofx"),
            ofx_content,
            &opts,
        )
        .expect("commit ofx");
        assert_eq!(commit.matched_count, 1);
        assert_eq!(commit.imported_count, 1);
        assert_eq!(commit.skipped_duplicate_count, 0);

        let txs =
            repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID)).expect("txs");
        let matched_tx = txs.iter().find(|t| t.id == manual_id).expect("matched");
        assert_eq!(matched_tx.cleared, "Cleared");
        assert_eq!(matched_tx.source.as_deref(), Some("Matched"));
        assert_eq!(
            matched_tx.imported_payee.as_deref(),
            Some("LOCAL GROCER #44")
        );
        assert!(matched_tx.matched_transaction_id.is_some());
        assert!(is_transaction_matched(matched_tx));

        let imported_new = txs
            .iter()
            .find(|t| t.id == commit.imported_transaction_ids[0])
            .expect("new imported");
        assert_eq!(imported_new.source.as_deref(), Some("Imported"));
        assert!(is_transaction_imported(imported_new));
        assert!(!imported_new.approved);

        // Re-previewing exact same file skips both as duplicates
        let dup_preview = repo::preview_file_import(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("statement.ofx"),
            ofx_content,
            &opts,
        )
        .expect("dup preview");
        assert_eq!(dup_preview.duplicate_count, 2);
        assert_eq!(dup_preview.new_count, 0);
        assert_eq!(dup_preview.matched_count, 0);
    }

    #[test]
    fn test_ui_50_file_import_qfx_and_qif_formats_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let mut conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 500_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let qfx_data = "<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN><DTPOSTED>20261115<TRNAMT>-25.00<NAME>BOOKSTORE</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>";
        let opts = repo::ImportOptions::default();
        let qfx_preview = repo::preview_file_import(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("activity.qfx"),
            qfx_data,
            &opts,
        )
        .expect("preview qfx");
        assert_eq!(qfx_preview.format, repo::ImportFileFormat::Qfx);
        assert_eq!(qfx_preview.new_count, 1);

        let qfx_res = repo::commit_file_import(
            &mut conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("activity.qfx"),
            qfx_data,
            &opts,
        )
        .expect("commit qfx");
        assert_eq!(qfx_res.imported_count, 1);

        let qif_data = "!Type:Bank\nD11/20/2026\nT-30.00\nPCoffee Bar\nMCappuccino\n^\n";
        let qif_preview = repo::preview_file_import(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("export.qif"),
            qif_data,
            &opts,
        )
        .expect("preview qif");
        assert_eq!(qif_preview.format, repo::ImportFileFormat::Qif);
        assert_eq!(qif_preview.new_count, 1);

        let qif_res = repo::commit_file_import(
            &mut conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("export.qif"),
            qif_data,
            &opts,
        )
        .expect("commit qif");
        assert_eq!(qif_res.imported_count, 1);

        let txs =
            repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID)).expect("txs");
        assert!(txs.iter().any(
            |t| t.payee_name.as_deref() == Some("Coffee Bar") && t.amount_milliunits == -30_000
        ));
    }

    #[test]
    fn test_ui_51_file_import_csv_swap_inflow_outflow_and_payee_memo_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let mut conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 0,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let csv_data = "Date,Payee,Memo,Amount\n2026-11-18,BankMemoCol,Target Store,42.75\n";
        let opts = repo::ImportOptions {
            swap_inflow_outflow: true,
            swap_memo_with_payee: true,
            import_memos: true,
            ..Default::default()
        };

        let commit = repo::commit_file_import(
            &mut conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("bank.csv"),
            csv_data,
            &opts,
        )
        .expect("commit csv");
        assert_eq!(commit.imported_count, 1);

        let txs =
            repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID)).expect("txs");
        assert_eq!(txs.len(), 1);
        assert_eq!(txs[0].payee_name.as_deref(), Some("Target Store"));
        assert_eq!(txs[0].memo.as_deref(), Some("BankMemoCol"));
        assert_eq!(txs[0].amount_milliunits, -42_750);
    }

    #[test]
    fn test_ui_52_manual_match_within_10_days_and_unmatch_restoration_e2e() {
        use crate::ui::accounts::can_manually_match_pair;
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let mut conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let manual_id = repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: None,
                payee_name: Some("Electric Co".to_string()),
                category_id: None,
                date: "2026-11-05".to_string(),
                amount_milliunits: -80_000,
                memo: None,
                cleared: Some("Uncleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("manual");

        // Import an entry 9 days later (same amount, manual matching disabled for auto_match so both rows exist)
        let csv_data = "Date,Payee,Memo,Amount\n2026-11-14,ELEC UTILITY PMT,AutoPay,-80.00\n";
        let commit = repo::commit_file_import(
            &mut conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("bank.csv"),
            csv_data,
            &repo::ImportOptions {
                auto_match: false,
                ..Default::default()
            },
        )
        .expect("import");
        let imported_id = commit.imported_transaction_ids[0].clone();

        let txs_before =
            repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID)).expect("before");
        let m_dto = txs_before.iter().find(|t| t.id == manual_id).unwrap();
        let i_dto = txs_before.iter().find(|t| t.id == imported_id).unwrap();
        assert_eq!(
            can_manually_match_pair(m_dto, i_dto),
            Some((manual_id.clone(), imported_id.clone()))
        );

        // 11 days apart cannot match
        let mut far_dto = i_dto.clone();
        far_dto.date = "2026-11-17".to_string();
        assert_eq!(can_manually_match_pair(m_dto, &far_dto), None);

        // Perform manual match
        repo::match_transactions(&mut conn, &manual_id, &imported_id).expect("match");
        let txs_matched =
            repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID)).expect("matched");
        assert_eq!(
            txs_matched
                .iter()
                .filter(|t| t.amount_milliunits == -80_000)
                .count(),
            1
        );
        let matched = txs_matched.iter().find(|t| t.id == manual_id).unwrap();
        assert_eq!(matched.cleared, "Cleared");
        assert_eq!(matched.source.as_deref(), Some("Matched"));
        assert_eq!(matched.imported_payee.as_deref(), Some("ELEC UTILITY PMT"));
        assert!(matches_search_query(matched, "Is: Matched"));

        // Unmatch restores both rows cleanly without leaking JSON into imported_payee
        let restored = repo::unmatch_transactions(&mut conn, std::slice::from_ref(&manual_id))
            .expect("unmatch");
        assert_eq!(restored, vec![imported_id.clone()]);

        let txs_after =
            repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID)).expect("after");
        let m_after = txs_after.iter().find(|t| t.id == manual_id).unwrap();
        let i_after = txs_after.iter().find(|t| t.id == imported_id).unwrap();
        assert_eq!(m_after.cleared, "Uncleared");
        assert!(m_after.matched_transaction_id.is_none());
        assert!(m_after.imported_payee.is_none());
        assert_eq!(i_after.imported_payee.as_deref(), Some("ELEC UTILITY PMT"));
        assert!(matches_search_query(i_after, "Is: Imported"));
    }

    #[test]
    fn test_ui_53_loan_account_type_routing_and_terms_persistence_e2e() {
        use crate::ui::loan::is_loan_account_type;
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        for (idx, ltype) in [
            "mortgage",
            "autoLoan",
            "studentLoan",
            "personalLoan",
            "medicalDebt",
            "otherDebt",
        ]
        .iter()
        .enumerate()
        {
            assert!(is_loan_account_type(ltype));
            let acc = repo::create_account(
                &conn,
                &CreateAccountPayload {
                    name: format!("Loan {idx}"),
                    account_type: (*ltype).to_string(),
                    balance_milliunits: -250_000_000,
                    on_budget: Some(false),
                    note: None,
                },
                Some(DEFAULT_BUDGET_ID),
            )
            .expect("create loan");
            assert_eq!(acc.sidebar_group(), AccountGroup::Loan);

            if idx == 0 {
                repo::save_loan_terms(
                    &conn,
                    &repo::LoanAccountTerms {
                        account_id: acc.id.clone(),
                        start_date: Some("2026-11-01".to_string()),
                        original_balance_milliunits: Some(300_000_000),
                        current_balance_milliunits: 250_000_000,
                        apr_milli_percent: 6_500,
                        minimum_payment_milliunits: 1_850_000,
                        escrow_milliunits: 270_000,
                        asset_value_milliunits: Some(350_000_000),
                    },
                )
                .expect("save terms");

                let loaded = repo::get_loan_terms(&conn, &acc.id).expect("load terms");
                assert_eq!(loaded.original_balance_milliunits, Some(300_000_000));
                assert_eq!(loaded.current_balance_milliunits, 250_000_000);
                assert_eq!(loaded.apr_milli_percent, 6_500);
                assert_eq!(loaded.minimum_payment_milliunits, 1_850_000);
                assert_eq!(loaded.escrow_milliunits, 270_000);
                assert_eq!(loaded.asset_value_milliunits, Some(350_000_000));
            }
        }
    }

    #[test]
    fn test_ui_54_loan_amortization_simulator_and_ui_vm_parity_e2e() {
        use crate::ui::loan::{simulate_loan_payoff_vm, LoanTermsVm};
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let loan = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Auto Loan".to_string(),
                account_type: "autoLoan".to_string(),
                balance_milliunits: -25_000_000,
                on_budget: Some(false),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("loan");

        repo::save_loan_terms(
            &conn,
            &repo::LoanAccountTerms {
                account_id: loan.id.clone(),
                start_date: Some("2026-11-01".to_string()),
                original_balance_milliunits: Some(30_000_000),
                current_balance_milliunits: 25_000_000,
                apr_milli_percent: 6_000,
                minimum_payment_milliunits: 600_000,
                escrow_milliunits: 50_000,
                asset_value_milliunits: None,
            },
        )
        .expect("save terms");

        let core_sim =
            repo::simulate_loan_payoff(&conn, &loan.id, 200_000, 2_000_000, Some("2026-11-01"))
                .expect("simulate core");
        assert!(core_sim.interest_saved_milliunits > 0);
        assert!(core_sim.months_saved > 0);
        assert_eq!(core_sim.accelerated.final_balance_milliunits, 0);

        let ui_terms = LoanTermsVm {
            account_id: loan.id,
            original_balance_milliunits: 30_000_000,
            apr_millipercent: 6_000,
            minimum_payment_milliunits: 600_000,
            monthly_escrow_milliunits: 50_000,
            start_date: Some("2026-11-01".to_string()),
        };
        let ui_sim =
            simulate_loan_payoff_vm(25_000_000, &ui_terms, 200_000, 2_000_000, "2026-11-01");
        assert!(ui_sim.interest_saved_milliunits > 0);
        assert!(ui_sim.months_saved > 0);
        assert_eq!(
            ui_sim.baseline.next_principal_milliunits
                + ui_sim.baseline.next_interest_milliunits
                + ui_sim.baseline.next_escrow_milliunits,
            600_000
        );
    }

    #[test]
    fn test_ui_55_loan_negative_amortization_and_paid_off_states() {
        use crate::ui::loan::{simulate_loan_payoff_vm, LoanTermsVm};
        let terms_neg = LoanTermsVm {
            account_id: "l1".to_string(),
            original_balance_milliunits: 100_000_000,
            apr_millipercent: 12_000,
            minimum_payment_milliunits: 500_000, // interest is $1,000/mo -> negative amort!
            monthly_escrow_milliunits: 0,
            start_date: Some("2026-11-01".to_string()),
        };
        let sim_neg = simulate_loan_payoff_vm(100_000_000, &terms_neg, 0, 0, "2026-11-01");
        assert!(sim_neg.baseline.is_negative_amortization);

        let sim_paid = simulate_loan_payoff_vm(0, &terms_neg, 0, 0, "2026-11-01");
        assert!(sim_paid.baseline.is_paid_off);
        assert_eq!(sim_paid.baseline.payoff_date_label, "Paid Off");
    }

    #[test]
    fn test_ui_56_recent_moves_auto_recorded_on_assign_and_move_money_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 3_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let m0 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m0");
        let cat_a = m0.category_groups[1].categories[0].id.clone();
        let cat_b = m0.category_groups[1].categories[1].id.clone();

        // 1. Assign +$600 to cat_a
        repo::set_category_assigned(
            &conn,
            &SetAssignedPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_a.clone(),
                month: "2026-11-01".to_string(),
                assigned_milliunits: 600_000,
            },
        )
        .expect("assign 600");

        // 2. Reduce to +$450 (delta = -$150 back to RTA)
        repo::set_category_assigned(
            &conn,
            &SetAssignedPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_a.clone(),
                month: "2026-11-01".to_string(),
                assigned_milliunits: 450_000,
            },
        )
        .expect("assign 450");

        // 3. Re-saving exact same +$450 (delta == 0) must NOT record an extra move
        repo::set_category_assigned(
            &conn,
            &SetAssignedPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_a.clone(),
                month: "2026-11-01".to_string(),
                assigned_milliunits: 450_000,
            },
        )
        .expect("assign same 450");

        // 4. Move $100 from cat_a -> cat_b
        repo::move_money_between_categories(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            "2026-11-01",
            Some(&cat_a),
            Some(&cat_b),
            100_000,
        )
        .expect("move money");

        let all = repo::list_recent_moves(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            repo::RecentMoveFilter::All,
            None,
        )
        .expect("all moves");
        assert_eq!(all.len(), 3);

        let assigned = repo::list_recent_moves(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            repo::RecentMoveFilter::Assigned,
            None,
        )
        .expect("assigned moves");
        assert_eq!(assigned.len(), 2);
        assert!(assigned.iter().all(|m| m.is_assignment));

        let moved = repo::list_recent_moves(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            repo::RecentMoveFilter::Moved,
            None,
        )
        .expect("moved");
        assert_eq!(moved.len(), 1);
        assert!(!moved[0].is_assignment);
        assert_eq!(moved[0].amount_milliunits, 100_000);

        let cat_b_only = repo::list_recent_moves(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            repo::RecentMoveFilter::All,
            Some(&cat_b),
        )
        .expect("cat_b moves");
        assert_eq!(cat_b_only.len(), 1);
        assert_eq!(
            cat_b_only[0].to_subcategory_id.as_deref(),
            Some(cat_b.as_str())
        );
    }

    #[test]
    fn test_ui_57_recent_moves_34_day_window_and_quick_budget_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let m0 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m0");
        let cat_a = m0.category_groups[1].categories[0].id.clone();

        // Insert one stale movement (40 days before 2026-11-18) and one within 34 days
        ynab_core::ledger::money_movements::record_money_movement(
            &conn,
            &repo::RecordMoneyMovementPayload {
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                month: "2026-10-01".to_string(),
                from_subcategory_id: None,
                to_subcategory_id: Some(cat_a.clone()),
                amount_milliunits: 50_000,
                source: Some(repo::MoneyMovementSource::ManualAssign),
                group_id: None,
                note: None,
                performed_by_user_id: None,
                move_started_at: Some("2026-10-05T10:00:00Z".to_string()),
            },
        )
        .expect("old move");

        ynab_core::ledger::money_movements::record_money_movement(
            &conn,
            &repo::RecordMoneyMovementPayload {
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                month: "2026-11-01".to_string(),
                from_subcategory_id: None,
                to_subcategory_id: Some(cat_a.clone()),
                amount_milliunits: 75_000,
                source: Some(repo::MoneyMovementSource::ManualAssign),
                group_id: None,
                note: None,
                performed_by_user_id: None,
                move_started_at: Some("2026-11-10T10:00:00Z".to_string()),
            },
        )
        .expect("recent move");

        let windowed = repo::list_recent_moves_as_of(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            repo::RecentMoveFilter::All,
            None,
            Some("2026-11-18"),
        )
        .expect("as_of");
        assert_eq!(windowed.len(), 1);
        assert_eq!(windowed[0].amount_milliunits, 75_000);

        // Quick budget also records MoneyMovement
        repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");
        repo::set_category_goal(
            &conn,
            &SetGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_a.clone(),
                goal_type: Some("NEED".to_string()),
                target_amount: 300_000,
                target_date: None,
                cadence: Some(1),
                cadence_frequency: Some(1),
                day_of_week: None,
                needs_whole_amount: Some(false),
            },
        )
        .expect("goal");
        repo::apply_quick_budget(
            &conn,
            &repo::ApplyQuickBudgetPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                month: "2026-11-01".to_string(),
                quick_budget_type: "Underfunded".to_string(),
                category_ids: Some(vec![cat_a]),
            },
        )
        .expect("qb");

        let all_now = repo::list_recent_moves(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            repo::RecentMoveFilter::All,
            None,
        )
        .expect("all now");
        assert!(all_now
            .iter()
            .any(|m| m.source == "auto_assign_underfunded" && m.amount_milliunits == 300_000));
    }

    #[test]
    fn test_ui_58_combine_payees_merges_transactions_scheduled_and_rename_rules_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let mut conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: None,
                payee_name: Some("AMZN Mktp US*111".to_string()),
                category_id: None,
                date: "2026-11-10".to_string(),
                amount_milliunits: -25_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("tx1");

        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: None,
                payee_name: Some("Amazon.com*222".to_string()),
                category_id: None,
                date: "2026-11-12".to_string(),
                amount_milliunits: -40_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("tx2");

        let payees = repo::get_payees(&conn, Some(DEFAULT_BUDGET_ID)).expect("payees");
        let p1 = payees
            .iter()
            .find(|p| p.name == "AMZN Mktp US*111")
            .unwrap()
            .id
            .clone();
        let p2 = payees
            .iter()
            .find(|p| p.name == "Amazon.com*222")
            .unwrap()
            .id
            .clone();

        ynab_core::ledger::scheduled::save_scheduled_transaction(
            &conn,
            &ynab_core::ledger::scheduled::SaveScheduledTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: Some(p1.clone()),
                category_id: None,
                date: "2026-12-01".to_string(),
                frequency: "Monthly".to_string(),
                amount_milliunits: -15_000,
                memo: None,
                flag: None,
                transfer_account_id: None,
            },
        )
        .expect("sched");

        let res = repo::combine_payees(
            &mut conn,
            Some(DEFAULT_BUDGET_ID),
            &[p1.clone(), p2.clone()],
            "Amazon",
        )
        .expect("combine");
        assert_eq!(res.target_payee_name, "Amazon");
        assert_eq!(res.updated_transactions_count, 2);
        assert_eq!(res.updated_scheduled_transactions_count, 1);

        let txs =
            repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID)).expect("txs");
        assert!(txs
            .iter()
            .filter(|t| t.amount_milliunits < 0)
            .all(|t| t.payee_name.as_deref() == Some("Amazon")));

        // Future import of old raw payee auto-resolves to "Amazon" via generated rename rule
        let csv_future = "Date,Payee,Amount\n2026-11-25,AMZN Mktp US*111,-19.99\n";
        let preview = repo::preview_file_import(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("next.csv"),
            csv_future,
            &repo::ImportOptions::default(),
        )
        .expect("preview future");
        assert_eq!(preview.rows[0].resolved_payee_name, "Amazon");
    }

    #[test]
    fn test_ui_59_payee_auto_rename_rules_crud_and_import_enrichment_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        repo::save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: None,
                payee_name: Some("Whole Foods".to_string()),
                category_id: None,
                date: "2026-11-10".to_string(),
                amount_milliunits: -50_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .expect("wf tx");

        let wf_id = repo::get_payees(&conn, Some(DEFAULT_BUDGET_ID))
            .expect("payees")
            .into_iter()
            .find(|p| p.name == "Whole Foods")
            .unwrap()
            .id;

        let r1 = repo::add_payee_rename_condition(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            &wf_id,
            repo::RenameOperator::Contains,
            "WHOLEFDS",
        )
        .expect("add rule");
        let rules =
            repo::list_payee_rename_conditions(&conn, Some(DEFAULT_BUDGET_ID), Some(&wf_id))
                .expect("list rules");
        assert_eq!(rules.len(), 1);

        let csv = "Date,Payee,Amount\n2026-11-18,WHOLEFDS MKT #102,-64.20\n";
        let preview = repo::preview_file_import(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            &chk.id,
            Some("wf.csv"),
            csv,
            &repo::ImportOptions::default(),
        )
        .expect("preview");
        assert_eq!(preview.rows[0].resolved_payee_name, "Whole Foods");
        assert_eq!(preview.rows[0].imported_payee, "WHOLEFDS MKT #102");

        repo::delete_payee_rename_condition(&conn, &r1).expect("del rule");
        let rules_after =
            repo::list_payee_rename_conditions(&conn, Some(DEFAULT_BUDGET_ID), Some(&wf_id))
                .expect("after del");
        assert!(rules_after.is_empty());
    }

    #[test]
    fn test_ui_60_scheduled_transaction_skip_occurrence_advances_frequencies_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 1_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");

        let mk_sched = |date: &str, freq: &str| {
            ynab_core::ledger::scheduled::save_scheduled_transaction(
                &conn,
                &ynab_core::ledger::scheduled::SaveScheduledTransactionPayload {
                    id: None,
                    budget_id: DEFAULT_BUDGET_ID.to_string(),
                    account_id: chk.id.clone(),
                    payee_id: None,
                    category_id: None,
                    date: date.to_string(),
                    frequency: freq.to_string(),
                    amount_milliunits: -25_000,
                    memo: None,
                    flag: None,
                    transfer_account_id: None,
                },
            )
            .expect("sched")
        };

        let s_mon = mk_sched("2026-11-15", "Monthly");
        let s_wk = mk_sched("2026-11-15", "Weekly");
        let s_bi = mk_sched("2026-11-15", "EveryOtherWeek");
        let s_2m = mk_sched("2026-11-01", "TwiceAMonth");
        let s_yr = mk_sched("2026-11-15", "Yearly");
        let s_once = mk_sched("2026-11-15", "Never");

        let tx_count_before = repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID))
            .expect("txs before")
            .len();

        assert_eq!(
            repo::skip_scheduled_occurrence(&conn, &s_mon)
                .unwrap()
                .as_deref(),
            Some("2026-12-15")
        );
        assert_eq!(
            repo::skip_scheduled_occurrence(&conn, &s_wk)
                .unwrap()
                .as_deref(),
            Some("2026-11-22")
        );
        assert_eq!(
            repo::skip_scheduled_occurrence(&conn, &s_bi)
                .unwrap()
                .as_deref(),
            Some("2026-11-29")
        );
        assert_eq!(
            repo::skip_scheduled_occurrence(&conn, &s_2m)
                .unwrap()
                .as_deref(),
            Some("2026-11-15")
        );
        assert_eq!(
            repo::skip_scheduled_occurrence(&conn, &s_yr)
                .unwrap()
                .as_deref(),
            Some("2027-11-15")
        );
        assert_eq!(
            repo::skip_scheduled_occurrence(&conn, &s_once).unwrap(),
            None
        );

        // Skipping must NOT create any real transactions
        let tx_count_after = repo::get_transactions(&conn, Some(&chk.id), Some(DEFAULT_BUDGET_ID))
            .expect("txs after")
            .len();
        assert_eq!(tx_count_before, tx_count_after);
    }

    #[test]
    fn test_ui_61_fabricated_scheduled_transfers_and_skip_counterpart_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let chk = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 2_000_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("checking");
        let sav = repo::create_account(
            &conn,
            &CreateAccountPayload {
                name: "Savings".to_string(),
                account_type: "savings".to_string(),
                balance_milliunits: 500_000,
                on_budget: Some(true),
                note: None,
            },
            Some(DEFAULT_BUDGET_ID),
        )
        .expect("savings");

        let sched_id = ynab_core::ledger::scheduled::save_scheduled_transaction(
            &conn,
            &ynab_core::ledger::scheduled::SaveScheduledTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: chk.id.clone(),
                payee_id: Some(format!("payee/transfer/{}", sav.id)),
                category_id: None,
                date: "2026-12-01".to_string(),
                frequency: "Monthly".to_string(),
                amount_milliunits: -350_000,
                memo: Some("Auto save".to_string()),
                flag: None,
                transfer_account_id: Some(sav.id.clone()),
            },
        )
        .expect("save sched xfer");

        let sav_sched = repo::list_scheduled_transactions_for_account(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            Some(&sav.id),
        )
        .expect("sav sched");
        assert_eq!(sav_sched.len(), 1);
        assert!(sav_sched[0].is_fabricated);
        assert_eq!(sav_sched[0].scheduled.amount_milliunits, 350_000);
        assert_eq!(
            sav_sched[0].scheduled.payee_name.as_deref(),
            Some("Transfer : Checking")
        );
        assert_eq!(
            sav_sched[0].source_scheduled_transaction_id.as_deref(),
            Some(sched_id.as_str())
        );

        // Skipping via fabricated ID advances the underlying scheduled transfer for both accounts
        let next = repo::skip_scheduled_occurrence(&conn, &sav_sched[0].scheduled.id)
            .expect("skip fabricated")
            .expect("next date");
        assert_eq!(next, "2027-01-01");

        let chk_after = repo::list_scheduled_transactions_for_account(
            &conn,
            Some(DEFAULT_BUDGET_ID),
            Some(&chk.id),
        )
        .expect("chk after");
        assert_eq!(chk_after[0].scheduled.date, "2027-01-01");
    }

    #[test]
    fn test_ui_62_category_notes_and_month_notes_persistence_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");

        let m0 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m0");
        let cat_id = m0.category_groups[1].categories[0].id.clone();

        repo::update_category_note(&conn, &cat_id, "Annual insurance due in Dec")
            .expect("save cat note");
        repo::set_setting(
            &conn,
            DEFAULT_BUDGET_ID,
            "month_note_2026-11-01",
            "Holiday travel budget",
        )
        .expect("save month note");

        let m1 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m1");
        let cat = m1
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == cat_id)
            .unwrap();
        assert_eq!(cat.note.as_deref(), Some("Annual insurance due in Dec"));
        assert_eq!(
            repo::get_setting(&conn, DEFAULT_BUDGET_ID, "month_note_2026-11-01").unwrap(),
            Some("Holiday travel budget".to_string())
        );
    }

    #[test]
    fn test_ui_63_search_query_is_matched_and_is_imported_filters() {
        let mut matched_tx = make_tx(
            "t-match",
            "2026-11-18",
            "Target",
            "Groceries",
            "",
            -55_000,
            "Cleared",
            None,
        );
        matched_tx.source = Some("Matched".to_string());
        matched_tx.matched_transaction_id = Some("imp-1".to_string());
        matched_tx.imported_payee = Some("TARGET T-123".to_string());

        let mut imported_tx = make_tx(
            "t-imp",
            "2026-11-18",
            "Bakery",
            "Dining",
            "",
            -12_000,
            "Cleared",
            None,
        );
        imported_tx.source = Some("Imported".to_string());
        imported_tx.import_id = Some("YNAB:-12000:2026-11-18:1".to_string());

        let manual_tx = make_tx(
            "t-man",
            "2026-11-18",
            "Hardware",
            "Home",
            "",
            -20_000,
            "Uncleared",
            None,
        );

        assert!(matches_search_query(&matched_tx, "Is: Matched"));
        assert!(!matches_search_query(&manual_tx, "Is: Matched"));
        assert!(matches_search_query(&imported_tx, "Is: Imported"));
        assert!(!matches_search_query(&manual_tx, "Is: Imported"));
    }

    #[test]
    fn test_ui_64_commands_compat_wrappers_smoke_e2e() {
        use std::sync::{Arc, Mutex};
        use ynab_core::commands_compat as cmd;
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");
        let state: cmd::StateRef = Arc::new(cmd::AppState {
            db: Mutex::new(conn),
        });

        let loan = cmd::create_account(
            CreateAccountPayload {
                name: "Mortgage".to_string(),
                account_type: "mortgage".to_string(),
                balance_milliunits: -200_000_000,
                on_budget: Some(false),
                note: None,
            },
            state.clone(),
            Some(DEFAULT_BUDGET_ID.to_string()),
        )
        .expect("create loan");

        cmd::save_loan_terms(
            repo::LoanAccountTerms {
                account_id: loan.id.clone(),
                start_date: Some("2026-11-01".to_string()),
                original_balance_milliunits: Some(250_000_000),
                current_balance_milliunits: 200_000_000,
                apr_milli_percent: 5_500,
                minimum_payment_milliunits: 1_500_000,
                escrow_milliunits: 200_000,
                asset_value_milliunits: None,
            },
            state.clone(),
        )
        .expect("save terms");
        let terms = cmd::get_loan_terms(loan.id.clone(), state.clone()).expect("get terms");
        assert_eq!(terms.apr_milli_percent, 5_500);
        let sim = cmd::simulate_loan_payoff(
            loan.id,
            250_000,
            0,
            Some("2026-11-01".to_string()),
            state.clone(),
        )
        .expect("sim");
        assert!(sim.interest_saved_milliunits > 0);

        let month = cmd::get_budget_month(
            "2026-11-01".to_string(),
            state.clone(),
            Some(DEFAULT_BUDGET_ID.to_string()),
        )
        .expect("month");
        let cat_a = month.category_groups[1].categories[0].id.clone();
        let cat_b = month.category_groups[1].categories[1].id.clone();

        cmd::update_category_note(cat_a.clone(), "Cmd note".to_string(), state.clone())
            .expect("note");
        cmd::move_money_between_categories(
            Some(DEFAULT_BUDGET_ID.to_string()),
            "2026-11-01".to_string(),
            Some(cat_a),
            Some(cat_b),
            50_000,
            state.clone(),
        )
        .expect("move");
        let moves = cmd::list_recent_moves(
            Some(DEFAULT_BUDGET_ID.to_string()),
            repo::RecentMoveFilter::Moved,
            None,
            state,
        )
        .expect("moves");
        assert_eq!(moves.len(), 1);
        assert_eq!(moves[0].amount_milliunits, 50_000);
    }

    #[test]
    fn test_ui_65_reconciled_guard_in_can_manually_match_pair_e2e() {
        use crate::ui::accounts::can_manually_match_pair;
        let manual = make_tx(
            "t-man",
            "2026-11-18",
            "Coffee",
            "Dining",
            "",
            -12_000,
            "Reconciled",
            None,
        );
        let mut imported = make_tx(
            "t-imp",
            "2026-11-18",
            "Coffee",
            "Dining",
            "",
            -12_000,
            "Cleared",
            None,
        );
        imported.source = Some("Imported".to_string());
        imported.import_id = Some("YNAB:-12000:2026-11-18:1".to_string());

        assert_eq!(can_manually_match_pair(&manual, &imported), None);

        let mut manual_uncleared = manual.clone();
        manual_uncleared.cleared = "Uncleared".to_string();
        assert_eq!(
            can_manually_match_pair(&manual_uncleared, &imported),
            Some(("t-man".to_string(), "t-imp".to_string()))
        );

        let mut imported_reconciled = imported.clone();
        imported_reconciled.cleared = "Reconciled".to_string();
        assert_eq!(
            can_manually_match_pair(&manual_uncleared, &imported_reconciled),
            None
        );
    }

    #[test]
    fn test_ui_66_snooze_goal_undo_redo_state_and_restore_e2e() {
        let tmp = tempfile::NamedTempFile::new().expect("temp db");
        let mut conn = init_sqlite_connection(&tmp.path().to_path_buf()).expect("init sqlite");
        let m0 = repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m0");
        let cat_id = m0.category_groups[1].categories[0].id.clone();

        repo::set_category_goal(
            &conn,
            &SetGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_id.clone(),
                goal_type: Some("TB".to_string()),
                target_amount: 100_000,
                target_date: Some("2026-12-01".to_string()),
                cadence: Some(1),
                cadence_frequency: Some(1),
                day_of_week: None,
                needs_whole_amount: Some(false),
            },
        )
        .expect("set goal");

        let m_snoozed = repo::snooze_category_goal(
            &conn,
            &SnoozeGoalPayload {
                budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
                category_id: cat_id.clone(),
                month: "2026-11-01".to_string(),
                snooze: true,
            },
        )
        .expect("snooze");
        let cat_snoozed = m_snoozed
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == cat_id)
            .expect("cat");
        assert!(cat_snoozed.is_snoozed);

        let ur = ynab_core::changeset::get_undo_redo_state(&conn, DEFAULT_BUDGET_ID).expect("ur");
        assert!(ur.can_undo);
        assert_eq!(ur.undo_label.as_deref(), Some("Snooze Goal"));

        assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).expect("undo snooze"));
        let m_undone =
            repo::get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).expect("m_undone");
        let cat_undone = m_undone
            .category_groups
            .iter()
            .flat_map(|g| &g.categories)
            .find(|c| c.id == cat_id)
            .expect("cat");
        assert!(!cat_undone.is_snoozed);
    }

    #[test]
    fn test_ui_67_head_css_cascade_places_figtree_and_zero_padding_after_normalize() {
        let head = build_embedded_head_html();

        // 1. normalize.css (`font-family:sans-serif`) must precede our authoritative overrides
        let normalize_pos = head
            .find("font-family:sans-serif")
            .expect("normalize.css font-family:sans-serif present");
        let last_sans_pos = head
            .rfind("font-family:sans-serif")
            .expect("last font-family:sans-serif present");
        let figtree_override_pos = head
            .rfind(r#"font-family: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;"#)
            .expect("authoritative Figtree !important override");
        let zero_padding_pos = head
            .rfind("padding: 0 !important;")
            .expect("authoritative padding: 0 !important override");

        assert!(normalize_pos < figtree_override_pos);
        assert!(last_sans_pos < figtree_override_pos);
        assert!(normalize_pos < zero_padding_pos);
        assert!(last_sans_pos < zero_padding_pos);

        // 2. ember_glimmer_components.css rules must be included
        assert!(head.contains(".dialog-overlay"));
        assert!(head.contains(".ynab-new-settings-menu"));

        // 3. :root --cdn_url_* base64 SVGs must be embedded offline
        assert!(head.contains(":root {"));
        assert!(
            head.contains(r#"--cdn_url_ynab-primary-logo_svg: url("data:image/svg+xml;base64,"#)
        );
        assert!(head.contains(r#"--cdn_url_dashboard_books_svg: url("data:image/svg+xml;base64,"#));
        assert!(
            head.contains(r#"--cdn_url_reconcile_checkmark_svg: url("data:image/svg+xml;base64,"#)
        );
    }

    fn extract_quoted_literals(expr: &str) -> Vec<String> {
        let mut out = Vec::new();
        let bytes = expr.as_bytes();
        let mut i = 0usize;
        while i < bytes.len() {
            if bytes[i] == b'"' {
                i += 1;
                let start = i;
                while i < bytes.len() && bytes[i] != b'"' {
                    if bytes[i] == b'\\' && i + 1 < bytes.len() {
                        i += 2;
                    } else {
                        i += 1;
                    }
                }
                if i <= bytes.len() {
                    let s = &expr[start..i];
                    if !s.is_empty() && !(s.starts_with('{') && s.ends_with('}')) {
                        out.push(s.to_string());
                    }
                }
            }
            i += 1;
        }
        out
    }

    fn find_word_colon_value<'a>(body: &'a str, field_name: &str) -> Option<&'a str> {
        let bytes = body.as_bytes();
        let mut depth_brace = 0usize;
        let mut depth_paren = 0usize;
        let mut in_str = false;
        let mut i = 0usize;
        while i < bytes.len() {
            let b = bytes[i];
            if in_str {
                if b == b'\\' && i + 1 < bytes.len() {
                    i += 2;
                    continue;
                }
                if b == b'"' {
                    in_str = false;
                }
                i += 1;
                continue;
            }
            match b {
                b'"' => in_str = true,
                b'{' => depth_brace += 1,
                b'}' => depth_brace = depth_brace.saturating_sub(1),
                b'(' => depth_paren += 1,
                b')' => depth_paren = depth_paren.saturating_sub(1),
                _ if depth_brace == 0 && depth_paren == 0 && body[i..].starts_with(field_name) => {
                    let prev_ok = i == 0 || {
                        let prev = bytes[i - 1];
                        !prev.is_ascii_alphanumeric() && prev != b'_'
                    };
                    if prev_ok {
                        let after = &body[i + field_name.len()..];
                        let trimmed = after.trim_start();
                        if let Some(rest) = trimmed.strip_prefix(':') {
                            // Read until top-level comma or end of block
                            let rbytes = rest.as_bytes();
                            let mut rb = 0usize;
                            let mut rp = 0usize;
                            let mut rstr = false;
                            let mut end = rbytes.len();
                            let mut j = 0usize;
                            while j < rbytes.len() {
                                let c = rbytes[j];
                                if rstr {
                                    if c == b'\\' && j + 1 < rbytes.len() {
                                        j += 2;
                                        continue;
                                    }
                                    if c == b'"' {
                                        rstr = false;
                                    }
                                } else {
                                    match c {
                                        b'"' => rstr = true,
                                        b'{' => rb += 1,
                                        b'}' => rb = rb.saturating_sub(1),
                                        b'(' => rp += 1,
                                        b')' => rp = rp.saturating_sub(1),
                                        b',' if rb == 0 && rp == 0 => {
                                            end = j;
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                                j += 1;
                            }
                            return Some(rest[..end].trim());
                        }
                    }
                }
                _ => {}
            }
            i += 1;
        }
        None
    }

    #[test]
    fn test_ui_68_all_ui_icon_names_exist_in_embedded_sprite() {
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let sprite_svg = std::fs::read_to_string(manifest_dir.join("assets/icon_sprite.svg"))
            .expect("read icon_sprite.svg");
        let ui_dir = manifest_dir.join("src/ui");

        let mut checked_literals: Vec<(String, String)> = Vec::new();
        for entry in std::fs::read_dir(&ui_dir).expect("read src/ui") {
            let path = entry.expect("dir entry").path();
            if path.extension().and_then(|e| e.to_str()) != Some("rs") {
                continue;
            }
            let fname = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            let src = std::fs::read_to_string(&path).expect("read ui file");

            // 1. Scan `Icon { ... name: <expr> ... }`
            let mut search_idx = 0usize;
            while let Some(rel) = src[search_idx..].find("Icon") {
                let abs = search_idx + rel;
                let prev_ok = abs == 0 || {
                    let prev = src.as_bytes()[abs - 1];
                    !prev.is_ascii_alphanumeric() && prev != b'_'
                };
                let after = &src[abs + 4..];
                let ws_len = after.len() - after.trim_start().len();
                if prev_ok && after[ws_len..].starts_with('{') {
                    let body_start = abs + 4 + ws_len + 1;
                    let bytes = src.as_bytes();
                    let mut depth = 1usize;
                    let mut pos = body_start;
                    let mut in_str = false;
                    while pos < bytes.len() && depth > 0 {
                        let b = bytes[pos];
                        if in_str {
                            if b == b'\\' && pos + 1 < bytes.len() {
                                pos += 2;
                                continue;
                            }
                            if b == b'"' {
                                in_str = false;
                            }
                        } else {
                            match b {
                                b'"' => in_str = true,
                                b'{' => depth += 1,
                                b'}' => depth -= 1,
                                _ => {}
                            }
                        }
                        pos += 1;
                    }
                    let body = &src[body_start..pos.saturating_sub(1)];
                    if let Some(name_expr) = find_word_colon_value(body, "name") {
                        for lit in extract_quoted_literals(name_expr) {
                            checked_literals.push((fname.clone(), lit));
                        }
                    }
                    search_idx = pos;
                } else {
                    search_idx = abs + 4;
                }
            }

            // 2. Scan `leading_icon: <expr>`
            let mut li_idx = 0usize;
            while let Some(rel) = src[li_idx..].find("leading_icon:") {
                let start = li_idx + rel + "leading_icon:".len();
                let end = src[start..]
                    .find(',')
                    .map(|o| start + o)
                    .unwrap_or(src.len());
                for lit in extract_quoted_literals(&src[start..end]) {
                    checked_literals.push((fname.clone(), lit));
                }
                li_idx = end;
            }

            // 3. Scan `resolve_sprite_icon_name("...")`
            let mut res_idx = 0usize;
            let needle = "resolve_sprite_icon_name(";
            while let Some(rel) = src[res_idx..].find(needle) {
                let start = res_idx + rel + needle.len();
                let end = src[start..]
                    .find(')')
                    .map(|o| start + o)
                    .unwrap_or(src.len());
                for lit in extract_quoted_literals(&src[start..end]) {
                    checked_literals.push((fname.clone(), lit));
                }
                res_idx = end;
            }
        }

        // Also include dynamic helper icon outputs (account_type_icon, BudgetViewRow, recent_moves, sort carets)
        for dyn_icon in [
            "credit_card",
            "line_chart_down",
            "line_chart_up",
            "cash",
            "caret_up",
            "caret_down",
            "check_circle_fill",
            "exclamation_mark_triangle_fill",
            "arrows_horizontal",
            "subtract_circle_fill",
            "plus_circle_fill",
        ] {
            checked_literals.push(("dynamic_helpers".to_string(), dyn_icon.to_string()));
        }

        assert!(
            checked_literals.len() >= 60,
            "expected at least 60 icon references, found {}",
            checked_literals.len()
        );

        for (fname, raw_name) in checked_literals {
            let resolved = crate::ui::core::resolve_sprite_icon_name(&raw_name);
            let sym = format!(r#"id="icon_sprite_{resolved}""#);
            assert!(
                sprite_svg.contains(&sym),
                "icon `{raw_name}` (resolved `{resolved}`) in `{fname}` missing from icon_sprite.svg"
            );
        }
    }

    #[test]
    fn test_ui_69_no_tailwind_slate_hex_hacks_in_ui_sources() {
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let ui_dir = manifest_dir.join("src/ui");
        let forbidden_hexes = [
            "#cbd5e1", "#64748b", "#f8fafc", "#e2e8f0", "#0f172a", "#2b6cb0",
        ];

        let mut non_core_style_attr_count = 0usize;
        let mut total_style_line_count = 0usize;

        for entry in std::fs::read_dir(&ui_dir).expect("read src/ui") {
            let path = entry.expect("dir entry").path();
            if path.extension().and_then(|e| e.to_str()) != Some("rs") {
                continue;
            }
            let fname = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            let src = std::fs::read_to_string(&path).expect("read ui file");
            let lower = src.to_ascii_lowercase();

            for hex in forbidden_hexes {
                assert!(
                    !lower.contains(hex),
                    "forbidden Tailwind/slate hex `{hex}` found in `{fname}`"
                );
            }

            for (idx, line) in src.lines().enumerate() {
                let trimmed = line.trim();
                let has_style_prop = trimmed.starts_with("style:")
                    || trimmed.contains(" style:")
                    || trimmed.contains(",style:");
                if !has_style_prop {
                    continue;
                }
                total_style_line_count += 1;
                if fname != "core.rs" {
                    non_core_style_attr_count += 1;
                    assert!(
                        trimmed.contains('{'),
                        "static inline style found in `{fname}:{}`: `{trimmed}`",
                        idx + 1
                    );
                }
            }
        }

        assert!(
            non_core_style_attr_count <= 14,
            "expected <= 14 dynamic style: attrs across non-core UI files, found {non_core_style_attr_count}"
        );
        assert!(
            total_style_line_count <= 28,
            "expected <= 28 total style: lines across src/ui/*.rs, found {total_style_line_count}"
        );
    }
}
