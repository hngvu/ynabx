package com.ynabx.dto;

import java.util.List;

public record TransactionPageResponse(List<TransactionResponse> data, String next_cursor) {}
