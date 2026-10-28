package com.ynabx.dto;

import java.time.Instant;
import java.util.UUID;

public record PlanSummary(
        UUID id,
        UUID owner_user_id,
        String name,
        String currency_code,
        String number_format,
        boolean currency_symbol_first,
        boolean currency_display_symbol,
        String date_format,
        Instant created_at,
        Instant updated_at) {}
