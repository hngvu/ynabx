package com.ynabx.dto;

import java.util.List;
import java.util.UUID;

public record CategoryGroupWithCategoriesResponse(
        UUID id,
        UUID plan_id,
        String name,
        boolean is_system,
        boolean hidden,
        int sort_order,
        List<CategoryResponse> categories) {}
