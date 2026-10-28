package com.ynabx.dto;

import com.ynabx.entity.Transaction.ClearedStatus;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        UUID plan_id,
        UUID account_id,
        UUID category_id,
        UUID payee_id,
        String payee_name,
        LocalDate date,
        long amount_milliunits,
        String memo,
        ClearedStatus cleared,
        boolean approved,
        UUID transfer_account_id,
        UUID transfer_transaction_id) {}
