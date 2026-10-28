package com.ynabx.repository;

import com.ynabx.entity.Account;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {
    List<Account> findByPlanIdAndDeletedFalseOrderBySortOrderAsc(UUID planId);

    List<Account> findByPlanIdAndDeletedFalseAndClosedFalseOrderBySortOrderAsc(UUID planId);

    Optional<Account> findByIdAndPlanIdAndDeletedFalse(UUID id, UUID planId);
}
