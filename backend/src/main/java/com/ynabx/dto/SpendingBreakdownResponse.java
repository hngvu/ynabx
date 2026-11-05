package com.ynabx.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SpendingBreakdownResponse(
        LocalDate since_month,
        LocalDate until_month,
        int month_count,
        int day_count,
        long total_spent_milliunits,
        int transaction_count,
        List<GroupItem> groups,
        LargestOutflowItem largest_outflow) {

    public record GroupItem(
            UUID group_id,
            String group_name,
            long spent_milliunits,
            int percentage_basis_points,
            List<CategoryItem> categories) {}

    public record CategoryItem(
            UUID category_id,
            String category_name,
            long spent_milliunits,
            int transaction_count,
            int percentage_basis_points) {}

    public record LargestOutflowItem(
            UUID transaction_id,
            LocalDate date,
            String payee_name,
            UUID category_id,
            String category_name,
            long amount_milliunits) {}
}
