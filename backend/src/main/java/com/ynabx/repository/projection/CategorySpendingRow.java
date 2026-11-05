package com.ynabx.repository.projection;

import java.util.UUID;

public record CategorySpendingRow(
        UUID categoryId, long netAmountMilliunits, long transactionCount) {}
