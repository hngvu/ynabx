---
name: integration-testing
description: Author, run, and maintain Spring Boot integration tests with PostgreSQL Testcontainers, Flyway schema validation, multi-tenant isolation, and mock MVC slice tests. Use when adding test coverage for database interactions or API endpoints.
---

# Integration & Slice Testing

## Entry Criteria
- Implementing or updating database queries, Flyway migrations, JPA entity relationships, or repository methods.
- Adding or modifying REST controllers requiring HTTP contract verification (`ProblemDetail`, status codes, serialization).
- Verifying multi-tenant isolation (`plan_id` scoping) or transaction concurrency locking against real PostgreSQL.

## Instructions

1. **Review Testing Strategy**:
   - Read [docs/TESTING.md](../../../docs/TESTING.md) and [INVARIANTS.md §Testing & Quality](../../../INVARIANTS.md#testing--quality).
   - Integration tests must run against real PostgreSQL using Testcontainers (`*IT.java` or `*IntegrationTest.java`).
   - MockMvc / `@WebMvcTest` slice tests verify controller routing, DTO serialization, validation errors, and RFC 7807 problem details without full database overhead.

2. **Authoring PostgreSQL Integration Tests (`*IT.java`)**:
   - Place in `backend/src/test/java/com/ynabx/integration/`.
   - Use `@SpringBootTest` with Testcontainers PostgreSQL container.
   - Test Flyway migrations: ensure clean startup and schema validation (`spring.jpa.hibernate.ddl-auto=validate`).
   - Test Tenant Isolation: assert that `User A` cannot read, update, or delete `plan_id` entities belonging to `User B`.
   - Test Atomic Transfers: assert paired transaction creation and rollback if either leg fails.
   - Assert Query Counts: verify no N+1 query loops when fetching budget grids or account registers.

3. **Authoring Web Slice Tests (`*ControllerTest.java`)**:
   - Place in `backend/src/test/java/com/ynabx/web/` or `backend/src/test/java/com/ynabx/controller/`.
   - Use `@WebMvcTest(YourController.class)` and `@MockBean` for underlying services.
   - Assert HTTP status codes (200, 201, 204, 400, 403, 404, 409).
   - Assert RFC 7807 `ProblemDetail` fields on error: `title`, `status`, `detail`, `instance`.
   - Verify integer milliunit formatting in request/response JSON payloads.

4. **Frontend Component & State Tests**:
   - Place in `frontend/src/__tests__/`.
   - Use Vitest and React Testing Library.
   - Test state transitions, optimistic UI updates, and error rollbacks.

5. **Execution & Verification**:
   - Run `make test-backend` to verify all unit and integration tests.
   - Run `make test-frontend` to verify React Vitest suite.
   - Ensure JaCoCo coverage remains >= 80% (100% on budget math calculators).
   - Ensure no tests are ignored or disabled (`@Disabled`, `.skip`).

## Completion Criteria
- Automated integration test (`*IT.java`) or controller test (`*Test.java`) committed and passing.
- Real PostgreSQL container verifies schema migrations and queries without mocking the database.
- `make test` and `make check` pass with zero failures.

## Resources
- [docs/TESTING.md](../../../docs/TESTING.md)
- [INVARIANTS.md](../../../INVARIANTS.md)
- [backend/AGENTS.md](../../../backend/AGENTS.md)
- [Makefile](../../../Makefile)
