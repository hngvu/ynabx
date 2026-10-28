# docs/SETUP.md — Local Development Setup

## Prerequisites

- **OS**: Linux, macOS, or Windows (via WSL2 or Git Bash + `make` for Makefile execution)
- **Runtime**:
  - Java JDK 21+ (`java -version`)
  - Node.js 20 LTS+ and `npm` (`node -v`)
- **Required tools**:
  - Docker & Docker Compose (for local PostgreSQL instance)
  - GNU `make`

## Installation

```bash
git clone <repo-url>
cd ynabx

# Copy environment configurations
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Install backend (Maven dependencies & wrapper) and frontend (npm packages)
make install
```

## Configuration

Configure local environment variables via `backend/.env` and `frontend/.env`:

### Backend (`backend/.env`)

| Variable | Example | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/ynabx` | JDBC connection URL for `backend/` |
| `SPRING_DATASOURCE_USERNAME` | `ynabx` | Backend datasource username |
| `SPRING_DATASOURCE_PASSWORD` | `ynabx_dev_local` | Backend datasource password |
| `SPRING_PROFILES_ACTIVE` | `dev` | Active Spring profile |
| `JWT_ACCESS_TOKEN_EXPIRATION_SECONDS` | `900` | Access token lifespan (15 mins) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed origins |

### Frontend (`frontend/.env`)

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | Backend API base URL consumed by `frontend/` |

Start the local PostgreSQL container before running the backend locally:

```bash
make dev-db
```

## Running the Service

```bash
# Option 1: Run full stack in Docker Compose
make run

# Option 2: Run PostgreSQL in Docker and start backend + frontend with hot-reload
make dev-db
make dev-backend     # Starts Spring Boot API at http://localhost:8080/api/v1/health
make dev-frontend    # Starts React dev server at http://localhost:5173
```

## Running Tests

Run the full backend and frontend test suites with `make test`. See [TESTING.md](TESTING.md) for test organisation, coverage targets, and fixture patterns.

## Running Validation

```bash
make help       # List all available root and per-module targets
make check      # Run all validation (lint + typecheck + test across backend and frontend)
```

## Troubleshooting

### Windows `make` or Shell Compatibility
**Symptom**: `make` is not recognized in PowerShell or `awk` help formatting fails.
**Fix**: Run `make` inside WSL2 or Git Bash, or install `make` via Winget/Scoop (`winget install GnuWin32.Make`). Alternatively, run maven/npm commands directly via wrapper (`cd backend && .\mvnw.cmd test` and `cd frontend && npm test`).
