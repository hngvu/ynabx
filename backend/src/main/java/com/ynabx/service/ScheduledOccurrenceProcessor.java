package com.ynabx.service;

import com.ynabx.entity.Account;
import com.ynabx.entity.ScheduledTransaction;
import com.ynabx.entity.Transaction.ClearedStatus;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.ScheduledTransactionRepository;
import com.ynabx.repository.TransactionRepository;
import com.ynabx.util.RecurrenceCalculator;
import com.ynabx.util.RecurrenceCalculator.Frequency;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ScheduledOccurrenceProcessor {

    private static final Logger log = LoggerFactory.getLogger(ScheduledOccurrenceProcessor.class);

    public enum ProcessStatus {
        CREATED,
        SKIPPED,
        NOT_DUE
    }

    @PersistenceContext private EntityManager em;

    private final ScheduledTransactionRepository scheduledTransactionRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final TransactionRules transactionRules;
    private final TransactionService transactionService;

    public ScheduledOccurrenceProcessor(
            ScheduledTransactionRepository scheduledTransactionRepository,
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            TransactionRules transactionRules,
            TransactionService transactionService) {
        this.scheduledTransactionRepository = scheduledTransactionRepository;
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.transactionRules = transactionRules;
        this.transactionService = transactionService;
    }

    @Transactional
    public ProcessStatus processNext(UUID schedId, LocalDate today) {
        ScheduledTransaction sched =
                em.find(ScheduledTransaction.class, schedId, LockModeType.PESSIMISTIC_WRITE);

        if (sched == null || sched.isDeleted() || sched.getDateNext().isAfter(today)) {
            return ProcessStatus.NOT_DUE;
        }

        LocalDate occurrenceDate = sched.getDateNext();
        UUID planId = sched.getPlanId();

        // 1. Verify account still exists and is not closed/deleted
        Optional<Account> sourceAcc =
                accountRepository.findByIdAndPlanIdAndDeletedFalse(sched.getAccountId(), planId);
        if (sourceAcc.isEmpty() || sourceAcc.get().isClosed()) {
            log.warn(
                    "Scheduled tx {} skipped: source account {} is closed or missing",
                    schedId,
                    sched.getAccountId());
            sched.setDeleted(true);
            sched.setUpdatedAt(Instant.now());
            scheduledTransactionRepository.save(sched);
            return ProcessStatus.SKIPPED;
        }

        if (sched.getTransferAccountId() != null) {
            Optional<Account> targetAcc =
                    accountRepository.findByIdAndPlanIdAndDeletedFalse(
                            sched.getTransferAccountId(), planId);
            if (targetAcc.isEmpty() || targetAcc.get().isClosed()) {
                log.warn(
                        "Scheduled tx {} skipped: target transfer account {} is closed or missing",
                        schedId,
                        sched.getTransferAccountId());
                sched.setDeleted(true);
                sched.setUpdatedAt(Instant.now());
                scheduledTransactionRepository.save(sched);
                return ProcessStatus.SKIPPED;
            }
        }

        // 2. Validate transaction rules (category / transfer rules)
        try {
            transactionRules.validate(
                    planId,
                    sched.getAccountId(),
                    sched.getTransferAccountId(),
                    sched.getCategoryId(),
                    sched.getPayeeId(),
                    null);
        } catch (Exception ex) {
            log.warn(
                    "Scheduled tx {} violated rules for date {}: {}. Advancing without creating transaction.",
                    schedId,
                    occurrenceDate,
                    ex.getMessage());
            advanceSchedule(sched);
            return ProcessStatus.SKIPPED;
        }

        // 3. Idempotency check: does an occurrence already exist in the ledger?
        boolean alreadyCreated =
                em.createQuery(
                                        "SELECT count(t) FROM Transaction t WHERE t.scheduledTransactionId = :schedId "
                                                + "AND t.scheduledOccurrenceDate = :occurrenceDate",
                                        Long.class)
                                .setParameter("schedId", schedId)
                                .setParameter("occurrenceDate", occurrenceDate)
                                .getSingleResult()
                        > 0;

        if (alreadyCreated) {
            advanceSchedule(sched);
            return ProcessStatus.SKIPPED;
        }

        // 4. Create ledger entry
        ClearedStatus cleared =
                sourceAcc.get().getType() == Account.AccountType.CASH
                        ? ClearedStatus.CLEARED
                        : ClearedStatus.UNCLEARED;

        NewLedgerEntry cmd =
                new NewLedgerEntry(
                        sched.getAccountId(),
                        sched.getCategoryId(),
                        sched.getPayeeId(),
                        null,
                        occurrenceDate,
                        sched.getAmountMilliunits(),
                        sched.getMemo(),
                        cleared,
                        false, // approved = false
                        sched.getTransferAccountId(),
                        sched.getId(),
                        occurrenceDate);

        transactionService.createLedgerEntry(planId, cmd);
        advanceSchedule(sched);

        return ProcessStatus.CREATED;
    }

    private void advanceSchedule(ScheduledTransaction sched) {
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
    }
}
