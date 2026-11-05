// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod budget_calculator;
mod commands;
mod db;

use commands::AppState;
use db::Db;
use std::sync::Mutex;
use tauri::Manager;

fn main() {
    let db_path = "ynab_desktop.sqlite";
    println!("[TAURI MAIN] Starting YNAB Desktop...");
    let db = Db::open(db_path).expect("Failed to initialize SQLite database");
    println!("[TAURI MAIN] DB opened successfully.");

    tauri::Builder::default()
        .setup(|app| {
            println!("[TAURI MAIN] Setup hook running...");
            for (label, window) in app.webview_windows() {
                println!("[TAURI MAIN] Found window: {}", label);
                let _ = window.show();
                let _ = window.set_focus();
                #[cfg(debug_assertions)]
                {
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
