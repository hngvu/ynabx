package com.ynabx.repository;

import com.ynabx.entity.MonthlyCategoryAllocation;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MonthlyCategoryAllocationRepository
        extends JpaRepository<MonthlyCategoryAllocation, UUID> {
    List<MonthlyCategoryAllocation> findByPlanIdAndMonth(UUID planId, LocalDate month);

    Optional<MonthlyCategoryAllocation> findByPlanIdAndCategoryIdAndMonth(
            UUID planId, UUID categoryId, LocalDate month);

    List<MonthlyCategoryAllocation> findByCategoryId(UUID categoryId);

    boolean existsByCategoryIdAndAssignedMilliunitsNot(UUID categoryId, long assigned);
}
