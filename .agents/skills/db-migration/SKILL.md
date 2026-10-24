---
name: db-migration
description: Author and verify a PostgreSQL Flyway schema migration in the Spring Boot backend. Use whenever adding or altering database tables, columns, indexes, or constraints.
---

# PostgreSQL Flyway Database Migration

## Entry Criteria
- The task requires creating or modifying database tables, columns, indexes, or constraints in PostgreSQL.

## Instructions
1. Read [backend/AGENTS.md](../../../backend/AGENTS.md) (and root [INVARIANTS.md](../../../INVARIANTS.md) if not auto-loaded).
2. Create a new versioned SQL migration file in `backend/src/main/resources/db/migration/V<N>__<snake_case_description>.sql`:
   - Never edit or delete an existing committed `V*__*.sql` migration file.
   - Use `BIGINT` for all monetary columns (milliunits) — never `FLOAT`, `DOUBLE PRECISION`, or `NUMERIC` without explicit ADR approval.
   - Use `DATE` for calendar transaction dates / budget months, and `TIMESTAMPTZ` for system audit timestamps (`created_at`, `updated_at`).
   - Include `budget_id` foreign key and composite indexes `(budget_id, ...)` on tenant-scoped tables to prevent full-table scans and support tenant isolation.
3. Update corresponding Java JPA entities / records in `backend/` to match the new schema (`spring.jpa.hibernate.ddl-auto=validate`).
4. Add or update a Testcontainers PostgreSQL integration test in `backend/src/test/` verifying that Flyway applies the migration cleanly and JPA schema validation succeeds.
5. Run `make test-backend` and `make check`.
6. Flag the PR for mandatory human review (all schema changes require human sign-off per [AGENTS.md](../../../AGENTS.md)).

## Completion Criteria
- New immutable Flyway migration file created under `backend/src/main/resources/db/migration/`.
- All monetary columns use `BIGINT` (milliunits) and tenant-scoped tables index `budget_id`.
- `make check` passes including Testcontainers Flyway validation.
- Human review requested on the migration.

## Resources
- [backend/AGENTS.md](../../../backend/AGENTS.md)
- [INVARIANTS.md](../../../INVARIANTS.md)
- [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md)
- [docs/TESTING.md](../../../docs/TESTING.md)
- [Makefile](../../../Makefile)
