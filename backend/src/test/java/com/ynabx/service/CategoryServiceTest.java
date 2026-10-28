package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ynabx.dto.CreateCategoryRequest;
import com.ynabx.dto.UpdateCategoryRequest;
import com.ynabx.entity.Category;
import com.ynabx.entity.CategoryGroup;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.SystemResourceConflictException;
import com.ynabx.repository.CategoryGroupRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.MonthlyCategoryAllocationRepository;
import com.ynabx.repository.TransactionRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock private PlanService planService;
    @Mock private CategoryGroupRepository groupRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private MonthlyCategoryAllocationRepository allocationRepository;
    @Mock private TransactionRepository transactionRepository;

    private CategoryService categoryService;
    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID groupId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        categoryService =
                new CategoryService(
                        planService,
                        groupRepository,
                        categoryRepository,
                        allocationRepository,
                        transactionRepository);
    }

    @Test
    @DisplayName(
            "createCategory: throws SystemResourceConflictException when target group is system")
    void createCategoryInSystemGroup() {
        CategoryGroup systemGroup =
                CategoryGroup.builder().id(groupId).planId(planId).system(true).build();
        when(groupRepository.findByIdAndPlanIdAndDeletedFalse(groupId, planId))
                .thenReturn(Optional.of(systemGroup));

        CreateCategoryRequest req = new CreateCategoryRequest(groupId, "New Category", null, 0);

        assertThatThrownBy(() -> categoryService.createCategory(planId, userId, req))
                .isInstanceOf(SystemResourceConflictException.class)
                .hasMessageContaining("system category group");
    }

    @Test
    @DisplayName(
            "updateCategory: throws SystemResourceConflictException when category is system envelope")
    void updateSystemCategoryFails() {
        Category systemCat =
                Category.builder().id(categoryId).planId(planId).inflowCategory(true).build();
        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(categoryId, planId))
                .thenReturn(Optional.of(systemCat));

        UpdateCategoryRequest req = new UpdateCategoryRequest(null, "Renamed", null, null, null);

        assertThatThrownBy(() -> categoryService.updateCategory(planId, categoryId, userId, req))
                .isInstanceOf(SystemResourceConflictException.class)
                .hasMessageContaining("System category cannot be modified");
    }

    @Test
    @DisplayName(
            "deleteCategory: throws SystemResourceConflictException when category has money/transactions and no reassign target")
    void deleteCategoryWithFundsWithoutReassign() {
        Category cat =
                Category.builder()
                        .id(categoryId)
                        .planId(planId)
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .build();
        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(categoryId, planId))
                .thenReturn(Optional.of(cat));
        when(allocationRepository.existsByCategoryIdAndAssignedMilliunitsNot(categoryId, 0L))
                .thenReturn(true);

        assertThatThrownBy(() -> categoryService.deleteCategory(planId, categoryId, userId, null))
                .isInstanceOf(SystemResourceConflictException.class)
                .hasMessageContaining("reassign_to_category_id is required");
    }

    @Test
    @DisplayName(
            "deleteCategory: throws DomainValidationException when reassign target is the same category")
    void deleteCategorySelfReassignFails() {
        Category cat =
                Category.builder()
                        .id(categoryId)
                        .planId(planId)
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .build();
        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(categoryId, planId))
                .thenReturn(Optional.of(cat));
        when(allocationRepository.existsByCategoryIdAndAssignedMilliunitsNot(categoryId, 0L))
                .thenReturn(true);

        assertThatThrownBy(
                        () ->
                                categoryService.deleteCategory(
                                        planId, categoryId, userId, categoryId))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("cannot be the same category");
    }

    @Test
    @DisplayName("deleteCategory: safely reassigns transactions and allocations to target category")
    void deleteCategorySuccessfulReassignment() {
        UUID targetCatId = UUID.randomUUID();
        Category source =
                Category.builder()
                        .id(categoryId)
                        .planId(planId)
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .build();
        Category target =
                Category.builder()
                        .id(targetCatId)
                        .planId(planId)
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .build();

        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(categoryId, planId))
                .thenReturn(Optional.of(source));
        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(targetCatId, planId))
                .thenReturn(Optional.of(target));
        when(allocationRepository.existsByCategoryIdAndAssignedMilliunitsNot(categoryId, 0L))
                .thenReturn(false);
        when(transactionRepository.existsByCategoryIdAndDeletedFalse(categoryId)).thenReturn(true);

        categoryService.deleteCategory(planId, categoryId, userId, targetCatId);

        assertThat(source.isDeleted()).isTrue();
        verify(categoryRepository).save(source);
    }
}
