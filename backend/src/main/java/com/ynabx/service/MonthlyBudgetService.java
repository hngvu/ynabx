package com.ynabx.service;

import com.ynabx.dto.AllocationUpdate;
import com.ynabx.dto.CategoryMonthAllocationResponse;
import com.ynabx.dto.PlanMonthSummary;
import com.ynabx.dto.UpdateMonthAllocationsRequest;
import com.ynabx.entity.Account;
import com.ynabx.entity.Category;
import com.ynabx.entity.MonthlyCategoryAllocation;
import com.ynabx.entity.Transaction;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.exception.SystemResourceConflictException;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.MonthlyCategoryAllocationRepository;
import com.ynabx.repository.TransactionRepository;
import com.ynabx.util.BudgetRolloverCalculator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonthlyBudgetService {

    private final PlanService planService;
    private final CategoryRepository categoryRepository;
    private final MonthlyCategoryAllocationRepository allocationRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    public MonthlyBudgetService(
            PlanService planService,
            CategoryRepository categoryRepository,
            MonthlyCategoryAllocationRepository allocationRepository,
            TransactionRepository transactionRepository,
            AccountRepository accountRepository) {
        this.planService = planService;
        this.categoryRepository = categoryRepository;
        this.allocationRepository = allocationRepository;
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
    }

    @Transactional(readOnly = true)
    public PlanMonthSummary getPlanMonth(UUID planId, UUID userId, LocalDate monthDate) {
        planService.getPlanEntity(planId, userId);
        LocalDate normalizedMonth = LocalDate.of(monthDate.getYear(), monthDate.getMonth(), 1);

        List<Category> categories =
                categoryRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId);
        List<BudgetRolloverCalculator.CategoryMeta> categoryMetas =
                categories.stream()
                        .map(
                                c ->
                                        new BudgetRolloverCalculator.CategoryMeta(
                                                c.getId(),
                                                c.getGroupId(),
                                                c.getName(),
                                                c.isInflowCategory(),
                                                c.isCreditCardPayment(),
                                                c.getCreditCardAccountId()))
                        .toList();

        LocalDate endOfTargetMonth = normalizedMonth.plusMonths(1).minusDays(1);
        List<Transaction> allTransactions =
                transactionRepository.findForPlanUpToDate(planId, endOfTargetMonth);

        Map<UUID, Account> accountsById = new HashMap<>();
        accountRepository
                .findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId)
                .forEach(a -> accountsById.put(a.getId(), a));

        Map<YearMonth, List<Transaction>> txsByMonth = new HashMap<>();
        for (Transaction tx : allTransactions) {
            YearMonth ym = YearMonth.from(tx.getDate());
            txsByMonth.computeIfAbsent(ym, k -> new ArrayList<>()).add(tx);
        }

        YearMonth targetYm = YearMonth.from(normalizedMonth);
        YearMonth startYm = targetYm;
        for (YearMonth ym : txsByMonth.keySet()) {
            if (ym.isBefore(startYm)) {
                startYm = ym;
            }
        }

        BudgetRolloverCalculator.PlanMonthRollup currentRollup = null;
        YearMonth iterYm = startYm;
        while (!iterYm.isAfter(targetYm)) {
            LocalDate iterMonthDate = iterYm.atDay(1);
            List<MonthlyCategoryAllocation> monthAllocations =
                    allocationRepository.findByPlanIdAndMonth(planId, iterMonthDate);

            Map<UUID, Long> assignedMap = new HashMap<>();
            for (MonthlyCategoryAllocation a : monthAllocations) {
                assignedMap.put(a.getCategoryId(), a.getAssignedMilliunits());
            }

            long monthInflow = 0L;
            Map<UUID, Long> cashActivity = new HashMap<>();
            Map<UUID, Long> creditActivity = new HashMap<>();
            Map<UUID, Long> ccPaymentTransfers = new HashMap<>();

            List<Transaction> monthTxs = txsByMonth.getOrDefault(iterYm, List.of());
            for (Transaction tx : monthTxs) {
                Account acc = accountsById.get(tx.getAccountId());
                if (acc == null) continue;

                if (tx.getCategoryId() != null) {
                    Category cat =
                            categories.stream()
                                    .filter(c -> c.getId().equals(tx.getCategoryId()))
                                    .findFirst()
                                    .orElse(null);
                    if (cat != null && cat.isInflowCategory()) {
                        monthInflow += tx.getAmountMilliunits();
                    } else if (cat != null) {
                        if (acc.getType() == Account.AccountType.CREDIT_CARD) {
                            creditActivity.merge(cat.getId(), tx.getAmountMilliunits(), Long::sum);
                        } else {
                            cashActivity.merge(cat.getId(), tx.getAmountMilliunits(), Long::sum);
                        }
                    }
                }

                if (acc.getType() == Account.AccountType.CREDIT_CARD
                        && tx.getTransferAccountId() != null) {
                    Category ccPaymentCat =
                            categories.stream()
                                    .filter(
                                            c ->
                                                    c.isCreditCardPayment()
                                                            && acc.getId()
                                                                    .equals(
                                                                            c
                                                                                    .getCreditCardAccountId()))
                                    .findFirst()
                                    .orElse(null);
                    if (ccPaymentCat != null) {
                        ccPaymentTransfers.merge(
                                ccPaymentCat.getId(), -tx.getAmountMilliunits(), Long::sum);
                    }
                }
            }

            BudgetRolloverCalculator.PriorMonthSummary priorSummary =
                    (currentRollup != null)
                            ? currentRollup.toPriorMonthSummary()
                            : new BudgetRolloverCalculator.PriorMonthSummary(
                                    0L, Map.of(), Map.of());

            currentRollup =
                    BudgetRolloverCalculator.calculateMonth(
                            categoryMetas,
                            priorSummary,
                            monthInflow,
                            assignedMap,
                            cashActivity,
                            creditActivity,
                            Map.of(),
                            ccPaymentTransfers);

            iterYm = iterYm.plusMonths(1);
        }

        List<CategoryMonthAllocationResponse> categoryAllocations = new ArrayList<>();
        for (Category cat : categories) {
            BudgetRolloverCalculator.CategoryBalance bal =
                    currentRollup.categoryBalances().get(cat.getId());
            long assigned = bal != null ? bal.assignedMilliunits() : 0L;
            long activity = bal != null ? bal.activityMilliunits() : 0L;
            long available = bal != null ? bal.availableMilliunits() : 0L;

            categoryAllocations.add(
                    new CategoryMonthAllocationResponse(
                            cat.getId(),
                            cat.getGroupId(),
                            cat.getName(),
                            cat.getNote(),
                            assigned,
                            activity,
                            available,
                            cat.isCreditCardPayment(),
                            cat.getCreditCardAccountId(),
                            cat.isHidden(),
                            cat.getSortOrder()));
        }

        return new PlanMonthSummary(
                normalizedMonth,
                currentRollup.readyToAssignMilliunits(),
                currentRollup.totalAssignedMilliunits(),
                currentRollup.totalActivityMilliunits(),
                currentRollup.totalAvailableMilliunits(),
                categoryAllocations);
    }

    @Transactional
    public PlanMonthSummary updateMonthAllocations(
            UUID planId, UUID userId, LocalDate monthDate, UpdateMonthAllocationsRequest req) {
        planService.getPlanEntity(planId, userId);
        LocalDate normalizedMonth = LocalDate.of(monthDate.getYear(), monthDate.getMonth(), 1);

        if (req.allocations() == null || req.allocations().isEmpty()) {
            throw new DomainValidationException(
                    "allocations array is required and cannot be empty");
        }

        Set<UUID> seenCats = new HashSet<>();
        for (AllocationUpdate update : req.allocations()) {
            if (!seenCats.add(update.category_id())) {
                throw new DomainValidationException(
                        "Duplicate category_id in allocations array: " + update.category_id());
            }

            Category cat =
                    categoryRepository
                            .findByIdAndPlanIdAndDeletedFalse(update.category_id(), planId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Category not found: " + update.category_id()));

            if (cat.isInflowCategory()) {
                throw new SystemResourceConflictException(
                        "Cannot assign money directly to an inflow category");
            }

            Instant now = Instant.now();
            MonthlyCategoryAllocation entity =
                    allocationRepository
                            .findByPlanIdAndCategoryIdAndMonth(planId, cat.getId(), normalizedMonth)
                            .orElseGet(
                                    () ->
                                            MonthlyCategoryAllocation.builder()
                                                    .id(UUID.randomUUID())
                                                    .planId(planId)
                                                    .categoryId(cat.getId())
                                                    .month(normalizedMonth)
                                                    .createdAt(now)
                                                    .build());

            entity.setAssignedMilliunits(update.assigned_milliunits());
            entity.setUpdatedAt(now);
            allocationRepository.save(entity);
        }

        return getPlanMonth(planId, userId, normalizedMonth);
    }
}
