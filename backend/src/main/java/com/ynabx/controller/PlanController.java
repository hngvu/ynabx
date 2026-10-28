package com.ynabx.controller;

import com.ynabx.dto.CategoryGroupResponse;
import com.ynabx.dto.CategoryGroupWithCategoriesResponse;
import com.ynabx.dto.CategoryResponse;
import com.ynabx.dto.CreateCategoryGroupRequest;
import com.ynabx.dto.CreateCategoryRequest;
import com.ynabx.dto.CreatePlanRequest;
import com.ynabx.dto.PlanMonthSummary;
import com.ynabx.dto.PlanSummary;
import com.ynabx.dto.UpdateCategoryGroupRequest;
import com.ynabx.dto.UpdateCategoryRequest;
import com.ynabx.dto.UpdateMonthAllocationsRequest;
import com.ynabx.dto.UpdatePlanRequest;
import com.ynabx.service.CategoryService;
import com.ynabx.service.MonthlyBudgetService;
import com.ynabx.service.PlanService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/plans")
public class PlanController {

    private final PlanService planService;
    private final CategoryService categoryService;
    private final MonthlyBudgetService monthlyBudgetService;

    public PlanController(
            PlanService planService,
            CategoryService categoryService,
            MonthlyBudgetService monthlyBudgetService) {
        this.planService = planService;
        this.categoryService = categoryService;
        this.monthlyBudgetService = monthlyBudgetService;
    }

    private UUID getUserId(Principal principal) {
        return UUID.fromString(principal.getName());
    }

    @GetMapping
    public ResponseEntity<List<PlanSummary>> listPlans(Principal principal) {
        return ResponseEntity.ok(planService.listPlans(getUserId(principal)));
    }

    @PostMapping
    public ResponseEntity<PlanSummary> createPlan(
            @RequestBody CreatePlanRequest req, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(planService.createPlan(getUserId(principal), req));
    }

    @GetMapping("/{planId}")
    public ResponseEntity<PlanSummary> getPlan(@PathVariable UUID planId, Principal principal) {
        return ResponseEntity.ok(planService.getPlan(planId, getUserId(principal)));
    }

    @PatchMapping("/{planId}")
    public ResponseEntity<PlanSummary> updatePlan(
            @PathVariable UUID planId, @RequestBody UpdatePlanRequest req, Principal principal) {
        return ResponseEntity.ok(planService.updatePlan(planId, getUserId(principal), req));
    }

    @DeleteMapping("/{planId}")
    public ResponseEntity<Void> deletePlan(@PathVariable UUID planId, Principal principal) {
        planService.deletePlan(planId, getUserId(principal));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{planId}/category-groups")
    public ResponseEntity<List<CategoryGroupWithCategoriesResponse>> listCategoryGroups(
            @PathVariable UUID planId,
            @RequestParam(name = "include_hidden", defaultValue = "false") boolean includeHidden,
            Principal principal) {
        return ResponseEntity.ok(
                categoryService.listCategoryGroups(planId, getUserId(principal), includeHidden));
    }

    @PostMapping("/{planId}/category-groups")
    public ResponseEntity<CategoryGroupResponse> createCategoryGroup(
            @PathVariable UUID planId,
            @RequestBody CreateCategoryGroupRequest req,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createCategoryGroup(planId, getUserId(principal), req));
    }

    @PatchMapping("/{planId}/category-groups/{groupId}")
    public ResponseEntity<CategoryGroupResponse> updateCategoryGroup(
            @PathVariable UUID planId,
            @PathVariable UUID groupId,
            @RequestBody UpdateCategoryGroupRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                categoryService.updateCategoryGroup(planId, groupId, getUserId(principal), req));
    }

    @DeleteMapping("/{planId}/category-groups/{groupId}")
    public ResponseEntity<Void> deleteCategoryGroup(
            @PathVariable UUID planId,
            @PathVariable UUID groupId,
            @RequestParam(name = "reassign_to_category_id", required = false)
                    UUID reassignToCategoryId,
            Principal principal) {
        categoryService.deleteCategoryGroup(
                planId, groupId, getUserId(principal), reassignToCategoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{planId}/categories")
    public ResponseEntity<List<CategoryResponse>> listCategories(
            @PathVariable UUID planId,
            @RequestParam(name = "group_id", required = false) UUID groupId,
            @RequestParam(name = "include_hidden", defaultValue = "false") boolean includeHidden,
            Principal principal) {
        return ResponseEntity.ok(
                categoryService.listCategories(
                        planId, getUserId(principal), groupId, includeHidden));
    }

    @PostMapping("/{planId}/categories")
    public ResponseEntity<CategoryResponse> createCategory(
            @PathVariable UUID planId,
            @RequestBody CreateCategoryRequest req,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createCategory(planId, getUserId(principal), req));
    }

    @GetMapping("/{planId}/categories/{categoryId}")
    public ResponseEntity<CategoryResponse> getCategory(
            @PathVariable UUID planId, @PathVariable UUID categoryId, Principal principal) {
        return ResponseEntity.ok(
                categoryService.getCategory(planId, categoryId, getUserId(principal)));
    }

    @PatchMapping("/{planId}/categories/{categoryId}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable UUID planId,
            @PathVariable UUID categoryId,
            @RequestBody UpdateCategoryRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                categoryService.updateCategory(planId, categoryId, getUserId(principal), req));
    }

    @DeleteMapping("/{planId}/categories/{categoryId}")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable UUID planId,
            @PathVariable UUID categoryId,
            @RequestParam(name = "reassign_to_category_id", required = false)
                    UUID reassignToCategoryId,
            Principal principal) {
        categoryService.deleteCategory(
                planId, categoryId, getUserId(principal), reassignToCategoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{planId}/months/{month}")
    public ResponseEntity<PlanMonthSummary> getPlanMonth(
            @PathVariable UUID planId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month,
            Principal principal) {
        return ResponseEntity.ok(
                monthlyBudgetService.getPlanMonth(planId, getUserId(principal), month));
    }

    @PatchMapping("/{planId}/months/{month}/allocations")
    public ResponseEntity<PlanMonthSummary> updateMonthAllocations(
            @PathVariable UUID planId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month,
            @RequestBody UpdateMonthAllocationsRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                monthlyBudgetService.updateMonthAllocations(
                        planId, getUserId(principal), month, req));
    }
}
