package com.ynabx.entity;

import com.ynabx.util.RecurrenceCalculator.Frequency;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "scheduled_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledTransaction {

    @Id private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "payee_id")
    private UUID payeeId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "transfer_account_id")
    private UUID transferAccountId;

    @Column(name = "amount_milliunits", nullable = false)
    private long amountMilliunits;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Frequency frequency;

    @Column(name = "date_first", nullable = false)
    private LocalDate dateFirst;

    @Column(name = "date_next", nullable = false)
    private LocalDate dateNext;

    @Column(name = "occurrence_index", nullable = false)
    private int occurrenceIndex;

    @Column(nullable = false)
    private boolean deleted;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
