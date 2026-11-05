package com.ynabx.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class AgeOfMoneyCalculatorTest {

    @Test
    void returnsNullWhenNoCashFlowsOrNoOutflows() {
        AgeOfMoneyCalculator calc = new AgeOfMoneyCalculator();
        List<Integer> res = calc.calculateSnapshots(List.of(), List.of(LocalDate.of(2026, 11, 1)));
        assertEquals(1, res.size());
        assertNull(res.get(0));

        // Inflow only
        List<AgeOfMoneyCalculator.CashFlow> flows =
                List.of(new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 10, 1), 100_000L, 0));
        List<Integer> res2 = calc.calculateSnapshots(flows, List.of(LocalDate.of(2026, 10, 15)));
        assertNull(res2.get(0));
    }

    @Test
    void matchesFifoLotsAcrossMultipleInflows() {
        // Inflow 1: 50,000 on Day 0 (2026-10-01)
        // Inflow 2: 50,000 on Day 10 (2026-10-11)
        // Outflow 1: -80,000 on Day 20 (2026-10-21)
        // Takes 50,000 from Inflow 1 (age = 20 days)
        // Takes 30,000 from Inflow 2 (age = 10 days)
        // Total weighted days = 50,000 * 20 + 30,000 * 10 = 1,000,000 + 300,000 = 1,300,000
        // Matched amount = 80,000
        // Expected AoM = 1,300,000 / 80,000 = 16.25 -> 16 days
        AgeOfMoneyCalculator calc = new AgeOfMoneyCalculator();
        List<AgeOfMoneyCalculator.CashFlow> flows =
                List.of(
                        new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 10, 1), 50_000L, 0),
                        new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 10, 11), 50_000L, 1),
                        new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 10, 21), -80_000L, 2));

        List<Integer> res = calc.calculateSnapshots(flows, List.of(LocalDate.of(2026, 10, 25)));
        assertEquals(16, res.get(0));
    }

    @Test
    void provesDollarWeightedAverageDiffersFromSimpleTransactionAverage() {
        // Specification test: Outflow 100 (age 10 days) and 900 (age 100 days)
        // Simple average: (10 + 100) / 2 = 55 days
        // Dollar-weighted average: (100 * 10 + 900 * 100) / 1000 = (1000 + 90000) / 1000 = 91 days
        List<AgeOfMoneyCalculator.CashFlow> weightedFlows =
                List.of(
                        new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 1, 1), 100L, 0),
                        new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 1, 1), 900L, 1),
                        new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 1, 11), -100L, 2),
                        new AgeOfMoneyCalculator.CashFlow(LocalDate.of(2026, 4, 11), -900L, 3));

        AgeOfMoneyCalculator calc = new AgeOfMoneyCalculator();
        List<Integer> res =
                calc.calculateSnapshots(weightedFlows, List.of(LocalDate.of(2026, 4, 15)));
        assertEquals(91, res.get(0));
    }

    @Test
    void windowSlidesDroppingOlderThanTenOutflows() {
        AgeOfMoneyCalculator calc = new AgeOfMoneyCalculator(10);
        // 1 large inflow on Jan 1
        LocalDate start = LocalDate.of(2026, 1, 1);
        List<AgeOfMoneyCalculator.CashFlow> flows = new java.util.ArrayList<>();
        flows.add(new AgeOfMoneyCalculator.CashFlow(start, 1_000_000L, 0));

        // Outflow #1 on day 10 (Jan 11): -1000, age = 10 days
        flows.add(new AgeOfMoneyCalculator.CashFlow(start.plusDays(10), -1000L, 1));

        // Outflows #2..#11 on day 100 (Apr 11): each -1000, age = 100 days
        for (int i = 2; i <= 11; i++) {
            flows.add(new AgeOfMoneyCalculator.CashFlow(start.plusDays(100), -1000L, i));
        }

        // At day 100, we have 11 outflows. The first outflow (age 10) must be evicted!
        // All 10 remaining outflows in window have age 100 -> AoM = 100
        List<Integer> res = calc.calculateSnapshots(flows, List.of(start.plusDays(105)));
        assertEquals(100, res.get(0));
    }
}
