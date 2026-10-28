package com.ynabx.dto;

import com.ynabx.entity.Transaction.ClearedStatus;
import java.time.LocalDate;
import java.util.UUID;

public record SaveTransactionRequest(
        UUID account_id,
        UUID category_id,
        UUID payee_id,
        String payee_name,
        LocalDate date,
        long amount_milliunits,
        String memo,
        ClearedStatus cleared,
        Boolean approved,
        UUID transfer_account_id) {}
