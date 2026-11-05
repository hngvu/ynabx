package com.ynabx.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ynabx.exception.DomainValidationException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class TimezoneResolverTest {

    @Test
    void defaultsToUtcWhenNullOrBlank() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-11-05T00:30:00Z"), ZoneOffset.UTC);
        TimezoneResolver resolver = new TimezoneResolver(fixedClock);

        assertEquals(ZoneOffset.UTC, resolver.resolveZone(null));
        assertEquals(ZoneOffset.UTC, resolver.resolveZone("   "));
        assertEquals(LocalDate.of(2026, 11, 5), resolver.today(null));
    }

    @Test
    void resolvesValidIanaTimezone() {
        // 2026-11-04 20:00 UTC -> 2026-11-05 03:00 in Asia/Ho_Chi_Minh (UTC+7)
        Clock fixedClock = Clock.fixed(Instant.parse("2026-11-04T20:00:00Z"), ZoneOffset.UTC);
        TimezoneResolver resolver = new TimezoneResolver(fixedClock);

        ZoneId zone = resolver.resolveZone("Asia/Ho_Chi_Minh");
        assertEquals(ZoneId.of("Asia/Ho_Chi_Minh"), zone);
        assertEquals(LocalDate.of(2026, 11, 5), resolver.today("Asia/Ho_Chi_Minh"));

        // America/New_York (UTC-5) -> 2026-11-04 15:00
        assertEquals(LocalDate.of(2026, 11, 4), resolver.today("America/New_York"));
    }

    @Test
    void throwsDomainValidationExceptionOnInvalidTimezone() {
        TimezoneResolver resolver = new TimezoneResolver(Clock.systemUTC());
        DomainValidationException ex =
                assertThrows(
                        DomainValidationException.class,
                        () -> resolver.resolveZone("Invalid/NonExistent_Zone"));
        assertEquals("Invalid X-Timezone header: Invalid/NonExistent_Zone", ex.getMessage());
    }
}
