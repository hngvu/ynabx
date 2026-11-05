package com.ynabx.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class RecurrenceCalculatorTest {

    @Test
    void rejectsNullsAndNegativeIndex() {
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        RecurrenceCalculator.occurrence(
                                null, RecurrenceCalculator.Frequency.DAILY, 0));
        assertThrows(
                IllegalArgumentException.class,
                () -> RecurrenceCalculator.occurrence(LocalDate.now(), null, 0));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        RecurrenceCalculator.occurrence(
                                LocalDate.now(), RecurrenceCalculator.Frequency.DAILY, -1));
    }

    @Test
    void neverAlwaysReturnsAnchorDate() {
        LocalDate anchor = LocalDate.of(2026, 11, 5);
        assertEquals(
                anchor,
                RecurrenceCalculator.occurrence(anchor, RecurrenceCalculator.Frequency.NEVER, 0));
        assertEquals(
                anchor,
                RecurrenceCalculator.occurrence(anchor, RecurrenceCalculator.Frequency.NEVER, 5));
    }

    @Test
    void dayAndWeekFrequencies() {
        LocalDate anchor = LocalDate.of(2026, 11, 5);
        assertEquals(
                LocalDate.of(2026, 11, 8),
                RecurrenceCalculator.occurrence(anchor, RecurrenceCalculator.Frequency.DAILY, 3));
        assertEquals(
                LocalDate.of(2026, 11, 19),
                RecurrenceCalculator.occurrence(anchor, RecurrenceCalculator.Frequency.WEEKLY, 2));
        assertEquals(
                LocalDate.of(2026, 12, 3),
                RecurrenceCalculator.occurrence(
                        anchor, RecurrenceCalculator.Frequency.EVERY_OTHER_WEEK, 2));
        assertEquals(
                LocalDate.of(2026, 12, 3),
                RecurrenceCalculator.occurrence(
                        anchor, RecurrenceCalculator.Frequency.EVERY_4_WEEKS, 1));
    }

    @Test
    void monthlyPreventsDateDriftOnShortMonths() {
        // Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31
        LocalDate jan31 = LocalDate.of(2026, 1, 31);
        assertEquals(
                jan31,
                RecurrenceCalculator.occurrence(jan31, RecurrenceCalculator.Frequency.MONTHLY, 0));
        assertEquals(
                LocalDate.of(2026, 2, 28),
                RecurrenceCalculator.occurrence(jan31, RecurrenceCalculator.Frequency.MONTHLY, 1));
        assertEquals(
                LocalDate.of(2026, 3, 31),
                RecurrenceCalculator.occurrence(jan31, RecurrenceCalculator.Frequency.MONTHLY, 2));
        assertEquals(
                LocalDate.of(2026, 4, 30),
                RecurrenceCalculator.occurrence(jan31, RecurrenceCalculator.Frequency.MONTHLY, 3));
        assertEquals(
                LocalDate.of(2026, 5, 31),
                RecurrenceCalculator.occurrence(jan31, RecurrenceCalculator.Frequency.MONTHLY, 4));
    }

    @Test
    void leapYearHandledCorrectly() {
        // Feb 29 on leap year 2024 -> 2025-02-28 -> 2028-02-29
        LocalDate leapDay = LocalDate.of(2024, 2, 29);
        assertEquals(
                LocalDate.of(2025, 2, 28),
                RecurrenceCalculator.occurrence(leapDay, RecurrenceCalculator.Frequency.YEARLY, 1));
        assertEquals(
                LocalDate.of(2028, 2, 29),
                RecurrenceCalculator.occurrence(leapDay, RecurrenceCalculator.Frequency.YEARLY, 4));
    }

    @Test
    void twiceAMonthSemantics() {
        LocalDate anchor1 = LocalDate.of(2026, 1, 20);
        // n=0: 2026-01-20
        assertEquals(
                anchor1,
                RecurrenceCalculator.occurrence(
                        anchor1, RecurrenceCalculator.Frequency.TWICE_A_MONTH, 0));
        // n=1: 2026-01-20 + 15 days = 2026-02-04
        assertEquals(
                LocalDate.of(2026, 2, 4),
                RecurrenceCalculator.occurrence(
                        anchor1, RecurrenceCalculator.Frequency.TWICE_A_MONTH, 1));
        // n=2: 2026-01-20 + 1 month = 2026-02-20
        assertEquals(
                LocalDate.of(2026, 2, 20),
                RecurrenceCalculator.occurrence(
                        anchor1, RecurrenceCalculator.Frequency.TWICE_A_MONTH, 2));
        // n=3: 2026-02-20 + 15 days = 2026-03-07
        assertEquals(
                LocalDate.of(2026, 3, 7),
                RecurrenceCalculator.occurrence(
                        anchor1, RecurrenceCalculator.Frequency.TWICE_A_MONTH, 3));

        LocalDate anchor2 = LocalDate.of(2026, 1, 31);
        // n=0: 2026-01-31
        assertEquals(
                anchor2,
                RecurrenceCalculator.occurrence(
                        anchor2, RecurrenceCalculator.Frequency.TWICE_A_MONTH, 0));
        // n=1: 2026-01-31 + 15 days = 2026-02-15
        assertEquals(
                LocalDate.of(2026, 2, 15),
                RecurrenceCalculator.occurrence(
                        anchor2, RecurrenceCalculator.Frequency.TWICE_A_MONTH, 1));
        // n=2: 2026-01-31 + 1 month = 2026-02-28
        assertEquals(
                LocalDate.of(2026, 2, 28),
                RecurrenceCalculator.occurrence(
                        anchor2, RecurrenceCalculator.Frequency.TWICE_A_MONTH, 2));
    }

    @Test
    void longerCadences() {
        LocalDate anchor = LocalDate.of(2026, 1, 15);
        assertEquals(
                LocalDate.of(2026, 3, 15),
                RecurrenceCalculator.occurrence(
                        anchor, RecurrenceCalculator.Frequency.EVERY_OTHER_MONTH, 1));
        assertEquals(
                LocalDate.of(2026, 4, 15),
                RecurrenceCalculator.occurrence(
                        anchor, RecurrenceCalculator.Frequency.EVERY_3_MONTHS, 1));
        assertEquals(
                LocalDate.of(2026, 5, 15),
                RecurrenceCalculator.occurrence(
                        anchor, RecurrenceCalculator.Frequency.EVERY_4_MONTHS, 1));
        assertEquals(
                LocalDate.of(2026, 7, 15),
                RecurrenceCalculator.occurrence(
                        anchor, RecurrenceCalculator.Frequency.TWICE_A_YEAR, 1));
        assertEquals(
                LocalDate.of(2028, 1, 15),
                RecurrenceCalculator.occurrence(
                        anchor, RecurrenceCalculator.Frequency.EVERY_OTHER_YEAR, 1));
    }
}
