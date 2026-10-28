package com.ynabx.dto;

import java.util.UUID;

public record CreateCategoryRequest(UUID group_id, String name, String note, Integer sort_order) {}
