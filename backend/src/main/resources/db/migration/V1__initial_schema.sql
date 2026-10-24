-- V1: Initial schema for ynabx zero-based envelope budgeting

CREATE TABLE budgets (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category_groups (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_category_groups_budget ON category_groups(budget_id);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_credit_card_payment BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_categories_budget ON categories(budget_id);

CREATE TABLE monthly_category_allocations (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- Stored as first of month, e.g. 2026-10-01
    assigned_milliunits BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_category_month UNIQUE (category_id, month)
);
CREATE INDEX idx_monthly_allocations_budget_month ON monthly_category_allocations(budget_id, month);

CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- CHECKING, SAVINGS, CREDIT_CARD
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_accounts_budget ON accounts(budget_id);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount_milliunits BIGINT NOT NULL, -- Stored in integer milliunits (1000 = 1.00)
    payee VARCHAR(255),
    memo TEXT,
    cleared VARCHAR(20) NOT NULL DEFAULT 'UNCLEARED', -- UNCLEARED, CLEARED, RECONCILED
    transfer_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    transfer_transaction_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transactions_budget_date ON transactions(budget_id, date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
