use rusqlite::Connection;
use crate::{schema, seed};

pub fn setup_test_db() -> Connection {
    let mut conn = Connection::open_in_memory().expect("failed to open in-memory sqlite db");
    schema::init_database(&conn).expect("failed to init schema");
    seed::seed_new_budget(&mut conn, seed::DEFAULT_BUDGET_ID, "Test Budget").expect("failed to seed budget");
    conn
}
