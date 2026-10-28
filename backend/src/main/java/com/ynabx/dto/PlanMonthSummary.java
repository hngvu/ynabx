package com.ynabx.dto;

import java.time.LocalDate;
import java.util.List;

public record PlanMonthSummary(
        LocalDate month,
        long ready_to_assign_milliunits,
        long total_assigned_milliunits,
        long total_activity_milliunits,
        long total_available_milliunits,
        List<CategoryMonthAllocationResponse> categories) {}
