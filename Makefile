# Agents: run only make targets listed here. No direct shell commands.
# Multi-toolchain Unified Execution Surface for ynabx (Backend: Java Spring Boot | Frontend: React TypeScript | Desktop: Pure Rust Dioxus Workspace)

.DEFAULT_GOAL := help

BACKEND_DIR := backend
FRONTEND_DIR := frontend
DESKTOP_DIR := desktop

# ─── Help ────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show available commands (Agents: run only make targets listed here. No direct shell commands.)
	@echo "Usage: make <target>"
	@echo "Agents: run only make targets listed here. No direct shell commands."
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS=":.*## "}; /^[a-zA-Z0-9_-]+:.*## / { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ─── Development ─────────────────────────────────────────────────────────────

.PHONY: install install-backend install-frontend
install: install-backend install-frontend ## Install dependencies for backend and frontend

install-backend: ## Resolve and download Maven/Gradle dependencies for Spring Boot backend
	@if [ -f "$(BACKEND_DIR)/mvnw" ]; then cd $(BACKEND_DIR) && ./mvnw dependency:go-offline -B; \
	elif [ -f "$(BACKEND_DIR)/pom.xml" ]; then cd $(BACKEND_DIR) && mvn dependency:go-offline -B; \
	elif [ -f "$(BACKEND_DIR)/gradlew" ]; then cd $(BACKEND_DIR) && ./gradlew dependencies; \
	else echo "[install-backend] No backend manifest found in $(BACKEND_DIR)/ yet (scaffold pending)"; fi

install-frontend: ## Install npm/pnpm packages for React frontend
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then cd $(FRONTEND_DIR) && npm install; \
	else echo "[install-frontend] No frontend/package.json found yet (scaffold pending)"; fi

.PHONY: build build-backend build-frontend build-desktop package-desktop
build: build-backend build-frontend build-desktop ## Build backend JAR, frontend production bundle, and pure Rust desktop executable

build-backend: ## Compile and package Spring Boot backend (skipping tests)
	@if [ -f "$(BACKEND_DIR)/mvnw" ]; then cd $(BACKEND_DIR) && ./mvnw package -DskipTests -B; \
	elif [ -f "$(BACKEND_DIR)/pom.xml" ]; then cd $(BACKEND_DIR) && mvn package -DskipTests -B; \
	elif [ -f "$(BACKEND_DIR)/gradlew" ]; then cd $(BACKEND_DIR) && ./gradlew assemble; \
	else echo "[build-backend] No backend manifest found in $(BACKEND_DIR)/ yet"; fi

build-frontend: ## Build React frontend production assets
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then cd $(FRONTEND_DIR) && npm run build; \
	else echo "[build-frontend] No frontend/package.json found yet"; fi

build-desktop: ## Compile pure Rust ynab-desktop release binary
	cd $(DESKTOP_DIR) && cargo build --release -p ynab-desktop

package-desktop: ## Build and package standalone Windows executables into desktop/dist/
	powershell -NoProfile -ExecutionPolicy Bypass -File $(DESKTOP_DIR)/packaging/package-windows.ps1

.PHONY: run dev dev-db dev-backend dev-frontend dev-desktop
run: ## Start full stack via Docker Compose (PostgreSQL + Backend + Frontend)
	docker compose up --build

dev: ## Start local PostgreSQL container and print instructions for hot-reload dev servers
	docker compose up -d postgres

dev-db: ## Start only local PostgreSQL via Docker Compose
	docker compose up -d postgres

dev-backend: ## Start Spring Boot backend in local dev profile
	@if [ -f "$(BACKEND_DIR)/mvnw" ]; then cd $(BACKEND_DIR) && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev; \
	elif [ -f "$(BACKEND_DIR)/pom.xml" ]; then cd $(BACKEND_DIR) && mvn spring-boot:run -Dspring-boot.run.profiles=dev; \
	elif [ -f "$(BACKEND_DIR)/gradlew" ]; then cd $(BACKEND_DIR) && ./gradlew bootRun --args='--spring.profiles.active=dev'; \
	else echo "[dev-backend] No backend manifest found in $(BACKEND_DIR)/ yet"; fi

dev-frontend: ## Start React Vite dev server with hot-reload
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then cd $(FRONTEND_DIR) && npm run dev; \
	else echo "[dev-frontend] No frontend/package.json found yet"; fi

dev-desktop: ## Launch pure Rust ynab-desktop application
	cd $(DESKTOP_DIR) && cargo run -p ynab-desktop

# ─── Validation (most important — agents run these) ───────────────────────────

.PHONY: test test-backend test-frontend test-desktop
test: test-backend test-frontend test-desktop ## Run all backend, frontend, and desktop Rust tests

test-backend: ## Run Spring Boot unit & integration tests with JaCoCo coverage
	@if [ -f "$(BACKEND_DIR)/mvnw" ]; then cd $(BACKEND_DIR) && ./mvnw verify -B; \
	elif [ -f "$(BACKEND_DIR)/pom.xml" ]; then cd $(BACKEND_DIR) && mvn verify -B; \
	elif [ -f "$(BACKEND_DIR)/gradlew" ]; then cd $(BACKEND_DIR) && ./gradlew check; \
	else echo "[test-backend] No backend manifest found in $(BACKEND_DIR)/ yet"; fi

