package com.ynabx.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class Milliunits {

    public static final long MILLIUNITS_PER_UNIT = 1000L;

    private Milliunits() {}

    public static long parse(String input) {
        if (input == null || input.isBlank()) {
            return 0L;
        }
        String clean = input.replaceAll("[$,\\s]", "");
        return Math.round(Double.parseDouble(clean) * MILLIUNITS_PER_UNIT);
    }

    public static List<Long> splitEqually(long totalMilliunits, int partsCount) {
        if (partsCount <= 0) {
            throw new IllegalArgumentException("partsCount must be greater than 0");
        }
        long basePart = totalMilliunits / partsCount;
        long remainder = totalMilliunits % partsCount;

        List<Long> parts = new ArrayList<>(partsCount);
        for (int i = 0; i < partsCount; i++) {
            parts.add(basePart);
        }
        if (remainder != 0) {
            parts.set(0, parts.get(0) + remainder);
        }
        return Collections.unmodifiableList(parts);
    }

    public static boolean checkZeroBasedInvariant(
            long readyToAssign, long sumAssigned, long totalInflow, long priorRollover) {
        return (readyToAssign + sumAssigned) == (totalInflow + priorRollover);
    }
}
