package com.ynabx.dto;

import java.util.UUID;

public record CategoryMonthAllocationResponse(
        UUID category_id,
        UUID group_id,
        String name,
        String note,
        long assigned_milliunits,
        long activity_milliunits,
        long available_milliunits,
        boolean is_credit_card_payment,
        UUID credit_card_account_id,
        boolean hidden,
        int sort_order) {}
