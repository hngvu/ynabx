package com.ynabx.dto;

public record ReconcileAccountRequest(
        long statement_balance_milliunits, Boolean create_adjustment_transaction) {}
