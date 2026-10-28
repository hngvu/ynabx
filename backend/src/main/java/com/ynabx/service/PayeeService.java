package com.ynabx.service;

import com.ynabx.dto.CreatePayeeRequest;
import com.ynabx.dto.PayeeResponse;
import com.ynabx.dto.UpdatePayeeRequest;
import com.ynabx.entity.Payee;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.exception.SystemResourceConflictException;
import com.ynabx.repository.PayeeRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayeeService {

    private final PlanService planService;
    private final PayeeRepository payeeRepository;

    public PayeeService(PlanService planService, PayeeRepository payeeRepository) {
        this.planService = planService;
        this.payeeRepository = payeeRepository;
    }

    public List<PayeeResponse> listPayees(UUID planId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        return payeeRepository.findByPlanIdAndDeletedFalseOrderByNameAsc(planId).stream()
                .map(this::toPayeeResponse)
                .toList();
    }

    @Transactional
    public PayeeResponse createPayee(UUID planId, UUID userId, CreatePayeeRequest req) {
        planService.getPlanEntity(planId, userId);
        if (req.name() == null || req.name().isBlank()) {
            throw new DomainValidationException("Payee name is required");
        }
        Instant now = Instant.now();
        Payee payee =
                Payee.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .name(req.name())
                        .transferAccountId(null)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        payeeRepository.save(payee);
        return toPayeeResponse(payee);
    }

    @Transactional
    public PayeeResponse updatePayee(
            UUID planId, UUID payeeId, UUID userId, UpdatePayeeRequest req) {
        planService.getPlanEntity(planId, userId);
        Payee payee =
                payeeRepository
                        .findByIdAndPlanIdAndDeletedFalse(payeeId, planId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Payee not found: " + payeeId));

        if (payee.getTransferAccountId() != null) {
            throw new SystemResourceConflictException(
                    "Transfer payee cannot be updated directly; rename the account instead");
        }
        if (req.name() != null) payee.setName(req.name());
        payee.setUpdatedAt(Instant.now());
        payeeRepository.save(payee);
        return toPayeeResponse(payee);
    }

    @Transactional
    public void deletePayee(UUID planId, UUID payeeId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        Payee payee =
                payeeRepository
                        .findByIdAndPlanIdAndDeletedFalse(payeeId, planId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Payee not found: " + payeeId));

        if (payee.getTransferAccountId() != null) {
            throw new SystemResourceConflictException("Transfer payee cannot be deleted");
        }
        payee.setDeleted(true);
        payee.setUpdatedAt(Instant.now());
        payeeRepository.save(payee);
    }

    private PayeeResponse toPayeeResponse(Payee p) {
        return new PayeeResponse(p.getId(), p.getPlanId(), p.getName(), p.getTransferAccountId());
    }
}
