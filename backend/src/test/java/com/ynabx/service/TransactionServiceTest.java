package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ynabx.dto.SaveTransactionRequest;
import com.ynabx.dto.TransactionResponse;
import com.ynabx.entity.Account;
import com.ynabx.entity.Transaction;
import com.ynabx.entity.Transaction.ClearedStatus;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.TransactionLockedException;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.PayeeRepository;
import com.ynabx.repository.TransactionRepository;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock private PlanService planService;
    @Mock private TransactionRepository transactionRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private PayeeRepository payeeRepository;

    private TransactionService transactionService;
    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID accountId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();
    private final UUID targetAccountId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        transactionService =
                new TransactionService(
                        planService,
                        transactionRepository,
                        accountRepository,
                        categoryRepository,
                        payeeRepository);
    }

    @Test
    @DisplayName(
            "createTransaction: on-budget transaction without category throws DomainValidationException")
    void onBudgetMissingCategoryThrows() {
        Account account = Account.builder().id(accountId).planId(planId).onBudget(true).build();
        when(accountRepository.findByIdAndPlanIdAndDeletedFalse(accountId, planId))
                .thenReturn(Optional.of(account));

        SaveTransactionRequest req =
                new SaveTransactionRequest(
                        accountId,
                        null,
                        null,
                        "Store",
                        LocalDate.now(),
                        -50000L,
                        null,
                        null,
                        null,
                        null);

        assertThatThrownBy(() -> transactionService.createTransaction(planId, userId, req))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("Category is required");
    }

    @Test
    @DisplayName("createTransaction: creates transfer pair with exact negated amounts and links")
    void createTransferPairAtomicity() {
        Account sourceAcc =
                Account.builder()
                        .id(accountId)
                        .planId(planId)
                        .onBudget(true)
                        .balanceMilliunits(100000L)
                        .clearedBalanceMilliunits(100000L)
                        .build();
        Account targetAcc =
                Account.builder()
                        .id(targetAccountId)
                        .planId(planId)
                        .onBudget(true)
                        .balanceMilliunits(0L)
                        .clearedBalanceMilliunits(0L)
                        .build();

        when(accountRepository.findByIdAndPlanIdAndDeletedFalse(accountId, planId))
                .thenReturn(Optional.of(sourceAcc));
        when(accountRepository.findByIdAndPlanIdAndDeletedFalse(targetAccountId, planId))
                .thenReturn(Optional.of(targetAcc));

        SaveTransactionRequest req =
                new SaveTransactionRequest(
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.now(),
                        -30000L,
                        "Transfer",
                        ClearedStatus.CLEARED,
                        true,
                        targetAccountId);

        TransactionResponse res = transactionService.createTransaction(planId, userId, req);

        assertThat(res.amount_milliunits()).isEqualTo(-30000L);
        assertThat(res.transfer_account_id()).isEqualTo(targetAccountId);
        verify(transactionRepository, org.mockito.Mockito.times(3)).save(any(Transaction.class));
        assertThat(sourceAcc.getBalanceMilliunits()).isEqualTo(70000L);
        assertThat(targetAcc.getBalanceMilliunits()).isEqualTo(30000L);
    }

    @Test
    @DisplayName(
            "updateTransaction: mutating locked fields on RECONCILED transaction throws TransactionLockedException")
    void updateReconciledTransactionThrows() {
        UUID txId = UUID.randomUUID();
        Transaction tx =
                Transaction.builder()
                        .id(txId)
                        .planId(planId)
                        .accountId(accountId)
                        .amountMilliunits(-50000L)
                        .date(LocalDate.now())
                        .cleared(ClearedStatus.RECONCILED)
                        .build();

        when(transactionRepository.findByIdAndPlanIdAndDeletedFalse(txId, planId))
                .thenReturn(Optional.of(tx));

        SaveTransactionRequest req =
                new SaveTransactionRequest(
                        accountId,
                        categoryId,
                        null,
                        null,
                        LocalDate.now(),
                        -60000L,
                        null,
                        null,
                        null,
                        null);

        assertThatThrownBy(() -> transactionService.updateTransaction(planId, txId, userId, req))
                .isInstanceOf(TransactionLockedException.class)
                .hasMessageContaining("Transaction is RECONCILED (locked)");
    }
}
