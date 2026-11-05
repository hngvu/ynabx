package com.ynabx.service;

import com.ynabx.entity.Transaction.ClearedStatus;
import java.time.LocalDate;
import java.util.UUID;

public record NewLedgerEntry(
        UUID accountId,
        UUID categoryId,
        UUID payeeId,
        String payeeName,
        LocalDate date,
        long amountMilliunits,
        String memo,
        ClearedStatus cleared,
        boolean approved,
        UUID transferAccountId,
        UUID scheduledTransactionId,
        LocalDate scheduledOccurrenceDate) {}
