package com.ynabx.repository;

import com.ynabx.repository.projection.CategorySpendingRow;
import com.ynabx.repository.projection.LargestOutflowRow;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportTransactionRepository {

    List<CategorySpendingRow> aggregateSpendingByCategory(
            UUID planId,
            LocalDate sinceDate,
            LocalDate untilExclusive,
            Collection<UUID> eligibleCategoryIds,
            Collection<UUID> accountIdsFilter);

    Optional<LargestOutflowRow> findLargestOutflow(
            UUID planId,
            LocalDate sinceDate,
            LocalDate untilExclusive,
            Collection<UUID> eligibleCategoryIds,
            Collection<UUID> accountIdsFilter);
}
