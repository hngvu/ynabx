package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ynabx.dto.AccountResponse;
import com.ynabx.dto.CreateAccountRequest;
import com.ynabx.dto.UpdateAccountRequest;
import com.ynabx.entity.Account;
import com.ynabx.entity.Account.AccountType;
import com.ynabx.entity.CategoryGroup;
import com.ynabx.entity.Payee;
import com.ynabx.exception.DomainConflictException;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.CategoryGroupRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.PayeeRepository;
import com.ynabx.repository.TransactionRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock private PlanService planService;
    @Mock private AccountRepository accountRepository;
    @Mock private PayeeRepository payeeRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private CategoryGroupRepository groupRepository;
    @Mock private TransactionRepository transactionRepository;

    private AccountService accountService;
    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID accountId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        accountService =
                new AccountService(
                        planService,
                        accountRepository,
                        payeeRepository,
                        categoryRepository,
                        groupRepository,
                        transactionRepository);
    }

    @Test
    @DisplayName(
            "createAccount: creates account and automatically provisions linked transfer payee")
    void createAccountProvisionsTransferPayee() {
        CreateAccountRequest req =
                new CreateAccountRequest("Checking", AccountType.CHECKING, true, 0L, null, 0);

        AccountResponse res = accountService.createAccount(planId, userId, req);

        assertThat(res.name()).isEqualTo("Checking");
        verify(accountRepository, org.mockito.Mockito.atLeastOnce()).save(any(Account.class));
        verify(payeeRepository).save(any(Payee.class));
    }

    @Test
    @DisplayName("createAccount: provisions credit card payment category when type is CREDIT_CARD")
    void createCreditCardProvisionsPaymentCategory() {
        CategoryGroup ccGroup =
                CategoryGroup.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .name("Credit Card Payments")
                        .build();
        when(groupRepository.findByPlanIdAndSystemTrueAndName(planId, "Credit Card Payments"))
                .thenReturn(Optional.of(ccGroup));

        CreateAccountRequest req =
                new CreateAccountRequest("Visa Card", AccountType.CREDIT_CARD, true, 0L, null, 0);

        accountService.createAccount(planId, userId, req);

        verify(categoryRepository).save(any());
    }

    @Test
    @DisplayName(
            "updateAccount: closing an account with non-zero balance throws DomainConflictException")
    void closeAccountWithNonZeroBalanceFails() {
        Account account =
                Account.builder()
                        .id(accountId)
                        .planId(planId)
                        .balanceMilliunits(50000L)
                        .closed(false)
                        .build();
        when(accountRepository.findByIdAndPlanIdAndDeletedFalse(accountId, planId))
                .thenReturn(Optional.of(account));

        UpdateAccountRequest req = new UpdateAccountRequest(null, null, true, null);

        assertThatThrownBy(() -> accountService.updateAccount(planId, accountId, userId, req))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("Cannot close an account with a non-zero balance");
    }

    @Test
    @DisplayName("deleteAccount: throws DomainConflictException when transactions exist")
    void deleteAccountWithTransactionsFails() {
        Account account = Account.builder().id(accountId).planId(planId).build();
        when(accountRepository.findByIdAndPlanIdAndDeletedFalse(accountId, planId))
                .thenReturn(Optional.of(account));
        when(transactionRepository.existsByAccountIdAndDeletedFalse(accountId)).thenReturn(true);

        assertThatThrownBy(() -> accountService.deleteAccount(planId, accountId, userId))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("has transactions and cannot be deleted");
    }
}
