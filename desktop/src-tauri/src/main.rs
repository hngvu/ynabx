#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod calc;
mod changeset;
mod commands;
mod ledger;
mod schema;
mod seed;
mod sortable_index;

#[cfg(test)]
mod tests;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[tauri::command]
fn ping() -> &'static str {
    "pong"
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            println!("[YNAB Desktop] Initializing database in AppData...");
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");
            let db_path = app_data_dir.join("ynab_desktop.sqlite");
            let mut conn = Connection::open(&db_path)
                .expect("Failed to open SQLite database in AppData");
            schema::init_database(&conn).expect("Failed to initialize database schema");
            seed::seed_new_budget_if_needed(&mut conn, seed::DEFAULT_BUDGET_ID, "My Plan")
                .expect("Failed to seed default budget");
            seed::cleanup_duplicate_system_categories(&mut conn, seed::DEFAULT_BUDGET_ID)
                .expect("Failed to clean up duplicate system categories");
            println!("[YNAB Desktop] Database ready at {:?}", db_path);

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            for (label, window) in app.webview_windows() {
                println!("[YNAB Desktop] Showing window: {}", label);
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            commands::get_plan_summary,
            commands::get_accounts,
            commands::create_account,
            commands::update_account,
            commands::delete_account,
            commands::close_account,
            commands::get_budget_month,
            commands::set_category_assigned,
            commands::set_category_goal,
            commands::snooze_category_goal,
            commands::apply_quick_budget,
            commands::create_category_group,
            commands::create_subcategory,
            commands::rename_category,
            commands::delete_category,
            commands::hide_category,
            commands::update_category_note,
            commands::update_plan_settings,
            commands::get_transactions,
            commands::save_transaction,
            commands::delete_transactions,
            commands::bulk_update_transactions,
            commands::toggle_transaction_cleared,
            commands::reconcile_account,
            commands::get_payees,
            commands::update_payee,
            commands::delete_payee,
            commands::reorder_accounts,
            commands::reorder_categories,
            commands::make_fresh_start,
        ])
        .run(tauri::generate_context!())
        .expect("error while running YNAB Desktop application");
}
