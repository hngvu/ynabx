package com.ynabx.dto;

public record AuthResponse(
        String access_token, String token_type, int expires_in, UserProfileResponse user) {}
