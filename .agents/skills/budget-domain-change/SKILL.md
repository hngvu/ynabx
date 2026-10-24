---
name: budget-domain-change
description: Implement or modify zero-based budgeting calculations, monthly category rollovers, credit card payment movements, or transaction ledger rules. Use whenever touching budget math or transaction domain services.
---

# Budget & Ledger Domain Change

## Entry Criteria
- The task modifies monthly budget calculations (`Assigned`, `Activity`, `Available`, `ReadyToAssign`), transaction splits, account transfers, credit card payment categories, or reconciliation state.

## Instructions
1. Read [INVARIANTS.md](../../../INVARIANTS.md) and [AGENTS.md](../../../AGENTS.md) if not already loaded in context.
2. Read [backend/AGENTS.md](../../../backend/AGENTS.md) (and [frontend/AGENTS.md](../../../frontend/AGENTS.md) if UI calculation/optimistic state is affected).
3. Verify how the change interacts with the core accounting rules in [docs/DECISIONS.md](../../../docs/DECISIONS.md):
   - Integer milliunit arithmetic (`1000` = `1.00`) and explicit split remainder assignment.
   - Month rollover boundary (`M -> M+1`): positive `Available` rolls over into the category; negative cash `Available` resets to `0` and deducts from `M+1` `ReadyToAssign`; credit overspending becomes debt without reducing `ReadyToAssign`.
   - Funded credit card spending moves `Available` from the expense category to the Credit Card Payment category.
   - Account-to-account transfers maintain paired opposite legs summing to `0` milliunits.
4. Write or update deterministic unit tests in `backend/src/test/` covering multi-month rollover sequences and edge cases (zero, negative, split remainders, credit vs. cash overspending) before or alongside the implementation.
5. Run validation via `Makefile`:
   - `make test-backend` (and `make test-frontend` if frontend files changed)
   - `make check`
6. Escalate to a human reviewer if the change alters existing accounting semantics or requires a historical ledger recalculation migration.

## Completion Criteria
- `make check` passes with zero lint, typecheck, or test failures.
- Unit and integration tests explicitly assert the Zero-Based Budgeting Conservation Invariant (`ReadyToAssign + Sum(CategoryAssigned) == TotalUnallocatedInflow + PriorMonthRollover`).
- `docs/DECISIONS.md` is updated if an architectural or domain calculation rule changed.

## Resources
- [AGENTS.md](../../../AGENTS.md)
- [INVARIANTS.md](../../../INVARIANTS.md)
- [backend/AGENTS.md](../../../backend/AGENTS.md)
- [frontend/AGENTS.md](../../../frontend/AGENTS.md)
- [docs/DECISIONS.md](../../../docs/DECISIONS.md)
- [docs/TESTING.md](../../../docs/TESTING.md)
- [Makefile](../../../Makefile)
