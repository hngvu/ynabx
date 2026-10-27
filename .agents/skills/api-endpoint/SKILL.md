---
name: api-endpoint
description: Design, add, or update a REST API endpoint across openapi.yaml, the Java Spring Boot backend, and the React TypeScript frontend. Use when introducing or modifying /api/v1/** routes.
---

# API Endpoint Implementation (Spec-First)

## Entry Criteria
- The task adds or modifies an HTTP endpoint under `/api/v1/**` or changes request/response DTO schemas.

## Instructions
1. Read [backend/AGENTS.md](../../../backend/AGENTS.md) and [frontend/AGENTS.md](../../../frontend/AGENTS.md). (Also read root [AGENTS.md](../../../AGENTS.md) and [INVARIANTS.md](../../../INVARIANTS.md) if not auto-loaded.)
2. **Update `openapi.yaml` first**:
   - Define the path, HTTP method, parameters, request body, and response schemas.
   - Ensure all monetary fields are integer `int64` milliunits (`*_milliunits`) and error responses reference RFC 7807 `ProblemDetail`.
   - If the change is breaking to an existing endpoint, stop and escalate to a human reviewer.
3. **Implement in `backend/`**:
   - Scope all repository/service calls by the authenticated user's `plan_id` (tenant isolation).
   - Keep controller DTOs separate from domain entities.
   - Add controller contract tests (`@WebMvcTest`) and tenant-isolation integration tests (`*IT.java`).
4. **Integrate in `frontend/`** (if part of the task):
   - Update TypeScript API client types to match `openapi.yaml`.
   - Ensure query cache invalidation updates affected budget months and account balances.
5. Run `make check` from the repository root to verify linting, static types, and tests across both `backend/` and `frontend/`.

## Completion Criteria
- `openapi.yaml` matches the implemented controller route, status codes, and DTO schemas.
- Every monetary field uses integer milliunits.
- Tenant isolation (`plan_id` ownership check) is enforced and covered by an automated test.
- `make check` passes.

## Resources
- [openapi.yaml](../../../openapi.yaml)
- [backend/AGENTS.md](../../../backend/AGENTS.md)
- [frontend/AGENTS.md](../../../frontend/AGENTS.md)
- [INVARIANTS.md](../../../INVARIANTS.md)
- [docs/TESTING.md](../../../docs/TESTING.md)
- [Makefile](../../../Makefile)
