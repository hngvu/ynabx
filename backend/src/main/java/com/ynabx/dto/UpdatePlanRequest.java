package com.ynabx.dto;

public record UpdatePlanRequest(
        String name,
        String currency_code,
        String number_format,
        Boolean currency_symbol_first,
        Boolean currency_display_symbol,
        String date_format) {}
