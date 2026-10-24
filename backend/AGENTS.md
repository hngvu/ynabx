# AGENTS.md — Backend (`backend/`)

**Scope**: this file governs `backend/` only.

**Navigation**: ↑ [Root AGENTS.md](../AGENTS.md) · [INVARIANTS.md](../INVARIANTS.md)

## Local Architecture

`backend/` is a Java Spring Boot service structured by domain capability (`budget`, `account`, `transaction`, `category`, `auth`). Controllers handle HTTP + DTO validation (`jakarta.validation`), Domain Services execute transactional business logic (`@Transactional`), and Repositories handle persistence against PostgreSQL.

## Local Invariants

- All JPA entities and JDBC queries touching monetary columns MUST map to `long` / `Long` (milliunits) — never `double`, `float`, or unscaled `BigDecimal` — *Enforced by: make lint-backend & make test-backend*
- Services mutating `MonthlyCategoryAllocation` or `Transaction` rows MUST acquire appropriate row/budget-level locks or optimistic version checks (`@Version`) to prevent concurrent allocation race conditions — *Enforced by: make test-backend*
- Flyway migrations under `backend/src/main/resources/db/migration/` MUST follow `V<number>__<snake_case_description>.sql` naming and remain backwards-compatible — *Enforced by: make test-backend*

## Local Footguns

### JPA Dirty Checking & Unintended Flushes in Budget Calculation
- Mutating managed JPA entities inside a read/calculation helper method within an active `@Transactional` context will flush unintended changes to PostgreSQL at commit time.
- Use immutable Java `record` projections or `@Transactional(readOnly = true)` for monthly budget rollup calculations.

### Timezone Drift on Budget Months and Transaction Dates
- Transaction dates (`LocalDate`) and budget months (`YearMonth`, stored as `YYYY-MM-01` `DATE` or `CHAR(7)`) are calendar dates in the budget's local timezone, NOT UTC instants (`Instant` / `OffsetDateTime`).
- Converting transaction dates through UTC timestamps shifts midnight transactions into the previous/next day or month for users in `UTC+7` or `UTC-5`. Always use `java.time.LocalDate` for transaction dates and `java.time.YearMonth` for budget months; use `Instant` only for audit fields (`created_at`, `updated_at`).

## Local Workflows

- Run backend checks via root `Makefile`: `make lint-backend`, `make typecheck-backend`, `make test-backend`.
- When adding a database migration, follow [.agents/skills/db-migration/SKILL.md](../.agents/skills/db-migration/SKILL.md).
- When modifying budget math or transaction ledger behavior, follow [.agents/skills/budget-domain-change/SKILL.md](../.agents/skills/budget-domain-change/SKILL.md).
