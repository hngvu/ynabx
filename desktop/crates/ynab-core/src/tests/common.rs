use crate::{schema, seed, AppState};
use rusqlite::Connection;
use std::cell::RefCell;
use std::sync::Arc;

pub struct MockApp {
    state: RefCell<Option<Arc<AppState>>>,
}

impl MockApp {
    pub fn manage(&self, state: AppState) {
        *self.state.borrow_mut() = Some(Arc::new(state));
    }

    #[allow(clippy::extra_unused_type_parameters)]
    pub fn state<T>(&self) -> Arc<AppState> {
        self.state.borrow().as_ref().unwrap().clone()
    }
}

pub fn mock_app() -> MockApp {
    MockApp {
        state: RefCell::new(None),
    }
}

pub fn setup_test_db() -> Connection {
    let mut conn = Connection::open_in_memory().expect("failed to open in-memory sqlite db");
    schema::init_database(&conn).expect("failed to init schema");
    seed::seed_new_budget(&mut conn, seed::DEFAULT_BUDGET_ID, "Test Budget")
        .expect("failed to seed budget");
    conn
}
