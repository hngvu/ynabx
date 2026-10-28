package com.ynabx.util;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class BudgetRolloverCalculator {

    private BudgetRolloverCalculator() {}

    public record CategoryMeta(
            UUID categoryId,
            UUID groupId,
            String name,
            boolean inflowCategory,
            boolean creditCardPayment,
            UUID creditCardAccountId) {}

    public record CategoryBalance(
            UUID categoryId,
            long assignedMilliunits,
            long activityMilliunits,
            long availableMilliunits,
            long cashOverspentMilliunits,
            long creditOverspentMilliunits) {}

    public record PriorMonthSummary(
            long readyToAssignMilliunits,
            Map<UUID, Long> categoryAvailableMilliunits,
            Map<UUID, Long> categoryCashOverspentMilliunits) {}

    public record PlanMonthRollup(
            long readyToAssignMilliunits,
            long totalAssignedMilliunits,
            long totalActivityMilliunits,
            long totalAvailableMilliunits,
            Map<UUID, CategoryBalance> categoryBalances) {

        public PriorMonthSummary toPriorMonthSummary() {
            Map<UUID, Long> availableMap = new HashMap<>();
            Map<UUID, Long> cashOverspentMap = new HashMap<>();
            for (Map.Entry<UUID, CategoryBalance> entry : categoryBalances.entrySet()) {
                availableMap.put(entry.getKey(), entry.getValue().availableMilliunits());
                if (entry.getValue().cashOverspentMilliunits() > 0) {
                    cashOverspentMap.put(
                            entry.getKey(), entry.getValue().cashOverspentMilliunits());
                }
            }
            return new PriorMonthSummary(readyToAssignMilliunits, availableMap, cashOverspentMap);
        }
    }

    public static PlanMonthRollup calculateMonth(
            List<CategoryMeta> categories,
            long priorReadyToAssign,
            Map<UUID, Long> priorCategoryAvailable,
            long monthInflowMilliunits,
            Map<UUID, Long> monthAssigned,
            Map<UUID, Long> monthCashActivity,
            Map<UUID, Long> monthCreditActivity,
            Map<UUID, Long> ccPaymentTransfers) {

        return calculateMonth(
                categories,
                new PriorMonthSummary(priorReadyToAssign, priorCategoryAvailable, Map.of()),
                monthInflowMilliunits,
                monthAssigned,
                monthCashActivity,
                monthCreditActivity,
                Map.of(),
                ccPaymentTransfers);
    }

    public static PlanMonthRollup calculateMonth(
            List<CategoryMeta> categories,
            PriorMonthSummary priorMonth,
            long monthInflowMilliunits,
            Map<UUID, Long> monthAssigned,
            Map<UUID, Long> monthCashActivity,
            Map<UUID, Long> monthCreditActivity,
            Map<UUID, Map<UUID, Long>> creditActivityByCard,
            Map<UUID, Long> ccPaymentTransfers) {

        Map<UUID, Long> startingAvailable = new HashMap<>();
        long priorCashOverspendingDeduction = 0L;

        if (priorMonth != null) {
            Map<UUID, Long> priorAvailable = priorMonth.categoryAvailableMilliunits();
            Map<UUID, Long> priorCashOverspent = priorMonth.categoryCashOverspentMilliunits();

            for (CategoryMeta cat : categories) {
                long priorAvail = priorAvailable.getOrDefault(cat.categoryId(), 0L);
                if (priorAvail > 0) {
                    startingAvailable.put(cat.categoryId(), priorAvail);
                } else if (priorAvail < 0) {
                    startingAvailable.put(cat.categoryId(), 0L);
                    long cashOver = priorCashOverspent.getOrDefault(cat.categoryId(), 0L);
                    if (cashOver > 0) {
                        priorCashOverspendingDeduction += cashOver;
                    }
                } else {
                    startingAvailable.put(cat.categoryId(), 0L);
                }
            }
        }

        long totalAssigned = 0L;
        for (Map.Entry<UUID, Long> entry : monthAssigned.entrySet()) {
            totalAssigned += entry.getValue();
        }

        Map<UUID, Long> fundedByCard = new HashMap<>();
        Map<UUID, CategoryBalance> balances = new HashMap<>();

        Map<UUID, UUID> ccAccountToCategory = new HashMap<>();
        UUID singleCcPaymentCategoryId = null;
        for (CategoryMeta cat : categories) {
            if (cat.creditCardPayment()) {
                if (cat.creditCardAccountId() != null) {
                    ccAccountToCategory.put(cat.creditCardAccountId(), cat.categoryId());
                }
                singleCcPaymentCategoryId = cat.categoryId();
            }
        }

        long totalActivity = 0L;
        long totalAvailable = 0L;

        for (CategoryMeta cat : categories) {
            if (cat.inflowCategory() || cat.creditCardPayment()) {
                continue;
            }

            long assigned = monthAssigned.getOrDefault(cat.categoryId(), 0L);
            long startAvail = startingAvailable.getOrDefault(cat.categoryId(), 0L);
            long cashAct = monthCashActivity.getOrDefault(cat.categoryId(), 0L);
            long creditAct = monthCreditActivity.getOrDefault(cat.categoryId(), 0L);

            long netActivity = cashAct + creditAct;
            totalActivity += netActivity;

            long fundsBeforeSpending = startAvail + assigned;
            long fundsAfterCash = fundsBeforeSpending + cashAct;

            long cashOverspent = 0L;
            long creditOverspent = 0L;
            long fundedCreditSpending = 0L;

            if (fundsAfterCash < 0) {
                cashOverspent = -fundsAfterCash;
                creditOverspent = -creditAct;
            } else {
                long creditOutflow = -creditAct;
                if (creditOutflow > 0) {
                    if (fundsAfterCash >= creditOutflow) {
                        fundedCreditSpending = creditOutflow;
                    } else {
                        fundedCreditSpending = fundsAfterCash;
                        creditOverspent = creditOutflow - fundsAfterCash;
                    }
                }
            }

            long endingAvailable = fundsBeforeSpending + netActivity;
            totalAvailable += endingAvailable;

            balances.put(
                    cat.categoryId(),
                    new CategoryBalance(
                            cat.categoryId(),
                            assigned,
                            netActivity,
                            endingAvailable,
                            cashOverspent,
                            creditOverspent));

            if (singleCcPaymentCategoryId != null) {
                fundedByCard.merge(singleCcPaymentCategoryId, fundedCreditSpending, Long::sum);
            }
        }

        // Second pass: CC Payment categories
        for (CategoryMeta cat : categories) {
            if (!cat.creditCardPayment()) {
                continue;
            }

            long assigned = monthAssigned.getOrDefault(cat.categoryId(), 0L);
            long startAvail = startingAvailable.getOrDefault(cat.categoryId(), 0L);
            long paymentTransfer = ccPaymentTransfers.getOrDefault(cat.categoryId(), 0L);
            long fundedMovement = fundedByCard.getOrDefault(cat.categoryId(), 0L);

            long netCcActivity = fundedMovement + paymentTransfer;
            long endingAvail = startAvail + assigned + netCcActivity;

            totalActivity += netCcActivity;
            totalAvailable += endingAvail;

            balances.put(
                    cat.categoryId(),
                    new CategoryBalance(
                            cat.categoryId(), assigned, netCcActivity, endingAvail, 0L, 0L));
        }

        long priorRta = (priorMonth != null) ? priorMonth.readyToAssignMilliunits() : 0L;
        long readyToAssign =
                priorRta - priorCashOverspendingDeduction + monthInflowMilliunits - totalAssigned;

        return new PlanMonthRollup(
                readyToAssign,
                totalAssigned,
                totalActivity,
                totalAvailable,
                Collections.unmodifiableMap(balances));
    }
}
