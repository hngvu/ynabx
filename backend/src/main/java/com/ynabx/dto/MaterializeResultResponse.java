package com.ynabx.dto;

public record MaterializeResultResponse(
        int materialized_count, int skipped_count, boolean has_more) {}
