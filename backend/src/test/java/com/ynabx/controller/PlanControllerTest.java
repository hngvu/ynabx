package com.ynabx.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.CategoryResponse;
import com.ynabx.dto.CreatePlanRequest;
import com.ynabx.dto.PlanMonthSummary;
import com.ynabx.dto.PlanSummary;
import com.ynabx.service.CategoryService;
import com.ynabx.service.MonthlyBudgetService;
import com.ynabx.service.PlanService;
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

@WebMvcTest(PlanController.class)
@AutoConfigureMockMvc(addFilters = false)
class PlanControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private PlanService planService;
    @MockBean private CategoryService categoryService;
    @MockBean private MonthlyBudgetService monthlyBudgetService;

    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final Principal principal = () -> userId.toString();

    @Test
    @DisplayName("GET /plans returns list of plans")
    void testListPlans() throws Exception {
        PlanSummary plan = new PlanSummary(planId, "Personal Budget", "USD", LocalDate.now(), null);
        when(planService.listPlans(userId)).thenReturn(List.of(plan));

        mockMvc.perform(get("/plans").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(planId.toString()))
                .andExpect(jsonPath("$[0].name").value("Personal Budget"));
    }

    @Test
    @DisplayName("POST /plans creates new plan")
    void testCreatePlan() throws Exception {
        CreatePlanRequest req = new CreatePlanRequest("Vacation Budget", "USD");
        PlanSummary plan = new PlanSummary(planId, "Vacation Budget", "USD", LocalDate.now(), null);
        when(planService.createPlan(eq(userId), any(CreatePlanRequest.class))).thenReturn(plan);

        mockMvc.perform(
                        post("/plans")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(planId.toString()))
                .andExpect(jsonPath("$.name").value("Vacation Budget"));
    }

    @Test
    @DisplayName("DELETE /plans/{planId} deletes plan")
    void testDeletePlan() throws Exception {
        mockMvc.perform(delete("/plans/" + planId).principal(principal))
                .andExpect(status().isNoContent());

        verify(planService).deletePlan(planId, userId);
    }

    @Test
    @DisplayName("GET /plans/{planId}/categories returns categories")
    void testListCategories() throws Exception {
        UUID catId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        CategoryResponse cat =
                new CategoryResponse(
                        catId,
                        planId,
                        groupId,
                        "Groceries",
                        null,
                        false,
                        false,
                        null,
                        false,
                        0);
        when(categoryService.listCategories(planId, userId, null, false))
                .thenReturn(List.of(cat));

        mockMvc.perform(get("/plans/" + planId + "/categories").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(catId.toString()))
                .andExpect(jsonPath("$[0].name").value("Groceries"));
    }

    @Test
    @DisplayName("GET /plans/{planId}/months/{month} returns month summary")
    void testGetPlanMonth() throws Exception {
        LocalDate month = LocalDate.of(2026, 10, 1);
        PlanMonthSummary summary =
                new PlanMonthSummary(month, 50_000L, 100_000L, -20_000L, 80_000L, List.of());
        when(monthlyBudgetService.getPlanMonth(planId, userId, month)).thenReturn(summary);

        mockMvc.perform(
                        get("/plans/" + planId + "/months/2026-10-01")
                                .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready_to_assign_milliunits").value(50000))
                .andExpect(jsonPath("$.total_assigned_milliunits").value(100000));
    }
}
