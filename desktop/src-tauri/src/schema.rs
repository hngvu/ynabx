//! SQLite Schema for YNAB Desktop following YNAB v26.160.1 be_* entities.
//! All monetary amounts are stored as 64-bit integer milliunits (1000 = $1.00).

use rusqlite::{Connection, Result};

pub fn init_database(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA synchronous = NORMAL;

        -- 1. Budget Master Singleton / Multi-Plan
        CREATE TABLE IF NOT EXISTS be_budgets (
            id TEXT PRIMARY KEY,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            budget_id TEXT NOT NULL,
            budget_name TEXT NOT NULL,
            date_format TEXT NOT NULL DEFAULT '{"format":"YYYY-MM-DD"}',
            currency_format TEXT NOT NULL DEFAULT '{"iso_code":"USD","example_format":"1,234.56","decimal_digits":2,"decimal_separator":".","symbol_first":true,"group_separator":",","currency_symbol":"$","display_symbol":true}',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Budget Settings (e.g. flag_settings, focus_views, cost_to_be_me)
        CREATE TABLE IF NOT EXISTS be_settings (
            id TEXT PRIMARY KEY,
            setting_name TEXT NOT NULL,
            setting_value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Accounts (13 account types supported by YNAB)
        CREATE TABLE IF NOT EXISTS be_accounts (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            account_type TEXT NOT NULL,
            account_name TEXT NOT NULL,
            note TEXT,
            is_closed INTEGER NOT NULL DEFAULT 0,
            sortable_index INTEGER NOT NULL DEFAULT 0,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            sortable_favorite_index INTEGER NOT NULL DEFAULT 0,
            on_budget INTEGER NOT NULL DEFAULT 1,
            last_reconciled_at TEXT,
            debt_start_date TEXT,
            debt_original_balance INTEGER,
            debt_interest_rates TEXT,
            debt_minimum_payments TEXT,
            debt_asset_values TEXT,
            debt_escrow_amounts TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Account Calculations (Materialized cache ac/<accountId>)
        CREATE TABLE IF NOT EXISTS be_account_calculations (
            id TEXT PRIMARY KEY,
            entities_account_id TEXT NOT NULL REFERENCES be_accounts(id) ON DELETE CASCADE,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            cleared_balance INTEGER NOT NULL DEFAULT 0,
            uncleared_balance INTEGER NOT NULL DEFAULT 0,
            info_count INTEGER NOT NULL DEFAULT 0,
            warning_count INTEGER NOT NULL DEFAULT 0,
            error_count INTEGER NOT NULL DEFAULT 0,
            transaction_count INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Monthly Account Calculations (mac/<YYYY-MM>/<accountId>)
        CREATE TABLE IF NOT EXISTS be_monthly_account_calculations (
            id TEXT PRIMARY KEY,
            entities_account_id TEXT NOT NULL REFERENCES be_accounts(id) ON DELETE CASCADE,
            month TEXT NOT NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            cleared_balance INTEGER NOT NULL DEFAULT 0,
            uncleared_balance INTEGER NOT NULL DEFAULT 0,
            rolling_balance INTEGER NOT NULL DEFAULT 0,
            inflows INTEGER NOT NULL DEFAULT 0,
            outflows INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (entities_account_id, month)
        );

        -- 6. Master Categories
        CREATE TABLE IF NOT EXISTS be_master_categories (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            internal_name TEXT,
            deletable INTEGER NOT NULL DEFAULT 1,
            sortable_index INTEGER NOT NULL DEFAULT 0,
            name TEXT NOT NULL,
            note TEXT,
            is_hidden INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 7. Subcategories (DFT, DBT Credit Card Payment, Internal Categories)
        CREATE TABLE IF NOT EXISTS be_subcategories (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_master_category_id TEXT NOT NULL REFERENCES be_master_categories(id) ON DELETE CASCADE,
            entities_account_id TEXT REFERENCES be_accounts(id) ON DELETE SET NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            internal_name TEXT,
            sortable_index INTEGER NOT NULL DEFAULT 0,
            pinned_index INTEGER,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'DFT',
            note TEXT,
            is_hidden INTEGER NOT NULL DEFAULT 0,
            goal_type TEXT,
            goal_created_on TEXT,
            goal_needs_whole_amount INTEGER,
            goal_target_amount INTEGER,
            goal_target_date TEXT,
            goal_cadence INTEGER,
            goal_cadence_frequency INTEGER,
            goal_day INTEGER,
            monthly_funding INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 8. Monthly Budgets (mb/<YYYY-MM>/<budgetId>)
        CREATE TABLE IF NOT EXISTS be_monthly_budgets (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            month TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (budget_id, month)
        );

        -- 9. Monthly Budget Calculations (mbc/<YYYY-MM>/<budgetId>)
        CREATE TABLE IF NOT EXISTS be_monthly_budget_calculations (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_monthly_budget_id TEXT NOT NULL REFERENCES be_monthly_budgets(id) ON DELETE CASCADE,
            month TEXT NOT NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            immediate_income INTEGER NOT NULL DEFAULT 0,
            budgeted INTEGER NOT NULL DEFAULT 0,
            cash_outflows INTEGER NOT NULL DEFAULT 0,
            credit_outflows INTEGER NOT NULL DEFAULT 0,
            balance INTEGER NOT NULL DEFAULT 0,
            over_spent INTEGER NOT NULL DEFAULT 0,
            available_to_budget INTEGER NOT NULL DEFAULT 0,
            uncategorized_cash_outflows INTEGER NOT NULL DEFAULT 0,
            uncategorized_credit_outflows INTEGER NOT NULL DEFAULT 0,
            uncategorized_balance INTEGER NOT NULL DEFAULT 0,
            additional_to_be_budgeted INTEGER NOT NULL DEFAULT 0,
            age_of_money INTEGER,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (budget_id, month)
        );

        -- 10. Monthly Subcategory Budgets (mcb/<YYYY-MM>/<subCategoryId>)
        CREATE TABLE IF NOT EXISTS be_monthly_subcategory_budgets (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_monthly_budget_id TEXT NOT NULL REFERENCES be_monthly_budgets(id) ON DELETE CASCADE,
            entities_subcategory_id TEXT NOT NULL REFERENCES be_subcategories(id) ON DELETE CASCADE,
            month TEXT NOT NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            budgeted INTEGER NOT NULL DEFAULT 0,
            goal_snoozed_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (entities_subcategory_id, month)
        );

        -- 11. Monthly Subcategory Budget Calculations (mcbc/<YYYY-MM>/<subCategoryId>)
        CREATE TABLE IF NOT EXISTS be_monthly_subcategory_budget_calculations (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_monthly_subcategory_budget_id TEXT NOT NULL REFERENCES be_monthly_subcategory_budgets(id) ON DELETE CASCADE,
            entities_subcategory_id TEXT NOT NULL REFERENCES be_subcategories(id) ON DELETE CASCADE,
            month TEXT NOT NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            balance_previous_month INTEGER NOT NULL DEFAULT 0,
            cash_outflows INTEGER NOT NULL DEFAULT 0,
            positive_cash_outflows INTEGER,
            credit_outflows INTEGER NOT NULL DEFAULT 0,
            balance INTEGER NOT NULL DEFAULT 0,
            budgeted_cash_outflows INTEGER NOT NULL DEFAULT 0,
            unbudgeted_cash_outflows INTEGER NOT NULL DEFAULT 0,
            budgeted_credit_outflows INTEGER NOT NULL DEFAULT 0,
            unbudgeted_credit_outflows INTEGER NOT NULL DEFAULT 0,
            budgeted_spending INTEGER,
            all_spending INTEGER,
            all_spending_since_last_payment INTEGER,
            ccpc_missing_overspending INTEGER NOT NULL DEFAULT 0,
            ccpc_missing_uncategorized INTEGER NOT NULL DEFAULT 0,
            additional_to_be_budgeted INTEGER NOT NULL DEFAULT 0,
            upcoming_transactions INTEGER NOT NULL DEFAULT 0,
            upcoming_transactions_count INTEGER NOT NULL DEFAULT 0,
            upcoming_transactions_first_date TEXT,
            goal_overall_funded INTEGER NOT NULL DEFAULT 0,
            goal_overall_outflows INTEGER NOT NULL DEFAULT 0,
            goal_under_funded INTEGER NOT NULL DEFAULT 0,
            goal_target INTEGER NOT NULL DEFAULT 0,
            goal_overall_left INTEGER NOT NULL DEFAULT 0,
            goal_expected_completion INTEGER NOT NULL DEFAULT 0,
            goal_percentage_complete INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (entities_subcategory_id, month)
        );

        -- 12. Payees
        CREATE TABLE IF NOT EXISTS be_payees (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_account_id TEXT REFERENCES be_accounts(id) ON DELETE CASCADE,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            name TEXT NOT NULL,
            internal_name TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            auto_fill_subcategory_id TEXT REFERENCES be_subcategories(id) ON DELETE SET NULL,
            auto_fill_user_defined_subcategory_id TEXT REFERENCES be_subcategories(id) ON DELETE SET NULL,
            auto_fill_memo TEXT,
            auto_fill_amount INTEGER,
            auto_fill_subcategory_enabled INTEGER NOT NULL DEFAULT 1,
            auto_fill_memo_enabled INTEGER NOT NULL DEFAULT 1,
            auto_fill_amount_enabled INTEGER NOT NULL DEFAULT 1,
            rename_on_import_enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 13. Transactions
        CREATE TABLE IF NOT EXISTS be_transactions (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_account_id TEXT NOT NULL REFERENCES be_accounts(id) ON DELETE CASCADE,
            entities_payee_id TEXT REFERENCES be_payees(id) ON DELETE SET NULL,
            entities_subcategory_id TEXT REFERENCES be_subcategories(id) ON DELETE SET NULL,
            entities_scheduled_transaction_id TEXT,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            date TEXT NOT NULL,
            date_entered_from_schedule TEXT,
            amount INTEGER NOT NULL,
            cash_amount INTEGER NOT NULL DEFAULT 0,
            credit_amount INTEGER NOT NULL DEFAULT 0,
            credit_amount_adjusted INTEGER NOT NULL DEFAULT 0,
            subcategory_credit_amount_preceding INTEGER NOT NULL DEFAULT 0,
            memo TEXT,
            cleared TEXT NOT NULL DEFAULT 'Uncleared',
            accepted INTEGER NOT NULL DEFAULT 1,
            check_number TEXT,
            flag TEXT,
            transfer_account_id TEXT REFERENCES be_accounts(id) ON DELETE SET NULL,
            transfer_transaction_id TEXT,
            transfer_subtransaction_id TEXT,
            matched_transaction_id TEXT,
            ynab_id TEXT,
            imported_payee TEXT,
            imported_date TEXT,
            source TEXT,
            debt_transaction_type TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 14. Split Subtransactions
        CREATE TABLE IF NOT EXISTS be_subtransactions (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_transaction_id TEXT NOT NULL REFERENCES be_transactions(id) ON DELETE CASCADE,
            entities_payee_id TEXT REFERENCES be_payees(id) ON DELETE SET NULL,
            entities_subcategory_id TEXT REFERENCES be_subcategories(id) ON DELETE SET NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            amount INTEGER NOT NULL,
            cash_amount INTEGER NOT NULL DEFAULT 0,
            credit_amount INTEGER NOT NULL DEFAULT 0,
            credit_amount_adjusted INTEGER NOT NULL DEFAULT 0,
            subcategory_credit_amount_preceding INTEGER NOT NULL DEFAULT 0,
            memo TEXT,
            check_number TEXT,
            transfer_account_id TEXT REFERENCES be_accounts(id) ON DELETE SET NULL,
            transfer_transaction_id TEXT,
            sortable_index INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 15. Scheduled Transactions
        CREATE TABLE IF NOT EXISTS be_scheduled_transactions (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_account_id TEXT NOT NULL REFERENCES be_accounts(id) ON DELETE CASCADE,
            entities_payee_id TEXT REFERENCES be_payees(id) ON DELETE SET NULL,
            entities_subcategory_id TEXT REFERENCES be_subcategories(id) ON DELETE SET NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            date TEXT NOT NULL,
            frequency TEXT NOT NULL,
            amount INTEGER NOT NULL,
            memo TEXT,
            flag TEXT,
            transfer_account_id TEXT REFERENCES be_accounts(id) ON DELETE SET NULL,
            upcoming_instances TEXT,
            debt_transaction_type TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 16. Scheduled Subtransactions
        CREATE TABLE IF NOT EXISTS be_scheduled_subtransactions (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_scheduled_transaction_id TEXT NOT NULL REFERENCES be_scheduled_transactions(id) ON DELETE CASCADE,
            entities_payee_id TEXT REFERENCES be_payees(id) ON DELETE SET NULL,
            entities_subcategory_id TEXT REFERENCES be_subcategories(id) ON DELETE SET NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            amount INTEGER NOT NULL,
            memo TEXT,
            transfer_account_id TEXT REFERENCES be_accounts(id) ON DELETE SET NULL,
            sortable_index INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 17. Money Movement Groups (e.g. Recent Moves, Auto-Assign batches)
        CREATE TABLE IF NOT EXISTS be_money_movement_groups (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            performed_by_user_id TEXT,
            source TEXT,
            note TEXT,
            month TEXT NOT NULL,
            group_created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_entities_subcategory_id TEXT
        );

        -- 18. Money Movements (Append-only audit trail for Recent Moves)
        CREATE TABLE IF NOT EXISTS be_money_movements (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL REFERENCES be_budgets(id) ON DELETE CASCADE,
            entities_money_movement_group_id TEXT REFERENCES be_money_movement_groups(id) ON DELETE SET NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            from_entities_monthly_subcategory_budget_id TEXT,
            to_entities_monthly_subcategory_budget_id TEXT,
            amount INTEGER NOT NULL,
            performed_by_user_id TEXT,
            source TEXT,
            note TEXT,
            move_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            move_accepted_at TEXT
        );

        -- 19. Undo/Redo ChangeSet Tables (Unit-of-work ACID rollback)
        CREATE TABLE IF NOT EXISTS changesets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget_id TEXT NOT NULL,
            stack TEXT NOT NULL CHECK (stack IN ('undo', 'redo')),
            label TEXT NOT NULL,
            context_json TEXT,
            earliest_affected_month TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS changeset_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            changeset_id INTEGER NOT NULL REFERENCES changesets(id) ON DELETE CASCADE,
            seq INTEGER NOT NULL,
            entity_table TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            op TEXT NOT NULL CHECK (op IN ('insert', 'update')),
            before_json TEXT,
            after_json TEXT NOT NULL
        );

        -- Indexes for high-performance range queries and rollovers
        CREATE INDEX IF NOT EXISTS idx_tx_budget_date ON be_transactions(budget_id, is_tombstone, date);
        CREATE INDEX IF NOT EXISTS idx_tx_account ON be_transactions(entities_account_id, is_tombstone, date);
        CREATE INDEX IF NOT EXISTS idx_tx_category ON be_transactions(entities_subcategory_id, is_tombstone, date);
        CREATE INDEX IF NOT EXISTS idx_mscb_month ON be_monthly_subcategory_budgets(budget_id, month);
        CREATE INDEX IF NOT EXISTS idx_mcbc_month ON be_monthly_subcategory_budget_calculations(budget_id, month);
        CREATE INDEX IF NOT EXISTS idx_payees_account ON be_payees(entities_account_id);
        "#
    )?;
    Ok(())
}
