package com.ynabx.service.report;

import com.ynabx.entity.Category;
import com.ynabx.entity.CategoryGroup;
import com.ynabx.entity.Payee;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.repository.CategoryGroupRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.PayeeRepository;
import com.ynabx.repository.ReportTransactionRepository;
import com.ynabx.repository.TransactionRepository;
import com.ynabx.repository.projection.CategorySpendingRow;
import com.ynabx.repository.projection.LargestOutflowRow;
import com.ynabx.service.PlanService;
import com.ynabx.util.BasisPointAllocator;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpendingBreakdownService {

    private final PlanService planService;
    private final CategoryRepository categoryRepository;
    private final CategoryGroupRepository categoryGroupRepository;
    private final PayeeRepository payeeRepository;
    private final TransactionRepository transactionRepository;
    private final ReportTransactionRepository reportTransactionRepository;

    public SpendingBreakdownService(
            PlanService planService,
            CategoryRepository categoryRepository,
            CategoryGroupRepository categoryGroupRepository,
            PayeeRepository payeeRepository,
            TransactionRepository transactionRepository,
            ReportTransactionRepository reportTransactionRepository) {
        this.planService = planService;
        this.categoryRepository = categoryRepository;
        this.categoryGroupRepository = categoryGroupRepository;
        this.payeeRepository = payeeRepository;
        this.transactionRepository = transactionRepository;
        this.reportTransactionRepository = reportTransactionRepository;
    }

    @Transactional(readOnly = true)
    public SpendingBreakdown getSpendingBreakdown(
            UUID planId,
            UUID userId,
            LocalDate sinceMonthReq,
            LocalDate untilMonthReq,
            Collection<UUID> accountIdsFilter,
            Collection<UUID> categoryIdsFilter,
            LocalDate today) {
        planService.getPlanEntity(planId, userId);

        if (untilMonthReq == null) {
            throw new DomainValidationException("until_month is required");
        }

        LocalDate normalizedUntil = untilMonthReq.withDayOfMonth(1);
        LocalDate normalizedSince;
        if (sinceMonthReq == null) {
            Optional<LocalDate> minDate = transactionRepository.findMinDateByPlanId(planId);
            normalizedSince = minDate.map(d -> d.withDayOfMonth(1)).orElse(normalizedUntil);
        } else {
            normalizedSince = sinceMonthReq.withDayOfMonth(1);
        }

        if (normalizedSince.isAfter(normalizedUntil)) {
            throw new DomainValidationException("since_month cannot be after until_month");
        }

        long monthsBetween =
                ChronoUnit.MONTHS.between(
                                YearMonth.from(normalizedSince), YearMonth.from(normalizedUntil))
                        + 1;
        if (monthsBetween > 120) {
            throw new DomainValidationException("Timeframe exceeds maximum of 120 months");
        }

        LocalDate sinceDate = normalizedSince;
        LocalDate untilExclusive = normalizedUntil.plusMonths(1);
        LocalDate effectiveEndDate =
                untilExclusive.minusDays(1).isAfter(today) ? today : untilExclusive.minusDays(1);
        int dayCount = (int) Math.max(1, ChronoUnit.DAYS.between(sinceDate, effectiveEndDate) + 1);
        int monthCount = (int) monthsBetween;

        List<Category> allCategories =
                categoryRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId);
        List<CategoryGroup> allGroups =
                categoryGroupRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId);

        Map<UUID, Category> categoryMap = new HashMap<>();
        Map<UUID, CategoryGroup> groupMap = new HashMap<>();
        allCategories.forEach(c -> categoryMap.put(c.getId(), c));
        allGroups.forEach(g -> groupMap.put(g.getId(), g));

        Set<UUID> eligibleCategoryIds = new HashSet<>();
        for (Category c : allCategories) {
            if (!c.isInflowCategory() && !c.isCreditCardPayment()) {
                eligibleCategoryIds.add(c.getId());
            }
        }

        if (categoryIdsFilter != null) {
            eligibleCategoryIds.retainAll(categoryIdsFilter);
        }

        // If filter results in no eligible categories or account filter is empty set
        if (eligibleCategoryIds.isEmpty()
                || (accountIdsFilter != null && accountIdsFilter.isEmpty())) {
            return new SpendingBreakdown(
                    normalizedSince, normalizedUntil, monthCount, dayCount, 0L, 0, List.of(), null);
        }

        List<CategorySpendingRow> rawRows =
                reportTransactionRepository.aggregateSpendingByCategory(
                        planId, sinceDate, untilExclusive, eligibleCategoryIds, accountIdsFilter);

        // Filter: only categories where net amount < 0 (actual spending), spent = -net
        record IntermediateCat(
                UUID categoryId, String name, UUID groupId, long spent, int txCount) {}
        List<IntermediateCat> spendingCats = new ArrayList<>();
        long totalSpent = 0L;
        int totalTxCount = 0;
        Set<UUID> activeSpendingCatIds = new HashSet<>();

        for (CategorySpendingRow row : rawRows) {
            if (row.netAmountMilliunits() < 0) {
                long spent = -row.netAmountMilliunits();
                totalSpent += spent;
                totalTxCount += (int) row.transactionCount();
                Category cat = categoryMap.get(row.categoryId());
                String catName = cat != null ? cat.getName() : "Unknown";
                UUID grpId = cat != null ? cat.getGroupId() : null;
                spendingCats.add(
                        new IntermediateCat(
                                row.categoryId(),
                                catName,
                                grpId,
                                spent,
                                (int) row.transactionCount()));
                activeSpendingCatIds.add(row.categoryId());
            }
        }

        if (totalSpent == 0) {
            return new SpendingBreakdown(
                    normalizedSince, normalizedUntil, monthCount, dayCount, 0L, 0, List.of(), null);
        }

        // Group cats by groupId
        Map<UUID, List<IntermediateCat>> catsByGroup = new HashMap<>();
        for (IntermediateCat c : spendingCats) {
            catsByGroup.computeIfAbsent(c.groupId(), k -> new ArrayList<>()).add(c);
        }

        record IntermediateGroup(
                UUID groupId, String name, long spent, List<IntermediateCat> cats) {}
        List<IntermediateGroup> spendingGroups = new ArrayList<>();
        for (Map.Entry<UUID, List<IntermediateCat>> entry : catsByGroup.entrySet()) {
            UUID grpId = entry.getKey();
            CategoryGroup grp = groupMap.get(grpId);
            String grpName = grp != null ? grp.getName() : "Other";
            long grpSpent = entry.getValue().stream().mapToLong(IntermediateCat::spent).sum();
            spendingGroups.add(new IntermediateGroup(grpId, grpName, grpSpent, entry.getValue()));
        }

        // Sort groups descending by spent
        spendingGroups.sort(Comparator.comparingLong(IntermediateGroup::spent).reversed());

        long[] groupWeights = spendingGroups.stream().mapToLong(IntermediateGroup::spent).toArray();
        int[] groupBps = BasisPointAllocator.allocate(groupWeights, 10000);

        List<SpendingBreakdown.GroupBreakdown> resultGroups = new ArrayList<>();
        for (int i = 0; i < spendingGroups.size(); i++) {
            IntermediateGroup g = spendingGroups.get(i);
            int gBp = groupBps[i];

            // Sort categories in group descending by spent
            g.cats().sort(Comparator.comparingLong(IntermediateCat::spent).reversed());
            long[] catWeights = g.cats().stream().mapToLong(IntermediateCat::spent).toArray();
            int[] catBps = BasisPointAllocator.allocate(catWeights, gBp);

            List<SpendingBreakdown.CategoryBreakdown> resultCats = new ArrayList<>();
            for (int j = 0; j < g.cats().size(); j++) {
                IntermediateCat c = g.cats().get(j);
                resultCats.add(
                        new SpendingBreakdown.CategoryBreakdown(
                                c.categoryId(), c.name(), c.spent(), c.txCount(), catBps[j]));
            }
            resultGroups.add(
                    new SpendingBreakdown.GroupBreakdown(
                            g.groupId(), g.name(), g.spent(), gBp, resultCats));
        }

        // Largest outflow restricted to activeSpendingCatIds
        Optional<LargestOutflowRow> largestRow =
                reportTransactionRepository.findLargestOutflow(
                        planId, sinceDate, untilExclusive, activeSpendingCatIds, accountIdsFilter);

        SpendingBreakdown.LargestOutflow largestOutflow = null;
        if (largestRow.isPresent()) {
            LargestOutflowRow r = largestRow.get();
            String payeeName = null;
            if (r.payeeId() != null) {
                payeeName = payeeRepository.findById(r.payeeId()).map(Payee::getName).orElse(null);
            }
            Category c = categoryMap.get(r.categoryId());
            String catName = c != null ? c.getName() : null;
            largestOutflow =
                    new SpendingBreakdown.LargestOutflow(
                            r.transactionId(),
                            r.date(),
                            payeeName,
                            r.categoryId(),
                            catName,
                            Math.abs(r.amountMilliunits()));
        }

        return new SpendingBreakdown(
                normalizedSince,
                normalizedUntil,
                monthCount,
                dayCount,
                totalSpent,
                totalTxCount,
                resultGroups,
                largestOutflow);
    }
}
