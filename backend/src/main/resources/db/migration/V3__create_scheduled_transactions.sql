-- V3: Create scheduled transactions table and link to transactions ledger

CREATE TABLE scheduled_transactions (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    transfer_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    amount_milliunits BIGINT NOT NULL,
    memo TEXT,
    frequency VARCHAR(32) NOT NULL,
    date_first DATE NOT NULL,
    date_next DATE NOT NULL,
    occurrence_index INT NOT NULL DEFAULT 0,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sched_frequency CHECK (frequency IN (
        'NEVER', 'DAILY', 'WEEKLY', 'EVERY_OTHER_WEEK', 'TWICE_A_MONTH',
        'EVERY_4_WEEKS', 'MONTHLY', 'EVERY_OTHER_MONTH', 'EVERY_3_MONTHS',
        'EVERY_4_MONTHS', 'TWICE_A_YEAR', 'YEARLY', 'EVERY_OTHER_YEAR'
    ))
);

CREATE INDEX idx_sched_tx_plan_next
    ON scheduled_transactions(plan_id, date_next) WHERE deleted = FALSE;

-- Ledger link
ALTER TABLE transactions ADD COLUMN scheduled_transaction_id UUID
    REFERENCES scheduled_transactions(id) ON DELETE SET NULL;

ALTER TABLE transactions ADD COLUMN scheduled_occurrence_date DATE;

CREATE UNIQUE INDEX uq_transactions_scheduled_occurrence
    ON transactions(scheduled_transaction_id, scheduled_occurrence_date)
    WHERE scheduled_transaction_id IS NOT NULL;
