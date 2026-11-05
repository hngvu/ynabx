package com.ynabx.util;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;

/**
 * Pure calculator for Age of Money using FIFO lot-matching on cash inflows and dollar-weighted age
 * averaging over the last N outflows (default N = 10).
 */
public final class AgeOfMoneyCalculator {

    public static final int DEFAULT_WINDOW_SIZE = 10;

    private final int windowSize;

    public AgeOfMoneyCalculator() {
        this(DEFAULT_WINDOW_SIZE);
    }

    public AgeOfMoneyCalculator(int windowSize) {
        if (windowSize <= 0) {
            throw new IllegalArgumentException("windowSize must be positive");
        }
        this.windowSize = windowSize;
    }

    public record CashFlow(LocalDate date, long amountMilliunits, int seq) {}

    private static class InflowLot {
        final LocalDate date;
        long remainingMilliunits;

        InflowLot(LocalDate date, long remainingMilliunits) {
            this.date = date;
            this.remainingMilliunits = remainingMilliunits;
        }
    }

    private record OutflowRecord(long weightedDays, long matchedAmount) {}

    public List<Integer> calculateSnapshots(
            List<CashFlow> cashFlows, List<LocalDate> snapshotDates) {
        if (snapshotDates == null || snapshotDates.isEmpty()) {
            return List.of();
        }

        List<CashFlow> sortedFlows = new ArrayList<>();
        if (cashFlows != null) {
            sortedFlows.addAll(cashFlows);
            // Inflow before outflow on the same day; otherwise preserve seq order
            sortedFlows.sort(
                    Comparator.comparing(CashFlow::date)
                            .thenComparing((CashFlow f) -> f.amountMilliunits() > 0 ? 0 : 1)
                            .thenComparingInt(CashFlow::seq));
        }

        Deque<InflowLot> inflowLots = new ArrayDeque<>();
        Deque<OutflowRecord> outflowWindow = new ArrayDeque<>(windowSize);
        long runningA = 0L; // sum of weightedDays
        long runningB = 0L; // sum of matchedAmount

        List<Integer> results = new ArrayList<>(snapshotDates.size());
        int flowIdx = 0;
        int totalFlows = sortedFlows.size();

        for (LocalDate snapshotDate : snapshotDates) {
            while (flowIdx < totalFlows) {
                CashFlow flow = sortedFlows.get(flowIdx);
                if (flow.date().isAfter(snapshotDate)) {
                    break;
                }
                flowIdx++;

                if (flow.amountMilliunits() > 0) {
                    inflowLots.addLast(new InflowLot(flow.date(), flow.amountMilliunits()));
                } else if (flow.amountMilliunits() < 0) {
                    long needed = -flow.amountMilliunits();
                    long outflowWeightedDays = 0L;
                    long outflowMatched = 0L;

                    while (needed > 0 && !inflowLots.isEmpty()) {
                        InflowLot lot = inflowLots.peekFirst();
                        if (lot.date.isAfter(flow.date())) {
                            break;
                        }

                        long take = Math.min(needed, lot.remainingMilliunits);
                        long days = ChronoUnit.DAYS.between(lot.date, flow.date());
                        outflowWeightedDays =
                                Math.addExact(outflowWeightedDays, Math.multiplyExact(take, days));
                        outflowMatched = Math.addExact(outflowMatched, take);
                        lot.remainingMilliunits -= take;
                        needed -= take;

                        if (lot.remainingMilliunits == 0) {
                            inflowLots.pollFirst();
                        }
                    }

                    if (outflowMatched > 0) {
                        if (outflowWindow.size() == windowSize) {
                            OutflowRecord evicted = outflowWindow.pollFirst();
                            runningA -= evicted.weightedDays();
                            runningB -= evicted.matchedAmount();
                        }
                        OutflowRecord record =
                                new OutflowRecord(outflowWeightedDays, outflowMatched);
                        outflowWindow.addLast(record);
                        runningA = Math.addExact(runningA, outflowWeightedDays);
                        runningB = Math.addExact(runningB, outflowMatched);
                    }
                }
            }

            if (runningB == 0) {
                results.add(null);
            } else {
                long aom =
                        (Math.multiplyExact(2L, runningA) + runningB)
                                / (Math.multiplyExact(2L, runningB));
                results.add((int) aom);
            }
        }

        return results;
    }
}
