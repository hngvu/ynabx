package com.ynabx.repository;

import com.ynabx.entity.Transaction;
import com.ynabx.repository.projection.CategorySpendingRow;
import com.ynabx.repository.projection.LargestOutflowRow;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class ReportTransactionRepositoryImpl implements ReportTransactionRepository {

    @PersistenceContext private EntityManager em;

    @Override
    public List<CategorySpendingRow> aggregateSpendingByCategory(
            UUID planId,
            LocalDate sinceDate,
            LocalDate untilExclusive,
            Collection<UUID> eligibleCategoryIds,
            Collection<UUID> accountIdsFilter) {
        if (eligibleCategoryIds == null || eligibleCategoryIds.isEmpty()) {
            return List.of();
        }

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<CategorySpendingRow> query = cb.createQuery(CategorySpendingRow.class);
        Root<Transaction> root = query.from(Transaction.class);

        List<Predicate> predicates =
                buildCommonPredicates(
                        cb,
                        root,
                        planId,
                        sinceDate,
                        untilExclusive,
                        eligibleCategoryIds,
                        accountIdsFilter);

        query.where(predicates.toArray(new Predicate[0]));
        query.groupBy(root.get("categoryId"));
        query.select(
                cb.construct(
                        CategorySpendingRow.class,
                        root.get("categoryId"),
                        cb.sum(root.get("amountMilliunits")),
                        cb.count(root)));

        return em.createQuery(query).getResultList();
    }

    @Override
    public Optional<LargestOutflowRow> findLargestOutflow(
            UUID planId,
            LocalDate sinceDate,
            LocalDate untilExclusive,
            Collection<UUID> eligibleCategoryIds,
            Collection<UUID> accountIdsFilter) {
        if (eligibleCategoryIds == null || eligibleCategoryIds.isEmpty()) {
            return Optional.empty();
        }

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<LargestOutflowRow> query = cb.createQuery(LargestOutflowRow.class);
        Root<Transaction> root = query.from(Transaction.class);

        List<Predicate> predicates =
                buildCommonPredicates(
                        cb,
                        root,
                        planId,
                        sinceDate,
                        untilExclusive,
                        eligibleCategoryIds,
                        accountIdsFilter);
        predicates.add(cb.lessThan(root.get("amountMilliunits"), 0L));

        query.where(predicates.toArray(new Predicate[0]));
        // Order by amount ASC (most negative outflow), then date DESC, id ASC for stable results
        query.orderBy(
                cb.asc(root.get("amountMilliunits")),
                cb.desc(root.get("date")),
                cb.asc(root.get("id")));
        query.select(
                cb.construct(
                        LargestOutflowRow.class,
                        root.get("id"),
                        root.get("date"),
                        root.get("payeeId"),
                        root.get("categoryId"),
                        root.get("amountMilliunits")));

        List<LargestOutflowRow> rows = em.createQuery(query).setMaxResults(1).getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    private List<Predicate> buildCommonPredicates(
            CriteriaBuilder cb,
            Root<Transaction> root,
            UUID planId,
            LocalDate sinceDate,
            LocalDate untilExclusive,
            Collection<UUID> eligibleCategoryIds,
            Collection<UUID> accountIdsFilter) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("planId"), planId));
        predicates.add(cb.isFalse(root.get("deleted")));
        predicates.add(cb.greaterThanOrEqualTo(root.get("date"), sinceDate));
        predicates.add(cb.lessThan(root.get("date"), untilExclusive));
        predicates.add(root.get("categoryId").in(eligibleCategoryIds));

        if (accountIdsFilter != null) {
            predicates.add(root.get("accountId").in(accountIdsFilter));
        }
        return predicates;
    }
}
