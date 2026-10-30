import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router";
import type {
  Account,
  Category,
  CategoryMonthAllocation,
  Transaction,
} from "./api/types";
import { AccountRegister } from "./components/AccountRegister";
import { AuthScreen } from "./components/AuthScreen";
import { BudgetInspector } from "./components/BudgetInspector";
import { BudgetWorkspace } from "./components/BudgetWorkspace";
import { AddAccountModal } from "./components/modals/AddAccountModal";
import { DeleteCategoryModal } from "./components/modals/DeleteCategoryModal";
import { MoveMoneyModal } from "./components/modals/MoveMoneyModal";
import { ReconcileModal } from "./components/modals/ReconcileModal";
import { GuideView } from "./components/GuideView";
import { ReflectView } from "./components/ReflectView";
import { Sidebar, type ActiveView } from "./components/Sidebar";
import { AppProvider, useApp } from "./context/AppContext";
import { useTheme } from "./hooks/useUiOnlyFeatures";
import { formatMilliunits, parseInputToMilliunits } from "./utils/currency";

export { formatMilliunits, parseInputToMilliunits };

interface DeleteTargetState {
  kind: "category" | "group";
  id: string;
  name: string;
  deletedCategoryIds: string[];
}

export function parseYnabRoute(
  pathname: string,
  availablePlanIds: string[],
): {
  planId?: string;
  view: ActiveView;
  monthIso?: string;
} {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/guide" || clean.startsWith("/guide/")) {
    return { view: { type: "guide" } };
  }

  // Regex for YNAB route: /:planId/budget/:month, /:planId/reports, /:planId/accounts, /:planId/accounts/:accountId
  const parts = clean.split("/").filter(Boolean);
  if (parts.length >= 1) {
    const candidatePlanId = parts[0];
    const isPlan =
      candidatePlanId &&
      (availablePlanIds.includes(candidatePlanId) ||
        (candidatePlanId !== "accounts" &&
          candidatePlanId !== "reflect" &&
          candidatePlanId !== "reports" &&
          candidatePlanId !== "guide" &&
          candidatePlanId !== "plan" &&
          candidatePlanId !== "budget"));
    if (isPlan) {
      if (parts.length === 1) {
        return { planId: candidatePlanId, view: { type: "budget" } };
      }
      const section = parts[1];
      const subParam = parts[2];
      if (section === "budget") {
        let monthIso: string | undefined;
        if (subParam && /^\d{6}$/.test(subParam)) {
          // format: YYYYMM -> YYYY-MM-01
          monthIso = `${subParam.slice(0, 4)}-${subParam.slice(4, 6)}-01`;
        } else if (subParam && /^\d{4}-\d{2}(-\d{2})?$/.test(subParam)) {
          monthIso = subParam.length === 7 ? `${subParam}-01` : subParam;
        }
        return { planId: candidatePlanId, view: { type: "budget" }, monthIso };
      }
      if (section === "reports" || section === "reflect") {
        return { planId: candidatePlanId, view: { type: "reflect" } };
      }
      if (section === "accounts") {
        if (subParam) {
          return {
            planId: candidatePlanId,
            view: { type: "account", accountId: decodeURIComponent(subParam) },
          };
        }
        return { planId: candidatePlanId, view: { type: "all-accounts" } };
      }
    }
  }

  // Fallbacks for short paths: /reflect, /accounts, /plan
  if (clean === "/reflect") return { view: { type: "reflect" } };
  if (clean === "/accounts") return { view: { type: "all-accounts" } };
  if (clean.startsWith("/accounts/")) {
    const accId = decodeURIComponent(clean.slice("/accounts/".length).split("/")[0] || "");
    return accId
      ? { view: { type: "account", accountId: accId } }
      : { view: { type: "all-accounts" } };
  }
  if (clean.startsWith("/plan/") || clean.startsWith("/budget/")) {
    const seg = clean.split("/")[2] || "";
    if (/^\d{4}-\d{2}(-\d{2})?$/.test(seg)) {
      const monthIso = seg.length === 7 ? `${seg}-01` : seg;
      return { view: { type: "budget" }, monthIso };
    }
    return { view: { type: "budget" } };
  }

  return { view: { type: "budget" } };
}

export function buildYnabPath(
  planId: string,
  view: ActiveView,
  currentMonth: string,
): string {
  if (view.type === "guide") return "/guide";
  const ym = (currentMonth || "").slice(0, 7).replace("-", ""); // e.g. 202610
  if (view.type === "budget") return `/${planId}/budget/${ym || "202610"}`;
  if (view.type === "reflect") return `/${planId}/reports`;
  if (view.type === "all-accounts") return `/${planId}/accounts`;
  if (view.type === "account") {
    return `/${planId}/accounts/${encodeURIComponent(view.accountId)}`;
  }
  return `/${planId}/budget/${ym || "202610"}`;
}

