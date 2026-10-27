# docs/ARCHITECTURE.md — System Architecture

## System Overview

YNABx follows a decoupled monorepo architecture: a client-side Single-Page Application communicating over a REST API with a transactional Spring Boot backend persisted in PostgreSQL.

```mermaid
graph TD
    User["User (Browser)"] -->|"HTTPS / JSON"| SPA["React TypeScript SPA (frontend/)"]
    SPA -->|"REST API (/api/v1/**) — openapi.yaml"| API["Spring Boot API Server (backend/)"]
    API -->|"JDBC / Flyway (PostgreSQL 16)"| DB[("PostgreSQL Database")]
```

- **User (Browser)**: Interacts with the interactive monthly budget worksheet, account registers, and reconciliation modal.
- **React TypeScript SPA (`frontend/`)**: Renders the zero-based budgeting grid and account registers, formatting integer milliunits exclusively at the presentation layer, and optimistically updating budget cell state.
- **Spring Boot API Server (`backend/`)**: Enforces multi-tenant isolation (`budget_id`), executes double-entry and envelope budget calculations, coordinates transactions, and serves `/api/v1/**` endpoints.
- **PostgreSQL Database**: Relational source of truth for users, budgets, accounts, category groups, categories, monthly allocations, and split transactions.

## Data Flow

1. **Client Mutation (`User` → `SPA` → `API`)**: When a user assigns money to a category or records a transaction in `frontend/`, the UI converts user input into integer milliunits via `parseInputToMilliunits` and dispatches a JSON request (`POST`/`PATCH`) to `backend/` under `/api/v1/budgets/{budgetId}/...` (contract defined in `openapi.yaml`).
2. **Tenant & Auth Guard (`API`)**: Spring Security validates the authentication token and ensures `{budgetId}` belongs to the authenticated user before executing any domain service logic.
3. **Transactional Ledger & Envelope Calculation (`API` → `DB`)**: Inside an `@Transactional` boundary, the backend persists the transaction or monthly allocation row in PostgreSQL, updates paired transfer legs or credit-card payment category funding, and computes the monthly summary (`Assigned`, `Activity`, `Available`, `ReadyToAssign`).
4. **Authoritative State Response (`API` → `SPA`)**: The API returns the updated resource and affected monthly summary in integer milliunits (`_milliunits`), allowing the React query cache to reconcile optimistic state across the active and subsequent months.

## Key Components

### Level 2 — Containers

#### React TypeScript SPA (`frontend/`)

