package com.ynabx.dto;

import java.util.UUID;

public record CategoryResponse(
        UUID id,
        UUID plan_id,
        UUID group_id,
        String name,
        String note,
        boolean is_inflow_category,
        boolean is_credit_card_payment,
        UUID credit_card_account_id,
        boolean hidden,
        int sort_order) {}
