package com.ynabx.service;

import com.ynabx.dto.AccountResponse;
import com.ynabx.dto.CreateAccountRequest;
import com.ynabx.dto.ReconcileAccountRequest;
import com.ynabx.dto.UpdateAccountRequest;
import com.ynabx.entity.Account;
import com.ynabx.entity.Account.AccountType;
import com.ynabx.entity.Category;
import com.ynabx.entity.CategoryGroup;
import com.ynabx.entity.Payee;
import com.ynabx.entity.Transaction;
import com.ynabx.exception.DomainConflictException;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.CategoryGroupRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.PayeeRepository;
import com.ynabx.repository.TransactionRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final PlanService planService;
    private final AccountRepository accountRepository;
    private final PayeeRepository payeeRepository;
    private final CategoryRepository categoryRepository;
    private final CategoryGroupRepository groupRepository;
    private final TransactionRepository transactionRepository;

    public AccountService(
            PlanService planService,
            AccountRepository accountRepository,
            PayeeRepository payeeRepository,
            CategoryRepository categoryRepository,
            CategoryGroupRepository groupRepository,
            TransactionRepository transactionRepository) {
        this.planService = planService;
        this.accountRepository = accountRepository;
        this.payeeRepository = payeeRepository;
        this.categoryRepository = categoryRepository;
        this.groupRepository = groupRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<AccountResponse> listAccounts(UUID planId, UUID userId, boolean includeClosed) {
        planService.getPlanEntity(planId, userId);
        List<Account> accounts =
                includeClosed
                        ? accountRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId)
                        : accountRepository
                                .findByPlanIdAndDeletedFalseAndClosedFalseOrderBySortOrderAsc(
                                        planId);
        return accounts.stream().map(this::toAccountResponse).toList();
    }

    public AccountResponse getAccount(UUID planId, UUID accountId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        Account account =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(accountId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + accountId));
        return toAccountResponse(account);
    }

    @Transactional
    public AccountResponse createAccount(UUID planId, UUID userId, CreateAccountRequest req) {
        planService.getPlanEntity(planId, userId);
        if (req.name() == null || req.name().isBlank()) {
            throw new DomainValidationException("Account name is required");
        }
        if (req.type() == null) {
            throw new DomainValidationException("Account type is required");
        }

        Instant now = Instant.now();
        UUID accountId = UUID.randomUUID();

        boolean onBudget = req.on_budget() != null ? req.on_budget() : true;
        Account account =
                Account.builder()
                        .id(accountId)
                        .planId(planId)
                        .name(req.name())
                        .type(req.type())
                        .onBudget(onBudget)
                        .closed(false)
                        .balanceMilliunits(req.initial_balance_milliunits())
                        .clearedBalanceMilliunits(req.initial_balance_milliunits())
                        .unclearedBalanceMilliunits(0L)
                        .note(req.note())
                        .transferPayeeId(null)
                        .sortOrder(req.sort_order() != null ? req.sort_order() : 0)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        accountRepository.save(account);

        UUID transferPayeeId = UUID.randomUUID();
        Payee transferPayee =
                Payee.builder()
                        .id(transferPayeeId)
                        .planId(planId)
                        .name("Transfer : " + req.name())
                        .transferAccountId(accountId)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        payeeRepository.save(transferPayee);

        account.setTransferPayeeId(transferPayeeId);
        accountRepository.save(account);

        if (req.type() == AccountType.CREDIT_CARD && onBudget) {
            CategoryGroup ccGroup =
                    groupRepository
                            .findByPlanIdAndSystemTrueAndName(planId, "Credit Card Payments")
                            .orElseGet(
                                    () ->
                                            groupRepository.save(
                                                    CategoryGroup.builder()
                                                            .id(UUID.randomUUID())
                                                            .planId(planId)
                                                            .name("Credit Card Payments")
                                                            .system(true)
                                                            .hidden(false)
                                                            .sortOrder(1)
                                                            .deleted(false)
                                                            .createdAt(now)
                                                            .updatedAt(now)
                                                            .build()));

            Category ccCategory =
                    Category.builder()
                            .id(UUID.randomUUID())
                            .planId(planId)
                            .groupId(ccGroup.getId())
                            .name(req.name())
                            .inflowCategory(false)
                            .creditCardPayment(true)
                            .creditCardAccountId(accountId)
                            .hidden(false)
                            .sortOrder(0)
                            .deleted(false)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
            categoryRepository.save(ccCategory);
        }

        if (req.initial_balance_milliunits() != 0L) {
            UUID inflowCatId = null;
            if (onBudget && req.type() != AccountType.CREDIT_CARD) {
                inflowCatId =
                        categoryRepository
                                .findByPlanIdAndInflowCategoryTrue(planId)
                                .map(Category::getId)
                                .orElse(null);
            }

            Transaction initTx =
                    Transaction.builder()
                            .id(UUID.randomUUID())
                            .planId(planId)
                            .accountId(accountId)
                            .categoryId(inflowCatId)
                            .date(LocalDate.now())
                            .amountMilliunits(req.initial_balance_milliunits())
                            .memo("Starting Balance")
                            .cleared(Transaction.ClearedStatus.CLEARED)
                            .approved(true)
                            .deleted(false)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
            transactionRepository.save(initTx);
        }

        return toAccountResponse(account);
    }

    @Transactional
    public AccountResponse updateAccount(
            UUID planId, UUID accountId, UUID userId, UpdateAccountRequest req) {
        planService.getPlanEntity(planId, userId);
        Account account =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(accountId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + accountId));

        if (req.name() != null && !req.name().equals(account.getName())) {
            account.setName(req.name());
            if (account.getTransferPayeeId() != null) {
                payeeRepository
                        .findById(account.getTransferPayeeId())
                        .ifPresent(
                                p -> {
                                    p.setName("Transfer : " + req.name());
                                    p.setUpdatedAt(Instant.now());
                                    payeeRepository.save(p);
                                });
            }
            categoryRepository
                    .findByPlanIdAndCreditCardAccountIdAndDeletedFalse(planId, accountId)
                    .ifPresent(
                            c -> {
                                c.setName(req.name());
                                c.setUpdatedAt(Instant.now());
                                categoryRepository.save(c);
                            });
        }

        if (req.closed() != null) {
            if (req.closed() && account.getBalanceMilliunits() != 0L) {
                throw new DomainConflictException(
                        "Cannot close an account with a non-zero balance");
            }
            account.setClosed(req.closed());
        }

        if (req.note() != null) account.setNote(req.note());
        if (req.sort_order() != null) account.setSortOrder(req.sort_order());

        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);
        return toAccountResponse(account);
    }

    @Transactional
    public void deleteAccount(UUID planId, UUID accountId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        Account account =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(accountId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + accountId));

        if (transactionRepository.existsByAccountIdAndDeletedFalse(accountId)) {
            throw new DomainConflictException("Account has transactions and cannot be deleted");
        }

        account.setDeleted(true);
        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);

        if (account.getTransferPayeeId() != null) {
            payeeRepository
                    .findById(account.getTransferPayeeId())
                    .ifPresent(
                            p -> {
                                p.setDeleted(true);
                                p.setUpdatedAt(Instant.now());
                                payeeRepository.save(p);
                            });
        }

        categoryRepository
                .findByPlanIdAndCreditCardAccountIdAndDeletedFalse(planId, accountId)
                .ifPresent(
                        c -> {
                            c.setDeleted(true);
                            c.setUpdatedAt(Instant.now());
                            categoryRepository.save(c);
                        });
    }

    @Transactional
    public AccountResponse reconcileAccount(
            UUID planId, UUID accountId, UUID userId, ReconcileAccountRequest req) {
        planService.getPlanEntity(planId, userId);
        Account account =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(accountId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + accountId));

        long diff = req.statement_balance_milliunits() - account.getClearedBalanceMilliunits();
        if (diff != 0L) {
            boolean createAdj =
                    req.create_adjustment_transaction() != null
                            && req.create_adjustment_transaction();
            if (!createAdj) {
                throw new DomainConflictException(
                        "Statement balance differs from cleared balance by "
                                + diff
                                + " milliunits");
            }
            UUID inflowCatId = null;
            if (account.isOnBudget() && account.getType() != AccountType.CREDIT_CARD) {
                inflowCatId =
                        categoryRepository
                                .findByPlanIdAndInflowCategoryTrue(planId)
                                .map(Category::getId)
                                .orElse(null);
            }

            Instant now = Instant.now();
            Transaction adjTx =
                    Transaction.builder()
                            .id(UUID.randomUUID())
                            .planId(planId)
                            .accountId(accountId)
                            .categoryId(inflowCatId)
                            .date(LocalDate.now())
                            .amountMilliunits(diff)
                            .memo("Reconciliation Balance Adjustment")
                            .cleared(Transaction.ClearedStatus.CLEARED)
                            .approved(true)
                            .deleted(false)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
            transactionRepository.save(adjTx);

            account.setBalanceMilliunits(account.getBalanceMilliunits() + diff);
            account.setClearedBalanceMilliunits(account.getClearedBalanceMilliunits() + diff);
        }

        List<Transaction> clearedTransactions =
                transactionRepository.findByAccountIdAndCleared(
                        accountId, Transaction.ClearedStatus.CLEARED);
        for (Transaction tx : clearedTransactions) {
            tx.setCleared(Transaction.ClearedStatus.RECONCILED);
            tx.setUpdatedAt(Instant.now());
            transactionRepository.save(tx);
        }

        account.setLastReconciledAt(Instant.now());
        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);
        return toAccountResponse(account);
    }

    private AccountResponse toAccountResponse(Account a) {
        return new AccountResponse(
                a.getId(),
                a.getPlanId(),
                a.getName(),
                a.getType(),
                a.isOnBudget(),
                a.isClosed(),
                a.getBalanceMilliunits(),
                a.getClearedBalanceMilliunits(),
                a.getUnclearedBalanceMilliunits(),
                a.getNote(),
                a.getTransferPayeeId(),
                a.getLastReconciledAt(),
                a.getSortOrder());
    }
}
