import { useCallback, useEffect, useMemo, useState } from "react";
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

  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState<ActiveView>({ type: "budget" });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

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

  const selectedCategory = useMemo<CategoryMonthAllocation | null>(
    () =>
      monthSummary?.categories.find(
        (c) => c.category_id === selectedCategoryId,
      ) ?? null,
    [monthSummary, selectedCategoryId],
  );

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
    <div className="layout">
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
          onSelectView={setActiveView}
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
              month={currentMonth}
              monthSummary={monthSummary}
              categoryGroups={categoryGroups}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onChangeMonth={setCurrentMonth}
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
                  monthSummary={monthSummary}
                  selectedCategory={selectedCategory}
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
            onUpdateAccount={async (accId, updates) => {
              await updateAccount(accId, updates);
            }}
            onDeleteAccount={async (accId) => {
              await deleteAccount(accId);
              setActiveView({ type: "budget" });
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
            setActiveView({ type: "account", accountId: created.id });
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
  );
}

export function App() {
  return (
    <AppProvider>
      <YnabxShell />
    </AppProvider>
  );
}

export default App;
