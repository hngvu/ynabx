package com.ynabx.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.AccountResponse;
import com.ynabx.dto.CreateAccountRequest;
import com.ynabx.dto.PayeeResponse;
import com.ynabx.dto.SaveTransactionRequest;
import com.ynabx.dto.TransactionResponse;
import com.ynabx.entity.Account;
import com.ynabx.entity.Transaction;
import com.ynabx.service.AccountService;
import com.ynabx.service.PayeeService;
import com.ynabx.service.TransactionService;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(LedgerController.class)
@AutoConfigureMockMvc(addFilters = false)
class LedgerControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AccountService accountService;
    @MockBean private PayeeService payeeService;
    @MockBean private TransactionService transactionService;

    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID accountId = UUID.randomUUID();
    private final Principal principal = () -> userId.toString();

    @Test
    @DisplayName("GET /plans/{planId}/accounts returns accounts")
    void testListAccounts() throws Exception {
        AccountResponse account =
                new AccountResponse(
                        accountId,
                        planId,
                        "Chase Checking",
                        Account.AccountType.CHECKING,
                        true,
                        150_000L,
                        150_000L,
                        0L,
                        null,
                        false,
                        0);
        when(accountService.listAccounts(planId, userId, true)).thenReturn(List.of(account));

        mockMvc.perform(get("/plans/" + planId + "/accounts").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(accountId.toString()))
                .andExpect(jsonPath("$[0].name").value("Chase Checking"))
                .andExpect(jsonPath("$[0].cleared_balance_milliunits").value(150000));
    }

    @Test
    @DisplayName("POST /plans/{planId}/accounts creates account")
    void testCreateAccount() throws Exception {
        CreateAccountRequest req =
                new CreateAccountRequest(
                        "Main Checking", Account.AccountType.CHECKING, true, 500_000L, null);
        AccountResponse resp =
                new AccountResponse(
                        accountId,
                        planId,
                        "Main Checking",
                        Account.AccountType.CHECKING,
                        true,
                        500_000L,
                        500_000L,
                        0L,
                        null,
                        false,
                        0);
        when(accountService.createAccount(eq(planId), eq(userId), any(CreateAccountRequest.class)))
                .thenReturn(resp);

        mockMvc.perform(
                        post("/plans/" + planId + "/accounts")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(accountId.toString()))
                .andExpect(jsonPath("$.cleared_balance_milliunits").value(500000));
    }

    @Test
    @DisplayName("DELETE /plans/{planId}/accounts/{accountId} deletes account")
    void testDeleteAccount() throws Exception {
        mockMvc.perform(
                        delete("/plans/" + planId + "/accounts/" + accountId)
                                .principal(principal))
                .andExpect(status().isNoContent());

        verify(accountService).deleteAccount(planId, accountId, userId);
    }

    @Test
    @DisplayName("GET /plans/{planId}/payees returns payees")
    void testListPayees() throws Exception {
        UUID payeeId = UUID.randomUUID();
        PayeeResponse payee = new PayeeResponse(payeeId, planId, "Supermarket", null);
        when(payeeService.listPayees(planId, userId)).thenReturn(List.of(payee));

        mockMvc.perform(get("/plans/" + planId + "/payees").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(payeeId.toString()))
                .andExpect(jsonPath("$[0].name").value("Supermarket"));
    }

    @Test
    @DisplayName("POST /plans/{planId}/transactions creates transaction")
    void testCreateTransaction() throws Exception {
        UUID txId = UUID.randomUUID();
        UUID payeeId = UUID.randomUUID();
        UUID catId = UUID.randomUUID();

        SaveTransactionRequest req =
                new SaveTransactionRequest(
                        accountId,
                        LocalDate.of(2026, 10, 15),
                        -35_000L,
                        payeeId,
                        null,
                        catId,
                        "Lunch",
                        Transaction.ClearedStatus.CLEARED,
                        false,
                        null);

        TransactionResponse resp =
                new TransactionResponse(
                        txId,
                        planId,
                        accountId,
                        LocalDate.of(2026, 10, 15),
                        -35_000L,
                        payeeId,
                        "Cafe",
                        catId,
                        "Dining Out",
                        null,
                        null,
                        "Lunch",
                        Transaction.ClearedStatus.CLEARED,
                        false,
                        null);

        when(transactionService.createTransaction(eq(planId), eq(userId), any(SaveTransactionRequest.class)))
                .thenReturn(resp);

        mockMvc.perform(
                        post("/plans/" + planId + "/transactions")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(txId.toString()))
                .andExpect(jsonPath("$.amount_milliunits").value(-35000));
    }
}
