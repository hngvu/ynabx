-- V1: Production initial schema for ynabx zero-based envelope budgeting

-- 1. Users (Authentication & Tenant Owner)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Budgets (Multi-tenant Budget Root & Currency Settings)
CREATE TABLE budgets (
    id UUID PRIMARY KEY,
    owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    currency_iso_code VARCHAR(10) NOT NULL DEFAULT 'USD',
    currency_decimal_digits INT NOT NULL DEFAULT 2,
    currency_decimal_separator VARCHAR(5) NOT NULL DEFAULT '.',
    currency_group_separator VARCHAR(5) NOT NULL DEFAULT ',',
    currency_symbol_first BOOLEAN NOT NULL DEFAULT TRUE,
    date_format VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_budgets_owner ON budgets(owner_user_id);

-- 3. Payees (Counterparties & Linked Transfer Payees)
CREATE TABLE payees (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    transfer_account_id UUID, -- FK added after accounts table
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payees_budget ON payees(budget_id);

-- 4. Accounts (On-budget & Tracking Accounts)
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- CHECKING, SAVINGS, CREDIT_CARD, CASH
    on_budget BOOLEAN NOT NULL DEFAULT TRUE,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    balance_milliunits BIGINT NOT NULL DEFAULT 0,
    cleared_balance_milliunits BIGINT NOT NULL DEFAULT 0,
    uncleared_balance_milliunits BIGINT NOT NULL DEFAULT 0,
    note TEXT,
    transfer_payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
    last_reconciled_at TIMESTAMPTZ,
    sort_order INT NOT NULL DEFAULT 0,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_accounts_budget ON accounts(budget_id);

-- Add circular FK from payees to accounts
ALTER TABLE payees
    ADD CONSTRAINT fk_payees_transfer_account
    FOREIGN KEY (transfer_account_id) REFERENCES accounts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_payees_transfer_account ON payees(budget_id, transfer_account_id)
    WHERE transfer_account_id IS NOT NULL AND deleted = FALSE;

-- 5. Category Groups
CREATE TABLE category_groups (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE, -- Internal master / CC payment group
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_category_groups_budget ON category_groups(budget_id);

-- 6. Categories (Spending Envelopes & Target Configuration)
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    note TEXT,
    is_inflow_category BOOLEAN NOT NULL DEFAULT FALSE,
    is_credit_card_payment BOOLEAN NOT NULL DEFAULT FALSE,
    credit_card_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    target_amount_milliunits BIGINT,
    target_date DATE,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_categories_budget ON categories(budget_id);
CREATE INDEX idx_categories_budget_group ON categories(budget_id, group_id);
CREATE UNIQUE INDEX uq_categories_cc_account ON categories(budget_id, credit_card_account_id)
    WHERE credit_card_account_id IS NOT NULL AND deleted = FALSE;

-- 7. Monthly Category Allocations (Assigned Envelopes per Month)
CREATE TABLE monthly_category_allocations (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of month: YYYY-MM-01
    assigned_milliunits BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_category_month UNIQUE (category_id, month)
);
CREATE INDEX idx_monthly_allocations_budget_month ON monthly_category_allocations(budget_id, month);

-- 8. Transactions (Single or Parent Transaction Ledger)
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount_milliunits BIGINT NOT NULL, -- Inflow positive, outflow negative
    memo TEXT,
    cleared VARCHAR(20) NOT NULL DEFAULT 'UNCLEARED', -- UNCLEARED, CLEARED, RECONCILED
    approved BOOLEAN NOT NULL DEFAULT TRUE,
    transfer_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    transfer_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transactions_budget_date ON transactions(budget_id, date);
CREATE INDEX idx_transactions_budget_account ON transactions(budget_id, account_id, date);
CREATE INDEX idx_transactions_budget_category ON transactions(budget_id, category_id);

-- 9. Subtransactions (Split Items for Parent Transactions)
CREATE TABLE subtransactions (
    id UUID PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
    amount_milliunits BIGINT NOT NULL,
    memo TEXT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_subtransactions_budget_tx ON subtransactions(budget_id, transaction_id);
