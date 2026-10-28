package com.ynabx.repository;

import com.ynabx.entity.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByPlanIdAndDeletedFalseOrderBySortOrderAsc(UUID planId);

    List<Category> findByPlanIdAndDeletedFalseAndHiddenFalseOrderBySortOrderAsc(UUID planId);

    List<Category> findByPlanIdAndGroupIdAndDeletedFalseOrderBySortOrderAsc(
            UUID planId, UUID groupId);

    List<Category> findByPlanIdAndGroupIdAndDeletedFalseAndHiddenFalseOrderBySortOrderAsc(
            UUID planId, UUID groupId);

    Optional<Category> findByIdAndPlanIdAndDeletedFalse(UUID id, UUID planId);

    Optional<Category> findByPlanIdAndInflowCategoryTrue(UUID planId);

    Optional<Category> findByPlanIdAndCreditCardAccountIdAndDeletedFalse(
            UUID planId, UUID creditCardAccountId);

    List<Category> findByGroupIdAndDeletedFalse(UUID groupId);
}
