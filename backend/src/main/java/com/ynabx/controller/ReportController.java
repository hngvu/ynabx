package com.ynabx.controller;

import com.ynabx.dto.AgeOfMoneyResponse;
import com.ynabx.dto.SpendingBreakdownResponse;
import com.ynabx.service.report.AgeOfMoneyReport;
import com.ynabx.service.report.AgeOfMoneyService;
import com.ynabx.service.report.SpendingBreakdown;
import com.ynabx.service.report.SpendingBreakdownService;
import com.ynabx.util.TimezoneResolver;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/plans/{planId}/reports")
public class ReportController {

    private final SpendingBreakdownService spendingBreakdownService;
    private final AgeOfMoneyService ageOfMoneyService;
    private final TimezoneResolver timezoneResolver;

    public ReportController(
            SpendingBreakdownService spendingBreakdownService,
            AgeOfMoneyService ageOfMoneyService,
            TimezoneResolver timezoneResolver) {
        this.spendingBreakdownService = spendingBreakdownService;
        this.ageOfMoneyService = ageOfMoneyService;
        this.timezoneResolver = timezoneResolver;
    }

    private UUID getUserId(Principal principal) {
        return UUID.fromString(principal.getName());
    }

    @GetMapping("/spending-breakdown")
    public ResponseEntity<SpendingBreakdownResponse> getSpendingBreakdown(
            @PathVariable UUID planId,
            @RequestHeader(value = "X-Timezone", required = false) String timezoneHeader,
            @RequestParam(value = "since_month", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate sinceMonth,
            @RequestParam("until_month") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate untilMonth,
            @RequestParam(value = "account_id", required = false) List<UUID> accountIds,
            @RequestParam(value = "category_id", required = false) List<UUID> categoryIds,
            Principal principal) {
        LocalDate today = timezoneResolver.today(timezoneHeader);
        SpendingBreakdown breakdown =
                spendingBreakdownService.getSpendingBreakdown(
                        planId,
                        getUserId(principal),
                        sinceMonth,
                        untilMonth,
                        accountIds,
                        categoryIds,
                        today);

        List<SpendingBreakdownResponse.GroupItem> groupItems =
                breakdown.groups().stream()
                        .map(
                                g ->
                                        new SpendingBreakdownResponse.GroupItem(
                                                g.groupId(),
                                                g.groupName(),
                                                g.spentMilliunits(),
                                                g.percentageBasisPoints(),
                                                g.categories().stream()
                                                        .map(
                                                                c ->
                                                                        new SpendingBreakdownResponse
                                                                                .CategoryItem(
                                                                                c.categoryId(),
                                                                                c.categoryName(),
                                                                                c.spentMilliunits(),
                                                                                c
                                                                                        .transactionCount(),
                                                                                c
                                                                                        .percentageBasisPoints()))
                                                        .toList()))
                        .toList();

        SpendingBreakdownResponse.LargestOutflowItem largestOutflowItem = null;
        if (breakdown.largestOutflow() != null) {
            SpendingBreakdown.LargestOutflow lo = breakdown.largestOutflow();
            largestOutflowItem =
                    new SpendingBreakdownResponse.LargestOutflowItem(
                            lo.transactionId(),
                            lo.date(),
                            lo.payeeName(),
                            lo.categoryId(),
                            lo.categoryName(),
                            lo.amountMilliunits());
        }

        SpendingBreakdownResponse response =
                new SpendingBreakdownResponse(
                        breakdown.sinceMonth(),
                        breakdown.untilMonth(),
                        breakdown.monthCount(),
                        breakdown.dayCount(),
                        breakdown.totalSpentMilliunits(),
                        breakdown.transactionCount(),
                        groupItems,
                        largestOutflowItem);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/age-of-money")
    public ResponseEntity<AgeOfMoneyResponse> getAgeOfMoney(
            @PathVariable UUID planId,
            @RequestHeader(value = "X-Timezone", required = false) String timezoneHeader,
            @RequestParam(value = "months", defaultValue = "12") int months,
            Principal principal) {
        LocalDate today = timezoneResolver.today(timezoneHeader);
        AgeOfMoneyReport report =
                ageOfMoneyService.getAgeOfMoney(planId, getUserId(principal), months, today);

        List<AgeOfMoneyResponse.DataPoint> series =
                report.series().stream()
                        .map(d -> new AgeOfMoneyResponse.DataPoint(d.month(), d.ageOfMoneyDays()))
                        .toList();

        return ResponseEntity.ok(
                new AgeOfMoneyResponse(report.asOfDate(), report.ageOfMoneyDays(), series));
    }
}
