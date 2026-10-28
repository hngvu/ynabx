# Contributing

## For Everyone

- All contributions must pass `make check` (`lint`, `typecheck`, `test`) before submitting a pull request.
- Keep pull requests focused on a single feature, bugfix, or architectural concern.
- Update `openapi.yaml` alongside any `/api/v1/**` endpoint additions or schema changes.
- Review [AGENTS.md](AGENTS.md) and [INVARIANTS.md](INVARIANTS.md) before modifying code.

## For Humans

- **Branches**: Use prefixes that mirror commit types:
  - `feat/<short-slug>` (e.g., `feat/credit-card-rollover`)
  - `fix/<short-slug>` (e.g., `fix/split-transaction-remainder`)
  - `docs/<short-slug>`
  - `refactor/<short-slug>`
  - `chore/<short-slug>`
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): subject` in imperative mood). The commit body explains *why* — the diff shows *what*.
  - Example 1: `feat(budget): deduct prior-month cash overspending from Ready to Assign`
  - Example 2: `fix(ledger): preserve milliunit remainder on 3-way split transactions`
- **PRs**: Include a summary of the change, affected modules (`backend`, `frontend`, `openapi.yaml`), verification steps run (`make check`), and links to any relevant ADR in [docs/DECISIONS.md](docs/DECISIONS.md).

## Quality Standards

All contributions must pass `make check`. Constraint values (coverage targets, linting rules, type-checking requirements, and data integrity invariants) are defined in [INVARIANTS.md](INVARIANTS.md).

## Common Tasks

| Task | Skill |
|---|---|
| Implement or modify budget calculations, rollovers, or ledger transactions | [budget-domain-change](.agents/skills/budget-domain-change/SKILL.md) |
| Add or update a REST API endpoint across OpenAPI, Spring Boot, and React | [api-endpoint](.agents/skills/api-endpoint/SKILL.md) |
| Create or review a PostgreSQL Flyway database migration | [db-migration](.agents/skills/db-migration/SKILL.md) |
| Author and run PostgreSQL Testcontainers or web slice tests | [integration-testing](.agents/skills/integration-testing/SKILL.md) |
| Audit diffs against INVARIANTS.md, AGENTS.md, and openapi.yaml | [code-review](.agents/skills/code-review/SKILL.md) |

## Escalation Checklist

Any of the following requires human review before merge:

- [ ] Change would violate or relax a constraint in [INVARIANTS.md](INVARIANTS.md)
- [ ] Security-sensitive change (authentication, tenant `plan_id` scoping, credentials, PII handling)
- [ ] PostgreSQL schema migration under `backend/src/main/resources/db/migration/`
- [ ] Changes to zero-based budget rollover or credit card payment calculation rules
- [ ] API breaking change in `openapi.yaml` (removed/renamed endpoint or incompatible schema change)
- [ ] Large refactor crossing `backend/` and `frontend/` boundaries