function YnabxShell() {
  const {
    user,
    authLoading,
    sessionExpiredMessage,
    plans,
    activePlan,
    currentMonth,
    monthSummary,
    categoryGroups,
    accounts,
    payees,
    errorBanner,
    clearErrorBanner,
    login,
    register,
    logout,
    selectPlan,
    createPlan,
    updatePlan,
    deletePlan,
    setCurrentMonth,
    updateAllocations,
    createCategoryGroup,
    updateCategoryGroup,
    deleteCategoryGroup,
    createCategory,
    updateCategory,
    deleteCategory,
    createAccount,
    updateAccount,
    deleteAccount,
    reconcileAccount,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    unreconcileTransaction,
    client,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();

  const { theme, toggleTheme } = useTheme();

  const availablePlanIds = useMemo(() => plans.map((p) => p.id), [plans]);

  // Derive activeView directly from URL (single source of truth - zero lag & no cascade)
  const routeInfo = useMemo(() => {
    return parseYnabRoute(location.pathname, availablePlanIds);
  }, [location.pathname, availablePlanIds]);

  const activeView = routeInfo.view;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [targetVersion, setTargetVersion] = useState(0);

  // Sync plan and month from URL if present
  useEffect(() => {
    if (!user || authLoading) return;

    if (
      routeInfo.planId &&
      activePlan &&
      routeInfo.planId !== activePlan.id &&
      availablePlanIds.includes(routeInfo.planId)
    ) {
      selectPlan(routeInfo.planId);
    }

    if (routeInfo.monthIso && routeInfo.monthIso !== currentMonth) {
      setCurrentMonth(routeInfo.monthIso);
    }
  }, [
    user,
    authLoading,
    routeInfo.planId,
    routeInfo.monthIso,
    activePlan,
    availablePlanIds,
    selectPlan,
    currentMonth,
    setCurrentMonth,
  ]);

  // Navigate when user selects a view via UI
  const handleSelectView = useCallback(
    (view: ActiveView) => {
      if (activePlan) {
        const nextPath = buildYnabPath(activePlan.id, view, currentMonth);
        if (location.pathname !== nextPath) {
          navigate(nextPath);
        }
      }
    },
    [activePlan, currentMonth, location.pathname, navigate],
  );

  // Sync month change from workspace to URL
  const handleChangeMonth = useCallback(
    (nextMonth: string) => {
      setCurrentMonth(nextMonth);
      if (activePlan && activeView.type === "budget") {
        const nextPath = buildYnabPath(activePlan.id, { type: "budget" }, nextMonth);
        if (location.pathname !== nextPath) {
          navigate(nextPath);
        }
      }
    },
    [activePlan, activeView.type, location.pathname, navigate, setCurrentMonth],
  );

  // Canonical redirect when at root "/"
  useEffect(() => {
    if (!user || authLoading || !activePlan) return;
    if (activeView.type === "guide") return;
    if (location.pathname === "/" || location.pathname === "") {
      const canonical = buildYnabPath(activePlan.id, activeView, currentMonth);
      navigate(canonical, { replace: true });
    }
  }, [user, authLoading, activePlan, activeView, currentMonth, location.pathname, navigate]);

  // Modal states
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [moveMoneySource, setMoveMoneySource] =
    useState<CategoryMonthAllocation | null>(null);
  const [moveMoneyAnchor, setMoveMoneyAnchor] = useState<{
    top: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null>(null);
  const [reconcileTarget, setReconcileTarget] = useState<Account | null>(null);
  const [reconcileAnchor, setReconcileAnchor] = useState<{
    top: number;
    right?: number;
    left?: number;
    bottom?: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetState | null>(
    null,
  );

  // Paginated register state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  const registerAccountId =
    activeView.type === "account"
      ? activeView.accountId
      : activeView.type === "all-accounts"
        ? null
        : undefined;

  const fetchTransactionsPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!activePlan || registerAccountId === undefined) return;
      setTxLoading(true);
      try {
        const page = await client.listTransactions(activePlan.id, {
          account_id: registerAccountId ?? undefined,
          cursor: cursor ?? undefined,
          limit: 50,
        });
        setTransactions((prev) =>
          append ? [...prev, ...page.data] : page.data,
        );
        setNextCursor(page.next_cursor);
      } finally {
        setTxLoading(false);
      }
    },
    [activePlan, client, registerAccountId],
  );

  useEffect(() => {
    if (registerAccountId !== undefined && activePlan) {
      void fetchTransactionsPage(null, false);
    }
  }, [registerAccountId, activePlan, fetchTransactionsPage]);

  const flatCategories = useMemo<Category[]>(
    () => categoryGroups.flatMap((g) => g.categories),
    [categoryGroups],
  );

  const selectedCategories = useMemo<CategoryMonthAllocation[]>(() => {
    if (!monthSummary || !selectedCategoryIds.length) return [];
    const set = new Set(selectedCategoryIds);
    return monthSummary.categories.filter((c) => set.has(c.category_id));
  }, [monthSummary, selectedCategoryIds]);

  const selectedCategory = useMemo<CategoryMonthAllocation | null>(
    () => (selectedCategories.length === 1 ? selectedCategories[0] : null),
    [selectedCategories],
  );

  const selectedCategoryId = selectedCategory
    ? selectedCategory.category_id
    : null;

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--sidebar-bg)",
          color: "#ffffff",
          fontWeight: 600,
        }}
      >
        Loading YNABx...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onLogin={login}
        onRegister={register}
        sessionExpiredMessage={sessionExpiredMessage}
      />
    );
  }

  const reassignOptions = categoryGroups.flatMap((grp) =>
    grp.categories
      .filter((c) => !c.is_credit_card_payment && !c.is_inflow_category)
      .map((c) => ({
        id: c.id,
        name: c.name,
        groupName: grp.name,
      })),
  );

  return (
    <>
      <div
        className="layout"
        style={{ display: activeView.type === "guide" ? "none" : undefined }}
      >
      {errorBanner && (
        <div
          role="alert"
          style={{
            backgroundColor: "var(--pill-negative-bg)",
            color: "var(--pill-negative-text)",
            padding: "0.6rem 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.875rem",
            fontWeight: 600,
            zIndex: 10005,
          }}
        >
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={clearErrorBanner}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="content-layout user-logged-in">
        <Sidebar
          plans={plans}
          activePlan={activePlan}
          accounts={accounts}
          activeView={activeView}
          currentMonth={currentMonth}
          onSelectView={handleSelectView}
          onSelectPlan={selectPlan}
          onCreatePlan={createPlan}
          onUpdatePlan={updatePlan}
          onDeletePlan={deletePlan}
          onOpenAddAccount={() => setAddAccountOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={() => void logout()}
          userEmail={user.email}
        />

        <div className="ynab-u content">
          {activeView.type === "budget" && (
            <BudgetWorkspace
              key={`${currentMonth}-${targetVersion}`}
              month={currentMonth}
              planId={activePlan?.id ?? "default"}
              monthSummary={monthSummary}
              categoryGroups={categoryGroups}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(id) =>
                setSelectedCategoryIds(id ? [id] : [])
              }
              selectedCategoryIds={selectedCategoryIds}
              onSelectCategoryIds={setSelectedCategoryIds}
              onChangeMonth={handleChangeMonth}
              onAssignCategory={async (catId, assignedMilliunits) => {
                await updateAllocations(currentMonth, [
                  {
                    category_id: catId,
                    assigned_milliunits: assignedMilliunits,
                  },
                ]);
              }}
              onCreateGroup={async (name) => {
                await createCategoryGroup({ name });
              }}
              onUpdateGroup={async (groupId, updates) => {
                await updateCategoryGroup(groupId, updates);
              }}
              onDeleteGroupRequest={(groupId, groupName) => {
                const grp = categoryGroups.find((g) => g.id === groupId);
                const ids = grp?.categories.map((c) => c.id) ?? [];
                setDeleteTarget({
                  kind: "group",
                  id: groupId,
                  name: groupName,
                  deletedCategoryIds: ids,
                });
              }}
              onCreateCategory={async (groupId, name) => {
                await createCategory({ group_id: groupId, name });
              }}
              onUpdateCategory={async (categoryId, updates) => {
                await updateCategory(categoryId, updates);
              }}
              onDeleteCategoryRequest={(categoryId, categoryName) => {
                setDeleteTarget({
                  kind: "category",
                  id: categoryId,
                  name: categoryName,
                  deletedCategoryIds: [categoryId],
                });
              }}
              onOpenMoveMoney={(sourceCat, anchor) => {
                setMoveMoneySource(sourceCat);
                setMoveMoneyAnchor(anchor ?? null);
              }}
              inspector={
                <BudgetInspector
                  month={currentMonth}
                  planId={activePlan?.id ?? "default"}
                  onTargetChange={() => setTargetVersion((v) => v + 1)}
                  monthSummary={monthSummary}
                  selectedCategory={selectedCategory}
                  selectedCategories={selectedCategories}
                  onDeselectAll={() => setSelectedCategoryIds([])}
                  onQuickAssign={async (catId, assignedMilliunits) => {
                    await updateAllocations(currentMonth, [
                      {
                        category_id: catId,
                        assigned_milliunits: assignedMilliunits,
                      },
                    ]);
                  }}
                  onSaveCategoryNote={async (catId, note) => {
                    await updateCategory(catId, { note });
                  }}
                  onUpdateCategoryName={async (catId, name) => {
                    await updateCategory(catId, { name });
                  }}
                />
              }
            />
          )}

        {activeView.type === "reflect" && (
          <ReflectView monthSummary={monthSummary} accounts={accounts} />
        )}

        {(activeView.type === "all-accounts" ||
          activeView.type === "account") && (
          <AccountRegister
            accountId={
              activeView.type === "account" ? activeView.accountId : null
            }
            accounts={accounts}
            categories={flatCategories}
            categoryGroups={categoryGroups}
            monthlyBudgets={monthSummary?.categories ?? []}
            payees={payees}
            transactions={transactions}
            nextCursor={nextCursor}
            loading={txLoading}
            onLoadMore={() => {
              if (nextCursor) {
                void fetchTransactionsPage(nextCursor, true);
              }
            }}
            onCreateTransaction={async (req) => {
              await createTransaction(req);
              await fetchTransactionsPage(null, false);
            }}
            onUpdateTransaction={async (txId, req, prevDate) => {
              await updateTransaction(txId, req, prevDate);
              await fetchTransactionsPage(null, false);
            }}
            onDeleteTransaction={async (txId, dateIso) => {
              await deleteTransaction(txId, dateIso);
              await fetchTransactionsPage(null, false);
            }}
            onUnreconcileTransaction={async (txId, dateIso) => {
              await unreconcileTransaction(txId, dateIso);
              await fetchTransactionsPage(null, false);
            }}
            onOpenReconcile={(acc, anchor) => {
              setReconcileTarget(acc);
              setReconcileAnchor(anchor ?? null);
            }}
            onOpenAddCategory={() => {
              handleSelectView({ type: "budget" });
            }}
            onUpdateAccount={async (accId, updates) => {
              await updateAccount(accId, updates);
            }}
            onDeleteAccount={async (accId) => {
              await deleteAccount(accId);
              handleSelectView({ type: "budget" });
            }}
          />
        )}
      </div>
    </div>

      {addAccountOpen && (
        <AddAccountModal
          onClose={() => setAddAccountOpen(false)}
          onCreate={async (req) => {
            const created = await createAccount(req);
            handleSelectView({ type: "account", accountId: created.id });
          }}
        />
      )}

      <MoveMoneyModal
        isOpen={moveMoneySource !== null}
        summary={monthSummary}
        initialSourceCategoryId={moveMoneySource?.category_id}
        anchorPosition={moveMoneyAnchor}
        onClose={() => {
          setMoveMoneySource(null);
          setMoveMoneyAnchor(null);
        }}
        onMoveMoney={async (allocations) => {
          await updateAllocations(currentMonth, allocations);
        }}
      />

      <ReconcileModal
        isOpen={reconcileTarget !== null}
        account={reconcileTarget}
        anchorPosition={reconcileAnchor}
        onClose={() => {
          setReconcileTarget(null);
          setReconcileAnchor(null);
        }}
        onReconcile={async (accId, payload) => {
          await reconcileAccount(accId, payload);
          await fetchTransactionsPage(null, false);
        }}
      />

      <DeleteCategoryModal
        isOpen={deleteTarget !== null}
        targetName={deleteTarget?.name ?? ""}
        deletedCategoryIds={deleteTarget?.deletedCategoryIds ?? []}
        needsReassign={true}
        availableCategories={reassignOptions}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={async (reassignToId) => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "group") {
            await deleteCategoryGroup(deleteTarget.id, reassignToId);
          } else {
            await deleteCategory(deleteTarget.id, reassignToId);
          }
        }}
      />
    </div>

    {activeView.type === "guide" && (
      <GuideView
        onBack={() => handleSelectView({ type: "budget" })}
        onNavigateToPlan={() => handleSelectView({ type: "budget" })}
        onNavigateToAccounts={() => handleSelectView({ type: "all-accounts" })}
      />
    )}
  </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <YnabxShell />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
