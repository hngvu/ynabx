package com.ynabx.repository;

import com.ynabx.entity.ScheduledTransaction;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ScheduledTransactionRepository extends JpaRepository<ScheduledTransaction, UUID> {

    List<ScheduledTransaction> findByPlanIdAndDeletedFalseOrderByDateNextAscIdAsc(UUID planId);

    Optional<ScheduledTransaction> findByIdAndPlanIdAndDeletedFalse(UUID id, UUID planId);

    boolean existsByCategoryIdAndDeletedFalse(UUID categoryId);

    List<ScheduledTransaction> findByCategoryIdAndDeletedFalse(UUID categoryId);

    List<ScheduledTransaction> findByAccountIdAndDeletedFalse(UUID accountId);

    List<ScheduledTransaction> findByTransferAccountIdAndDeletedFalse(UUID transferAccountId);

    @Query(
            "SELECT s.id FROM ScheduledTransaction s WHERE s.planId = :planId "
                    + "AND s.deleted = false AND s.dateNext <= :today "
                    + "ORDER BY s.dateNext ASC, s.id ASC")
    List<UUID> findDueIds(@Param("planId") UUID planId, @Param("today") LocalDate today);
}