- **Role**: Delivers the interactive monthly budget worksheet, account transaction registers, and reporting views.
- **Interfaces**: Communicates with `backend/` via JSON over HTTPS (`openapi.yaml` contract).
- **Constraints**: [INVARIANTS.md §API Contract](../INVARIANTS.md#api-contract), [INVARIANTS.md §Code Quality](../INVARIANTS.md#code-quality)
- **Gotcha**: Must never store or compute currency as floats; see [frontend/AGENTS.md](../frontend/AGENTS.md).

#### Spring Boot API Server (`backend/`)

- **Role**: Owns authentication, tenant authorization, transactional ledger mutations, and zero-based envelope budgeting calculations.
- **Interfaces**: Exposes REST endpoints under `/api/v1/**` (`openapi.yaml`) and connects to PostgreSQL over JDBC.
- **Constraints**: [INVARIANTS.md §Security](../INVARIANTS.md#security), [INVARIANTS.md §Data Integrity](../INVARIANTS.md#data-integrity), [INVARIANTS.md §Performance](../INVARIANTS.md#performance)
- **Gotcha**: Monthly `Available` and `ReadyToAssign` depend on prior months' rollover and cash vs. credit overspending rules; see [AGENTS.md §Known Footguns](../AGENTS.md#known-footguns).

#### PostgreSQL Database

- **Role**: Stores persistent relational state for users, budgets, accounts, categories, monthly allocations, and transactions.
- **Interfaces**: Accessed exclusively by `backend/` via JDBC connection pool and managed via Flyway migrations (`backend/src/main/resources/db/migration/`).
- **Constraints**: [INVARIANTS.md §Data Integrity](../INVARIANTS.md#data-integrity)
- **Gotcha**: All monetary columns must use `BIGINT` (milliunits); schema changes must go through versioned Flyway SQL files.

### Level 3 — Components

#### `backend/` → Budget Calculation Engine

- **Role**: Computes monthly category `Assigned`, `Activity`, `Available`, credit card payment funding transfers, and budget-wide `ReadyToAssign` across month boundaries.
- **Interfaces**: Invoked by Budget and Transaction domain services within `@Transactional` boundaries.
- **Constraints**: [INVARIANTS.md §Data Integrity](../INVARIANTS.md#data-integrity), [INVARIANTS.md §Performance](../INVARIANTS.md#performance)
- **Gotcha**: Cash overspending in Month `M` reduces `ReadyToAssign` in Month `M+1`, whereas credit card overspending increases unbacked credit debt without reducing `ReadyToAssign`.

#### `backend/` → Transaction & Reconciliation Ledger

- **Role**: Manages regular transactions, split transactions (`subtransactions`), account-to-account transfers, and cleared/reconciled status transitions.
- **Interfaces**: Invoked by Transaction and Account controllers/services; writes to `transactions` and `subtransactions` tables.
- **Constraints**: [INVARIANTS.md §Data Integrity](../INVARIANTS.md#data-integrity)
- **Gotcha**: Account transfers consist of two linked legs (`transfer_account_id` / `transfer_transaction_id`) whose milliunit amounts must always be exact additive inverses (`+X` and `-X`).

## Performance Characteristics

- **SLA targets**: see [INVARIANTS.md §Performance](../INVARIANTS.md#performance)
- **Known bottlenecks**: Monthly budget rollup across many historical months if computed via per-category N+1 queries; mitigate with bulk SQL aggregation per `(budget_id, month)`.
- **Query Optimization**: Composite indexes on `(budget_id, month)` in `monthly_category_allocations` and `(budget_id, date)` in `transactions` (see `backend/src/main/resources/db/migration/V1__initial_schema.sql`).

## Security Architecture

- **Credential management**: Secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`) are injected via environment variables (`.env`) and cloud secret managers in production; never committed to Git.
- **Session handling**: Stateless JWT bearer tokens or secure session cookies validated on every `/api/v1/**` request.
- **Data protection**: Strict row-level tenant scoping by `budget_id` on every repository query; BCrypt password hashing.
- **Sensitive operations**: Password resets, budget deletion, and account reconciliation unlocking require explicit confirmation and audit logging.

## Deployment

- **Topology**: Containerized web + API + PostgreSQL (`docker-compose.yml` locally; horizontally scalable stateless API containers in production).
- **Load balancing**: Reverse proxy / ingress routing `/api/**` to Spring Boot (`:8080`) and static/SPA routes to Frontend (`:5173` in dev, static Nginx/CloudFront in prod).
- **State stores**: PostgreSQL (primary transactional store).
- **Scaling model**: Stateless `backend/` instances scale horizontally; database concurrency coordinated via PostgreSQL transactions and optimistic locking.

## Configuration Layers

| Layer | File / Directory | Purpose | Controls | Read by |
|---|---|---|---|---|
| 1 (Base Defaults) | `backend/src/main/resources/application.yml` | Base Spring Boot, JPA, context-path, and Flyway configuration | Context path `/api/v1`, Flyway migration path, Hibernate validate | `backend/` |
| 2 (Dev Profile) | `backend/src/main/resources/application-dev.yml` | Local development database connection and SQL logging | Local PostgreSQL URL, SQL formatting | `backend/` |
| 3 (Test Profile) | `backend/src/test/resources/application-test.yml` | Fast in-memory unit test database configuration | H2 in-memory DB, flyway disabled | `backend/` (test suite) |
| 4 (Environment) | `.env` (derived from `.env.example`) | Secrets, ports, and external service URLs | `POSTGRES_DB`, `POSTGRES_PORT`, `POSTGRES_PASSWORD`, `VITE_API_BASE_URL` | `docker-compose.yml`, `backend/`, `frontend/` |
