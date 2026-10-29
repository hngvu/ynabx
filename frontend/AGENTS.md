# AGENTS.md — Frontend (`frontend/`)

**Scope**: this file governs `frontend/` only.

**Navigation**: ↑ [Root AGENTS.md](../AGENTS.md) · [INVARIANTS.md](../INVARIANTS.md) · [Design System](../docs/DESIGN.md)

## Local Architecture

`frontend/` is a React + TypeScript single-page application communicating with the Spring Boot API (`/api/v1/**`). Server state (monthly budget grid, account registers, category balances) is managed via query caching with optimistic updates on cell edits.

## Local Invariants

- All monetary values in frontend state, props, and API payloads MUST remain integer milliunits (`number` representing safe integers) until formatted at the leaf display component — _Enforced by: make lint-frontend & make test-frontend_
- User currency inputs (e.g., `"12.34"`, `"+50"`, `"-10.5"`) MUST be parsed into integer milliunits via a single tested parser utility (`parseInputToMilliunits`) before dispatching any state or API mutation — _Enforced by: make test-frontend_

## Local Footguns

### Stale `Ready to Assign` (`RTA`) Banner After Category Cell Edit

- Editing a category's `Assigned` cell in Month `M` affects not only that category's `Available` balance in Month `M`, but also `Ready to Assign` in Month `M` and potentially future months `M+1, ...` (when cash overspending is created or covered).
- Optimistic UI updates on a single cell must always reconcile with the server's authoritative monthly budget summary payload on mutation completion, and invalidate cached subsequent months.

### Inline Calculator Expression Parsing in Budget Cells

- YNAB budget cells support inline math expressions (`100 + 25.50`, `500 / 3`). Evaluating expressions with raw floating-point math before converting to milliunits introduces rounding discrepancies vs. backend milliunit math.
- Round the final parsed result to the nearest integer milliunit (`Math.round(value * 1000)`) immediately after expression evaluation and before state dispatch.

## Local Workflows

- Run frontend checks via root `Makefile`: `make lint-frontend`, `make typecheck-frontend`, `make test-frontend`.
- When consuming or adding API endpoints, follow [.agents/skills/api-endpoint/SKILL.md](../.agents/skills/api-endpoint/SKILL.md).
