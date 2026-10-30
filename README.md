# YNABx

**YNABx** is a modern, privacy-focused SaaS personal finance platform based on the proven **Zero-Based Envelope Budgeting** methodology. Designed to help individuals and households gain total control over their money, YNABx ensures that **every single unit of income is assigned a job**—whether paying immediate bills, building true emergency savings, or planning for long-term investments.

Unlike traditional expense trackers that only show where your money already went, YNABx is **forward-looking and proactive**. By transforming bank accounts into purposeful monthly spending envelopes, it eliminates paycheck-to-paycheck stress, prevents debt accumulation, and gives you clear visibility into your true financial health.

---

## Key SaaS Features

- **Zero-Based Budgeting Engine ("Give Every Dollar a Job")**:
  Allocate income across customizable category envelopes until your **Ready to Assign** balance reaches exactly zero. Never spend money you haven't yet earned.
- **Automated Credit Card Debt Prevention**:
  When you spend on a budgeted category (e.g., *Groceries*) using a credit card, YNABx automatically shifts available funds into your *Credit Card Payment* envelope. You're always prepared to pay your statement balance in full without debt surprise.
- **Intelligent Month Rollover Rules**:
  Positive category balances automatically roll over into the next month. **Cash overspending** resets to zero and deducts from the next month's *Ready to Assign*, while **credit overspending** turns into tracked credit debt.
- **Multi-Account Register & Reconciliation**:
  Manage Checking, Savings, Cash, and Credit Card accounts in one place. Mark transactions as *Uncleared*, *Cleared*, or *Reconciled* with point-in-time bank statement balance locking.
- **Payees & Account Transfers**:
  Track who you pay and move money between accounts with automatically paired transfer transactions that always net to exactly zero.
- **Bank-Grade Financial Precision (Milliunit Math)**:
  Built on an integer-based milliunit ledger (`1000` milliunits = `$1.00`), guaranteeing zero IEEE-754 floating-point rounding errors across database, API, and UI layers.
- **Multi-Tenant Security & Privacy**:
  Engineered with strict tenant scoping (`plan_id`) on every query and mutation, robust password hashing, and clean separation between client DTOs and transactional ledger domains.

---

## Quickstart

Requires Docker, Java JDK 21+, Node.js 20+, and GNU `make`. See [docs/SETUP.md](docs/SETUP.md) for detailed local development instructions.

```bash
# 1. Clone repository and setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Install dependencies (Spring Boot Maven + React Vite)
make install

# 3. Start PostgreSQL and run validation suite
make dev-db     # Start local PostgreSQL container
make check      # Run lint, typecheck, and unit/integration tests
make run        # Run full stack via Docker Compose
```

---

## For Agents and Contributors

Repository conventions, invariants, and architectural guidelines are formalized under the repository harness:

- [AGENTS.md](AGENTS.md) — operational context, agent roles, and known financial domain footguns (read first)
- [INVARIANTS.md](INVARIANTS.md) — non-negotiable architectural, security, and financial ledger constraints
- [backend/AGENTS.md](backend/AGENTS.md) — Spring Boot, JPA concurrency, and Flyway migration rules
- [frontend/AGENTS.md](frontend/AGENTS.md) — React TypeScript, optimistic budget grid cache, and UI formatting rules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — C4 system architecture, container diagrams, and data flow
- [docs/BEHAVIOR.md](docs/BEHAVIOR.md) — user experience, spending plan workflows, and interaction mechanics
- [docs/DECISIONS.md](docs/DECISIONS.md) — Architecture Decision Records (ADR-001, ADR-002, ADR-003)
- [docs/SETUP.md](docs/SETUP.md) — full step-by-step local development setup
- [docs/TESTING.md](docs/TESTING.md) — testing strategy (JUnit 5, Testcontainers, Vitest)
- [CONTRIBUTING.md](CONTRIBUTING.md) — git branching, Conventional Commits, and agent skills index

---

## References

- [openapi.yaml](openapi.yaml) — OpenAPI 3.1 REST API contract
- [Adobe AI Repository Harness Guide](https://github.com/adobe/ai-repo-harness-guide) — repository harness methodology and blueprint
