package com.ynabx.controller;

import com.ynabx.dto.MaterializeResultResponse;
import com.ynabx.dto.SaveScheduledTransactionRequest;
import com.ynabx.dto.ScheduledTransactionResponse;
import com.ynabx.dto.SkipOccurrenceRequest;
import com.ynabx.dto.UpcomingOccurrenceResponse;
import com.ynabx.service.ScheduledTransactionMaterializer;
import com.ynabx.service.ScheduledTransactionService;
import com.ynabx.util.TimezoneResolver;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/plans/{planId}/scheduled-transactions")
public class ScheduledTransactionController {

    private final ScheduledTransactionService scheduledTransactionService;
    private final ScheduledTransactionMaterializer materializer;
    private final TimezoneResolver timezoneResolver;

    public ScheduledTransactionController(
            ScheduledTransactionService scheduledTransactionService,
            ScheduledTransactionMaterializer materializer,
            TimezoneResolver timezoneResolver) {
        this.scheduledTransactionService = scheduledTransactionService;
        this.materializer = materializer;
        this.timezoneResolver = timezoneResolver;
    }

    private UUID getUserId(Principal principal) {
        return UUID.fromString(principal.getName());
    }

    @GetMapping
    public ResponseEntity<List<ScheduledTransactionResponse>> listScheduledTransactions(
            @PathVariable UUID planId, Principal principal) {
        return ResponseEntity.ok(
                scheduledTransactionService.listScheduledTransactions(
                        planId, getUserId(principal)));
    }

    @PostMapping
    public ResponseEntity<ScheduledTransactionResponse> createScheduledTransaction(
            @PathVariable UUID planId,
            @RequestHeader(value = "X-Timezone", required = false) String timezoneHeader,
            @Valid @RequestBody SaveScheduledTransactionRequest req,
            Principal principal) {
        LocalDate today = timezoneResolver.today(timezoneHeader);
        ScheduledTransactionResponse response =
                scheduledTransactionService.createScheduledTransaction(
                        planId, getUserId(principal), req, today);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduledTransactionResponse> getScheduledTransaction(
            @PathVariable UUID planId, @PathVariable UUID id, Principal principal) {
        return ResponseEntity.ok(
                scheduledTransactionService.getScheduledTransaction(
                        planId, id, getUserId(principal)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScheduledTransactionResponse> updateScheduledTransaction(
            @PathVariable UUID planId,
            @PathVariable UUID id,
            @RequestHeader(value = "X-Timezone", required = false) String timezoneHeader,
            @Valid @RequestBody SaveScheduledTransactionRequest req,
            Principal principal) {
        LocalDate today = timezoneResolver.today(timezoneHeader);
        return ResponseEntity.ok(
                scheduledTransactionService.updateScheduledTransaction(
                        planId, id, getUserId(principal), req, today));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteScheduledTransaction(
            @PathVariable UUID planId, @PathVariable UUID id, Principal principal) {
        scheduledTransactionService.deleteScheduledTransaction(planId, id, getUserId(principal));
    }

    @PostMapping("/materialize")
    public ResponseEntity<MaterializeResultResponse> materializeDue(
            @PathVariable UUID planId,
            @RequestHeader(value = "X-Timezone", required = false) String timezoneHeader,
            Principal principal) {
        LocalDate today = timezoneResolver.today(timezoneHeader);
        return ResponseEntity.ok(materializer.materializeDue(planId, getUserId(principal), today));
    }

    @PostMapping("/{id}/skip")
    public ResponseEntity<ScheduledTransactionResponse> skipOccurrence(
            @PathVariable UUID planId,
            @PathVariable UUID id,
            @RequestBody SkipOccurrenceRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                scheduledTransactionService.skipOccurrence(planId, id, getUserId(principal), req));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<UpcomingOccurrenceResponse>> listUpcoming(
            @PathVariable UUID planId,
            @RequestHeader(value = "X-Timezone", required = false) String timezoneHeader,
            @RequestParam(value = "until", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate until,
            Principal principal) {
        LocalDate today = timezoneResolver.today(timezoneHeader);
        return ResponseEntity.ok(
                scheduledTransactionService.listUpcoming(
                        planId, getUserId(principal), until, today));
    }
}
