package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanServiceTest {

    @Mock private PlanRepository planRepository;
    @Mock private CategoryGroupRepository groupRepository;
    @Mock private CategoryRepository categoryRepository;

    private PlanService planService;
    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        planService = new PlanService(planRepository, groupRepository, categoryRepository);
    }

    @Test
    @DisplayName(
            "createPlan: creates plan and automatically seeds system category groups and inflow category")
    void createPlanSeedsSystemCategories() {
        CreatePlanRequest req =
                new CreatePlanRequest(
                        "Household Plan", "USD", "#,##0.00", true, true, "YYYY-MM-DD");

        PlanSummary summary = planService.createPlan(userId, req);

        assertThat(summary.name()).isEqualTo("Household Plan");
        verify(planRepository).save(any(Plan.class));
        // Verify seeding 2 system groups (Inflow group + Credit Card Payments group)
        verify(groupRepository, org.mockito.Mockito.times(2)).save(any(CategoryGroup.class));
        // Verify seeding 1 inflow category
        verify(categoryRepository, org.mockito.Mockito.times(1)).save(any(Category.class));
    }

    @Test
    @DisplayName(
            "getPlan: throws ResourceNotFoundException if plan is not found or owned by different user")
    void getPlanNotFoundOrUnauthorized() {
        when(planRepository.findByIdAndOwnerUserId(planId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> planService.getPlan(planId, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Plan not found");
    }

    @Test
    @DisplayName("updatePlan: updates non-null fields cleanly")
    void updatePlanSuccess() {
        Plan existing =
                Plan.builder()
                        .id(planId)
                        .ownerUserId(userId)
                        .name("Old Name")
                        .currencyCode("USD")
                        .numberFormat("#,##0.00")
                        .currencySymbolFirst(true)
                        .currencyDisplaySymbol(true)
                        .dateFormat("YYYY-MM-DD")
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
        when(planRepository.findByIdAndOwnerUserId(planId, userId))
                .thenReturn(Optional.of(existing));

        UpdatePlanRequest req = new UpdatePlanRequest("New Name", "EUR", null, null, null, null);
        PlanSummary updated = planService.updatePlan(planId, userId, req);

        assertThat(updated.name()).isEqualTo("New Name");
        assertThat(updated.currency_code()).isEqualTo("EUR");
        assertThat(existing.getName()).isEqualTo("New Name");
        verify(planRepository).save(existing);
    }
}
