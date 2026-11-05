package com.ynabx.service.report;

import com.ynabx.entity.Account;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.TransactionRepository;
import com.ynabx.repository.projection.CashFlowRow;
import com.ynabx.service.PlanService;
import com.ynabx.util.AgeOfMoneyCalculator;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgeOfMoneyService {

    private final PlanService planService;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final AgeOfMoneyCalculator calculator;

    public AgeOfMoneyService(
            PlanService planService,
            AccountRepository accountRepository,
            TransactionRepository transactionRepository) {
        this.planService = planService;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.calculator = new AgeOfMoneyCalculator();
    }

    @Transactional(readOnly = true)
    public AgeOfMoneyReport getAgeOfMoney(UUID planId, UUID userId, int months, LocalDate today) {
        planService.getPlanEntity(planId, userId);

        int boundedMonths = Math.min(Math.max(months, 1), 120);

        List<Account> accounts =
                accountRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId);
        Set<UUID> cashAccountIds =
                accounts.stream()
                        .filter(
                                a ->
                                        a.isOnBudget()
                                                && a.getType() != Account.AccountType.CREDIT_CARD)
                        .map(Account::getId)
                        .collect(Collectors.toSet());

        // Snapshot dates: boundedMonths points ending at today
        List<LocalDate> snapshotDates = buildSnapshotDates(boundedMonths, today);

        if (cashAccountIds.isEmpty()) {
            List<AgeOfMoneyReport.DataPoint> emptySeries =
                    snapshotDates.stream()
                            .map(d -> new AgeOfMoneyReport.DataPoint(d, null))
                            .toList();
            return new AgeOfMoneyReport(today, null, emptySeries);
        }

        List<CashFlowRow> rawRows =
                transactionRepository.findCashFlowsUpTo(planId, cashAccountIds, today);

        // Filter out cash <-> cash transfers at service level
        List<AgeOfMoneyCalculator.CashFlow> filteredFlows = new ArrayList<>();
        int seq = 0;
        for (CashFlowRow row : rawRows) {
            if (row.transferAccountId() != null
                    && cashAccountIds.contains(row.transferAccountId())) {
                continue; // cash to cash transfer ignored in AoM
            }
            filteredFlows.add(
                    new AgeOfMoneyCalculator.CashFlow(row.date(), row.amountMilliunits(), seq++));
        }

        List<Integer> calculatedAoms = calculator.calculateSnapshots(filteredFlows, snapshotDates);

        List<AgeOfMoneyReport.DataPoint> series = new ArrayList<>(snapshotDates.size());
        for (int i = 0; i < snapshotDates.size(); i++) {
            series.add(new AgeOfMoneyReport.DataPoint(snapshotDates.get(i), calculatedAoms.get(i)));
        }

        Integer currentAoM =
                series.isEmpty() ? null : series.get(series.size() - 1).ageOfMoneyDays();
        return new AgeOfMoneyReport(today, currentAoM, series);
    }

    private List<LocalDate> buildSnapshotDates(int months, LocalDate today) {
        List<LocalDate> dates = new ArrayList<>(months);
        YearMonth currentYm = YearMonth.from(today);
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = currentYm.minusMonths(i);
            LocalDate endOfMonth = ym.atEndOfMonth();
            LocalDate snapshot = endOfMonth.isAfter(today) ? today : endOfMonth;
            dates.add(snapshot);
        }
        return dates;
    }
}
