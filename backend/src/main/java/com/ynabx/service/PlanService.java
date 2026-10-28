package com.ynabx.service;

import com.ynabx.dto.CreatePlanRequest;
import com.ynabx.dto.PlanSummary;
import com.ynabx.dto.UpdatePlanRequest;
import com.ynabx.entity.Category;
import com.ynabx.entity.CategoryGroup;
import com.ynabx.entity.Plan;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.repository.CategoryGroupRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.PlanRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlanService {

    private final PlanRepository planRepository;
    private final CategoryGroupRepository groupRepository;
    private final CategoryRepository categoryRepository;

    public PlanService(
            PlanRepository planRepository,
            CategoryGroupRepository groupRepository,
            CategoryRepository categoryRepository) {
        this.planRepository = planRepository;
        this.groupRepository = groupRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<PlanSummary> listPlans(UUID userId) {
        return planRepository.findByOwnerUserId(userId).stream().map(this::toSummary).toList();
    }

    public Plan getPlanEntity(UUID planId, UUID userId) {
        return planRepository
                .findByIdAndOwnerUserId(planId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Plan not found: " + planId));
    }

    public PlanSummary getPlan(UUID planId, UUID userId) {
        return toSummary(getPlanEntity(planId, userId));
    }

    @Transactional
    public PlanSummary createPlan(UUID userId, CreatePlanRequest req) {
        Instant now = Instant.now();
        UUID planId = UUID.randomUUID();

        Plan plan =
                Plan.builder()
                        .id(planId)
                        .ownerUserId(userId)
                        .name(req.name() != null ? req.name() : "My Spending Plan")
                        .currencyCode(req.currency_code() != null ? req.currency_code() : "USD")
                        .numberFormat(
                                req.number_format() != null ? req.number_format() : "#,##0.00")
                        .currencySymbolFirst(
                                req.currency_symbol_first() != null
                                        ? req.currency_symbol_first()
                                        : true)
                        .currencyDisplaySymbol(
                                req.currency_display_symbol() != null
                                        ? req.currency_display_symbol()
                                        : true)
                        .dateFormat(req.date_format() != null ? req.date_format() : "YYYY-MM-DD")
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        planRepository.save(plan);

        UUID inflowGroupId = UUID.randomUUID();
        CategoryGroup inflowGroup =
                CategoryGroup.builder()
                        .id(inflowGroupId)
                        .planId(planId)
                        .name("Internal Master Category")
                        .system(true)
                        .hidden(false)
                        .sortOrder(0)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        groupRepository.save(inflowGroup);

        Category inflowCategory =
                Category.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .groupId(inflowGroupId)
                        .name("Inflow: Ready to Assign")
                        .note("System Inflow Envelope")
                        .inflowCategory(true)
                        .creditCardPayment(false)
                        .hidden(false)
                        .sortOrder(0)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        categoryRepository.save(inflowCategory);

        UUID ccPaymentsGroupId = UUID.randomUUID();
        CategoryGroup ccGroup =
                CategoryGroup.builder()
                        .id(ccPaymentsGroupId)
                        .planId(planId)
                        .name("Credit Card Payments")
                        .system(true)
                        .hidden(false)
                        .sortOrder(1)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        groupRepository.save(ccGroup);

        return toSummary(plan);
    }

    @Transactional
    public PlanSummary updatePlan(UUID planId, UUID userId, UpdatePlanRequest req) {
        Plan plan = getPlanEntity(planId, userId);
        if (req.name() != null) plan.setName(req.name());
        if (req.currency_code() != null) plan.setCurrencyCode(req.currency_code());
        if (req.number_format() != null) plan.setNumberFormat(req.number_format());
        if (req.currency_symbol_first() != null)
            plan.setCurrencySymbolFirst(req.currency_symbol_first());
        if (req.currency_display_symbol() != null)
            plan.setCurrencyDisplaySymbol(req.currency_display_symbol());
        if (req.date_format() != null) plan.setDateFormat(req.date_format());
        plan.setUpdatedAt(Instant.now());
        planRepository.save(plan);
        return toSummary(plan);
    }

    @Transactional
    public void deletePlan(UUID planId, UUID userId) {
        Plan plan = getPlanEntity(planId, userId);
        planRepository.delete(plan);
    }

    private PlanSummary toSummary(Plan plan) {
        return new PlanSummary(
                plan.getId(),
                plan.getOwnerUserId(),
                plan.getName(),
                plan.getCurrencyCode(),
                plan.getNumberFormat(),
                plan.isCurrencySymbolFirst(),
                plan.isCurrencyDisplaySymbol(),
                plan.getDateFormat(),
                plan.getCreatedAt(),
                plan.getUpdatedAt());
    }
}
