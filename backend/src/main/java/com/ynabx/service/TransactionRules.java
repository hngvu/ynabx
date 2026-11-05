package com.ynabx.service;

import com.ynabx.entity.Account;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.repository.AccountRepository;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class TransactionRules {

    private final AccountRepository accountRepository;

    public TransactionRules(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public record ValidationContext(Account sourceAccount, Account targetAccount) {}

    public ValidationContext validate(
            UUID planId,
            UUID accountId,
            UUID transferAccountId,
            UUID categoryId,
            UUID payeeId,
            String payeeName) {
        if (accountId == null) {
            throw new DomainValidationException("account_id is required");
        }

        Account account =
                accountRepository
                        .findByIdAndPlanIdAndDeletedFalse(accountId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Account not found: " + accountId));

        Account target = null;
        if (transferAccountId != null) {
            if (transferAccountId.equals(accountId)) {
                throw new DomainValidationException(
                        "transfer_account_id cannot be the same as account_id");
            }
            if (payeeId != null || (payeeName != null && !payeeName.isBlank())) {
                throw new DomainValidationException(
                        "payee_id and payee_name must be null for account transfers");
            }
            target =
                    accountRepository
                            .findByIdAndPlanIdAndDeletedFalse(transferAccountId, planId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Target transfer account not found: "
                                                            + transferAccountId));

            if (account.isOnBudget() && target.isOnBudget()) {
                if (categoryId != null) {
                    throw new DomainValidationException(
                            "Category must be null for on-budget to on-budget transfers");
                }
            } else if (account.isOnBudget() && !target.isOnBudget()) {
                if (categoryId == null) {
                    throw new DomainValidationException(
                            "Category is required for on-budget to off-budget transfers");
                }
            } else if (!account.isOnBudget() && target.isOnBudget()) {
                if (categoryId != null) {
                    throw new DomainValidationException(
                            "Category must be null for off-budget to on-budget transfer source");
                }
            }
        } else {
            if (account.isOnBudget()) {
                if (categoryId == null) {
                    throw new DomainValidationException(
                            "Category is required for on-budget accounts");
                }
            } else {
                if (categoryId != null) {
                    throw new DomainValidationException(
                            "Category must be null for off-budget (tracking) accounts");
                }
            }
        }

        return new ValidationContext(account, target);
    }
}
