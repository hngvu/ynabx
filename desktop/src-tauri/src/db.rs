use rusqlite::{params, Connection, Result};
use std::path::Path;
use uuid::Uuid;

pub struct Db {
    pub conn: Connection,
}

pub const DEFAULT_PLAN_ID: &str = "00000000-0000-0000-0000-000000000001";

impl Db {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Db { conn };
        db.init_schema()?;
        db.seed_defaults()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS plans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                currency_code TEXT NOT NULL DEFAULT 'USD',
                number_format TEXT NOT NULL DEFAULT '#,##0.00',
                currency_symbol_first INTEGER NOT NULL DEFAULT 1,
                currency_display_symbol INTEGER NOT NULL DEFAULT 1,
                date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS payees (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                transfer_account_id TEXT,
                deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                on_budget INTEGER NOT NULL DEFAULT 1,
                closed INTEGER NOT NULL DEFAULT 0,
                balance_milliunits INTEGER NOT NULL DEFAULT 0,
                cleared_balance_milliunits INTEGER NOT NULL DEFAULT 0,
                uncleared_balance_milliunits INTEGER NOT NULL DEFAULT 0,
                note TEXT,
                transfer_payee_id TEXT REFERENCES payees(id) ON DELETE SET NULL,
                last_reconciled_at TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS category_groups (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                is_system INTEGER NOT NULL DEFAULT 0,
                hidden INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                group_id TEXT NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                note TEXT,
                is_inflow_category INTEGER NOT NULL DEFAULT 0,
                is_credit_card_payment INTEGER NOT NULL DEFAULT 0,
                credit_card_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
                hidden INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS monthly_category_allocations (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                month TEXT NOT NULL,
                assigned_milliunits INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (category_id, month)
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                payee_id TEXT REFERENCES payees(id) ON DELETE SET NULL,
                category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                date TEXT NOT NULL,
                amount_milliunits INTEGER NOT NULL,
                memo TEXT,
                cleared TEXT NOT NULL DEFAULT 'UNCLEARED',
                approved INTEGER NOT NULL DEFAULT 1,
                transfer_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
                transfer_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
                deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )?;
        Ok(())
    }

    fn seed_defaults(&self) -> Result<()> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM plans WHERE id = ?1",
            params![DEFAULT_PLAN_ID],
            |row| row.get(0),
        )?;

        if count == 0 {
            self.conn.execute(
                r#"INSERT INTO plans (id, name, currency_code, number_format, currency_symbol_first, currency_display_symbol, date_format)
                   VALUES (?1, 'My Budget', 'USD', '#,##0.00', 1, 1, 'YYYY-MM-DD')"#,
                params![DEFAULT_PLAN_ID],
            )?;

            // Internal Master Inflow Category
            let internal_group_id = Uuid::new_v4().to_string();
            self.conn.execute(
                r#"INSERT INTO category_groups (id, plan_id, name, is_system, hidden, sort_order)
                   VALUES (?1, ?2, 'Internal Master Group', 1, 1, -1)"#,
                params![internal_group_id, DEFAULT_PLAN_ID],
            )?;

            let inflow_cat_id = Uuid::new_v4().to_string();
            self.conn.execute(
                r#"INSERT INTO categories (id, plan_id, group_id, name, is_inflow_category, sort_order)
                   VALUES (?1, ?2, ?3, 'Inflow: Ready to Assign', 1, -1)"#,
                params![inflow_cat_id, DEFAULT_PLAN_ID, internal_group_id],
            )?;

            // Default Envelope Category Groups
            let groups = [
                ("Immediate Obligations", vec!["Rent/Mortgage", "Electric", "Water", "Groceries", "Internet"]),
                ("True Expenses", vec!["Auto Maintenance", "Home Maintenance", "Medical", "Clothing"]),
                ("Quality of Life Goals", vec!["Vacation", "Fitness", "Education"]),
                ("Just for Fun", vec!["Dining Out", "Gaming", "Hobbies"]),
            ];

            for (group_order, (group_name, categories)) in groups.iter().enumerate() {
                let gid = Uuid::new_v4().to_string();
                self.conn.execute(
                    r#"INSERT INTO category_groups (id, plan_id, name, is_system, hidden, sort_order)
                       VALUES (?1, ?2, ?3, 0, 0, ?4)"#,
                    params![gid, DEFAULT_PLAN_ID, group_name, group_order as i32],
                )?;

                for (cat_order, cat_name) in categories.iter().enumerate() {
                    let cid = Uuid::new_v4().to_string();
                    self.conn.execute(
                        r#"INSERT INTO categories (id, plan_id, group_id, name, is_inflow_category, sort_order)
                           VALUES (?1, ?2, ?3, ?4, 0, ?5)"#,
                        params![cid, DEFAULT_PLAN_ID, gid, cat_name, cat_order as i32],
                    )?;
                }
            }
        }
        Ok(())
    }
}
