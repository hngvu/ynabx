package com.ynabx.service;

import com.ynabx.dto.CategoryGroupResponse;
import com.ynabx.dto.CategoryGroupWithCategoriesResponse;
import com.ynabx.dto.CategoryResponse;
import com.ynabx.dto.CreateCategoryGroupRequest;
import com.ynabx.dto.CreateCategoryRequest;
import com.ynabx.dto.UpdateCategoryGroupRequest;
import com.ynabx.dto.UpdateCategoryRequest;
import com.ynabx.entity.Category;
import com.ynabx.entity.CategoryGroup;
import com.ynabx.entity.MonthlyCategoryAllocation;
import com.ynabx.entity.Transaction;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.exception.SystemResourceConflictException;
import com.ynabx.repository.CategoryGroupRepository;
import com.ynabx.repository.CategoryRepository;
import com.ynabx.repository.MonthlyCategoryAllocationRepository;
import com.ynabx.repository.TransactionRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    private final PlanService planService;
    private final CategoryGroupRepository groupRepository;
    private final CategoryRepository categoryRepository;
    private final MonthlyCategoryAllocationRepository allocationRepository;
    private final TransactionRepository transactionRepository;

    public CategoryService(
            PlanService planService,
            CategoryGroupRepository groupRepository,
            CategoryRepository categoryRepository,
            MonthlyCategoryAllocationRepository allocationRepository,
            TransactionRepository transactionRepository) {
        this.planService = planService;
        this.groupRepository = groupRepository;
        this.categoryRepository = categoryRepository;
        this.allocationRepository = allocationRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<CategoryGroupWithCategoriesResponse> listCategoryGroups(
            UUID planId, UUID userId, boolean includeHidden) {
        planService.getPlanEntity(planId, userId);
        List<CategoryGroup> groups =
                includeHidden
                        ? groupRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(planId)
                        : groupRepository
                                .findByPlanIdAndDeletedFalseAndHiddenFalseOrderBySortOrderAsc(
                                        planId);

        return groups.stream()
                .map(
                        g -> {
                            List<Category> categories =
                                    includeHidden
                                            ? categoryRepository
                                                    .findByPlanIdAndGroupIdAndDeletedFalseOrderBySortOrderAsc(
                                                            planId, g.getId())
                                            : categoryRepository
                                                    .findByPlanIdAndGroupIdAndDeletedFalseAndHiddenFalseOrderBySortOrderAsc(
                                                            planId, g.getId());
                            return new CategoryGroupWithCategoriesResponse(
                                    g.getId(),
                                    g.getPlanId(),
                                    g.getName(),
                                    g.isSystem(),
                                    g.isHidden(),
                                    g.getSortOrder(),
                                    categories.stream().map(this::toCategoryResponse).toList());
                        })
                .toList();
    }

    @Transactional
    public CategoryGroupResponse createCategoryGroup(
            UUID planId, UUID userId, CreateCategoryGroupRequest req) {
        planService.getPlanEntity(planId, userId);
        if (req.name() == null || req.name().isBlank()) {
            throw new DomainValidationException("Category group name is required");
        }
        Instant now = Instant.now();
        CategoryGroup group =
                CategoryGroup.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .name(req.name())
                        .system(false)
                        .hidden(false)
                        .sortOrder(req.sort_order() != null ? req.sort_order() : 0)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        groupRepository.save(group);
        return toGroupResponse(group);
    }

    @Transactional
    public CategoryGroupResponse updateCategoryGroup(
            UUID planId, UUID groupId, UUID userId, UpdateCategoryGroupRequest req) {
        planService.getPlanEntity(planId, userId);
        CategoryGroup group =
                groupRepository
                        .findByIdAndPlanIdAndDeletedFalse(groupId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Category group not found: " + groupId));

        if (group.isSystem()) {
            throw new SystemResourceConflictException("System category group cannot be modified");
        }
        if (req.name() != null) group.setName(req.name());
        if (req.hidden() != null) group.setHidden(req.hidden());
        if (req.sort_order() != null) group.setSortOrder(req.sort_order());
        group.setUpdatedAt(Instant.now());
        groupRepository.save(group);
        return toGroupResponse(group);
    }

    @Transactional
    public void deleteCategoryGroup(
            UUID planId, UUID groupId, UUID userId, UUID reassignToCategoryId) {
        planService.getPlanEntity(planId, userId);
        CategoryGroup group =
                groupRepository
                        .findByIdAndPlanIdAndDeletedFalse(groupId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Category group not found: " + groupId));

        if (group.isSystem()) {
            throw new SystemResourceConflictException("System category group cannot be deleted");
        }

        List<Category> childCategories = categoryRepository.findByGroupIdAndDeletedFalse(groupId);
        for (Category cat : childCategories) {
            deleteCategory(planId, cat.getId(), userId, reassignToCategoryId);
        }

        group.setDeleted(true);
        group.setUpdatedAt(Instant.now());
        groupRepository.save(group);
    }

    public List<CategoryResponse> listCategories(
            UUID planId, UUID userId, UUID groupId, boolean includeHidden) {
        planService.getPlanEntity(planId, userId);
        List<Category> categories;
        if (groupId != null) {
            categories =
                    includeHidden
                            ? categoryRepository
                                    .findByPlanIdAndGroupIdAndDeletedFalseOrderBySortOrderAsc(
                                            planId, groupId)
                            : categoryRepository
                                    .findByPlanIdAndGroupIdAndDeletedFalseAndHiddenFalseOrderBySortOrderAsc(
                                            planId, groupId);
        } else {
            categories =
                    includeHidden
                            ? categoryRepository.findByPlanIdAndDeletedFalseOrderBySortOrderAsc(
                                    planId)
                            : categoryRepository
                                    .findByPlanIdAndDeletedFalseAndHiddenFalseOrderBySortOrderAsc(
                                            planId);
        }
        return categories.stream().map(this::toCategoryResponse).toList();
    }

    public CategoryResponse getCategory(UUID planId, UUID categoryId, UUID userId) {
        planService.getPlanEntity(planId, userId);
        Category cat =
                categoryRepository
                        .findByIdAndPlanIdAndDeletedFalse(categoryId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Category not found: " + categoryId));
        return toCategoryResponse(cat);
    }

    @Transactional
    public CategoryResponse createCategory(UUID planId, UUID userId, CreateCategoryRequest req) {
        planService.getPlanEntity(planId, userId);
        if (req.name() == null || req.name().isBlank()) {
            throw new DomainValidationException("Category name is required");
        }
        CategoryGroup group =
                groupRepository
                        .findByIdAndPlanIdAndDeletedFalse(req.group_id(), planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Category group not found: " + req.group_id()));

        if (group.isSystem()) {
            throw new SystemResourceConflictException(
                    "Cannot create categories inside a system category group");
        }

        Instant now = Instant.now();
        Category cat =
                Category.builder()
                        .id(UUID.randomUUID())
                        .planId(planId)
                        .groupId(group.getId())
                        .name(req.name())
                        .note(req.note())
                        .inflowCategory(false)
                        .creditCardPayment(false)
                        .hidden(false)
                        .sortOrder(req.sort_order() != null ? req.sort_order() : 0)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        categoryRepository.save(cat);
        return toCategoryResponse(cat);
    }

    @Transactional
    public CategoryResponse updateCategory(
            UUID planId, UUID categoryId, UUID userId, UpdateCategoryRequest req) {
        planService.getPlanEntity(planId, userId);
        Category cat =
                categoryRepository
                        .findByIdAndPlanIdAndDeletedFalse(categoryId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Category not found: " + categoryId));

        if (cat.isInflowCategory() || cat.isCreditCardPayment()) {
            throw new SystemResourceConflictException("System category cannot be modified");
        }

        if (req.group_id() != null) {
            CategoryGroup newGroup =
                    groupRepository
                            .findByIdAndPlanIdAndDeletedFalse(req.group_id(), planId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Target category group not found: "
                                                            + req.group_id()));
            if (newGroup.isSystem()) {
                throw new SystemResourceConflictException(
                        "Cannot move category into a system group");
            }
            cat.setGroupId(newGroup.getId());
        }

        if (req.name() != null) cat.setName(req.name());
        if (req.note() != null) cat.setNote(req.note());
        if (req.hidden() != null) cat.setHidden(req.hidden());
        if (req.sort_order() != null) cat.setSortOrder(req.sort_order());
        cat.setUpdatedAt(Instant.now());
        categoryRepository.save(cat);
        return toCategoryResponse(cat);
    }

    @Transactional
    public void deleteCategory(
            UUID planId, UUID categoryId, UUID userId, UUID reassignToCategoryId) {
        planService.getPlanEntity(planId, userId);
        Category cat =
                categoryRepository
                        .findByIdAndPlanIdAndDeletedFalse(categoryId, planId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Category not found: " + categoryId));

        if (cat.isInflowCategory() || cat.isCreditCardPayment()) {
            throw new SystemResourceConflictException("System category cannot be deleted");
        }

        boolean hasAllocations =
                allocationRepository.existsByCategoryIdAndAssignedMilliunitsNot(categoryId, 0L);
        boolean hasTransactions =
                transactionRepository.existsByCategoryIdAndDeletedFalse(categoryId);

        if (hasAllocations || hasTransactions) {
            if (reassignToCategoryId == null) {
                throw new SystemResourceConflictException(
                        "Category holds assigned money or transactions; reassign_to_category_id is required");
            }
            if (reassignToCategoryId.equals(categoryId)) {
                throw new DomainValidationException(
                        "reassign_to_category_id cannot be the same category");
            }

            Category target =
                    categoryRepository
                            .findByIdAndPlanIdAndDeletedFalse(reassignToCategoryId, planId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Reassignment target category not found: "
                                                            + reassignToCategoryId));
            if (target.isInflowCategory()) {
                throw new SystemResourceConflictException(
                        "Cannot reassign funds to an inflow category");
            }

            List<Transaction> transactions =
                    transactionRepository.findByCategoryIdAndDeletedFalse(categoryId);
            for (Transaction tx : transactions) {
                tx.setCategoryId(target.getId());
                tx.setUpdatedAt(Instant.now());
                transactionRepository.save(tx);
            }

            List<MonthlyCategoryAllocation> allocations =
                    allocationRepository.findByCategoryId(categoryId);
            for (MonthlyCategoryAllocation alloc : allocations) {
                allocationRepository
                        .findByPlanIdAndCategoryIdAndMonth(planId, target.getId(), alloc.getMonth())
                        .ifPresentOrElse(
                                targetAlloc -> {
                                    targetAlloc.setAssignedMilliunits(
                                            targetAlloc.getAssignedMilliunits()
                                                    + alloc.getAssignedMilliunits());
                                    targetAlloc.setUpdatedAt(Instant.now());
                                    allocationRepository.save(targetAlloc);
                                    allocationRepository.delete(alloc);
                                },
                                () -> {
                                    alloc.setCategoryId(target.getId());
                                    alloc.setUpdatedAt(Instant.now());
                                    allocationRepository.save(alloc);
                                });
            }
        }

        cat.setDeleted(true);
        cat.setUpdatedAt(Instant.now());
        categoryRepository.save(cat);
    }

    private CategoryResponse toCategoryResponse(Category cat) {
        return new CategoryResponse(
                cat.getId(),
                cat.getPlanId(),
                cat.getGroupId(),
                cat.getName(),
                cat.getNote(),
                cat.isInflowCategory(),
                cat.isCreditCardPayment(),
                cat.getCreditCardAccountId(),
                cat.isHidden(),
                cat.getSortOrder());
    }

    private CategoryGroupResponse toGroupResponse(CategoryGroup group) {
        return new CategoryGroupResponse(
                group.getId(),
                group.getPlanId(),
                group.getName(),
                group.isSystem(),
                group.isHidden(),
                group.getSortOrder());
    }
}
