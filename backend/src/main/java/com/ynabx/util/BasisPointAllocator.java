package com.ynabx.util;

import java.util.Arrays;
import java.util.Comparator;

/**
 * Largest-remainder method for integer basis-point allocation. Guarantees that sum(result) ==
 * totalBasisPoints, with remainders awarded to the largest fractional parts (tie-breaker: lower
 * index).
 */
public final class BasisPointAllocator {

    private BasisPointAllocator() {}

    public static int[] allocate(long[] weights, int totalBasisPoints) {
        if (weights == null || weights.length == 0 || totalBasisPoints <= 0) {
            return weights == null ? new int[0] : new int[weights.length];
        }

        long sumWeights = 0L;
        for (long w : weights) {
            if (w < 0L) {
                throw new IllegalArgumentException("Weights must be non-negative");
            }
            sumWeights += w;
        }

        if (sumWeights == 0L) {
            return new int[weights.length];
        }

        int n = weights.length;
        int[] result = new int[n];
        long[] remainders = new long[n]; // remainder * sumWeights to keep exact integer math

        long allocatedSum = 0L;
        for (int i = 0; i < n; i++) {
            long numerator = weights[i] * (long) totalBasisPoints;
            long floorVal = numerator / sumWeights;
            long rem = numerator % sumWeights;

            result[i] = (int) floorVal;
            remainders[i] = rem;
            allocatedSum += floorVal;
        }

        int remainderToDistribute = (int) (totalBasisPoints - allocatedSum);
        if (remainderToDistribute > 0) {
            Integer[] indices = new Integer[n];
            for (int i = 0; i < n; i++) {
                indices[i] = i;
            }

            // Sort by remainder descending, tie-breaker: index ascending
            Arrays.sort(
                    indices,
                    Comparator.<Integer>comparingLong(i -> remainders[i])
                            .reversed()
                            .thenComparingInt(i -> i));

            for (int k = 0; k < remainderToDistribute && k < n; k++) {
                result[indices[k]]++;
            }
        }

        return result;
    }
}
