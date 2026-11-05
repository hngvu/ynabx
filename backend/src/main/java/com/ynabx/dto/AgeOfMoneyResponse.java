package com.ynabx.dto;

import java.time.LocalDate;
import java.util.List;

public record AgeOfMoneyResponse(
        LocalDate as_of_date, Integer age_of_money_days, List<DataPoint> series) {

    public record DataPoint(LocalDate month, Integer age_of_money_days) {}
}
