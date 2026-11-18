//! Application State & Reactive Store (`AppStore`) for `ynab-desktop`.
//! Connects Dioxus UI components directly to `ynab-core` SQLite repository & calculation engine.

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;
use rusqlite::Connection;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

use ynab_core::changeset::{
    get_undo_redo_state, redo_last_changeset, undo_last_changeset, UndoRedoState,
};
use ynab_core::format::{
    format_date_with_pattern, format_milliunits_with_config, format_plain_decimal_milliunits,
    CurrencyFormatConfig,
};
use ynab_core::ledger::scheduled::{
    delete_scheduled_transaction, enter_scheduled_transaction_now, save_scheduled_transaction,
    SaveScheduledTransactionPayload, ScheduledTransactionDto,
};
use ynab_core::ledger::transfers::{SaveTransactionPayload, SubTransactionDto};
use ynab_core::repo::{
    self, AccountDto, AccountGroup, ApplyQuickBudgetPayload, CategoryDto, CategoryGroupDto,
    CreateAccountPayload, DeleteTransactionsPayload, FreshStartPayload, ImportFileFormat,
    ImportOptions, LoanAccountTerms, PayeeDto, PlanMonthSummaryDto, PlanSummaryDto,
    RecentMoveFilter, ReconcileAccountPayload, RenameOperator, ScheduledTransferViewRow,
    SetAssignedPayload, SetGoalPayload, SnoozeGoalPayload, ToggleClearedPayload, TransactionDto,
    UpdateAccountPayload, UpdatePlanSettingsPayload,
};
use ynab_core::seed::DEFAULT_BUDGET_ID;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActiveWorkspace {
    Budget,
    Reflect,
    Accounts(Option<String>), // None = All Accounts, Some(id) = specific account
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActiveModal {
    None,
    PlanSettings {
        is_create: bool,
    },
    AddAccount,
    EditAccount(AccountDto),
    CloseAccount(AccountDto),
    ManagePayees,
    DisplayOptions,
    EditFlags,
    ExportPlan,
    FreshStart,
    KeyboardShortcuts,
    ReconcileWizard(AccountDto),
    FileImport {
        account_id: Option<String>,
    },
    EditLoanTerms(AccountDto),
    RecentMoves,
    CategoryMoves {
        category_id: String,
        category_name: String,
    },
    MoveMoney {
        from_category_id: Option<String>,
        from_category_name: Option<String>,
        to_category_id: Option<String>,
        initial_amount_milliunits: i64,
    },
    CoverOverspending {
        category_id: String,
        category_name: String,
        overspent_milliunits: i64,
    },
    ActivityTransactions {
        category_id: String,
        category_name: String,
        activity_milliunits: i64,
    },
    RtaBreakdown,
    MonthPicker,
    AddMasterCategory,
    AddSubCategory {
        group_id: String,
        group_name: String,
    },
    EditCategory {
        id: String,
        name: String,
        is_master: bool,
        can_delete: bool,
        can_rename: bool,
        is_cc_payment: bool,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GroupedAccounts {
    pub cash: Vec<AccountDto>,
    pub credit: Vec<AccountDto>,
    pub loan: Vec<AccountDto>,
    pub tracking: Vec<AccountDto>,
    pub closed: Vec<AccountDto>,
}

impl GroupedAccounts {
    pub fn from_accounts(accounts: &[AccountDto]) -> Self {
        let mut cash = Vec::new();
        let mut credit = Vec::new();
        let mut loan = Vec::new();
        let mut tracking = Vec::new();
        let mut closed = Vec::new();

        for acc in accounts {
            match acc.sidebar_group() {
                AccountGroup::Cash => cash.push(acc.clone()),
                AccountGroup::Credit => credit.push(acc.clone()),
                AccountGroup::Loan => loan.push(acc.clone()),
                AccountGroup::Tracking => tracking.push(acc.clone()),
                AccountGroup::Closed => closed.push(acc.clone()),
            }
        }

        Self {
            cash,
            credit,
            loan,
            tracking,
            closed,
        }
    }
}

#[derive(Clone, Copy)]
pub struct AppStore {
    pub conn: Signal<Rc<RefCell<Connection>>>,
    pub budget_id: Signal<String>,
    pub available_budgets: Signal<Vec<(String, String)>>,
    pub plan_summary: Signal<PlanSummaryDto>,
    pub accounts: Signal<Vec<AccountDto>>,
    pub current_month: Signal<String>, // "YYYY-MM-01"
    pub month_notes: Signal<HashMap<String, String>>,
    pub month_summary: Signal<PlanMonthSummaryDto>,
    pub transactions: Signal<Vec<TransactionDto>>,
    pub scheduled_transactions: Signal<Vec<ScheduledTransactionDto>>,
    pub scheduled_view_rows: Signal<Vec<ScheduledTransferViewRow>>,
    pub payees: Signal<Vec<PayeeDto>>,
    pub undo_redo: Signal<UndoRedoState>,

    // Navigation & UI Preferences
    pub workspace: Signal<ActiveWorkspace>,
    pub sidebar_collapsed: Signal<bool>,
    pub active_modal: Signal<ActiveModal>,
    pub plan_menu_open: Signal<bool>,
    pub hide_amounts: Signal<bool>,
    pub theme: Signal<String>, // "", "theme-dark", "theme-match-system"
    pub show_progress_bars: Signal<bool>,
    pub differentiate_without_color: Signal<bool>,
    pub flag_names: Signal<HashMap<String, String>>,
    pub shortcuts_disabled: Signal<bool>,

    // Budget Workspace State
    pub active_budget_view: Signal<String>, // "all", "underfunded", "overfunded", "money-available", "snoozed", "overspent"
    pub selected_category_ids: Signal<HashSet<String>>,
    pub collapsed_category_groups: Signal<HashSet<String>>,
    pub show_hidden_categories: Signal<bool>,

    // Accounts Workspace State
    pub selected_tx_ids: Signal<HashSet<String>>,
    pub editing_tx_id: Signal<Option<String>>,
    pub is_adding_tx: Signal<bool>,
    pub is_adding_scheduled: Signal<bool>,
    pub search_text: Signal<String>,
    pub show_reconciled: Signal<bool>,
    pub show_scheduled: Signal<bool>,
    pub show_running_balance: Signal<bool>,
    pub show_flags: Signal<bool>,
    pub show_images: Signal<bool>,
    pub sort_column: Signal<String>,
    pub sort_ascending: Signal<bool>,
    pub expanded_split_tx_ids: Signal<HashSet<String>>,
    pub is_adjustment_mode: Signal<bool>,
    pub adjustment_target_balance: Signal<i64>,
}

impl AppStore {
    pub fn new(conn: Connection) -> Self {
        let budget_id_str = DEFAULT_BUDGET_ID.to_string();
        let default_month = "2026-11-01".to_string();

        let summary =
            repo::get_plan_summary(&conn, Some(&budget_id_str)).unwrap_or(PlanSummaryDto {
                id: budget_id_str.clone(),
                name: "My Personal Budget".to_string(),
                currency_code: "USD".to_string(),
                number_format: "123,456.78".to_string(),
                currency_symbol_first: true,
                currency_display_symbol: true,
                currency_symbol: "$".to_string(),
                decimal_digits: 2,
                decimal_separator: ".".to_string(),
                group_separator: ",".to_string(),
                date_format: "MM/DD/YYYY".to_string(),
            });

        let budgets = repo::list_budgets(&conn)
            .unwrap_or_else(|_| vec![(budget_id_str.clone(), summary.name.clone())]);
        let accs = repo::get_accounts(&conn, Some(&budget_id_str)).unwrap_or_default();
        let m_summary = repo::get_budget_month(&conn, &default_month, Some(&budget_id_str))
            .unwrap_or(PlanMonthSummaryDto {
                month: default_month.clone(),
                ready_to_assign_milliunits: 0,
                total_assigned_milliunits: 0,
                total_activity_milliunits: 0,
                total_available_milliunits: 0,
                funded_in_future_milliunits: 0,
                immediate_income_milliunits: 0,
                prior_month_overspent_milliunits: 0,
                category_groups: Vec::new(),
            });
        let txs = repo::get_transactions(&conn, None, Some(&budget_id_str)).unwrap_or_default();
        let sched_views =
            repo::list_scheduled_transactions_for_account(&conn, Some(&budget_id_str), None)
                .unwrap_or_default();
        let sched: Vec<ScheduledTransactionDto> =
            sched_views.iter().map(|r| r.scheduled.clone()).collect();
        let payees_list = repo::get_payees(&conn, Some(&budget_id_str)).unwrap_or_default();
        let ur_state = get_undo_redo_state(&conn, &budget_id_str).unwrap_or_default();

        // Load persisted settings from `be_settings`
        let saved_theme = repo::get_setting(&conn, &budget_id_str, "theme")
            .ok()
            .flatten()
            .unwrap_or_default();
        let saved_hide = repo::get_setting(&conn, &budget_id_str, "hide_amounts")
            .ok()
            .flatten()
            .map(|v| v == "true")
            .unwrap_or(false);
        let saved_bars = repo::get_setting(&conn, &budget_id_str, "progress_bars")
            .ok()
            .flatten()
            .map(|v| v != "false")
            .unwrap_or(true);
        let saved_diff = repo::get_setting(&conn, &budget_id_str, "differentiate_colors")
            .ok()
            .flatten()
            .map(|v| v == "true")
            .unwrap_or(false);

        let mut flags_map = HashMap::new();
        for c in ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"] {
            flags_map.insert(c.to_string(), c.to_string());
        }
        if let Ok(Some(flags_json)) = repo::get_setting(&conn, &budget_id_str, "flag_names") {
            if let Ok(parsed) = serde_json::from_str::<HashMap<String, String>>(&flags_json) {
                for (k, v) in parsed {
                    flags_map.insert(k, v);
                }
            }
        }

        Self {
            conn: Signal::new(Rc::new(RefCell::new(conn))),
            budget_id: Signal::new(budget_id_str),
            available_budgets: Signal::new(budgets),
            plan_summary: Signal::new(summary),
            accounts: Signal::new(accs),
            current_month: Signal::new(default_month),
            month_notes: Signal::new(HashMap::new()),
            month_summary: Signal::new(m_summary),
            transactions: Signal::new(txs),
            scheduled_transactions: Signal::new(sched),
            scheduled_view_rows: Signal::new(sched_views),
            payees: Signal::new(payees_list),
            undo_redo: Signal::new(ur_state),
            workspace: Signal::new(ActiveWorkspace::Budget),
            sidebar_collapsed: Signal::new(false),
            active_modal: Signal::new(ActiveModal::None),
            plan_menu_open: Signal::new(false),
            hide_amounts: Signal::new(saved_hide),
            theme: Signal::new(saved_theme),
            show_progress_bars: Signal::new(saved_bars),
            differentiate_without_color: Signal::new(saved_diff),
            flag_names: Signal::new(flags_map),
            shortcuts_disabled: Signal::new(false),
            active_budget_view: Signal::new("all".to_string()),
            selected_category_ids: Signal::new(HashSet::new()),
            collapsed_category_groups: Signal::new(HashSet::new()),
            show_hidden_categories: Signal::new(false),
            selected_tx_ids: Signal::new(HashSet::new()),
            editing_tx_id: Signal::new(None),
            is_adding_tx: Signal::new(false),
            is_adding_scheduled: Signal::new(false),
            search_text: Signal::new(String::new()),
            show_reconciled: Signal::new(true),
            show_scheduled: Signal::new(true),
            show_running_balance: Signal::new(false),
            show_flags: Signal::new(true),
            show_images: Signal::new(true),
            sort_column: Signal::new("date".to_string()),
            sort_ascending: Signal::new(false),
            expanded_split_tx_ids: Signal::new(HashSet::new()),
            is_adjustment_mode: Signal::new(false),
            adjustment_target_balance: Signal::new(0),
        }
    }

    pub fn currency_config(&self) -> CurrencyFormatConfig {
        let s = self.plan_summary.read();
        CurrencyFormatConfig {
            iso_code: s.currency_code.clone(),
            example_format: s.number_format.clone(),
            decimal_digits: s.decimal_digits,
            decimal_separator: s.decimal_separator.clone(),
            symbol_first: s.currency_symbol_first,
            group_separator: s.group_separator.clone(),
            currency_symbol: s.currency_symbol.clone(),
            display_symbol: s.currency_display_symbol,
        }
    }

    pub fn format_money(&self, milliunits: i64) -> String {
        let hide = *self.hide_amounts.read();
        format_milliunits_with_config(milliunits, &self.currency_config(), false, hide)
    }

    pub fn format_plain_decimal(&self, milliunits: i64) -> String {
        format_plain_decimal_milliunits(milliunits)
    }

    pub fn format_date(&self, iso_date: &str) -> String {
        let fmt = &self.plan_summary.read().date_format;
        format_date_with_pattern(iso_date, fmt)
    }

    pub fn grouped_accounts(&self) -> GroupedAccounts {
        GroupedAccounts::from_accounts(&self.accounts.read())
    }

    pub fn reload_all(&mut self) {
        let b_id = self.budget_id.read().clone();
        let m_iso = self.current_month.read().clone();
        let acc_filter = match &*self.workspace.read() {
            ActiveWorkspace::Accounts(Some(acc_id)) => Some(acc_id.clone()),
            _ => None,
        };

        let conn_rc = self.conn.read().clone();
        let conn = conn_rc.borrow();
        if let Ok(s) = repo::get_plan_summary(&conn, Some(&b_id)) {
            self.plan_summary.set(s);
        }
        if let Ok(list) = repo::list_budgets(&conn) {
            self.available_budgets.set(list);
        }
        if let Ok(accs) = repo::get_accounts(&conn, Some(&b_id)) {
            self.accounts.set(accs);
        }
        if let Ok(ms) = repo::get_budget_month(&conn, &m_iso, Some(&b_id)) {
            self.month_summary.set(ms);
        }
        if let Ok(txs) = repo::get_transactions(&conn, acc_filter.as_deref(), Some(&b_id)) {
            self.transactions.set(txs);
        }
        if let Ok(sched_views) =
            repo::list_scheduled_transactions_for_account(&conn, Some(&b_id), acc_filter.as_deref())
        {
            let sched: Vec<ScheduledTransactionDto> =
                sched_views.iter().map(|r| r.scheduled.clone()).collect();
            self.scheduled_transactions.set(sched);
            self.scheduled_view_rows.set(sched_views);
        }
        if let Ok(ps) = repo::get_payees(&conn, Some(&b_id)) {
            self.payees.set(ps);
        }
        if let Ok(ur) = get_undo_redo_state(&conn, &b_id) {
            self.undo_redo.set(ur);
        }
    }

    // ---------------------------------------------------------
    // Navigation & Month Actions
    // ---------------------------------------------------------

    pub fn navigate_to(&mut self, ws: ActiveWorkspace) {
        self.workspace.set(ws);
        self.selected_tx_ids.write().clear();
        self.editing_tx_id.set(None);
        self.is_adding_tx.set(false);
        self.is_adjustment_mode.set(false);
        self.reload_all();
    }

    pub fn set_month(&mut self, month_iso: String) {
        self.current_month.set(month_iso);
        self.reload_all();
    }

    pub fn prev_month(&mut self) {
        let curr = self.current_month.read().clone();
        let (y, m) = repo::parse_year_month(&curr);
        let (ny, nm) = if m <= 1 { (y - 1, 12) } else { (y, m - 1) };
        self.set_month(format!("{ny:04}-{nm:02}-01"));
    }

    pub fn next_month(&mut self) {
        let curr = self.current_month.read().clone();
        let (y, m) = repo::parse_year_month(&curr);
        let next = repo::increment_month(y, m);
        self.set_month(next);
    }

    // ---------------------------------------------------------
    // Undo / Redo Actions
    // ---------------------------------------------------------

    pub fn undo(&mut self) {
        let b_id = self.budget_id.read().clone();
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            undo_last_changeset(&mut conn, &b_id)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn redo(&mut self) {
        let b_id = self.budget_id.read().clone();
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            redo_last_changeset(&mut conn, &b_id)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    // ---------------------------------------------------------
    // Budget Actions
    // ---------------------------------------------------------

    pub fn set_category_assigned(&mut self, category_id: &str, assigned_milliunits: i64) {
        let b_id = self.budget_id.read().clone();
        let month = self.current_month.read().clone();
        let payload = SetAssignedPayload {
            budget_id: Some(b_id),
            category_id: category_id.to_string(),
            month,
            assigned_milliunits,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::set_category_assigned(&conn, &payload)
        };
        if let Ok(ms) = res {
            self.month_summary.set(ms);
            let b_id = self.budget_id.read().clone();
            let ur_opt = {
                let conn_rc = self.conn.read().clone();
                let conn = conn_rc.borrow();
                get_undo_redo_state(&conn, &b_id).ok()
            };
            if let Some(ur) = ur_opt {
                self.undo_redo.set(ur);
            }
        }
    }

    pub fn move_money(
        &mut self,
        from_category_id: Option<&str>,
        to_category_id: &str,
        amount_milliunits: i64,
    ) {
        if amount_milliunits <= 0 {
            return;
        }
        if let Some(from_id) = from_category_id {
            if from_id == to_category_id {
                return;
            }
        }
        let b_id = self.budget_id.read().clone();
        let month = self.current_month.read().clone();
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::move_money_between_categories(
                &conn,
                Some(&b_id),
                &month,
                from_category_id,
                Some(to_category_id),
                amount_milliunits,
            )
        };
        if let Ok(ms) = res {
            self.month_summary.set(ms);
            let ur_opt = {
                let conn_rc = self.conn.read().clone();
                let conn = conn_rc.borrow();
                get_undo_redo_state(&conn, &b_id).ok()
            };
            if let Some(ur) = ur_opt {
                self.undo_redo.set(ur);
            }
        }
    }

    pub fn apply_quick_budget(
        &mut self,
        quick_budget_type: &str,
        category_ids: Option<Vec<String>>,
    ) {
        let b_id = self.budget_id.read().clone();
        let month = self.current_month.read().clone();
        let payload = ApplyQuickBudgetPayload {
            budget_id: Some(b_id),
            month,
            quick_budget_type: quick_budget_type.to_string(),
            category_ids,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::apply_quick_budget(&conn, &payload)
        };
        if let Ok(ms) = res {
            self.month_summary.set(ms);
            let b_id = self.budget_id.read().clone();
            let ur_opt = {
                let conn_rc = self.conn.read().clone();
                let conn = conn_rc.borrow();
                get_undo_redo_state(&conn, &b_id).ok()
            };
            if let Some(ur) = ur_opt {
                self.undo_redo.set(ur);
            }
        }
    }

    pub fn save_category_goal(&mut self, payload: SetGoalPayload) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::set_category_goal(&conn, &payload)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn toggle_snooze_goal(&mut self, category_id: &str, currently_snoozed: bool) {
        let b_id = self.budget_id.read().clone();
        let month = self.current_month.read().clone();
        let payload = SnoozeGoalPayload {
            budget_id: Some(b_id),
            category_id: category_id.to_string(),
            month,
            snooze: !currently_snoozed,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::snooze_category_goal(&conn, &payload)
        };
        if let Ok(ms) = res {
            self.month_summary.set(ms);
            let b_id = self.budget_id.read().clone();
            let ur_opt = {
                let conn_rc = self.conn.read().clone();
                let conn = conn_rc.borrow();
                get_undo_redo_state(&conn, &b_id).ok()
            };
            if let Some(ur) = ur_opt {
                self.undo_redo.set(ur);
            }
        }
    }

    pub fn update_category_note(&mut self, category_id: &str, note: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::update_category_note(&conn, category_id, note)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn create_category_group(&mut self, name: &str) {
        if name.trim().is_empty() {
            return;
        }
        let b_id = self.budget_id.read().clone();
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::create_category_group(&conn, name.trim(), Some(&b_id))
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn create_subcategory(&mut self, group_id: &str, name: &str) {
        if name.trim().is_empty() {
            return;
        }
        let b_id = self.budget_id.read().clone();
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::create_subcategory(&conn, group_id, name.trim(), Some(&b_id))
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn rename_category(&mut self, id: &str, new_name: &str, is_master: bool) {
        if new_name.trim().is_empty() {
            return;
        }
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::rename_category(&conn, id, new_name.trim(), is_master)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn delete_category(&mut self, id: &str, is_master: bool) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::delete_category(&conn, id, is_master)
        };
        if res.is_ok() {
            self.selected_category_ids.write().remove(id);
            self.reload_all();
        }
    }

    pub fn hide_category(&mut self, id: &str, is_master: bool, is_hidden: bool) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::hide_category(&conn, id, is_master, is_hidden)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn reorder_categories(
        &mut self,
        ordered_group_ids: Vec<String>,
        subcategories_by_group: serde_json::Value,
    ) {
        let b_id = self.budget_id.read().clone();
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::reorder_categories(
                &mut conn,
                Some(&b_id),
                &ordered_group_ids,
                Some(&subcategories_by_group),
            )
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    // ---------------------------------------------------------
    // Accounts & Ledger Actions
    // ---------------------------------------------------------

    pub fn create_account(
        &mut self,
        name: &str,
        account_type: &str,
        balance_milliunits: i64,
    ) -> Option<AccountDto> {
        let b_id = self.budget_id.read().clone();
        let payload = CreateAccountPayload {
            name: name.to_string(),
            account_type: account_type.to_string(),
            balance_milliunits,
            on_budget: None,
            note: None,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::create_account(&conn, &payload, Some(&b_id))
        };
        if let Ok(acc) = res {
            self.reload_all();
            Some(acc)
        } else {
            None
        }
    }

    pub fn update_account(
        &mut self,
        id: &str,
        name: &str,
        note: Option<String>,
        delta: Option<i64>,
    ) {
        let b_id = self.budget_id.read().clone();
        let payload = UpdateAccountPayload {
            id: id.to_string(),
            name: name.to_string(),
            note,
            budget_id: Some(b_id),
            balance_adjustment_delta: delta,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::update_account(&conn, &payload)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn close_account(&mut self, account_id: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::close_account_in_db(&conn, account_id)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn reorder_accounts(&mut self, ordered_ids: Vec<String>) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::reorder_accounts(&conn, &ordered_ids)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn save_transaction(&mut self, payload: SaveTransactionPayload) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::save_transaction(&conn, &payload)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn toggle_cleared(&mut self, tx_id: &str, current_cleared: &str) {
        let next = if current_cleared.eq_ignore_ascii_case("cleared")
            || current_cleared.eq_ignore_ascii_case("reconciled")
        {
            "Uncleared"
        } else {
            "Cleared"
        };
        let b_id = self.budget_id.read().clone();
        let payload = ToggleClearedPayload {
            id: tx_id.to_string(),
            cleared: next.to_string(),
            budget_id: Some(b_id),
            allow_reconciled: false,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::toggle_transaction_cleared(&conn, &payload)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn bulk_update_selected(&mut self, action: &str, payload: serde_json::Value) {
        let ids: Vec<String> = self.selected_tx_ids.read().iter().cloned().collect();
        if ids.is_empty() {
            return;
        }
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::bulk_update_transactions_in_db(&mut conn, &ids, action, &payload)
        };
        if res.is_ok() {
            if action == "delete" {
                self.selected_tx_ids.write().clear();
            }
            self.reload_all();
        }
    }

    pub fn delete_selected_transactions(&mut self) {
        let ids: Vec<String> = self.selected_tx_ids.read().iter().cloned().collect();
        if ids.is_empty() {
            return;
        }
        let b_id = self.budget_id.read().clone();
        let payload = DeleteTransactionsPayload {
            ids,
            budget_id: Some(b_id),
            allow_reconciled: false,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::delete_transactions(&conn, &payload)
        };
        if res.is_ok() {
            self.selected_tx_ids.write().clear();
            self.reload_all();
        }
    }

    pub fn reconcile_account(
        &mut self,
        account_id: &str,
        target_balance_milliunits: i64,
        create_adjustment: bool,
    ) {
        let b_id = self.budget_id.read().clone();
        let payload = ReconcileAccountPayload {
            budget_id: Some(b_id),
            account_id: account_id.to_string(),
            target_balance_milliunits,
            create_adjustment,
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::reconcile_account(&conn, &payload)
        };
        if res.is_ok() {
            self.is_adjustment_mode.set(false);
            self.reload_all();
        }
    }

    // ---------------------------------------------------------
    // Scheduled Transactions Actions
    // ---------------------------------------------------------

    pub fn save_scheduled(&mut self, payload: SaveScheduledTransactionPayload) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            save_scheduled_transaction(&conn, &payload)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn enter_scheduled_now(&mut self, scheduled_id: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            enter_scheduled_transaction_now(&conn, scheduled_id)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn delete_scheduled(&mut self, scheduled_id: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            delete_scheduled_transaction(&conn, scheduled_id)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn skip_scheduled_occurrence(&mut self, scheduled_id: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::skip_scheduled_occurrence(&conn, scheduled_id)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    // ---------------------------------------------------------
    // File Import, Matching, Loan, Recent Moves & Payee Rule Actions
    // ---------------------------------------------------------

    pub fn match_transactions(&mut self, manual_tx_id: &str, imported_tx_id: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::match_transactions(&mut conn, manual_tx_id, imported_tx_id)
        };
        if res.is_ok() {
            self.selected_tx_ids.write().clear();
            self.reload_all();
        }
    }

    pub fn unmatch_transactions(&mut self, tx_ids: &[String]) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::unmatch_transactions(&mut conn, tx_ids)
        };
        if res.is_ok() {
            self.selected_tx_ids.write().clear();
            self.reload_all();
        }
    }

    pub fn preview_file_import(
        &self,
        req: &crate::ui::file_import::FileImportRequest,
    ) -> Result<crate::ui::file_import::ImportPreviewVm, String> {
        let b_id = self.budget_id.read().clone();
        let filename_opt = if req.file_name.trim().is_empty() {
            None
        } else {
            Some(req.file_name.trim())
        };
        let opts = ImportOptions {
            swap_inflow_outflow: req.swap_inflow_outflow,
            swap_memo_with_payee: req.swap_payee_memo,
            import_memos: req.import_memos,
            auto_match: true,
            ..Default::default()
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::preview_file_import(
                &conn,
                Some(&b_id),
                &req.account_id,
                filename_opt,
                &req.raw_contents,
                &opts,
            )?
        };
        let format_label = match res.format {
            ImportFileFormat::Ofx => "OFX",
            ImportFileFormat::Qfx => "QFX",
            ImportFileFormat::Qif => "QIF",
            ImportFileFormat::Csv => "CSV",
            ImportFileFormat::Tsv => "TSV",
        }
        .to_string();
        let rows = res
            .rows
            .into_iter()
            .map(|r| {
                let status = match r.status {
                    repo::ImportRowStatus::New => crate::ui::file_import::ImportRowStatus::New,
                    repo::ImportRowStatus::AutoMatched => {
                        crate::ui::file_import::ImportRowStatus::AutoMatched
                    }
                    repo::ImportRowStatus::Duplicate => {
                        crate::ui::file_import::ImportRowStatus::DuplicateSkipped
                    }
                };
                let matched_summary = if r.status == repo::ImportRowStatus::AutoMatched {
                    let payee_part = r
                        .matched_transaction_payee
                        .as_deref()
                        .filter(|s| !s.is_empty())
                        .unwrap_or("Existing transaction");
                    let date_part = r.matched_transaction_date.as_deref().unwrap_or("");
                    if date_part.is_empty() {
                        Some(format!("Auto-matched to {payee_part}"))
                    } else {
                        Some(format!("Auto-matched to {payee_part} ({date_part})"))
                    }
                } else {
                    None
                };
                crate::ui::file_import::ImportPreviewRowVm {
                    date: r.date,
                    payee: r.resolved_payee_name,
                    original_payee: r.imported_payee,
                    memo: r.memo.unwrap_or_default(),
                    amount_milliunits: r.amount_milliunits,
                    import_id: r.import_id,
                    status,
                    matched_summary,
                }
            })
            .collect();

        Ok(crate::ui::file_import::ImportPreviewVm {
            format_label,
            total_rows: res.total_parsed,
            new_count: res.new_count,
            matched_count: res.matched_count,
            skipped_count: res.duplicate_count,
            rows,
        })
    }

    pub fn commit_file_import(
        &mut self,
        req: &crate::ui::file_import::FileImportRequest,
    ) -> Result<crate::ui::file_import::ImportCommitResultVm, String> {
        let b_id = self.budget_id.read().clone();
        let filename_opt = if req.file_name.trim().is_empty() {
            None
        } else {
            Some(req.file_name.trim())
        };
        let opts = ImportOptions {
            swap_inflow_outflow: req.swap_inflow_outflow,
            swap_memo_with_payee: req.swap_payee_memo,
            import_memos: req.import_memos,
            auto_match: true,
            ..Default::default()
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::commit_file_import(
                &mut conn,
                Some(&b_id),
                &req.account_id,
                filename_opt,
                &req.raw_contents,
                &opts,
            )?
        };
        self.reload_all();
        Ok(crate::ui::file_import::ImportCommitResultVm {
            imported_count: res.imported_count,
            matched_count: res.matched_count,
            skipped_count: res.skipped_duplicate_count,
        })
    }

    pub fn get_loan_terms(&self, account_id: &str) -> crate::ui::loan::LoanTermsVm {
        let conn_rc = self.conn.read().clone();
        let conn = conn_rc.borrow();
        match repo::get_loan_terms(&conn, account_id) {
            Ok(terms) => crate::ui::loan::LoanTermsVm {
                account_id: terms.account_id,
                original_balance_milliunits: terms
                    .original_balance_milliunits
                    .unwrap_or(terms.current_balance_milliunits),
                apr_millipercent: terms.apr_milli_percent,
                minimum_payment_milliunits: terms.minimum_payment_milliunits,
                monthly_escrow_milliunits: terms.escrow_milliunits,
                start_date: terms.start_date,
            },
            Err(_) => crate::ui::loan::LoanTermsVm {
                account_id: account_id.to_string(),
                ..Default::default()
            },
        }
    }

    pub fn save_loan_terms(&mut self, payload: crate::ui::loan::SaveLoanTermsPayload) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            let existing = repo::get_loan_terms(&conn, &payload.account_id).ok();
            let orig_bal = if payload.original_balance_milliunits > 0 {
                Some(payload.original_balance_milliunits)
            } else {
                existing
                    .as_ref()
                    .and_then(|t| t.original_balance_milliunits)
            };
            let terms = LoanAccountTerms {
                account_id: payload.account_id,
                start_date: existing.as_ref().and_then(|t| t.start_date.clone()),
                original_balance_milliunits: orig_bal,
                current_balance_milliunits: existing
                    .as_ref()
                    .map(|t| t.current_balance_milliunits)
                    .unwrap_or(0),
                apr_milli_percent: payload.apr_millipercent,
                minimum_payment_milliunits: payload.minimum_payment_milliunits,
                escrow_milliunits: payload.monthly_escrow_milliunits,
                asset_value_milliunits: existing.as_ref().and_then(|t| t.asset_value_milliunits),
            };
            repo::save_loan_terms(&conn, &terms)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn combine_payees(
        &mut self,
        source_payee_ids: &[String],
        target_name: &str,
    ) -> Result<(), String> {
        let b_id = self.budget_id.read().clone();
        {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::combine_payees(&mut conn, Some(&b_id), source_payee_ids, target_name)?;
        }
        self.reload_all();
        Ok(())
    }

    pub fn get_payee_rename_rules(
        &self,
        payee_id: &str,
    ) -> Vec<crate::ui::modals::PayeeRenameRuleVm> {
        let b_id = self.budget_id.read().clone();
        let conn_rc = self.conn.read().clone();
        let conn = conn_rc.borrow();
        repo::list_payee_rename_conditions(&conn, Some(&b_id), Some(payee_id))
            .unwrap_or_default()
            .into_iter()
            .map(|r| crate::ui::modals::PayeeRenameRuleVm {
                id: r.id,
                payee_id: r.payee_id,
                operator: r.operator.as_str().to_string(),
                operand: r.operand,
            })
            .collect()
    }

    pub fn add_payee_rename_rule(
        &mut self,
        payee_id: &str,
        operator: &str,
        operand: &str,
    ) -> Result<(), String> {
        let b_id = self.budget_id.read().clone();
        let op = RenameOperator::from_str_loose(operator);
        {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::add_payee_rename_condition(&conn, Some(&b_id), payee_id, op, operand)?;
        }
        self.reload_all();
        Ok(())
    }

    pub fn delete_payee_rename_rule(&mut self, rule_id: &str) -> Result<(), String> {
        {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::delete_payee_rename_condition(&conn, rule_id)?;
        }
        self.reload_all();
        Ok(())
    }

    pub fn recent_moves_entries(
        &self,
        category_id_filter: Option<&str>,
    ) -> Vec<crate::ui::recent_moves::RecentMoveEntryVm> {
        let b_id = self.budget_id.read().clone();
        let conn_rc = self.conn.read().clone();
        let conn = conn_rc.borrow();
        repo::list_recent_moves(
            &conn,
            Some(&b_id),
            RecentMoveFilter::All,
            category_id_filter,
        )
        .unwrap_or_default()
        .into_iter()
        .map(|e| crate::ui::recent_moves::RecentMoveEntryVm {
            id: e.id,
            moved_at: e.move_started_at,
            from_category_name: e.from_category_name,
            to_category_name: e.to_category_name,
            amount_milliunits: e.amount_milliunits,
            is_assignment: e.is_assignment,
        })
        .collect()
    }

    // ---------------------------------------------------------
    // Payee & Settings Actions
    // ---------------------------------------------------------

    pub fn update_payee(&mut self, payee_id: &str, new_name: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::update_payee(&conn, payee_id, new_name)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn delete_payee(&mut self, payee_id: &str) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::delete_payee(&conn, payee_id)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn update_plan_settings(&mut self, payload: UpdatePlanSettingsPayload) {
        let res = {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            repo::update_plan_settings(&conn, &payload)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn create_and_switch_budget(&mut self, name: &str, payload: UpdatePlanSettingsPayload) {
        let new_id_res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::create_new_budget(&mut conn, name)
        };
        if let Ok(new_id) = new_id_res {
            let mut pl = payload;
            pl.budget_id = Some(new_id.clone());
            {
                let conn_rc = self.conn.read().clone();
                let conn = conn_rc.borrow();
                let _ = repo::update_plan_settings(&conn, &pl);
            }
            self.budget_id.set(new_id);
            self.workspace.set(ActiveWorkspace::Budget);
            self.reload_all();
        }
    }

    pub fn switch_budget(&mut self, target_budget_id: &str) {
        self.budget_id.set(target_budget_id.to_string());
        self.workspace.set(ActiveWorkspace::Budget);
        self.selected_category_ids.write().clear();
        self.selected_tx_ids.write().clear();
        self.reload_all();
    }

    pub fn make_fresh_start(&mut self, new_name: &str) {
        let b_id = self.budget_id.read().clone();
        let payload = FreshStartPayload {
            budget_id: Some(b_id),
            new_name: Some(new_name.to_string()),
            preserve_current_balance_as_starting: Some(true),
        };
        let res = {
            let conn_rc = self.conn.read().clone();
            let mut conn = conn_rc.borrow_mut();
            repo::make_fresh_start(&mut conn, &payload)
        };
        if res.is_ok() {
            self.reload_all();
        }
    }

    pub fn save_display_options(
        &mut self,
        theme: &str,
        progress_bars: bool,
        differentiate_without_color: bool,
    ) {
        let b_id = self.budget_id.read().clone();
        self.theme.set(theme.to_string());
        self.show_progress_bars.set(progress_bars);
        self.differentiate_without_color
            .set(differentiate_without_color);
        let conn_rc = self.conn.read().clone();
        let conn = conn_rc.borrow();
        let _ = repo::set_setting(&conn, &b_id, "theme", theme);
        let _ = repo::set_setting(
            &conn,
            &b_id,
            "progress_bars",
            if progress_bars { "true" } else { "false" },
        );
        let _ = repo::set_setting(
            &conn,
            &b_id,
            "differentiate_colors",
            if differentiate_without_color {
                "true"
            } else {
                "false"
            },
        );
    }

    pub fn toggle_hide_amounts(&mut self) {
        let next = !*self.hide_amounts.read();
        self.hide_amounts.set(next);
        let b_id = self.budget_id.read().clone();
        let conn_rc = self.conn.read().clone();
        let conn = conn_rc.borrow();
        let _ = repo::set_setting(
            &conn,
            &b_id,
            "hide_amounts",
            if next { "true" } else { "false" },
        );
    }

    pub fn save_flag_names(&mut self, updated: HashMap<String, String>) {
        let b_id = self.budget_id.read().clone();
        self.flag_names.set(updated.clone());
        if let Ok(json_str) = serde_json::to_string(&updated) {
            let conn_rc = self.conn.read().clone();
            let conn = conn_rc.borrow();
            let _ = repo::set_setting(&conn, &b_id, "flag_names", &json_str);
        }
    }
}

pub fn filter_category_monthly_transactions(
    transactions: &[TransactionDto],
    category_id: &str,
    month_iso: &str,
) -> Vec<TransactionDto> {
    if category_id.is_empty() || month_iso.len() < 7 {
        return Vec::new();
    }
    let ym = &month_iso[0..7];
    transactions
        .iter()
        .filter(|tx| {
            tx.date.starts_with(ym)
                && (tx.category_id.as_deref() == Some(category_id)
                    || tx
                        .subtransactions
                        .iter()
                        .any(|s: &SubTransactionDto| s.category_id.as_deref() == Some(category_id)))
        })
        .cloned()
        .collect()
}

pub fn filter_categories_by_view(
    groups: &[CategoryGroupDto],
    active_view: &str,
    show_hidden: bool,
) -> Vec<CategoryGroupDto> {
    let mut out = Vec::new();
    for g in groups {
        if g.hidden && !show_hidden {
            continue;
        }
        let filtered_cats: Vec<CategoryDto> = g
            .categories
            .iter()
            .filter(|c| {
                if c.hidden && !show_hidden {
                    return false;
                }
                match active_view {
                    "overspent" => c.available_milliunits < 0,
                    "underfunded" => !c.is_snoozed && c.goal_under_funded.unwrap_or(0) > 0,
                    "overfunded" => {
                        if let Some(target) = c.goal_target_amount {
                            target > 0 && c.assigned_milliunits > target
                        } else {
                            false
                        }
                    }
                    "money-available" => c.available_milliunits > 0,
                    "snoozed" => c.is_snoozed,
                    _ => true,
                }
            })
            .cloned()
            .collect();

        if !filtered_cats.is_empty() || active_view == "all" {
            let mut grp_clone = g.clone();
            grp_clone.categories = filtered_cats;
            out.push(grp_clone);
        }
    }
    out
}
