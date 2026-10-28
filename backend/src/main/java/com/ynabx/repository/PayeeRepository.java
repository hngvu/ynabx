package com.ynabx.repository;

import com.ynabx.entity.Payee;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PayeeRepository extends JpaRepository<Payee, UUID> {
    List<Payee> findByPlanIdAndDeletedFalseOrderByNameAsc(UUID planId);

    Optional<Payee> findByIdAndPlanIdAndDeletedFalse(UUID id, UUID planId);

    Optional<Payee> findByPlanIdAndNameIgnoreCaseAndDeletedFalse(UUID planId, String name);

    Optional<Payee> findByPlanIdAndTransferAccountIdAndDeletedFalse(
            UUID planId, UUID transferAccountId);
}
