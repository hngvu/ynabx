package com.ynabx.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    public enum AccountType {
        CHECKING,
        SAVINGS,
        CREDIT_CARD,
        CASH
    }

    @Id private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AccountType type;

    @Column(name = "on_budget", nullable = false)
    private boolean onBudget;

    @Column(nullable = false)
    private boolean closed;

    @Column(name = "balance_milliunits", nullable = false)
    private long balanceMilliunits;

    @Column(name = "cleared_balance_milliunits", nullable = false)
    private long clearedBalanceMilliunits;

    @Column(name = "uncleared_balance_milliunits", nullable = false)
    private long unclearedBalanceMilliunits;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "transfer_payee_id")
    private UUID transferPayeeId;

    @Column(name = "last_reconciled_at")
    private Instant lastReconciledAt;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
