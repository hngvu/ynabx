package com.ynabx.repository.projection;

import java.time.LocalDate;
import java.util.UUID;

public record LargestOutflowRow(
        UUID transactionId, LocalDate date, UUID payeeId, UUID categoryId, long amountMilliunits) {}
