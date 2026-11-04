#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod budget_calculator;
mod commands;
mod db;

use commands::AppState;
use db::Db;
use std::sync::Mutex;
use tauri::Manager;

fn main() {
    let db_path = "ynab_desktop.sqlite";
    let db = Db::open(db_path).expect("Failed to initialize SQLite database");

    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.open_devtools();
                }
            }
            Ok(())
        })
        .manage(AppState {
            db: Mutex::new(db),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_plans,
            commands::get_accounts,
            commands::create_account,
            commands::get_category_groups,
            commands::get_month_budget,
            commands::update_category_allocation,
            commands::get_transactions,
            commands::save_transaction,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
