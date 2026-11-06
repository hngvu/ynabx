mod calc;
mod changeset;
mod ledger;
mod schema;
mod seed;
mod sortable_index;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, State};

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[tauri::command]
fn ping() -> &'static str {
    "pong"
}

fn main() {
    println!("[YNAB Desktop] Initializing database...");
    let conn = Connection::open("ynab_desktop.sqlite").expect("Failed to open SQLite database");
    schema::init_database(&conn).expect("Failed to initialize database schema");
    seed::seed_new_budget(&conn, seed::DEFAULT_BUDGET_ID, "My Plan")
        .expect("Failed to seed default budget");
    println!("[YNAB Desktop] Database ready.");

    tauri::Builder::default()
        .setup(|app| {
            for (label, window) in app.webview_windows() {
                println!("[YNAB Desktop] Showing window: {}", label);
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .manage(AppState {
            db: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running YNAB Desktop application");
}
