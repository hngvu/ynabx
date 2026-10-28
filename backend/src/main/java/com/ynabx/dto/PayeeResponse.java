package com.ynabx.dto;

import java.util.UUID;

public record PayeeResponse(UUID id, UUID plan_id, String name, UUID transfer_account_id) {}
