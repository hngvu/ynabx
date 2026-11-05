package com.ynabx.dto;

import com.ynabx.util.RecurrenceCalculator.Frequency;
import java.time.LocalDate;
import java.util.UUID;

public record ScheduledTransactionResponse(
        UUID id,
        UUID plan_id,
        UUID account_id,
        UUID category_id,
        UUID payee_id,
        String payee_name,
        LocalDate date_first,
        LocalDate date_next,
        Frequency frequency,
        long amount_milliunits,
        String memo,
        UUID transfer_account_id,
        int occurrence_index) {}