test-frontend: ## Run React unit & component tests
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then cd $(FRONTEND_DIR) && npm test -- --run; \
	else echo "[test-frontend] No frontend/package.json found yet"; fi

test-desktop: ## Run all unit and integration tests across the pure Rust desktop Cargo workspace
	cd $(DESKTOP_DIR) && cargo test --workspace

.PHONY: test-uat
test-uat: ## Run automated End-to-End UAT runner against live backend (default: http://localhost:8080/api/v1)
	node scripts/uat-runner.mjs $(API_URL)

.PHONY: lint lint-backend lint-frontend lint-desktop
lint: lint-backend lint-frontend lint-desktop ## Run linters across backend, frontend, and desktop

lint-backend: ## Run Spotless/Checkstyle verification on Java backend
	@if [ -f "$(BACKEND_DIR)/mvnw" ]; then cd $(BACKEND_DIR) && ./mvnw spotless:check checkstyle:check -B; \
	elif [ -f "$(BACKEND_DIR)/pom.xml" ]; then cd $(BACKEND_DIR) && mvn spotless:check checkstyle:check -B; \
	elif [ -f "$(BACKEND_DIR)/gradlew" ]; then cd $(BACKEND_DIR) && ./gradlew spotlessCheck checkstyleMain checkstyleTest; \
	else echo "[lint-backend] No backend manifest found in $(BACKEND_DIR)/ yet"; fi

lint-frontend: ## Run ESLint on React TypeScript frontend
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then cd $(FRONTEND_DIR) && npm run lint; \
	else echo "[lint-frontend] No frontend/package.json found yet"; fi

lint-desktop: ## Run rustfmt check and clippy (-D warnings) on the pure Rust desktop Cargo workspace
	cd $(DESKTOP_DIR) && cargo fmt --all -- --check && cargo clippy --workspace --all-targets -- -D warnings

.PHONY: format format-backend format-frontend format-desktop
format: format-backend format-frontend format-desktop ## Auto-format backend Java, frontend TypeScript, and desktop Rust code

format-backend: ## Format Java code using Spotless
	@if [ -f "$(BACKEND_DIR)/mvnw" ]; then cd $(BACKEND_DIR) && ./mvnw spotless:apply -B; \
	elif [ -f "$(BACKEND_DIR)/pom.xml" ]; then cd $(BACKEND_DIR) && mvn spotless:apply -B; \
	elif [ -f "$(BACKEND_DIR)/gradlew" ]; then cd $(BACKEND_DIR) && ./gradlew spotlessApply; \
	else echo "[format-backend] No backend manifest found in $(BACKEND_DIR)/ yet"; fi

format-frontend: ## Format frontend code using Prettier
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then cd $(FRONTEND_DIR) && npm run format; \
	else echo "[format-frontend] No frontend/package.json found yet"; fi

format-desktop: ## Format pure Rust desktop Cargo workspace using rustfmt
	cd $(DESKTOP_DIR) && cargo fmt --all

.PHONY: typecheck typecheck-backend typecheck-frontend
typecheck: typecheck-backend typecheck-frontend ## Run static type checking across backend and frontend

typecheck-backend: ## Compile Java sources and test sources with strict javac warnings
	@if [ -f "$(BACKEND_DIR)/mvnw" ]; then cd $(BACKEND_DIR) && ./mvnw test-compile -B; \
	elif [ -f "$(BACKEND_DIR)/pom.xml" ]; then cd $(BACKEND_DIR) && mvn test-compile -B; \
	elif [ -f "$(BACKEND_DIR)/gradlew" ]; then cd $(BACKEND_DIR) && ./gradlew compileJava compileTestJava; \
	else echo "[typecheck-backend] No backend manifest found in $(BACKEND_DIR)/ yet"; fi

typecheck-frontend: ## Run TypeScript compiler check (tsc --noEmit)
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then cd $(FRONTEND_DIR) && npm run typecheck; \
	else echo "[typecheck-frontend] No frontend/package.json found yet"; fi

.PHONY: check
check: lint typecheck test ## Run all validation (lint + typecheck + test)

# ─── Maintenance ──────────────────────────────────────────────────────────────

.PHONY: clean clean-backend clean-frontend clean-desktop
clean: clean-backend clean-frontend clean-desktop ## Remove build artifacts and caches

clean-backend: ## Clean Maven/Gradle build outputs
	rm -rf $(BACKEND_DIR)/target $(BACKEND_DIR)/build

clean-frontend: ## Clean frontend build artifacts and caches
	rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/coverage $(FRONTEND_DIR)/node_modules/.cache

clean-desktop: ## Clean Rust Cargo build artifacts in desktop workspace
	cd $(DESKTOP_DIR) && cargo clean

# ─── Scraper ──────────────────────────────────────────────────────────────────

.PHONY: scrape-login scrape-budget scrape-accounts scrape-icons
scrape-login: ## Launch persistent browser session to log in to YNAB
	cd scripts/scraper && npm run login

scrape-budget: ## Dump YNAB budget grid, inspector, and theme styles
	cd scripts/scraper && npm run dump:budget

scrape-accounts: ## Dump YNAB account register, add row, and reconcile modal
	cd scripts/scraper && npm run dump:accounts

scrape-icons: ## Extract standalone SVG icons from YNAB
	cd scripts/scraper && npm run extract:icons
