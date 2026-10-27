# docs/TESTING.md — Testing Strategy

## Testing Philosophy

`ynabx` is a financial ledger and zero-based budgeting system where off-by-one milliunit rounding errors, broken month rollovers, or cross-tenant data leaks corrupt user budgets. The test suite prioritizes:
1. **Deterministic domain unit tests** for all milliunit math, split transactions, and monthly rollover rules.
2. **Real PostgreSQL integration tests** (via Testcontainers) for Flyway migrations, repository queries, concurrency locking, and tenant isolation.
3. **Component and state tests** on the React frontend for currency parsing/formatting and optimistic budget grid updates.

Coverage target and non-skippable test constraints: see [INVARIANTS.md §Testing & Quality](../INVARIANTS.md#testing--quality).

## Test Organisation

```
ynabx/
├── backend/
│   └── src/test/java/com/ynabx/
│       ├── domain/                  # Pure unit tests for budget math & ledger invariants (e.g. MilliunitsTest.java)
│       ├── web/                     # @WebMvcTest controller & RFC 7807 contract tests (e.g. HealthControllerTest.java)
│       └── integration/             # @SpringBootTest + PostgreSQL Testcontainers
└── frontend/
    └── src/
        └── __tests__/               # Vitest + React Testing Library tests (e.g. currency.test.ts)
```

- **Backend naming**: `*Test.java` for fast unit tests; `*IT.java` (or `*IntegrationTest.java`) for Testcontainers integration tests.
- **Frontend naming**: `*.test.ts` and `*.test.tsx` co-located in `__tests__/` directories alongside modules.

## Unit Testing Guidelines

- **What to unit test**:
  - Milliunit arithmetic, split remainder allocation, and inline calculator expression parsing.
  - Monthly rollover calculations (`Assigned`, `Activity`, `Available`, `ReadyToAssign`) across multi-month sequences.
  - Credit card funded spending movement and debt tracking when categories are overspent by cash vs. credit.
- **What not to unit test**:
  - Trivial getters/setters, framework boilerplate, or mocked SQL queries (test SQL against real PostgreSQL in integration tests).
- **Common patterns**:
  - Table-driven / `@ParameterizedTest` JUnit 5 tests covering positive, zero, negative, and boundary milliunit amounts.

## Integration Testing Guidelines

- **What to integration test**:
  - Flyway schema migrations from clean DB to latest version.
  - Multi-tenant isolation (`User A` cannot read or mutate `User B`'s `plan_id` entities).
  - Account-to-account transfer creation, update, and deletion atomicity.
  - Query count assertions verifying no N+1 queries on monthly budget summary endpoints.
- **Test infrastructure setup**:
  - Backend integration tests use **Testcontainers** (`org.testcontainers:postgresql`) to spin up an ephemeral PostgreSQL container automatically during `make test-backend` (Docker daemon must be running).
  - In-memory H2 database (`application-test.yml`) is used for slice and isolated component testing.

## Critical Paths

Operations that MUST always have automated test coverage (see [INVARIANTS.md](../INVARIANTS.md)):

- **Zero-Based Budget Conservation Equation** — see [INVARIANTS.md §Data Integrity](../INVARIANTS.md#data-integrity)
- **Milliunit Integer Representation & Split Remainder Distribution** — see [INVARIANTS.md §Data Integrity](../INVARIANTS.md#data-integrity)
- **Cross-Plan Tenant Isolation (`plan_id` scoping)** — see [INVARIANTS.md §Security](../INVARIANTS.md#security)
- **Credit Card Payment Category Automatic Funding & Transfer Legs** — see [AGENTS.md §Known Footguns](../AGENTS.md#known-footguns)
- **Reconciled (`LOCKED`) Transaction Immutability** — see [INVARIANTS.md §Data Integrity](../INVARIANTS.md#data-integrity)

## Running Tests

```bash
make test            # Run full backend + frontend test suites
make test-backend    # Run Java Spring Boot unit & integration tests (Maven verify)
make test-frontend   # Run React Vitest suite
make check           # Run lint + typecheck + test across the entire repository
```

## Mocking & Fixtures

- **Mock policy**: Never mock PostgreSQL or JPA repositories when testing query logic, constraints, or transactions — use Testcontainers PostgreSQL. Mock only external third-party HTTP integrations (e.g., bank sync webhooks) at the adapter boundary.
- **Fixtures location**:
  - Backend test builders/fixtures: `backend/src/test/java/com/ynabx/fixtures/`
  - Frontend test fixtures: `frontend/src/__tests__/fixtures/`
