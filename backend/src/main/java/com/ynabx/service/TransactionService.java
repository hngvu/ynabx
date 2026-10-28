package com.ynabx.service;

import com.ynabx.dto.SaveTransactionRequest;
import com.ynabx.dto.TransactionPageResponse;
import com.ynabx.dto.TransactionResponse;
import com.ynabx.entity.Account;
import com.ynabx.entity.Category;
import com.ynabx.entity.Payee;
import com.ynabx.entity.Transaction;
import com.ynabx.entity.Transaction.ClearedStatus;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.exception.TransactionLockedException;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.PayeeRepository;
import com.ynabx.repository.TransactionRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionService {

    private final PlanService planService;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final PayeeRepository payeeRepository;

    public TransactionService(
            PlanService planService,
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            CategoryRepository categoryRepository,
            PayeeRepository payeeRepository) {
        this.planService = planService;
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.payeeRepository = payeeRepository;
    }

    public TransactionPageResponse listTransactions(
            UUID planId,
            UUID userId,
            UUID accountId,
            UUID categoryId,
            UUID payeeId,
            LocalDate sinceDate,
            LocalDate untilDate,
            int limit,
            String cursor) {
        planService.getPlanEntity(planId, userId);
        int pageSize = Math.min(Math.max(limit, 1), 500);

        List<Transaction> results =
                transactionRepository.findFiltered(
                        planId,
                        accountId,
                        categoryId,
                        payeeId,
                        sinceDate,
                        untilDate,
                        PageRequest.of(0, pageSize + 1));

        boolean hasMore = results.size() > pageSize;
        List<Transaction> pageItems = hasMore ? results.subList(0, pageSize) : results;
        String nextCursor = hasMore ? pageItems.get(pageItems.size() - 1).getId().toString() : null;

        return new TransactionPageResponse(
                pageItems.stream().map(this::toTransactionResponse).toList(), nextCursor);
    }

    public TransactionResponse getTransaction(UUID planId, UUID transactionId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        Transaction tx =
                transactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(transactionId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Transaction not found: " + transactionId));
        return toTransactionResponse(tx);
    }

    @Transactional
    public TransactionResponse createTransaction(
            UUID planId, UUID userId, SaveTransactionRequest req) {
        planService.getPlanEntity(planId, userId);
        validateTransactionRequest(planId, req);

        Instant now = Instant.now();
        UUID txId = UUID.randomUUID();
        Account sourceAccount =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(req.account_id(), planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Source account not found: " + req.account_id()));

        ClearedStatus cleared = req.cleared() != null ? req.cleared() : ClearedStatus.UNCLEARED;
        boolean approved = req.approved() != null ? req.approved() : true;

        if (req.transfer_account_id() != null) {
            Account targetAccount =
                    accountRepository
                            .findByIdAndPlanIdAndDeletedFalse(req.transfer_account_id(), planId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Target transfer account not found: "
                                                            + req.transfer_account_id()));

            UUID peerTxId = UUID.randomUUID();

            UUID targetCategoryId = null;
            if (!sourceAccount.isOnBudget() && targetAccount.isOnBudget()) {
                targetCategoryId =
                        categoryRepository
                                .findByPlanIdAndInflowCategoryTrue(planId)
                                .map(Category::getId)
                                .orElse(null);
            }

            Transaction sourceTx =
                    Transaction.builder()
                            .id(txId)
                            .planId(planId)
                            .accountId(sourceAccount.getId())
                            .categoryId(req.category_id())
                            .payeeId(targetAccount.getTransferPayeeId())
                            .date(req.date())
                            .amountMilliunits(req.amount_milliunits())
                            .memo(req.memo())
                            .cleared(cleared)
                            .approved(approved)
                            .transferAccountId(targetAccount.getId())
                            .transferTransactionId(null)
                            .deleted(false)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
            transactionRepository.save(sourceTx);

            Transaction peerTx =
                    Transaction.builder()
                            .id(peerTxId)
                            .planId(planId)
                            .accountId(targetAccount.getId())
                            .categoryId(targetCategoryId)
                            .payeeId(sourceAccount.getTransferPayeeId())
                            .date(req.date())
                            .amountMilliunits(-req.amount_milliunits())
                            .memo(req.memo())
                            .cleared(cleared)
                            .approved(approved)
                            .transferAccountId(sourceAccount.getId())
                            .transferTransactionId(txId)
                            .deleted(false)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
            transactionRepository.save(peerTx);

            sourceTx.setTransferTransactionId(peerTxId);
            transactionRepository.save(sourceTx);

            updateAccountBalanceOnTransactionAdd(sourceAccount, sourceTx);
            updateAccountBalanceOnTransactionAdd(targetAccount, peerTx);

            return toTransactionResponse(sourceTx);
        } else {
            UUID resolvedPayeeId = resolvePayee(planId, req.payee_id(), req.payee_name());

            Transaction tx =
                    Transaction.builder()
                            .id(txId)
                            .planId(planId)
                            .accountId(sourceAccount.getId())
                            .categoryId(req.category_id())
                            .payeeId(resolvedPayeeId)
                            .date(req.date())
                            .amountMilliunits(req.amount_milliunits())
                            .memo(req.memo())
                            .cleared(cleared)
                            .approved(approved)
                            .transferAccountId(null)
                            .transferTransactionId(null)
                            .deleted(false)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();

            transactionRepository.save(tx);
            updateAccountBalanceOnTransactionAdd(sourceAccount, tx);

            return toTransactionResponse(tx);
        }
    }

    @Transactional
    public TransactionResponse updateTransaction(
            UUID planId, UUID transactionId, UUID userId, SaveTransactionRequest req) {
        planService.getPlanEntity(planId, userId);
        Transaction tx =
                transactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(transactionId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Transaction not found: " + transactionId));

        if (tx.getCleared() == ClearedStatus.RECONCILED) {
            boolean amountChanged = tx.getAmountMilliunits() != req.amount_milliunits();
            boolean accountChanged = !tx.getAccountId().equals(req.account_id());
            boolean dateChanged = !tx.getDate().equals(req.date());
            boolean clearedChanged = req.cleared() != null && tx.getCleared() != req.cleared();
            if (amountChanged || accountChanged || dateChanged || clearedChanged) {
                throw new TransactionLockedException(
                        "Transaction is RECONCILED (locked); unreconcile first");
            }
        }

        validateTransactionRequest(planId, req);

        Account sourceAccount =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(tx.getAccountId(), planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + tx.getAccountId()));
        revertAccountBalanceOnTransactionDelete(sourceAccount, tx);

        tx.setDate(req.date());
        tx.setAmountMilliunits(req.amount_milliunits());
        tx.setMemo(req.memo());
        if (req.cleared() != null) tx.setCleared(req.cleared());
        if (req.approved() != null) tx.setApproved(req.approved());
        tx.setCategoryId(req.category_id());
        tx.setUpdatedAt(Instant.now());

        if (tx.getTransferTransactionId() != null) {
            Transaction peerTx =
                    transactionRepository
                            .findByIdAndPlanIdAndDeletedFalse(tx.getTransferTransactionId(), planId)
                            .orElse(null);
            if (peerTx != null) {
                Account peerAccount =
                        accountRepository
                                .findByIdAndPlanIdAndDeletedFalse(peerTx.getAccountId(), planId)
                                .orElse(null);
                if (peerAccount != null) {
                    revertAccountBalanceOnTransactionDelete(peerAccount, peerTx);
                    peerTx.setDate(req.date());
                    peerTx.setAmountMilliunits(-req.amount_milliunits());
                    peerTx.setMemo(req.memo());
                    if (req.cleared() != null) peerTx.setCleared(req.cleared());
                    peerTx.setUpdatedAt(Instant.now());
                    transactionRepository.save(peerTx);
                    updateAccountBalanceOnTransactionAdd(peerAccount, peerTx);
                }
            }
        } else {
            tx.setPayeeId(resolvePayee(planId, req.payee_id(), req.payee_name()));
        }

        transactionRepository.save(tx);
        updateAccountBalanceOnTransactionAdd(sourceAccount, tx);

        return toTransactionResponse(tx);
    }

    @Transactional
    public void deleteTransaction(UUID planId, UUID transactionId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        Transaction tx =
                transactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(transactionId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Transaction not found: " + transactionId));

        if (tx.getCleared() == ClearedStatus.RECONCILED) {
            throw new TransactionLockedException(
                    "Transaction is RECONCILED (locked) and cannot be deleted");
        }

        Account sourceAccount =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(tx.getAccountId(), planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + tx.getAccountId()));
        revertAccountBalanceOnTransactionDelete(sourceAccount, tx);

        tx.setDeleted(true);
        tx.setUpdatedAt(Instant.now());
        transactionRepository.save(tx);

        if (tx.getTransferTransactionId() != null) {
            transactionRepository
                    .findByIdAndPlanIdAndDeletedFalse(tx.getTransferTransactionId(), planId)
                    .ifPresent(
                            peerTx -> {
                                accountRepository
                                        .findByIdAndPlanIdAndDeletedFalse(
                                                peerTx.getAccountId(), planId)
                                        .ifPresent(
                                                peerAcc ->
                                                        revertAccountBalanceOnTransactionDelete(
                                                                peerAcc, peerTx));
                                peerTx.setDeleted(true);
                                peerTx.setUpdatedAt(Instant.now());
                                transactionRepository.save(peerTx);
                            });
        }
    }

    @Transactional
    public TransactionResponse unreconcileTransaction(
            UUID planId, UUID transactionId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        Transaction tx =
                transactionRepository
                        .findByIdAndPlanIdAndDeletedFalse(transactionId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Transaction not found: " + transactionId));

        if (tx.getCleared() != ClearedStatus.RECONCILED) {
            throw new DomainValidationException("Transaction is not in RECONCILED state");
        }

        tx.setCleared(ClearedStatus.CLEARED);
        tx.setUpdatedAt(Instant.now());
        transactionRepository.save(tx);
        return toTransactionResponse(tx);
    }

    private void validateTransactionRequest(UUID planId, SaveTransactionRequest req) {
        if (req.account_id() == null) throw new DomainValidationException("account_id is required");
        if (req.date() == null) throw new DomainValidationException("date is required");

        Account account =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(req.account_id(), planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + req.account_id()));

        if (req.transfer_account_id() != null) {
            if (req.transfer_account_id().equals(req.account_id())) {
                throw new DomainValidationException(
                        "transfer_account_id cannot be the same as account_id");
            }
            if (req.payee_id() != null
                    || (req.payee_name() != null && !req.payee_name().isBlank())) {
                throw new DomainValidationException(
                        "payee_id and payee_name must be null for account transfers");
            }
            Account target =
                    accountRepository
                            .findByIdAndPlanIdAndDeletedFalse(req.transfer_account_id(), planId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Target transfer account not found: "
                                                            + req.transfer_account_id()));

            if (account.isOnBudget() && target.isOnBudget()) {
                if (req.category_id() != null) {
                    throw new DomainValidationException(
                            "Category must be null for on-budget to on-budget transfers");
                }
            } else if (account.isOnBudget() && !target.isOnBudget()) {
                if (req.category_id() == null) {
                    throw new DomainValidationException(
                            "Category is required for on-budget to off-budget transfers");
                }
            } else if (!account.isOnBudget() && target.isOnBudget()) {
                if (req.category_id() != null) {
                    throw new DomainValidationException(
                            "Category must be null for off-budget to on-budget transfer source");
                }
            }
        } else {
            if (account.isOnBudget()) {
                if (req.category_id() == null) {
                    throw new DomainValidationException(
                            "Category is required for on-budget accounts");
                }
            } else {
                if (req.category_id() != null) {
                    throw new DomainValidationException(
                            "Category must be null for off-budget (tracking) accounts");
                }
            }
        }
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

    private void updateAccountBalanceOnTransactionAdd(Account account, Transaction tx) {
        long amount = tx.getAmountMilliunits();
        account.setBalanceMilliunits(account.getBalanceMilliunits() + amount);
        if (tx.getCleared() == ClearedStatus.CLEARED
                || tx.getCleared() == ClearedStatus.RECONCILED) {
            account.setClearedBalanceMilliunits(account.getClearedBalanceMilliunits() + amount);
        } else {
            account.setUnclearedBalanceMilliunits(account.getUnclearedBalanceMilliunits() + amount);
        }
        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);
    }

    private void revertAccountBalanceOnTransactionDelete(Account account, Transaction tx) {
        long amount = tx.getAmountMilliunits();
        account.setBalanceMilliunits(account.getBalanceMilliunits() - amount);
        if (tx.getCleared() == ClearedStatus.CLEARED
                || tx.getCleared() == ClearedStatus.RECONCILED) {
            account.setClearedBalanceMilliunits(account.getClearedBalanceMilliunits() - amount);
        } else {
            account.setUnclearedBalanceMilliunits(account.getUnclearedBalanceMilliunits() - amount);
        }
        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);
    }

    private TransactionResponse toTransactionResponse(Transaction tx) {
        String payeeName = null;
        if (tx.getPayeeId() != null) {
            payeeName = payeeRepository.findById(tx.getPayeeId()).map(Payee::getName).orElse(null);
        }
        return new TransactionResponse(
                tx.getId(),
                tx.getPlanId(),
                tx.getAccountId(),
                tx.getCategoryId(),
                tx.getPayeeId(),
                payeeName,
                tx.getDate(),
                tx.getAmountMilliunits(),
                tx.getMemo(),
                tx.getCleared(),
                tx.isApproved(),
                tx.getTransferAccountId(),
                tx.getTransferTransactionId());
    }
}
