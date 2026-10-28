package com.ynabx.util;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class MilliunitsTest {

    @ParameterizedTest
    @CsvSource({
        "'12.34', 12340",
        "'$12.34', 12340",
        "'0.00', 0",
        "'-50.00', -50000",
        "'1,234.56', 1234560",
        "'$1,000.00', 1000000"
    })
    @DisplayName("Parse string amount into exact integer milliunits")
    void testParseMilliunits(String input, long expectedMilliunits) {
        assertEquals(expectedMilliunits, Milliunits.parse(input));
    }

    @Test
    @DisplayName("Handle null or empty string gracefully")
    void testParseEmpty() {
        assertEquals(0L, Milliunits.parse(null));
        assertEquals(0L, Milliunits.parse(""));
        assertEquals(0L, Milliunits.parse("   "));
    }

    @Test
    @DisplayName("Even division splits milliunits perfectly without remainder")
    void testSplitEquallyWithoutRemainder() {
        List<Long> parts = Milliunits.splitEqually(30_000L, 3);
        assertEquals(List.of(10_000L, 10_000L, 10_000L), parts);
        assertEquals(30_000L, parts.stream().mapToLong(Long::longValue).sum());
    }

    @Test
    @DisplayName("Odd division distributes remainder milliunits to the first part (ADR-001)")
    void testSplitEquallyWithRemainderAllocatedToFirst() {
        // $10.00 = 10000 milliunits divided 3 ways -> 3334, 3333, 3333
        List<Long> parts = Milliunits.splitEqually(10_000L, 3);
        assertEquals(3, parts.size());
        assertEquals(3334L, parts.get(0));
        assertEquals(3333L, parts.get(1));
        assertEquals(3333L, parts.get(2));
        assertEquals(10_000L, parts.stream().mapToLong(Long::longValue).sum());
    }
}
