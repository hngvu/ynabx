package com.ynabx.domain.budget;

import java.util.ArrayList;
import java.util.List;

/**
 * Domain utility for integer milliunit arithmetic.
 *
 * <p>Invariant: All monetary amounts must be stored and computed as integer milliunits (1000
 * milliunits = 1.00 currency unit) without IEEE-754 floating-point drift.
 */
public final class Milliunits {

    public static final long MILLIUNITS_PER_UNIT = 1000L;

    private Milliunits() {}

    /**
     * Converts a standard currency string (e.g. "12.34", "$1,540.25", "-50.00") into exact integer
     * milliunits.
     */
    public static long parse(String input) {
        if (input == null || input.isBlank()) {
            return 0L;
        }
        String clean = input.replaceAll("[$,\\s]", "");
        double parsed = Double.parseDouble(clean);
        return Math.round(parsed * MILLIUNITS_PER_UNIT);
    }

    /**
     * Splits a total milliunit amount into N equal parts, allocating the remainder to the first
     * split so that sum(parts) == total exactly.
     */
    public static List<Long> splitEqually(long totalMilliunits, int partsCount) {
        if (partsCount <= 0) {
            throw new IllegalArgumentException("Parts count must be positive");
        }
        long base = totalMilliunits / partsCount;
        long remainder = totalMilliunits % partsCount;

        List<Long> result = new ArrayList<>(partsCount);
        for (int i = 0; i < partsCount; i++) {
            if (i == 0) {
                result.add(base + remainder);
            } else {
                result.add(base);
            }
        }
        return result;
    }

    /**
     * Verifies the Zero-Based Budgeting conservation invariant: Ready to Assign + Sum(Category
     * Assigned) == Total Unallocated Inflow + Prior Rollover
     */
    public static boolean checkZeroBasedInvariant(
            long readyToAssign, long sumAssigned, long totalInflow, long priorRollover) {
        return (readyToAssign + sumAssigned) == (totalInflow + priorRollover);
    }
}
