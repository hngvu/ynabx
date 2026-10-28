package com.ynabx.repository;

import com.ynabx.entity.Plan;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlanRepository extends JpaRepository<Plan, UUID> {
    List<Plan> findByOwnerUserId(UUID ownerUserId);

    Optional<Plan> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);
}
