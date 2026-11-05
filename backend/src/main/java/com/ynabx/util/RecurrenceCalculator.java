package com.ynabx.util;

import java.time.LocalDate;

public final class RecurrenceCalculator {

    private RecurrenceCalculator() {}

    public enum Frequency {
        NEVER,
        DAILY,
        WEEKLY,
        EVERY_OTHER_WEEK,
        TWICE_A_MONTH,
        EVERY_4_WEEKS,
        MONTHLY,
        EVERY_OTHER_MONTH,
        EVERY_3_MONTHS,
        EVERY_4_MONTHS,
        TWICE_A_YEAR,
        YEARLY,
        EVERY_OTHER_YEAR
    }

    /**
     * Computes the n-th occurrence date (n >= 0) anchored at dateFirst. Always calculated from
     * dateFirst to avoid month-end drift (e.g. 31st -> 28th -> 31st).
     */
    public static LocalDate occurrence(
            LocalDate dateFirst, Frequency frequency, int occurrenceIndex) {
        if (dateFirst == null || frequency == null) {
            throw new IllegalArgumentException("dateFirst and frequency must not be null");
        }
        if (occurrenceIndex < 0) {
            throw new IllegalArgumentException("occurrenceIndex must be non-negative");
        }

        return switch (frequency) {
            case NEVER -> dateFirst;
            case DAILY -> dateFirst.plusDays(occurrenceIndex);
            case WEEKLY -> dateFirst.plusWeeks(occurrenceIndex);
            case EVERY_OTHER_WEEK -> dateFirst.plusWeeks(occurrenceIndex * 2L);
            case EVERY_4_WEEKS -> dateFirst.plusWeeks(occurrenceIndex * 4L);
            case MONTHLY -> dateFirst.plusMonths(occurrenceIndex);
            case EVERY_OTHER_MONTH -> dateFirst.plusMonths(occurrenceIndex * 2L);
            case EVERY_3_MONTHS -> dateFirst.plusMonths(occurrenceIndex * 3L);
            case EVERY_4_MONTHS -> dateFirst.plusMonths(occurrenceIndex * 4L);
            case TWICE_A_YEAR -> dateFirst.plusMonths(occurrenceIndex * 6L);
            case YEARLY -> dateFirst.plusYears(occurrenceIndex);
            case EVERY_OTHER_YEAR -> dateFirst.plusYears(occurrenceIndex * 2L);
            case TWICE_A_MONTH -> {
                int monthOffset = occurrenceIndex / 2;
                LocalDate monthAnchor = dateFirst.plusMonths(monthOffset);
                if (occurrenceIndex % 2 == 0) {
                    yield monthAnchor;
                } else {
                    yield monthAnchor.plusDays(15);
                }
            }
        };
    }
}
