package com.ynabx.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    public enum ClearedStatus {
        UNCLEARED,
        CLEARED,
        RECONCILED
    }

    @Id private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "payee_id")
    private UUID payeeId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "amount_milliunits", nullable = false)
    private long amountMilliunits;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ClearedStatus cleared;

    @Column(nullable = false)
    private boolean approved;

    @Column(name = "transfer_account_id")
    private UUID transferAccountId;

    @Column(name = "transfer_transaction_id")
    private UUID transferTransactionId;

    @Column(nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
