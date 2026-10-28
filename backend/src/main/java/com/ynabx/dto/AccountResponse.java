package com.ynabx.dto;

import com.ynabx.entity.Account.AccountType;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(
        UUID id,
        UUID plan_id,
        String name,
        AccountType type,
        boolean on_budget,
        boolean closed,
        long balance_milliunits,
        long cleared_balance_milliunits,
        long uncleared_balance_milliunits,
        String note,
        UUID transfer_payee_id,
        Instant last_reconciled_at,
        int sort_order) {}
