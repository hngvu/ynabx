---
name: code-review
description: Audit code changes and pull request diffs against INVARIANTS.md, AGENTS.md, and openapi.yaml. Verify tenant isolation, milliunit money invariants, test coverage, and validation targets. Use before merging or submitting code changes for review.
---

# Code Review & Invariant Audit

## Entry Criteria
- A feature, bugfix, schema migration, or refactoring diff is ready for review before commit or pull request.
- Human or agent requests a code quality and invariant audit.

## Instructions

1. **Audit against [INVARIANTS.md](../../../INVARIANTS.md)**:
   - **Security & Multi-Tenancy**:
     - Verify every DB query and mutation explicitly scopes by the authenticated user's `plan_id`.
     - Check that no secrets, tokens, or PII are committed or logged without masking.
     - Ensure passwords use BCrypt `PasswordEncoder`.
   - **Data Integrity & Monetary Math**:
     - Verify all currency amounts use integer `long` / `int64` milliunits (`1000` = `1.00`). Reject any `float`, `double`, or IEEE 754 division without integer remainder handling.
     - Verify the Zero-Based Budgeting Conservation Equation holds: `ReadyToAssign + Sum(CategoryAssigned) == TotalUnallocatedInflow + PriorMonthRollover`.
     - Verify account transfers create atomic paired transactions summing to `0`.
     - Check that reconciled (`LOCKED`) transactions are immutable unless explicitly un-reconciled.
   - **API Contract**:
     - Confirm all new or altered `/api/v1/**` routes are documented in `openapi.yaml`.
     - Check monetary JSON properties have `_milliunits` suffix.
     - Check error responses follow RFC 7807 `ProblemDetail`.
   - **Code Quality**:
     - Verify domain and service layers do not import web DTOs.
     - Ensure no `System.out.println` or stray `console.log` exist.

2. **Check for Known Footguns in [AGENTS.md](../../../AGENTS.md)**:
   - Rollover calculations must account for positive rollovers, cash overspending (resets to 0, deducted from next month RTA), and credit overspending (becomes debt).
   - Credit card spending must automatically fund the credit card payment category.
   - Avoid N+1 queries when loading budget month grids (use projection/bulk queries).

3. **Verify Automated Validation**:
   - Run `make check` (or target-specific `make lint`, `make typecheck`, `make test`).
   - Confirm no test is marked `@Disabled`, `@Ignore`, or `.skip`.
   - Check that backend test coverage meets >= 80% with 100% on budget math.

4. **Escalation Triggers**:
   - Escalate to a human reviewer if the diff touches:
     - Authentication / authorization logic.
     - Flyway database migrations (`backend/src/main/resources/db/migration/`).
     - Core budget rollover or credit card payment calculation rules.
     - Breaking schema or endpoint changes in `openapi.yaml`.

## Completion Criteria
- Comprehensive audit report generated highlighting passing checks, warnings, and blockers.
- All non-negotiable invariants verified.
- `make check` cleanly passes or actionable remediation steps are reported.

## Resources
- [INVARIANTS.md](../../../INVARIANTS.md)
- [AGENTS.md](../../../AGENTS.md)
- [backend/AGENTS.md](../../../backend/AGENTS.md)
- [frontend/AGENTS.md](../../../frontend/AGENTS.md)
- [openapi.yaml](../../../openapi.yaml)
- [docs/TESTING.md](../../../docs/TESTING.md)
- [Makefile](../../../Makefile)
