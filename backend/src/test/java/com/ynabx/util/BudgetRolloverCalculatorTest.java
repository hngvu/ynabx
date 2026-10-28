package com.ynabx.util;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BudgetRolloverCalculatorTest {

    @Test
    @DisplayName(
            "Positive available category balance rolls over into the next month starting balance")
    void testPositiveCategoryRollover() {
        UUID catId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        var category =
                new BudgetRolloverCalculator.CategoryMeta(
                        catId, groupId, "Groceries", false, false, null);

        // Month 1: Assigned $100 (100000), Spent $40 (-40000) -> Available = $60 (60000)
        var month1 =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(category),
                        0L,
                        Map.of(),
                        100_000L,
                        Map.of(catId, 100_000L),
                        Map.of(catId, -40_000L),
                        Map.of(),
                        Map.of());

        assertEquals(60_000L, month1.categoryBalances().get(catId).availableMilliunits());
        assertEquals(0L, month1.readyToAssignMilliunits());

        // Month 2: Prior available rolls over as starting balance
        var month2 =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(category),
                        month1.toPriorMonthSummary(),
                        50_000L,
                        Map.of(catId, 20_000L),
                        Map.of(catId, -30_000L),
                        Map.of(),
                        Map.of(),
                        Map.of());

        // Available = 60000 rollover + 20000 assigned - 30000 spent = 50000
        assertEquals(50_000L, month2.categoryBalances().get(catId).availableMilliunits());
        assertEquals(30_000L, month2.readyToAssignMilliunits());
    }

    @Test
    @DisplayName(
            "Cash overspending in Month M resets Category available to 0 and deducts overspent amount from Month M+1 RTA")
    void testCashOverspendingDeductedFromNextMonthRta() {
        UUID catId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        var category =
                new BudgetRolloverCalculator.CategoryMeta(
                        catId, groupId, "Dining", false, false, null);

        // Month 1: Assigned $50, Cash Spent $80 -> Cash overspent $30 (-30000)
        var month1 =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(category),
                        0L,
                        Map.of(),
                        50_000L,
                        Map.of(catId, 50_000L),
                        Map.of(catId, -80_000L),
                        Map.of(),
                        Map.of());

        assertEquals(-30_000L, month1.categoryBalances().get(catId).availableMilliunits());
        assertEquals(30_000L, month1.categoryBalances().get(catId).cashOverspentMilliunits());

        // Month 2: New inflow $100 (100000). RTA should be 100000 - 30000 (deduction) = 70000
        var month2 =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(category),
                        month1.toPriorMonthSummary(),
                        100_000L,
                        Map.of(),
                        Map.of(),
                        Map.of(),
                        Map.of(),
                        Map.of());

        assertEquals(0L, month2.categoryBalances().get(catId).availableMilliunits());
        assertEquals(70_000L, month2.readyToAssignMilliunits());
    }

    @Test
    @DisplayName("Credit card overspending does NOT deduct from next month RTA but turns into debt")
    void testCreditOverspendingDoesNotDeductFromNextMonthRta() {
        UUID catId = UUID.randomUUID();
        UUID ccPaymentCatId = UUID.randomUUID();
        UUID ccAccountId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();

        var cat =
                new BudgetRolloverCalculator.CategoryMeta(
                        catId, groupId, "Electronics", false, false, null);
        var ccPaymentCat =
                new BudgetRolloverCalculator.CategoryMeta(
                        ccPaymentCatId, groupId, "Visa Payment", false, true, ccAccountId);

        // Month 1: Budget $0, Credit Card Spent $150 (-150000) -> Credit overspent $150
        var month1 =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(cat, ccPaymentCat),
                        0L,
                        Map.of(),
                        0L,
                        Map.of(),
                        Map.of(),
                        Map.of(catId, -150_000L),
                        Map.of());

        assertEquals(-150_000L, month1.categoryBalances().get(catId).availableMilliunits());
        assertEquals(150_000L, month1.categoryBalances().get(catId).creditOverspentMilliunits());
        assertEquals(0L, month1.categoryBalances().get(catId).cashOverspentMilliunits());
        // Since it was unfunded, 0 moves to CC Payment category
        assertEquals(0L, month1.categoryBalances().get(ccPaymentCatId).availableMilliunits());

        // Month 2: Inflow $200. RTA should be the full 200000 (NO deduction for credit
        // overspending)
        var month2 =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(cat, ccPaymentCat),
                        month1.toPriorMonthSummary(),
                        200_000L,
                        Map.of(),
                        Map.of(),
                        Map.of(),
                        Map.of(),
                        Map.of());

        assertEquals(0L, month2.categoryBalances().get(catId).availableMilliunits());
        assertEquals(200_000L, month2.readyToAssignMilliunits());
    }

    @Test
    @DisplayName(
            "Funded credit card spending automatically shifts funds to the credit card payment category")
    void testFundedCreditCardSpendingMovement() {
        UUID catId = UUID.randomUUID();
        UUID ccPaymentCatId = UUID.randomUUID();
        UUID ccAccountId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();

        var cat =
                new BudgetRolloverCalculator.CategoryMeta(
                        catId, groupId, "Groceries", false, false, null);
        var ccPaymentCat =
                new BudgetRolloverCalculator.CategoryMeta(
                        ccPaymentCatId, groupId, "Visa Payment", false, true, ccAccountId);

        // Assigned $100 to Groceries. Spent $70 on Credit Card.
        // Groceries available should be $30; CC Payment available should automatically be $70.
        var result =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(cat, ccPaymentCat),
                        0L,
                        Map.of(),
                        100_000L,
                        Map.of(catId, 100_000L),
                        Map.of(),
                        Map.of(catId, -70_000L),
                        Map.of());

        assertEquals(30_000L, result.categoryBalances().get(catId).availableMilliunits());
        assertEquals(70_000L, result.categoryBalances().get(ccPaymentCatId).availableMilliunits());
        assertEquals(0L, result.readyToAssignMilliunits());
    }

    @Test
    @DisplayName("Partial funded credit card spending only moves available funds")
    void testPartiallyFundedCreditCardSpendingMovement() {
        UUID catId = UUID.randomUUID();
        UUID ccPaymentCatId = UUID.randomUUID();
        UUID ccAccountId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();

        var cat =
                new BudgetRolloverCalculator.CategoryMeta(
                        catId, groupId, "Clothing", false, false, null);
        var ccPaymentCat =
                new BudgetRolloverCalculator.CategoryMeta(
                        ccPaymentCatId, groupId, "Visa Payment", false, true, ccAccountId);

        // Assigned $40 to Clothing. Spent $100 on Credit Card.
        // Available was only $40, so only $40 is transferred to CC Payment.
        // Category ending available is -$60 (credit debt).
        var result =
                BudgetRolloverCalculator.calculateMonth(
                        List.of(cat, ccPaymentCat),
                        0L,
                        Map.of(),
                        40_000L,
                        Map.of(catId, 40_000L),
                        Map.of(),
                        Map.of(catId, -100_000L),
                        Map.of());

        assertEquals(-60_000L, result.categoryBalances().get(catId).availableMilliunits());
        assertEquals(60_000L, result.categoryBalances().get(catId).creditOverspentMilliunits());
        assertEquals(40_000L, result.categoryBalances().get(ccPaymentCatId).availableMilliunits());
    }
}
