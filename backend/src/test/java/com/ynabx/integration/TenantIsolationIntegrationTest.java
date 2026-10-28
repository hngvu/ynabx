package com.ynabx.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.ynabx.entity.Account;
import com.ynabx.entity.Plan;
import com.ynabx.entity.Transaction;
import com.ynabx.repository.AccountRepository;
import com.ynabx.repository.PlanRepository;
import com.ynabx.repository.TransactionRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TenantIsolationIntegrationTest {

    @Autowired private PlanRepository planRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private TransactionRepository transactionRepository;

    @Test
    @DisplayName("Tenant Isolation: User A cannot access Plan belonging to User B")
    void testPlanTenantIsolation() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        Plan planA =
                Plan.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(userA)
                        .name("Budget A")
                        .currencyCode("USD")
                        .numberFormat("en-US")
                        .dateFormat("YYYY-MM-DD")
                        .currencySymbolFirst(true)
                        .currencyDisplaySymbol(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
        planRepository.save(planA);

        // User A can find their plan
        Optional<Plan> foundA = planRepository.findByIdAndOwnerUserId(planA.getId(), userA);
        assertThat(foundA).isPresent();

        // User B cannot find User A's plan
        Optional<Plan> leakedB = planRepository.findByIdAndOwnerUserId(planA.getId(), userB);
        assertThat(leakedB).isEmpty();

        List<Plan> userBPlans = planRepository.findByOwnerUserId(userB);
        assertThat(userBPlans).isEmpty();
    }

    @Test
    @DisplayName("Tenant Isolation: Accounts in Plan A cannot be read or queried under Plan B")
    void testAccountTenantIsolation() {
        UUID planAId = UUID.randomUUID();
        UUID planBId = UUID.randomUUID();

        Account accA =
                Account.builder()
                        .id(UUID.randomUUID())
                        .planId(planAId)
                        .name("Checking Account A")
                        .type(Account.AccountType.CHECKING)
                        .onBudget(true)
                        .closed(false)
                        .sortOrder(0)
                        .deleted(false)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
        accountRepository.save(accA);

        // Accessible under Plan A
        Optional<Account> found = accountRepository.findByIdAndPlanIdAndDeletedFalse(accA.getId(), planAId);
        assertThat(found).isPresent();

        // Inaccessible under Plan B
        Optional<Account> notFound = accountRepository.findByIdAndPlanIdAndDeletedFalse(accA.getId(), planBId);
        assertThat(notFound).isEmpty();

        List<Account> planBAccounts = accountRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planBId);
        assertThat(planBAccounts).isEmpty();
    }

    @Test
    @DisplayName("Tenant Isolation: Transactions in Plan A cannot be fetched by Plan B queries")
    void testTransactionTenantIsolation() {
        UUID planAId = UUID.randomUUID();
        UUID planBId = UUID.randomUUID();
        UUID accId = UUID.randomUUID();

        Transaction txA =
                Transaction.builder()
                        .id(UUID.randomUUID())
                        .planId(planAId)
                        .accountId(accId)
                        .date(LocalDate.of(2026, 10, 1))
                        .amountMilliunits(-25_000L)
                        .cleared(Transaction.ClearedStatus.CLEARED)
                        .reconciled(false)
                        .deleted(false)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
        transactionRepository.save(txA);

        List<Transaction> planATxs = transactionRepository.findForPlanUpToDate(planAId, LocalDate.of(2026, 10, 31));
        assertThat(planATxs).hasSize(1);

        List<Transaction> planBTxs = transactionRepository.findForPlanUpToDate(planBId, LocalDate.of(2026, 10, 31));
        assertThat(planBTxs).isEmpty();
    }
}
