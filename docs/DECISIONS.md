# docs/DECISIONS.md — Architecture Decision Records

<!-- Decision records capture WHY a technical choice was made. -->

## ADR-001: Integer Milliunits for Monetary Amounts

**Date**: 2026-10-24
**Status**: Accepted
**Source**: Approved repository harness setup

**Context**

Personal budgeting requires exact decimal arithmetic across transaction splits, currency formatting, and zero-based envelope allocations. Standard floating-point representations (`double`/`float` in Java, `number` floats in JS) introduce binary rounding errors, while arbitrary-precision decimals across JSON APIs require string serialization and custom parsing on the frontend.

**Decision**

Represent all monetary values across PostgreSQL (`BIGINT`), Java backend (`long`), JSON API payloads (`*_milliunits`), and React frontend state (`number` integer) as **milliunits**, where `1000` milliunits equals `1.00` unit of currency (matching the official YNAB v1 API convention).

**Consequences**

- Exact integer addition and subtraction in SQL, Java, and TypeScript with zero floating-point drift.
- Supports up to 3 decimal places natively (covering standard 2-decimal currencies plus sub-cent split remainders).
- UI components must format milliunits (`amount / 1000`) only at display time and parse user input into milliunits at input boundaries.

**Agents Should Know**

- Never use `FLOAT`, `DOUBLE`, or unscaled floating-point math for currency in any layer.
- When splitting a parent transaction or proportionally distributing an allocation across $N$ items, distribute integer milliunits and assign the remainder (`total - sum(parts)`) explicitly so the sum of parts equals the exact total.

---

## ADR-002: Rollover Envelope Budgeting Calculation Model

**Date**: 2026-10-24
**Status**: Accepted
**Source**: Approved repository harness setup

**Context**

In a zero-based envelope budget (YNAB method), a category's `Available` balance in Month $M$ is not isolated to Month $M$; it depends on unspent funds or overspending from Month $M-1$, and cash overspending vs. credit card overspending behave differently at month boundaries.

**Decision**

Model category allocations per `(budget_id, category_id, month)` (`Assigned`) and derive `Activity` from ledger transactions in that month, computing `Available` and `ReadyToAssign` (`RTA`) according to zero-based rollover rules:
1. Positive `Available` at the end of Month $M-1$ rolls over into the category in Month $M$.
2. Negative `Available` caused by **cash** overspending resets the category to `0` in Month $M$ and subtracts the overspent amount from Month $M$'s `ReadyToAssign`.
3. Funded spending on a **Credit Card** account automatically shifts the funded amount from the spending category's `Available` to the corresponding Credit Card Payment category's `Available`.

**Consequences**

- Mutating a transaction or allocation in Month $M$ can affect `Available` and `ReadyToAssign` in Month $M$ and subsequent months $M+1 \dots$.
- Queries and caches must invalidate or recompute downstream months when historical months are edited.

**Agents Should Know**

- Read [.agents/skills/budget-domain-change/SKILL.md](../.agents/skills/budget-domain-change/SKILL.md) before changing any budget calculation or transaction ledger logic.
- Always add unit and integration test cases covering month boundary rollovers (`M -> M+1`) and mixed cash/credit overspending when touching the calculation engine.

---

## ADR-003: Monorepo with Java Spring Boot Backend, React Frontend, and PostgreSQL

**Date**: 2026-10-24
**Status**: Accepted
**Source**: Developer architecture selection during harness initialization

**Context**

`ynabx` requires strong transactional guarantees for double-entry/envelope ledger operations and a responsive, keyboard-driven spreadsheet-like UI for monthly budgeting.

**Decision**

Use a single repository containing:
- `backend/`: Java Spring Boot REST API with Flyway migrations and PostgreSQL persistence.
- `frontend/`: React + TypeScript SPA.
- `Makefile`: Unified multi-toolchain execution surface fanning out `install`, `build`, `lint`, `typecheck`, `test`, and `check` across both modules.

**Consequences**

- Single atomic PRs can update `openapi.yaml`, Spring Boot controllers/services, Flyway migrations, and React components together.
- Root `Makefile` shields agents and contributors from having to memorize separate Maven/Gradle and npm/pnpm flags.

**Agents Should Know**

- Always read the module-specific `AGENTS.md` ([backend/AGENTS.md](../backend/AGENTS.md) or [frontend/AGENTS.md](../frontend/AGENTS.md)) when working inside that subtree.
- Run `make check` at the repository root to validate both toolchains before completing a task.
