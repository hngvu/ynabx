package com.ynabx.dto;

import java.util.UUID;

public record CategoryGroupResponse(
        UUID id, UUID plan_id, String name, boolean is_system, boolean hidden, int sort_order) {}
