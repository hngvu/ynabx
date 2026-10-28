package com.ynabx.dto;

import java.util.UUID;

public record UpdateCategoryRequest(
        UUID group_id, String name, String note, Boolean hidden, Integer sort_order) {}
