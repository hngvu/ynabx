package com.ynabx.dto;

import com.ynabx.util.RecurrenceCalculator.Frequency;
import java.time.LocalDate;
import java.util.UUID;

public record UpcomingOccurrenceResponse(
        UUID scheduled_transaction_id,
        UUID account_id,
        UUID category_id,
        UUID payee_id,
        String payee_name,
        LocalDate date,
        long amount_milliunits,
        String memo,
        Frequency frequency,
        UUID transfer_account_id) {}
