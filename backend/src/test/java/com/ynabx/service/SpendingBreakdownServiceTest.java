package com.ynabx.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ynabx.entity.Category;
import com.ynabx.entity.CategoryGroup;
import com.ynabx.entity.Payee;
import com.ynabx.entity.Plan;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.repository.CategoryGroupRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.PayeeRepository;
import com.ynabx.repository.ReportTransactionRepository;
import com.ynabx.repository.TransactionRepository;
import com.ynabx.repository.projection.CategorySpendingRow;
import com.ynabx.repository.projection.LargestOutflowRow;
import com.ynabx.service.report.SpendingBreakdown;
import com.ynabx.service.report.SpendingBreakdownService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SpendingBreakdownServiceTest {

    private PlanService planService;
    private CategoryRepository categoryRepository;
    private CategoryGroupRepository categoryGroupRepository;
    private PayeeRepository payeeRepository;
    private TransactionRepository transactionRepository;
    private ReportTransactionRepository reportTransactionRepository;
    private SpendingBreakdownService service;

    private final UUID planId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        planService = mock(PlanService.class);
        categoryRepository = mock(CategoryRepository.class);
        categoryGroupRepository = mock(CategoryGroupRepository.class);
        payeeRepository = mock(PayeeRepository.class);
        transactionRepository = mock(TransactionRepository.class);
        reportTransactionRepository = mock(ReportTransactionRepository.class);

        service =
                new SpendingBreakdownService(
                        planService,
                        categoryRepository,
                        categoryGroupRepository,
                        payeeRepository,
                        transactionRepository,
                        reportTransactionRepository);

        when(planService.getPlanEntity(planId, userId)).thenReturn(mock(Plan.class));
    }

    @Test
    void rejectsInvalidTimeframe() {
        LocalDate today = LocalDate.of(2026, 11, 5);
        assertThrows(
                DomainValidationException.class,
                () -> service.getSpendingBreakdown(planId, userId, null, null, null, null, today));

        assertThrows(
                DomainValidationException.class,
                () ->
                        service.getSpendingBreakdown(
                                planId,
                                userId,
                                LocalDate.of(2026, 11, 1),
                                LocalDate.of(2026, 10, 1),
                                null,
                                null,
                                today));
    }

    @Test
    void calculatesHalfOpenIntervalAndHierarchicalBasisPoints() {
        LocalDate today = LocalDate.of(2026, 11, 5);
        LocalDate sinceMonth = LocalDate.of(2026, 9, 1);
        LocalDate untilMonth = LocalDate.of(2026, 10, 1);

        UUID groupId = UUID.randomUUID();
        CategoryGroup group =
                CategoryGroup.builder().id(groupId).planId(planId).name("Bills").build();

        UUID cat1Id = UUID.randomUUID();
        Category cat1 =
                Category.builder()
                        .id(cat1Id)
                        .groupId(groupId)
                        .name("Rent")
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .build();

        UUID cat2Id = UUID.randomUUID();
        Category cat2 =
                Category.builder()
                        .id(cat2Id)
                        .groupId(groupId)
                        .name("Power")
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .build();

        when(categoryGroupRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(group));
        when(categoryRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(cat1, cat2));

        // cat1 spent -600, cat2 spent -400 -> total 1000
        List<CategorySpendingRow> rows =
                List.of(
                        new CategorySpendingRow(cat1Id, -600_000L, 2),
                        new CategorySpendingRow(cat2Id, -400_000L, 1));
        when(reportTransactionRepository.aggregateSpendingByCategory(
                        eq(planId),
                        eq(LocalDate.of(2026, 9, 1)),
                        eq(LocalDate.of(2026, 11, 1)), // Half open [2026-09-01, 2026-11-01)
                        any(),
                        eq(null)))
                .thenReturn(rows);

        UUID payeeId = UUID.randomUUID();
        when(payeeRepository.findById(payeeId))
                .thenReturn(Optional.of(Payee.builder().id(payeeId).name("Landlord").build()));

        when(reportTransactionRepository.findLargestOutflow(
                        eq(planId),
                        eq(LocalDate.of(2026, 9, 1)),
                        eq(LocalDate.of(2026, 11, 1)),
                        any(),
                        eq(null)))
                .thenReturn(
                        Optional.of(
                                new LargestOutflowRow(
                                        UUID.randomUUID(),
                                        LocalDate.of(2026, 9, 5),
                                        payeeId,
                                        cat1Id,
                                        -500_000L)));

        SpendingBreakdown result =
                service.getSpendingBreakdown(
                        planId, userId, sinceMonth, untilMonth, null, null, today);

        assertEquals(1_000_000L, result.totalSpentMilliunits());
        assertEquals(3, result.transactionCount());
        assertEquals(2, result.monthCount());
        // Since Oct 31 <= Nov 5 (today), effective end date is Oct 31 -> days between 2026-09-01
        // and 2026-10-31 = 61 days
        assertEquals(61, result.dayCount());

        assertEquals(1, result.groups().size());
        SpendingBreakdown.GroupBreakdown g = result.groups().get(0);
        assertEquals(10000, g.percentageBasisPoints());
        assertEquals(2, g.categories().size());

        SpendingBreakdown.CategoryBreakdown c1 = g.categories().get(0);
        assertEquals(6000, c1.percentageBasisPoints());
        assertEquals(600_000L, c1.spentMilliunits());

        SpendingBreakdown.CategoryBreakdown c2 = g.categories().get(1);
        assertEquals(4000, c2.percentageBasisPoints());
        assertEquals(400_000L, c2.spentMilliunits());

        assertNotNull(result.largestOutflow());
        assertEquals(500_000L, result.largestOutflow().amountMilliunits());
        assertEquals("Landlord", result.largestOutflow().payeeName());
        assertEquals("Rent", result.largestOutflow().categoryName());
    }

    @Test
    void excludesNetPositiveCategories() {
        LocalDate today = LocalDate.of(2026, 11, 5);
        UUID groupId = UUID.randomUUID();
        UUID catId = UUID.randomUUID();
        Category cat =
                Category.builder()
                        .id(catId)
                        .groupId(groupId)
                        .name("Returns")
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .build();

        when(categoryGroupRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of());
        when(categoryRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(cat));

        // Net positive: refund greater than spending -> net +100
        when(reportTransactionRepository.aggregateSpendingByCategory(
                        any(), any(), any(), any(), any()))
                .thenReturn(List.of(new CategorySpendingRow(catId, 100_000L, 1)));

        SpendingBreakdown result =
                service.getSpendingBreakdown(
                        planId,
                        userId,
                        LocalDate.of(2026, 10, 1),
                        LocalDate.of(2026, 10, 1),
                        null,
                        null,
                        today);

        assertEquals(0L, result.totalSpentMilliunits());
        assertEquals(0, result.groups().size());
        assertNull(result.largestOutflow());
    }
}
