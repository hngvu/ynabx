package com.ynabx.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ynabx.entity.Account;
import com.ynabx.entity.Plan;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.TransactionRepository;
import com.ynabx.repository.projection.CashFlowRow;
import com.ynabx.service.report.AgeOfMoneyReport;
import com.ynabx.service.report.AgeOfMoneyService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AgeOfMoneyServiceTest {

    private PlanService planService;
    private AccountRepository accountRepository;
    private TransactionRepository transactionRepository;
    private AgeOfMoneyService service;

    private final UUID planId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        planService = mock(PlanService.class);
        accountRepository = mock(AccountRepository.class);
        transactionRepository = mock(TransactionRepository.class);

        service = new AgeOfMoneyService(planService, accountRepository, transactionRepository);
        when(planService.getPlanEntity(planId, userId)).thenReturn(mock(Plan.class));
    }

    @Test
    void returnsNullWhenNoCashAccounts() {
        // Only credit card account
        UUID ccId = UUID.randomUUID();
        Account cc =
                Account.builder()
                        .id(ccId)
                        .planId(planId)
                        .type(Account.AccountType.CREDIT_CARD)
                        .onBudget(true)
                        .build();
        when(accountRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(cc));

        LocalDate today = LocalDate.of(2026, 11, 5);
        AgeOfMoneyReport report = service.getAgeOfMoney(planId, userId, 3, today);

        assertNull(report.ageOfMoneyDays());
        assertEquals(3, report.series().size());
        assertNull(report.series().get(0).ageOfMoneyDays());
    }

    @Test
    void filtersCashToCashTransfersWhileKeepingCreditCardPayments() {
        UUID checkingId = UUID.randomUUID();
        UUID savingsId = UUID.randomUUID();
        UUID creditCardId = UUID.randomUUID();

        Account checking =
                Account.builder()
                        .id(checkingId)
                        .planId(planId)
                        .type(Account.AccountType.CHECKING)
                        .onBudget(true)
                        .build();
        Account savings =
                Account.builder()
                        .id(savingsId)
                        .planId(planId)
                        .type(Account.AccountType.SAVINGS)
                        .onBudget(true)
                        .build();

        when(accountRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId))
                .thenReturn(List.of(checking, savings));

        LocalDate day0 = LocalDate.of(2026, 10, 1);
        LocalDate day10 = LocalDate.of(2026, 10, 11);
        LocalDate day20 = LocalDate.of(2026, 10, 21);

        Instant now = Instant.now();
        List<CashFlowRow> rows =
                List.of(
                        // Income into checking: 100,000 on day 0
                        new CashFlowRow(UUID.randomUUID(), day0, 100_000L, checkingId, null, now),
                        // Transfer from Checking to Savings: -30,000 (ignored in AoM)
                        new CashFlowRow(
                                UUID.randomUUID(), day10, -30_000L, checkingId, savingsId, now),
                        // Transfer from Checking to Credit Card (paying bill): -50,000 on day 20
                        // (kept as outflow!)
                        // Age = 20 days, amount = 50,000
                        new CashFlowRow(
                                UUID.randomUUID(), day20, -50_000L, checkingId, creditCardId, now));

        when(transactionRepository.findCashFlowsUpTo(eq(planId), any(), any())).thenReturn(rows);

        LocalDate today = LocalDate.of(2026, 10, 25);
        AgeOfMoneyReport report = service.getAgeOfMoney(planId, userId, 1, today);

        assertEquals(20, report.ageOfMoneyDays());
    }
}
