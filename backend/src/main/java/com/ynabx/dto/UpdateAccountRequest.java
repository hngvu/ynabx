package com.ynabx.dto;

public record UpdateAccountRequest(String name, String note, Boolean closed, Integer sort_order) {}
