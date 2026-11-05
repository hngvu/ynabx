package com.ynabx.service;

import com.ynabx.dto.MaterializeResultResponse;
import com.ynabx.repository.ScheduledTransactionRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ScheduledTransactionMaterializer {

    public static final int MAX_OCCURRENCES_PER_RUN = 400;

    private final PlanService planService;
    private final ScheduledTransactionRepository scheduledTransactionRepository;
    private final ScheduledOccurrenceProcessor occurrenceProcessor;

    public ScheduledTransactionMaterializer(
            PlanService planService,
            ScheduledTransactionRepository scheduledTransactionRepository,
            ScheduledOccurrenceProcessor occurrenceProcessor) {
        this.planService = planService;
        this.scheduledTransactionRepository = scheduledTransactionRepository;
        this.occurrenceProcessor = occurrenceProcessor;
    }

    public MaterializeResultResponse materializeDue(UUID planId, UUID userId, LocalDate today) {
        planService.getPlanEntity(planId, userId);

        int materializedCount = 0;
        int skippedCount = 0;
        int totalProcessed = 0;

        List<UUID> dueIds = scheduledTransactionRepository.findDueIds(planId, today);

        for (UUID schedId : dueIds) {
            while (totalProcessed < MAX_OCCURRENCES_PER_RUN) {
                ScheduledOccurrenceProcessor.ProcessStatus status =
                        occurrenceProcessor.processNext(schedId, today);
                if (status == ScheduledOccurrenceProcessor.ProcessStatus.NOT_DUE) {
                    break;
                }
                totalProcessed++;
                if (status == ScheduledOccurrenceProcessor.ProcessStatus.CREATED) {
                    materializedCount++;
                } else if (status == ScheduledOccurrenceProcessor.ProcessStatus.SKIPPED) {
                    skippedCount++;
                }
            }

            if (totalProcessed >= MAX_OCCURRENCES_PER_RUN) {
                break;
            }
        }

        boolean hasMore = !scheduledTransactionRepository.findDueIds(planId, today).isEmpty();

        return new MaterializeResultResponse(materializedCount, skippedCount, hasMore);
    }
}
