package com.ynabx.repository;

import com.ynabx.entity.Transaction;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByPlanIdAndDeletedFalseOrderByDateDescIdDesc(UUID planId);

    Optional<Transaction> findByIdAndPlanIdAndDeletedFalse(UUID id, UUID planId);

    List<Transaction> findByAccountIdAndDeletedFalse(UUID accountId);

    List<Transaction> findByCategoryIdAndDeletedFalse(UUID categoryId);

    boolean existsByAccountIdAndDeletedFalse(UUID accountId);

    boolean existsByCategoryIdAndDeletedFalse(UUID categoryId);

    List<Transaction> findByAccountIdAndCleared(UUID accountId, Transaction.ClearedStatus cleared);

    @Query(
            "SELECT t FROM Transaction t WHERE t.planId = :planId AND t.deleted = false "
                    + "AND (:accountId IS NULL OR t.accountId = :accountId) "
                    + "AND (:categoryId IS NULL OR t.categoryId = :categoryId) "
                    + "AND (:payeeId IS NULL OR t.payeeId = :payeeId) "
                    + "AND (:sinceDate IS NULL OR t.date >= :sinceDate) "
                    + "AND (:untilDate IS NULL OR t.date <= :untilDate) "
                    + "ORDER BY t.date DESC, t.id DESC")
    List<Transaction> findFiltered(
            @Param("planId") UUID planId,
            @Param("accountId") UUID accountId,
            @Param("categoryId") UUID categoryId,
            @Param("payeeId") UUID payeeId,
            @Param("sinceDate") LocalDate sinceDate,
            @Param("untilDate") LocalDate untilDate,
            Pageable pageable);

    @Query(
            "SELECT t FROM Transaction t WHERE t.planId = :planId AND t.deleted = false AND t.date <= :maxDate")
    List<Transaction> findForPlanUpToDate(
            @Param("planId") UUID planId, @Param("maxDate") LocalDate maxDate);
}
