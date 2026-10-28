package com.ynabx.dto;

import com.ynabx.entity.Account.AccountType;

public record CreateAccountRequest(
        String name,
        AccountType type,
        Boolean on_budget,
        long initial_balance_milliunits,
        String note,
        Integer sort_order) {}
