# AGENTS.md — Repository Constraints & Context

> **Read [INVARIANTS.md](INVARIANTS.md) first** — it lists non-negotiable constraints that apply to all work in this repository.

## Repository Overview

**ynabx** is a zero-based envelope budgeting web application (YNAB clone) where every unit of income is assigned a job across monthly category envelopes, tracking bank accounts, credit card payment categories, account transfers, and reconciliation.

The system consists of a **React + TypeScript SPA** (`frontend/`), a **Java Spring Boot REST API** (`backend/`), and a **PostgreSQL** relational database storing transactional ledgers and monthly category allocations. See [Architecture](docs/ARCHITECTURE.md) for system diagrams, and [User Behavior](docs/BEHAVIOR.md) for the end-user interaction specification and lifecycle workflows.

## Module Context

- [backend/AGENTS.md](backend/AGENTS.md) — Java Spring Boot API, zero-based budget calculation engine, Flyway migrations, and PostgreSQL access rules
- [frontend/AGENTS.md](frontend/AGENTS.md) — React TypeScript SPA, budget grid state, optimistic updates, and milliunit UI formatting rules

## Agent Authorization

### FeatureImplementer
- Authority: Can create/edit application code, tests, and documentation on feature branches; can run all targets in `Makefile`. Cannot merge to `main` or modify `INVARIANTS.md` without human approval.
- Escalation: Changes touching authentication/authorization, budget math invariants, Flyway database migrations, or breaking changes in `openapi.yaml` require human review.

### CodeReviewer
- Authority: Can audit diffs against `INVARIANTS.md`, `AGENTS.md`, and `openapi.yaml`, run `make check`, and request changes on PRs.
- Escalation: Security-sensitive diffs, schema migrations, or ledger calculation changes must be escalated for human sign-off.

### DatabaseMigrator
- Authority: Can draft new additive Flyway migration scripts (`V<N>__<description>.sql`) and corresponding JPA/JOOQ mappings on feature branches.
- Escalation: Destructive schema changes (`DROP`, column type narrowing, data backfills on ledger tables) always require human approval before merge.

## Conventions

- **Commits & branches**: see [CONTRIBUTING.md](CONTRIBUTING.md) — single source of truth
- **Execution surface**: Run build, test, lint, and typecheck commands exclusively via `Makefile` targets (`make help`, `make check`).

## Known Footguns

### 1. Floating-Point Rounding in Currency Calculations
- **What happens**: Using `double`/`float` in Java or `Number` division in JS without integer rounding causes `0.1 + 0.2 = 0.30000000000000004` drift, breaking the zero-sum budget invariant by 1–2 milliunits when distributing amounts across categories (e.g. auto-assign, reconciliation adjustments).
- **Why it exists**: YNAB uses **milliunits** (`$12.34` = `12340`). Dividing `$10.00` (`10000` milliunits) three ways leaves a remainder of `1` milliunit (`3333 + 3333 + 3334`).
- **What to watch for**:
  - Always perform arithmetic in integer milliunits (`long` in Java, integer math in TypeScript).
  - When allocating amounts proportionally, explicitly allocate the remainder milliunits to the first (or largest) part so the sum of parts equals the exact total.
  - See [docs/DECISIONS.md#adr-001-integer-milliunits-for-monetary-amounts](docs/DECISIONS.md#adr-001-integer-milliunits-for-monetary-amounts).

### 2. Ready-to-Assign (`RTA`) Double-Counting Across Month Rollovers
- **What happens**: Naive implementations recalculate a month's `Available` category balance from only that month's `Assigned + Activity`, ignoring positive rollover from prior months or cash vs. credit overspending reset rules at month boundaries.
- **Why it exists**: In zero-based envelope budgeting:
  - Positive `Available` in Category `C` at end of Month `M` rolls over into Category `C` in Month `M+1`.
  - **Cash overspending** (negative `Available` from checking/cash transactions) in Month `M` resets Category `C`'s starting balance to `0` in Month `M+1` and deducts the overspent amount from Month `M+1`'s `Ready to Assign` (`RTA`).
  - **Credit overspending** (negative `Available` from credit card transactions) does *not* deduct from `RTA`; instead, it becomes unbacked debt until budgeted.
- **What to watch for**:
  - Never compute a month's budget state in isolation without prior-month rollup state.
  - See [docs/DECISIONS.md#adr-002-rollover-envelope-budgeting-calculation-model](docs/DECISIONS.md#adr-002-rollover-envelope-budgeting-calculation-model).

### 3. Credit Card Payment Category Automatic Movement
- **What happens**: When a user spends `$50` (`-50000` milliunits) on a budgeted category (e.g., Groceries) using a Credit Card account, the Groceries `Available` decreases by `$50`, AND the corresponding **Credit Card Payment** category's `Available` must automatically increase by `$50` (up to the funded amount available in Groceries).
- **Why it exists**: The money assigned to Groceries still sits in the bank account, but its job has changed from "buy groceries" to "pay back the credit card".
- **What to watch for**:
  - Editing, deleting, or recategorizing a credit-card transaction must recompute the funded transfer to the Credit Card Payment category.
  - Account-to-account transfers from Checking to the Credit Card account must use the Credit Card Payment category activity rather than requiring a regular expense category.

### 4. N+1 Queries When Loading a Budget Month Grid
- **What happens**: Fetching category groups, then querying categories per group, then querying monthly allocations and transaction activity sums per category fires 100+ SQL queries for a single budget view.
- **Why it exists**: Lazy-loaded ORM relationships on `CategoryGroup -> Category -> MonthlyCategoryBudget` and per-category `SUM(amount)` queries.
- **What to watch for**:
  - Fetch category hierarchy and aggregated monthly activity using bulk/projection queries scoped by `(plan_id, month)` in a single round-trip.
