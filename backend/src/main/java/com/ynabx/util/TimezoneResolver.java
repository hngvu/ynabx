package com.ynabx.util;

import com.ynabx.exception.DomainValidationException;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.springframework.stereotype.Component;

@Component
public class TimezoneResolver {

    private final Clock clock;

    public TimezoneResolver(Clock clock) {
        this.clock = clock;
    }

    public ZoneId resolveZone(String timezoneHeader) {
        if (timezoneHeader == null || timezoneHeader.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(timezoneHeader.trim());
        } catch (DateTimeException ex) {
            throw new DomainValidationException("Invalid X-Timezone header: " + timezoneHeader);
        }
    }

    public LocalDate today(String timezoneHeader) {
        ZoneId zone = resolveZone(timezoneHeader);
        return LocalDate.now(clock.withZone(zone));
    }
}
