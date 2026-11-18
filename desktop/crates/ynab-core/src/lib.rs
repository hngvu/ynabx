//! `ynab-core`: Pure Rust Domain Engine for YNAB Desktop
//! - SQLite WAL Schema & Seeding (`schema`, `seed`)
//! - 2-Pass Zero-Based Envelope & Credit Card Calculation Engine (`calc`)
//! - Atomic Transfers, Split Subtransactions, Scheduled Transactions, Reconciliation & Payee Autocat (`ledger`)
//! - ACID Undo/Redo ChangeSet Engine (`changeset`)
//! - Reflect / Reports Analytics Engine (`analytics`)
//! - Integer Milliunit Currency & Date Formatting & CSV Exporter (`format`)
//! - Popover Coordinate Positioning Math (`layout`)
//! - Bank File Import, Payee Rename Rules & Heuristic Matching (`import`)
//! - Pure-Integer Loan & Amortization Solver (`loan`)
//! - Zero-N+1 SQLite Repository Services (`repo`)

pub mod analytics;
pub mod calc;
pub mod changeset;
pub mod commands_compat;
pub mod format;
pub mod import;
pub mod layout;
pub mod ledger;
pub mod loan;
pub mod repo;
pub mod schema;
pub mod seed;
pub mod sortable_index;

pub use commands_compat as commands;
pub use commands_compat::AppState;

#[cfg(test)]
mod tests;
