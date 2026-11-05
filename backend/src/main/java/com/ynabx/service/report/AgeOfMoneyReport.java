package com.ynabx.service.report;

import java.time.LocalDate;
import java.util.List;

public record AgeOfMoneyReport(LocalDate asOfDate, Integer ageOfMoneyDays, List<DataPoint> series) {

    public record DataPoint(LocalDate month, Integer ageOfMoneyDays) {}
}
