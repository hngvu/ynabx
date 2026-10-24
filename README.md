# ynabx

**ynabx** is a full-stack zero-based envelope budgeting application (YNAB clone) for managing personal budgets, monthly category allocations, credit card payment envelopes, split transactions, and account reconciliation. It is built as a monorepo with a **Java Spring Boot** REST API (`backend/`), a **React + TypeScript** single-page application (`frontend/`), and a **PostgreSQL** database.

## Quickstart

Requires Docker, Java 21+, Node.js 20+, and `make` (`cp .env.example .env`). See [docs/SETUP.md](docs/SETUP.md) for full local setup.

```bash
make install    # Install backend (Maven/Gradle) and frontend (npm) dependencies
make build      # Build backend JAR and frontend production bundle
make check      # Run all linters, type checks, and test suites
```

## For Agents and Contributors

- [AGENTS.md](AGENTS.md) — roles, footguns, and module context (read this first)
- [INVARIANTS.md](INVARIANTS.md) — hard constraints (non-negotiable)
- [backend/AGENTS.md](backend/AGENTS.md) — Spring Boot backend & PostgreSQL module constraints
- [frontend/AGENTS.md](frontend/AGENTS.md) — React TypeScript frontend module constraints
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design and components
- [docs/DECISIONS.md](docs/DECISIONS.md) — architecture decision records (ADRs)
- [docs/SETUP.md](docs/SETUP.md) — full local development setup
- [docs/TESTING.md](docs/TESTING.md) — test strategy and how to run tests
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution workflow and skills directory

## References

- [openapi.yaml](openapi.yaml) — OpenAPI 3.1 REST API contract
- [Adobe AI Repository Harness Guide](https://github.com/adobe/ai-repo-harness-guide) — harness architecture reference

> **Reviewer**: Add links to your team wiki, Jira project, API docs, and related services here. Remove this line when done.
