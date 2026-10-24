package com.ynabx.domain.budget;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MilliunitsTest {

    @Test
    @DisplayName("parse converts formatted currency strings into exact milliunits")
    void testParse() {
        assertThat(Milliunits.parse("1.00")).isEqualTo(1000L);
        assertThat(Milliunits.parse("12.34")).isEqualTo(12340L);
        assertThat(Milliunits.parse("$1,540.25")).isEqualTo(1540250L);
        assertThat(Milliunits.parse("-50.00")).isEqualTo(-50000L);
        assertThat(Milliunits.parse(null)).isEqualTo(0L);
        assertThat(Milliunits.parse("  ")).isEqualTo(0L);
    }

    @Test
    @DisplayName("splitEqually distributes remainders without losing any milliunits")
    void testSplitEqually() {
        // Splitting $10.00 (10,000 milliunits) 3 ways: 3334, 3333, 3333
        List<Long> parts = Milliunits.splitEqually(10000L, 3);
        assertThat(parts).containsExactly(3334L, 3333L, 3333L);
        assertThat(parts.stream().mapToLong(Long::longValue).sum()).isEqualTo(10000L);
    }

    @Test
    @DisplayName("splitEqually rejects non-positive partsCount")
    void testSplitEquallyInvalid() {
        assertThatThrownBy(() -> Milliunits.splitEqually(1000L, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("checkZeroBasedInvariant validates conservation equation")
    void testZeroBasedInvariant() {
        // Inflow $2,000, Rollover $0 -> Assigned $1,500, Ready to Assign $500
        assertThat(Milliunits.checkZeroBasedInvariant(500000L, 1500000L, 2000000L, 0L)).isTrue();

        // Mismatched sum fails invariant check
        assertThat(Milliunits.checkZeroBasedInvariant(500001L, 1500000L, 2000000L, 0L)).isFalse();
    }
}
