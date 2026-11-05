package com.ynabx.service.report;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SpendingBreakdown(
        LocalDate sinceMonth,
        LocalDate untilMonth,
        int monthCount,
        int dayCount,
        long totalSpentMilliunits,
        int transactionCount,
        List<GroupBreakdown> groups,
        LargestOutflow largestOutflow) {

    public record GroupBreakdown(
            UUID groupId,
            String groupName,
            long spentMilliunits,
            int percentageBasisPoints,
            List<CategoryBreakdown> categories) {}

    public record CategoryBreakdown(
            UUID categoryId,
            String categoryName,
            long spentMilliunits,
            int transactionCount,
            int percentageBasisPoints) {}

    public record LargestOutflow(
            UUID transactionId,
            LocalDate date,
            String payeeName,
            UUID categoryId,
            String categoryName,
            long amountMilliunits) {}
}
