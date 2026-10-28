package com.ynabx.controller;

import com.ynabx.dto.AccountResponse;
import com.ynabx.dto.CreateAccountRequest;
import com.ynabx.dto.CreatePayeeRequest;
import com.ynabx.dto.PayeeResponse;
import com.ynabx.dto.ReconcileAccountRequest;
import com.ynabx.dto.SaveTransactionRequest;
import com.ynabx.dto.TransactionPageResponse;
import com.ynabx.dto.TransactionResponse;
import com.ynabx.dto.UpdateAccountRequest;
import com.ynabx.dto.UpdatePayeeRequest;
import com.ynabx.service.AccountService;
import com.ynabx.service.PayeeService;
import com.ynabx.service.TransactionService;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/plans/{planId}")
public class LedgerController {

    private final AccountService accountService;
    private final PayeeService payeeService;
    private final TransactionService transactionService;

    public LedgerController(
            AccountService accountService,
            PayeeService payeeService,
            TransactionService transactionService) {
        this.accountService = accountService;
        this.payeeService = payeeService;
        this.transactionService = transactionService;
    }

    private UUID getUserId(Principal principal) {
        return UUID.fromString(principal.getName());
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<AccountResponse>> listAccounts(
            @PathVariable UUID planId,
            @RequestParam(name = "include_closed", defaultValue = "true") boolean includeClosed,
            Principal principal) {
        return ResponseEntity.ok(
                accountService.listAccounts(planId, getUserId(principal), includeClosed));
    }

    @PostMapping("/accounts")
    public ResponseEntity<AccountResponse> createAccount(
            @PathVariable UUID planId, @RequestBody CreateAccountRequest req, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountService.createAccount(planId, getUserId(principal), req));
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<AccountResponse> getAccount(
            @PathVariable UUID planId, @PathVariable UUID accountId, Principal principal) {
        return ResponseEntity.ok(
                accountService.getAccount(planId, accountId, getUserId(principal)));
    }

    @PatchMapping("/accounts/{accountId}")
    public ResponseEntity<AccountResponse> updateAccount(
            @PathVariable UUID planId,
            @PathVariable UUID accountId,
            @RequestBody UpdateAccountRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                accountService.updateAccount(planId, accountId, getUserId(principal), req));
    }

    @DeleteMapping("/accounts/{accountId}")
    public ResponseEntity<Void> deleteAccount(
            @PathVariable UUID planId, @PathVariable UUID accountId, Principal principal) {
        accountService.deleteAccount(planId, accountId, getUserId(principal));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/accounts/{accountId}/reconcile")
    public ResponseEntity<AccountResponse> reconcileAccount(
            @PathVariable UUID planId,
            @PathVariable UUID accountId,
            @RequestBody ReconcileAccountRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                accountService.reconcileAccount(planId, accountId, getUserId(principal), req));
    }

    @GetMapping("/payees")
    public ResponseEntity<List<PayeeResponse>> listPayees(
            @PathVariable UUID planId, Principal principal) {
        return ResponseEntity.ok(payeeService.listPayees(planId, getUserId(principal)));
    }

    @PostMapping("/payees")
    public ResponseEntity<PayeeResponse> createPayee(
            @PathVariable UUID planId, @RequestBody CreatePayeeRequest req, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(payeeService.createPayee(planId, getUserId(principal), req));
    }

    @PatchMapping("/payees/{payeeId}")
    public ResponseEntity<PayeeResponse> updatePayee(
            @PathVariable UUID planId,
            @PathVariable UUID payeeId,
            @RequestBody UpdatePayeeRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                payeeService.updatePayee(planId, payeeId, getUserId(principal), req));
    }

    @DeleteMapping("/payees/{payeeId}")
    public ResponseEntity<Void> deletePayee(
            @PathVariable UUID planId, @PathVariable UUID payeeId, Principal principal) {
        payeeService.deletePayee(planId, payeeId, getUserId(principal));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/transactions")
    public ResponseEntity<TransactionPageResponse> listTransactions(
            @PathVariable UUID planId,
            @RequestParam(name = "account_id", required = false) UUID accountId,
            @RequestParam(name = "category_id", required = false) UUID categoryId,
            @RequestParam(name = "payee_id", required = false) UUID payeeId,
            @RequestParam(name = "since_date", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate sinceDate,
            @RequestParam(name = "until_date", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate untilDate,
            @RequestParam(name = "limit", defaultValue = "100") int limit,
            @RequestParam(name = "cursor", required = false) String cursor,
            Principal principal) {
        return ResponseEntity.ok(
                transactionService.listTransactions(
                        planId,
                        getUserId(principal),
                        accountId,
                        categoryId,
                        payeeId,
                        sinceDate,
                        untilDate,
                        limit,
                        cursor));
    }

    @PostMapping("/transactions")
    public ResponseEntity<TransactionResponse> createTransaction(
            @PathVariable UUID planId,
            @RequestBody SaveTransactionRequest req,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.createTransaction(planId, getUserId(principal), req));
    }

    @GetMapping("/transactions/{transactionId}")
    public ResponseEntity<TransactionResponse> getTransaction(
            @PathVariable UUID planId, @PathVariable UUID transactionId, Principal principal) {
        return ResponseEntity.ok(
                transactionService.getTransaction(planId, transactionId, getUserId(principal)));
    }

    @PutMapping("/transactions/{transactionId}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @PathVariable UUID planId,
            @PathVariable UUID transactionId,
            @RequestBody SaveTransactionRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                transactionService.updateTransaction(
                        planId, transactionId, getUserId(principal), req));
    }

    @DeleteMapping("/transactions/{transactionId}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable UUID planId, @PathVariable UUID transactionId, Principal principal) {
        transactionService.deleteTransaction(planId, transactionId, getUserId(principal));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/transactions/{transactionId}/unreconcile")
    public ResponseEntity<TransactionResponse> unreconcileTransaction(
            @PathVariable UUID planId, @PathVariable UUID transactionId, Principal principal) {
        return ResponseEntity.ok(
                transactionService.unreconcileTransaction(
                        planId, transactionId, getUserId(principal)));
    }
}
