# INVARIANTS.md — Hard Constraints

These are non-negotiable. Violations require explicit human sign-off.
All constraints are enforced here; `AGENTS.md` links to this file rather than restating them.

## Security

- Every database query and API mutation on budgets, accounts, categories, or transactions MUST be scoped by the authenticated user's `budget_id` / tenant context (no cross-budget data leakage) — *Enforced by: make test-backend (tenant isolation integration tests) & human review*
- Passwords MUST be hashed using BCrypt via Spring Security `PasswordEncoder` (never plaintext, MD5, or SHA-1) — *Enforced by: make test-backend*
- Authentication and session/JWT validation logic changes require explicit human review — *Enforced by: human review*
- Secrets, database credentials, and signing keys MUST never be hardcoded in source files, `application.yml`, or committed `.env` files — *Enforced by: make lint & human review*
- PII and financial account numbers MUST be masked or excluded from application logs — *Enforced by: human review*

## Performance

- Monthly budget summary and category availability endpoints MUST execute in bounded queries (no N+1 query loops per category or per transaction) — *Enforced by: make test-backend (SQL query count assertions)*
- Bulk transaction import and bank reconciliation endpoints MUST use batch inserts/updates — *Enforced by: [not yet enforced]*
- API read endpoints p99 latency < 300ms under local/staging benchmark load — *Enforced by: [not yet enforced]*

## Testing & Quality

- Backend line and branch coverage MUST remain >= 80% (`jacoco`), with 100% unit test coverage on budget math and milliunit allocation calculators — *Enforced by: make test-backend*
- Frontend test suite MUST pass for all state reducers, currency formatters, and budget grid interactions — *Enforced by: make test-frontend*
- All financial invariant tests (Zero-Based Budget equation, Credit Card payment rollover, Transfer pair atomicity) MUST never be skipped or disabled (`@Disabled` / `.skip`) — *Enforced by: make lint & make test*
- All changes MUST pass `make check` (`lint`, `typecheck`, `test`) before merge — *Enforced by: make check*

## Data Integrity

- All monetary amounts MUST be represented, stored, and transmitted as integer **milliunits** (`1000` milliunits = `1.00` currency unit, stored as `BIGINT` in PostgreSQL and `long` in Java) — NEVER use `FLOAT`, `DOUBLE`, or IEEE 754 floating-point numbers for money — *Enforced by: make lint & make test*
- Zero-Based Budgeting Conservation Invariant: for any budget month, `ReadyToAssign + Sum(CategoryAssigned) == TotalUnallocatedInflow + PriorMonthRollover` MUST hold after every mutation — *Enforced by: make test-backend*
- Account-to-account transfers MUST be persisted and updated atomically as paired transactions summing to `0` milliunits — *Enforced by: make test-backend*
- Every PostgreSQL schema change MUST be authored as a versioned, immutable Flyway migration under `backend/src/main/resources/db/migration/` (never modify an already-applied migration; `spring.jpa.hibernate.ddl-auto` MUST be `validate` in non-test profiles) — *Enforced by: make test-backend & human review*
- Reconciled (`LOCKED`) transactions MUST NOT have their amount, account, or cleared status mutated without explicit un-reconciliation — *Enforced by: make test-backend*

## API Contract

- Every REST endpoint under `/api/v1/**` MUST be documented in `openapi.yaml` before or alongside implementation — *Enforced by: human review*
- All API monetary fields in JSON payloads MUST use integer milliunits with the `_milliunits` suffix (or documented contract type in `openapi.yaml`) — *Enforced by: make test-backend*
- All API errors MUST return standard RFC 7807 `ProblemDetail` JSON responses — *Enforced by: make test-backend*
- Breaking changes to existing `/api/v1/**` request/response schemas require human sign-off — *Enforced by: human review*

## Code Quality

- Backend Java code MUST pass Spotless/Checkstyle formatting and static analysis with zero warnings — *Enforced by: make lint-backend*
- Frontend TypeScript code MUST pass `eslint` and strict TypeScript type checking (`tsc --noEmit`) with no unchecked `any` — *Enforced by: make lint-frontend & make typecheck-frontend*
- Domain and service layers in `backend/` MUST NOT import web/controller DTOs; controllers map domain models to API DTOs at the boundary — *Enforced by: make lint-backend & human review*
- No `System.out.println` in Java or stray `console.log` in production frontend code; use structured logging (`SLF4J` on backend) — *Enforced by: make lint*
