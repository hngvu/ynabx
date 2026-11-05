package com.ynabx.util;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class BasisPointAllocatorTest {

    @Test
    void handlesEmptyAndZeroWeights() {
        assertArrayEquals(new int[0], BasisPointAllocator.allocate(new long[0], 10000));
        assertArrayEquals(new int[0], BasisPointAllocator.allocate(null, 10000));
        assertArrayEquals(
                new int[] {0, 0}, BasisPointAllocator.allocate(new long[] {0L, 0L}, 10000));
        assertArrayEquals(
                new int[] {0, 0}, BasisPointAllocator.allocate(new long[] {100L, 200L}, 0));
    }

    @Test
    void throwsOnNegativeWeight() {
        assertThrows(
                IllegalArgumentException.class,
                () -> BasisPointAllocator.allocate(new long[] {100L, -5L}, 10000));
    }

    @Test
    void dividesThreeEqualPartsWithExactSum() {
        // 10000 / 3 = 3333.333... -> 3334, 3333, 3333
        int[] result = BasisPointAllocator.allocate(new long[] {10L, 10L, 10L}, 10000);
        assertArrayEquals(new int[] {3334, 3333, 3333}, result);
        assertEquals(10000, Arrays.stream(result).sum());
    }

    @Test
    void hierarchicalGroupAndCategoryAllocationNeverDrifts() {
        // Group A: 600, Group B: 400 (total 1000)
        long[] groupWeights = new long[] {600L, 400L};
        int[] groupBps = BasisPointAllocator.allocate(groupWeights, 10000);
        assertArrayEquals(new int[] {6000, 4000}, groupBps);

        // Group A categories: 200, 200, 200 -> each 1/3 of 6000 = 2000
        int[] catA = BasisPointAllocator.allocate(new long[] {200L, 200L, 200L}, groupBps[0]);
        assertArrayEquals(new int[] {2000, 2000, 2000}, catA);
        assertEquals(groupBps[0], Arrays.stream(catA).sum());

        // Group B categories: 133, 133, 134 (total 400)
        int[] catB = BasisPointAllocator.allocate(new long[] {133L, 133L, 134L}, groupBps[1]);
        assertEquals(groupBps[1], Arrays.stream(catB).sum());

        // Overall total sum equals 10000
        int totalCatBps = Arrays.stream(catA).sum() + Arrays.stream(catB).sum();
        assertEquals(10000, totalCatBps);
    }
}
