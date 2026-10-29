package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ynabx.dto.AllocationUpdate;
import com.ynabx.dto.PlanMonthSummary;
import com.ynabx.dto.UpdateMonthAllocationsRequest;
import com.ynabx.entity.Account;
import com.ynabx.entity.Category;
import com.ynabx.entity.MonthlyCategoryAllocation;
import com.ynabx.entity.Plan;
import com.ynabx.entity.Transaction;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.exception.SystemResourceConflictException;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.MonthlyCategoryAllocationRepository;
import com.ynabx.repository.TransactionRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MonthlyBudgetServiceTest {

    @Mock private PlanService planService;
    @Mock private CategoryRepository categoryRepository;
    @Mock private MonthlyCategoryAllocationRepository allocationRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private AccountRepository accountRepository;

    private MonthlyBudgetService monthlyBudgetService;
    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();
    private final UUID accountId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        monthlyBudgetService =
                new MonthlyBudgetService(
                        planService,
                        categoryRepository,
                        allocationRepository,
                        transactionRepository,
                        accountRepository);
    }

    @Test
    @DisplayName("getPlanMonth: calculates summary with categories, allocations, and activity")
    void testGetPlanMonthSuccess() {
        LocalDate month = LocalDate.of(2026, 10, 1);
        LocalDate endOfMonth = LocalDate.of(2026, 10, 31);

        Plan plan = Plan.builder().id(planId).ownerUserId(userId).name("My Budget").build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        Category cat =
                Category.builder()
                        .id(categoryId)
                        .planId(planId)
                        .groupId(UUID.randomUUID())
                        .name("Groceries")
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .sortOrder(0)
                        .deleted(false)
                        .build();
        when(categoryRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(cat));

        Account account =
                Account.builder()
                        .id(accountId)
                        .planId(planId)
                        .name("Checking")
                        .type(Account.AccountType.CHECKING)
                        .onBudget(true)
                        .deleted(false)
                        .build();
        when(accountRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(account));

        Transaction tx =
                Transaction.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .accountId(accountId)
                        .categoryId(categoryId)
                        .amountMilliunits(-45_000L)
                        .date(LocalDate.of(2026, 10, 10))
                        .deleted(false)
                        .build();
        when(transactionRepository.findForPlanUpToDate(planId, endOfMonth)).thenReturn(List.of(tx));

        MonthlyCategoryAllocation allocation =
                MonthlyCategoryAllocation.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .categoryId(categoryId)
                        .month(month)
                        .assignedMilliunits(100_000L)
                        .build();
        when(allocationRepository.findByPlanIdAndMonth(planId, month))
                .thenReturn(List.of(allocation));

        PlanMonthSummary summary = monthlyBudgetService.getPlanMonth(planId, userId, month);

        assertThat(summary).isNotNull();
        assertThat(summary.month()).isEqualTo(month);
        assertThat(summary.total_assigned_milliunits()).isEqualTo(100_000L);
        assertThat(summary.total_activity_milliunits()).isEqualTo(-45_000L);
        assertThat(summary.total_available_milliunits()).isEqualTo(55_000L);
        assertThat(summary.categories()).hasSize(1);
        assertThat(summary.categories().get(0).available_milliunits()).isEqualTo(55_000L);
    }

    @Test
    @DisplayName(
            "updateMonthAllocations: throws DomainValidationException when allocations list is empty")
    void testUpdateAllocationsEmptyThrows() {
        LocalDate month = LocalDate.of(2026, 10, 1);
        UpdateMonthAllocationsRequest emptyReq = new UpdateMonthAllocationsRequest(List.of());

        assertThatThrownBy(
                        () ->
                                monthlyBudgetService.updateMonthAllocations(
                                        planId, userId, month, emptyReq))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("allocations array is required and cannot be empty");
    }

    @Test
    @DisplayName(
            "updateMonthAllocations: throws DomainValidationException on duplicate category_id")
    void testUpdateAllocationsDuplicateCategoryThrows() {
        LocalDate month = LocalDate.of(2026, 10, 1);
        UpdateMonthAllocationsRequest dupReq =
                new UpdateMonthAllocationsRequest(
                        List.of(
                                new AllocationUpdate(categoryId, 10_000L),
                                new AllocationUpdate(categoryId, 20_000L)));

        assertThatThrownBy(
                        () ->
                                monthlyBudgetService.updateMonthAllocations(
                                        planId, userId, month, dupReq))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("Duplicate category_id");
    }

    @Test
    @DisplayName("updateMonthAllocations: throws ResourceNotFoundException when category not found")
    void testUpdateAllocationsCategoryNotFoundThrows() {
        LocalDate month = LocalDate.of(2026, 10, 1);
        UpdateMonthAllocationsRequest req =
                new UpdateMonthAllocationsRequest(
                        List.of(new AllocationUpdate(categoryId, 50_000L)));

        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(categoryId, planId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                monthlyBudgetService.updateMonthAllocations(
                                        planId, userId, month, req))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Category not found");
    }

    @Test
    @DisplayName(
            "updateMonthAllocations: throws SystemResourceConflictException for inflow category")
    void testUpdateAllocationsInflowCategoryThrows() {
        LocalDate month = LocalDate.of(2026, 10, 1);
        UpdateMonthAllocationsRequest req =
                new UpdateMonthAllocationsRequest(
                        List.of(new AllocationUpdate(categoryId, 50_000L)));

        Category inflowCat =
                Category.builder()
                        .id(categoryId)
                        .planId(planId)
                        .inflowCategory(true)
                        .name("Ready to Assign")
                        .build();
        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(categoryId, planId))
                .thenReturn(Optional.of(inflowCat));

        assertThatThrownBy(
                        () ->
                                monthlyBudgetService.updateMonthAllocations(
                                        planId, userId, month, req))
                .isInstanceOf(SystemResourceConflictException.class)
                .hasMessageContaining("Cannot assign money directly to an inflow category");
    }

    @Test
    @DisplayName("updateMonthAllocations: saves allocation and recalculates month")
    void testUpdateAllocationsSuccess() {
        LocalDate month = LocalDate.of(2026, 10, 1);
        UpdateMonthAllocationsRequest req =
                new UpdateMonthAllocationsRequest(
                        List.of(new AllocationUpdate(categoryId, 75_000L)));

        Category cat =
                Category.builder()
                        .id(categoryId)
                        .planId(planId)
                        .groupId(UUID.randomUUID())
                        .name("Rent")
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .sortOrder(0)
                        .deleted(false)
                        .build();
        when(categoryRepository.findByIdAndPlanIdAndDeletedFalse(categoryId, planId))
                .thenReturn(Optional.of(cat));
        when(allocationRepository.findByPlanIdAndCategoryIdAndMonth(planId, categoryId, month))
                .thenReturn(Optional.empty());

        // for getPlanMonth call
        when(categoryRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(cat));
        when(accountRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of());
        when(transactionRepository.findForPlanUpToDate(any(), any())).thenReturn(List.of());
        when(allocationRepository.findByPlanIdAndMonth(planId, month)).thenReturn(List.of());

        PlanMonthSummary summary =
                monthlyBudgetService.updateMonthAllocations(planId, userId, month, req);

        verify(allocationRepository).save(any(MonthlyCategoryAllocation.class));
        assertThat(summary).isNotNull();
    }
}
