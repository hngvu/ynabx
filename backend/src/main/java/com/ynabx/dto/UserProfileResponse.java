package com.ynabx.dto;

import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(UUID id, String email, String display_name, Instant created_at) {}
