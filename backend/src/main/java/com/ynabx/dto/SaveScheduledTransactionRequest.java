package com.ynabx.dto;

import com.ynabx.util.RecurrenceCalculator.Frequency;
import java.time.LocalDate;
import java.util.UUID;

public record SaveScheduledTransactionRequest(
        UUID account_id,
        UUID category_id,
        UUID payee_id,
        String payee_name,
        LocalDate date_first,
        Frequency frequency,
        long amount_milliunits,
        String memo,
        UUID transfer_account_id) {}
