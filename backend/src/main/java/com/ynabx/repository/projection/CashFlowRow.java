package com.ynabx.repository.projection;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CashFlowRow(
        UUID id,
        LocalDate date,
        long amountMilliunits,
        UUID accountId,
        UUID transferAccountId,
        Instant createdAt) {}
