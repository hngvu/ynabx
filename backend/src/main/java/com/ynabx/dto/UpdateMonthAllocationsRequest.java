package com.ynabx.dto;

import java.util.List;

public record UpdateMonthAllocationsRequest(List<AllocationUpdate> allocations) {}
