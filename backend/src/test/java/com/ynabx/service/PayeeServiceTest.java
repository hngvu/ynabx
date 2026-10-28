package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ynabx.dto.CreatePayeeRequest;
import com.ynabx.dto.PayeeResponse;
import com.ynabx.dto.UpdatePayeeRequest;
import com.ynabx.entity.Payee;
import com.ynabx.entity.Plan;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.exception.SystemResourceConflictException;
import com.ynabx.repository.PayeeRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PayeeServiceTest {

    @Mock private PlanService planService;
    @Mock private PayeeRepository payeeRepository;

    private PayeeService payeeService;
    private final UUID userId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID payeeId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        payeeService = new PayeeService(planService, payeeRepository);
    }

    @Test
    @DisplayName("listPayees: returns payees for the plan")
    void testListPayeesSuccess() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        Payee payee =
                Payee.builder()
                        .id(payeeId)
                        .planId(planId)
                        .name("Target")
                        .transferAccountId(null)
                        .deleted(false)
                        .build();
        when(payeeRepository.findByPlanIdAndDeletedFalseOrderByNameAsc(planId))
                .thenReturn(List.of(payee));

        List<PayeeResponse> payees = payeeService.listPayees(planId, userId);

        assertThat(payees).hasSize(1);
        assertThat(payees.get(0).name()).isEqualTo("Target");
        assertThat(payees.get(0).id()).isEqualTo(payeeId);
    }

    @Test
    @DisplayName("createPayee: creates and persists standard payee")
    void testCreatePayeeSuccess() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        CreatePayeeRequest req = new CreatePayeeRequest("Costco");
        PayeeResponse resp = payeeService.createPayee(planId, userId, req);

        assertThat(resp).isNotNull();
        assertThat(resp.name()).isEqualTo("Costco");
        assertThat(resp.transferAccountId()).isNull();
        verify(payeeRepository).save(any(Payee.class));
    }

    @Test
    @DisplayName("createPayee: throws DomainValidationException when name is blank")
    void testCreatePayeeBlankNameThrows() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        CreatePayeeRequest req = new CreatePayeeRequest("   ");

        assertThatThrownBy(() -> payeeService.createPayee(planId, userId, req))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("Payee name is required");
    }

    @Test
    @DisplayName("updatePayee: updates name of normal payee")
    void testUpdatePayeeSuccess() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        Payee payee =
                Payee.builder()
                        .id(payeeId)
                        .planId(planId)
                        .name("Old Name")
                        .transferAccountId(null)
                        .deleted(false)
                        .build();
        when(payeeRepository.findByIdAndPlanIdAndDeletedFalse(payeeId, planId))
                .thenReturn(Optional.of(payee));

        UpdatePayeeRequest req = new UpdatePayeeRequest("New Name");
        PayeeResponse resp = payeeService.updatePayee(planId, payeeId, userId, req);

        assertThat(resp.name()).isEqualTo("New Name");
        verify(payeeRepository).save(payee);
    }

    @Test
    @DisplayName("updatePayee: throws SystemResourceConflictException for transfer payee")
    void testUpdateTransferPayeeThrows() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        Payee transferPayee =
                Payee.builder()
                        .id(payeeId)
                        .planId(planId)
                        .name("Transfer : Savings")
                        .transferAccountId(UUID.randomUUID())
                        .deleted(false)
                        .build();
        when(payeeRepository.findByIdAndPlanIdAndDeletedFalse(payeeId, planId))
                .thenReturn(Optional.of(transferPayee));

        UpdatePayeeRequest req = new UpdatePayeeRequest("Illegal Rename");

        assertThatThrownBy(() -> payeeService.updatePayee(planId, payeeId, userId, req))
                .isInstanceOf(SystemResourceConflictException.class)
                .hasMessageContaining("Transfer payee cannot be updated directly");
    }

    @Test
    @DisplayName("deletePayee: soft-deletes standard payee")
    void testDeletePayeeSuccess() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        Payee payee =
                Payee.builder()
                        .id(payeeId)
                        .planId(planId)
                        .name("Coffee Shop")
                        .transferAccountId(null)
                        .deleted(false)
                        .build();
        when(payeeRepository.findByIdAndPlanIdAndDeletedFalse(payeeId, planId))
                .thenReturn(Optional.of(payee));

        payeeService.deletePayee(planId, payeeId, userId);

        assertThat(payee.isDeleted()).isTrue();
        verify(payeeRepository).save(payee);
    }

    @Test
    @DisplayName("deletePayee: throws SystemResourceConflictException for transfer payee")
    void testDeleteTransferPayeeThrows() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        Payee transferPayee =
                Payee.builder()
                        .id(payeeId)
                        .planId(planId)
                        .name("Transfer : Checking")
                        .transferAccountId(UUID.randomUUID())
                        .deleted(false)
                        .build();
        when(payeeRepository.findByIdAndPlanIdAndDeletedFalse(payeeId, planId))
                .thenReturn(Optional.of(transferPayee));

        assertThatThrownBy(() -> payeeService.deletePayee(planId, payeeId, userId))
                .isInstanceOf(SystemResourceConflictException.class)
                .hasMessageContaining("Transfer payee cannot be deleted");
    }

    @Test
    @DisplayName("deletePayee: throws ResourceNotFoundException if payee not found")
    void testDeletePayeeNotFoundThrows() {
        Plan plan = Plan.builder().id(planId).userId(userId).build();
        when(planService.getPlanEntity(planId, userId)).thenReturn(plan);

        when(payeeRepository.findByIdAndPlanIdAndDeletedFalse(payeeId, planId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> payeeService.deletePayee(planId, payeeId, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Payee not found");
    }
}
