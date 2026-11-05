package com.ynabx.service;

import com.ynabx.dto.SaveScheduledTransactionRequest;
import com.ynabx.dto.ScheduledTransactionResponse;
import com.ynabx.dto.SkipOccurrenceRequest;
import com.ynabx.dto.UpcomingOccurrenceResponse;
import com.ynabx.entity.Payee;
import com.ynabx.entity.ScheduledTransaction;
import com.ynabx.exception.DomainConflictException;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.repository.PayeeRepository;
import com.ynabx.repository.ScheduledTransactionRepository;
import com.ynabx.util.RecurrenceCalculator;
import com.ynabx.util.RecurrenceCalculator.Frequency;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduledTransactionService {

    private final PlanService planService;
    private final ScheduledTransactionRepository scheduledTransactionRepository;
    private final PayeeRepository payeeRepository;
    private final TransactionRules transactionRules;

    public ScheduledTransactionService(
            PlanService planService,
            ScheduledTransactionRepository scheduledTransactionRepository,
            PayeeRepository payeeRepository,
            TransactionRules transactionRules) {
        this.planService = planService;
        this.scheduledTransactionRepository = scheduledTransactionRepository;
        this.payeeRepository = payeeRepository;
        this.transactionRules = transactionRules;
    }

    public List<ScheduledTransactionResponse> listScheduledTransactions(UUID planId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        return scheduledTransactionRepository
                .findByPlanIdAndDeletedFalseOrderByDateNextAscIdAsc(planId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ScheduledTransactionResponse getScheduledTransaction(UUID planId, UUID id, UUID userId) {
        planService.getPlanEntity(planId, userId);
        ScheduledTransaction sched =
                scheduledTransactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(id, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Scheduled transaction not found: " + id));
        return toResponse(sched);
    }

    @Transactional
    public ScheduledTransactionResponse createScheduledTransaction(
            UUID planId, UUID userId, SaveScheduledTransactionRequest req, LocalDate today) {
        planService.getPlanEntity(planId, userId);

        if (req.date_first() == null) {
            throw new DomainValidationException("date_first is required");
        }
        if (req.frequency() == null) {
            throw new DomainValidationException("frequency is required");
        }
        if (req.date_first().isBefore(today)) {
            throw new DomainValidationException(
                    "date_first cannot be in the past; create an immediate transaction instead");
        }
        if (req.date_first().isAfter(today.plusYears(5))) {
            throw new DomainValidationException(
                    "date_first cannot be more than 5 years in the future");
        }

        transactionRules.validate(
                planId,
                req.account_id(),
                req.transfer_account_id(),
                req.category_id(),
                req.payee_id(),
                req.payee_name());

        UUID resolvedPayeeId = null;
        if (req.transfer_account_id() == null) {
            resolvedPayeeId = resolvePayee(planId, req.payee_id(), req.payee_name());
        }

        Instant now = Instant.now();
        ScheduledTransaction sched =
                ScheduledTransaction.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .accountId(req.account_id())
                        .categoryId(req.category_id())
                        .payeeId(resolvedPayeeId)
                        .transferAccountId(req.transfer_account_id())
                        .amountMilliunits(req.amount_milliunits())
                        .memo(req.memo())
                        .frequency(req.frequency())
                        .dateFirst(req.date_first())
                        .dateNext(req.date_first())
                        .occurrenceIndex(0)
                        .deleted(false)
                        .version(0L)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();

        scheduledTransactionRepository.save(sched);
        return toResponse(sched);
    }

    @Transactional
    public ScheduledTransactionResponse updateScheduledTransaction(
            UUID planId,
            UUID id,
            UUID userId,
            SaveScheduledTransactionRequest req,
            LocalDate today) {
        planService.getPlanEntity(planId, userId);
        ScheduledTransaction sched =
                scheduledTransactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(id, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Scheduled transaction not found: " + id));

        if (req.date_first() == null) {
            throw new DomainValidationException("date_first is required");
        }
        if (req.frequency() == null) {
            throw new DomainValidationException("frequency is required");
        }

        transactionRules.validate(
                planId,
                req.account_id(),
                req.transfer_account_id(),
                req.category_id(),
                req.payee_id(),
                req.payee_name());

        boolean anchorChanged =
                !sched.getDateNext().equals(req.date_first())
                        || sched.getFrequency() != req.frequency();
        if (anchorChanged) {
            if (req.date_first().isBefore(today)) {
                throw new DomainValidationException("New scheduled date cannot be in the past");
            }
            sched.setDateFirst(req.date_first());
            sched.setDateNext(req.date_first());
            sched.setOccurrenceIndex(0);
            sched.setFrequency(req.frequency());
        }

        sched.setAccountId(req.account_id());
        sched.setCategoryId(req.category_id());
        sched.setTransferAccountId(req.transfer_account_id());
        sched.setAmountMilliunits(req.amount_milliunits());
        sched.setMemo(req.memo());

        if (req.transfer_account_id() == null) {
            sched.setPayeeId(resolvePayee(planId, req.payee_id(), req.payee_name()));
        } else {
            sched.setPayeeId(null);
        }

        sched.setUpdatedAt(Instant.now());
        scheduledTransactionRepository.save(sched);
        return toResponse(sched);
    }

    @Transactional
    public void deleteScheduledTransaction(UUID planId, UUID id, UUID userId) {
        planService.getPlanEntity(planId, userId);
        ScheduledTransaction sched =
                scheduledTransactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(id, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Scheduled transaction not found: " + id));
        sched.setDeleted(true);
        sched.setUpdatedAt(Instant.now());
        scheduledTransactionRepository.save(sched);
    }

    @Transactional
    public ScheduledTransactionResponse skipOccurrence(
            UUID planId, UUID id, UUID userId, SkipOccurrenceRequest req) {
        planService.getPlanEntity(planId, userId);
        ScheduledTransaction sched =
                scheduledTransactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(id, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Scheduled transaction not found: " + id));

        if (req.occurrence_date() == null || !req.occurrence_date().equals(sched.getDateNext())) {
            throw new DomainConflictException(
                    "occurrence_date must match the current date_next: " + sched.getDateNext());
        }

        if (sched.getFrequency() == Frequency.NEVER) {
            sched.setDeleted(true);
        } else {
            int nextIdx = sched.getOccurrenceIndex() + 1;
            sched.setOccurrenceIndex(nextIdx);
            sched.setDateNext(
                    RecurrenceCalculator.occurrence(
                            sched.getDateFirst(), sched.getFrequency(), nextIdx));
        }

        sched.setUpdatedAt(Instant.now());
        scheduledTransactionRepository.save(sched);
        return toResponse(sched);
    }

    public List<UpcomingOccurrenceResponse> listUpcoming(
            UUID planId, UUID userId, LocalDate untilDate, LocalDate today) {
        planService.getPlanEntity(planId, userId);
        LocalDate maxUntil = today.plusYears(1);
        LocalDate targetUntil =
                untilDate != null ? (untilDate.isAfter(maxUntil) ? maxUntil : untilDate) : maxUntil;

        List<ScheduledTransaction> all =
                scheduledTransactionRepository.findByPlanIdAndDeletedFalseOrderByDateNextAscIdAsc(
                        planId);

        List<UpcomingOccurrenceResponse> results = new ArrayList<>();
        final int MAX_TOTAL = 500;

        for (ScheduledTransaction s : all) {
            String payeeName = null;
            if (s.getPayeeId() != null) {
                payeeName =
                        payeeRepository.findById(s.getPayeeId()).map(Payee::getName).orElse(null);
            }

            int idx = s.getOccurrenceIndex();
            LocalDate curDate = s.getDateNext();

            while (!curDate.isAfter(targetUntil)) {
                results.add(
                        new UpcomingOccurrenceResponse(
                                s.getId(),
                                s.getAccountId(),
                                s.getCategoryId(),
                                s.getPayeeId(),
                                payeeName,
                                curDate,
                                s.getAmountMilliunits(),
                                s.getMemo(),
                                s.getFrequency(),
                                s.getTransferAccountId()));

                if (results.size() >= MAX_TOTAL) {
                    break;
                }
                if (s.getFrequency() == Frequency.NEVER) {
                    break;
                }
                idx++;
                curDate = RecurrenceCalculator.occurrence(s.getDateFirst(), s.getFrequency(), idx);
            }

            if (results.size() >= MAX_TOTAL) {
                break;
            }
        }

        results.sort(Comparator.comparing(UpcomingOccurrenceResponse::date));
        return results;
    }

    private UUID resolvePayee(UUID planId, UUID payeeId, String payeeName) {
        if (payeeId != null) {
            return payeeRepository
                    .findByIdAndPlanIdAndDeletedFalse(payeeId, planId)
                    .map(Payee::getId)
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Payee not found: " + payeeId));
        }
        if (payeeName != null && !payeeName.isBlank()) {
            return payeeRepository
                    .findByPlanIdAndNameIgnoreCaseAndDeletedFalse(planId, payeeName.trim())
                    .map(Payee::getId)
                    .orElseGet(
                            () -> {
                                Instant now = Instant.now();
                                Payee newPayee =
                                        Payee.builder()
                                                .id(UUID.randomUUID())
                                                .planId(planId)
                                                .name(payeeName.trim())
                                                .transferAccountId(null)
                                                .deleted(false)
                                                .createdAt(now)
                                                .updatedAt(now)
                                                .build();
                                payeeRepository.save(newPayee);
                                return newPayee.getId();
                            });
        }
        return null;
    }

    private ScheduledTransactionResponse toResponse(ScheduledTransaction s) {
        String payeeName = null;
        if (s.getPayeeId() != null) {
            payeeName = payeeRepository.findById(s.getPayeeId()).map(Payee::getName).orElse(null);
        }
        return new ScheduledTransactionResponse(
                s.getId(),
                s.getPlanId(),
                s.getAccountId(),
                s.getCategoryId(),
                s.getPayeeId(),
                payeeName,
                s.getDateFirst(),
                s.getDateNext(),
                s.getFrequency(),
                s.getAmountMilliunits(),
                s.getMemo(),
                s.getTransferAccountId(),
                s.getOccurrenceIndex());
    }
}
