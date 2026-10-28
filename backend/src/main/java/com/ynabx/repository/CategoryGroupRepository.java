package com.ynabx.repository;

import com.ynabx.entity.CategoryGroup;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryGroupRepository extends JpaRepository<CategoryGroup, UUID> {
    List<CategoryGroup> findByPlanIdAndDeletedFalseOrderBySortOrderAsc(UUID planId);

    List<CategoryGroup> findByPlanIdAndDeletedFalseAndHiddenFalseOrderBySortOrderAsc(UUID planId);

    Optional<CategoryGroup> findByIdAndPlanIdAndDeletedFalse(UUID id, UUID planId);

    Optional<CategoryGroup> findByPlanIdAndSystemTrueAndName(UUID planId, String name);
}
