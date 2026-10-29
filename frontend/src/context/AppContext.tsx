import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiClient, type ApiClient } from "../api/client";
import type {
  Account,
  AllocationUpdate,
  CategoryGroupWithCategories,
  CreateAccountRequest,
  CreateCategoryGroupRequest,
  CreateCategoryRequest,
  Payee,
  PlanMonthSummary,
  PlanSummary,
  ReconcileAccountRequest,
  SaveTransactionRequest,
  UpdateAccountRequest,
  UpdateCategoryGroupRequest,
  UpdateCategoryRequest,
  UserProfile,
} from "../api/types";
import {
  applyOptimisticAllocation,
  invalidateAllMonths,
  invalidateMonthsFrom,
  needsMonthRefetch,
  shouldAcceptMonthFetchResponse,
} from "../state/budgetReducer";
import { getCurrentMonthIso, getMonthIsoFromDate } from "../utils/dates";

export interface AppContextValue {
  user: UserProfile | null;
  authLoading: boolean;
  sessionExpiredMessage: string | null;
  plans: PlanSummary[];
  activePlan: PlanSummary | null;
  currentMonth: string;
  monthSummary: PlanMonthSummary | null;
  monthSummariesCache: Record<string, PlanMonthSummary>;
  categoryGroups: CategoryGroupWithCategories[];
  accounts: Account[];
  payees: Payee[];
  errorBanner: string | null;
  clearErrorBanner: () => void;

  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;

  // Plan & Month actions
  selectPlan: (planId: string) => void;
  createPlan: (name: string, currencyCode: string) => Promise<void>;
  updatePlan: (planId: string, name: string, currencyCode?: string) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  setCurrentMonth: (monthIso: string) => void;
  updateAllocations: (
    monthIso: string,
    allocations: AllocationUpdate[],
  ) => Promise<PlanMonthSummary>;

  // Category Group & Category actions
  createCategoryGroup: (req: CreateCategoryGroupRequest) => Promise<void>;
  updateCategoryGroup: (
    groupId: string,
    req: UpdateCategoryGroupRequest,
  ) => Promise<void>;
  deleteCategoryGroup: (
    groupId: string,
    reassignToCategoryId?: string,
  ) => Promise<void>;
  createCategory: (req: CreateCategoryRequest) => Promise<void>;
  updateCategory: (
    categoryId: string,
    req: UpdateCategoryRequest,
  ) => Promise<void>;
  deleteCategory: (
    categoryId: string,
    reassignToCategoryId?: string,
  ) => Promise<void>;

  // Account & Reconciliation actions
  createAccount: (req: CreateAccountRequest) => Promise<Account>;
  updateAccount: (
    accountId: string,
    req: UpdateAccountRequest,
  ) => Promise<Account>;
  deleteAccount: (accountId: string) => Promise<void>;
  reconcileAccount: (
    accountId: string,
    req: ReconcileAccountRequest,
  ) => Promise<Account>;

  // Transaction mutations (with automatic month & account invalidation)
  createTransaction: (req: SaveTransactionRequest) => Promise<void>;
  updateTransaction: (
    transactionId: string,
    req: SaveTransactionRequest,
    previousDateIso?: string,
  ) => Promise<void>;
  deleteTransaction: (
    transactionId: string,
    transactionDateIso: string,
  ) => Promise<void>;
  unreconcileTransaction: (
    transactionId: string,
    transactionDateIso: string,
  ) => Promise<void>;
  client: ApiClient;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  customClient,
}: {
  children: React.ReactNode;
  customClient?: ApiClient;
}): React.JSX.Element {
  const client = customClient ?? apiClient;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<
    string | null
  >(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    getCurrentMonthIso(),
  );

  const [monthSummariesCache, setMonthSummariesCache] = useState<
    Record<string, PlanMonthSummary>
  >({});
  const [categoryGroups, setCategoryGroups] = useState<
    CategoryGroupWithCategories[]
  >([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);

  // Epoch counter incremented at both start and completion of every mutation
  const cacheEpochRef = useRef<number>(0);
  const [cacheEpochState, setCacheEpochState] = useState<number>(0);
  const inFlightMonthEpochRef = useRef<Record<string, number | null>>({});

  const bumpEpoch = useCallback(() => {
    cacheEpochRef.current += 1;
    setCacheEpochState(cacheEpochRef.current);
    return cacheEpochRef.current;
  }, []);

  const activePlan =
    plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;

  useEffect(() => {
    client.setOnSessionExpired(() => {
      setUser(null);
      setPlans([]);
      setActivePlanId(null);
      setMonthSummariesCache({});
      setSessionExpiredMessage(
        "Your session has expired. Please log in again.",
      );
    });
  }, [client]);

  const loadPlanMetadata = useCallback(
    async (planId: string) => {
      const [groupsData, accountsData, payeesData] = await Promise.all([
        client.listCategoryGroups(planId, true),
        client.listAccounts(planId, true),
        client.listPayees(planId),
      ]);
      setCategoryGroups(groupsData);
      setAccounts(accountsData);
      setPayees(payeesData);
    },
    [client],
  );

  const initializeUserPlans = useCallback(async () => {
    const existingPlans = await client.listPlans();
    if (existingPlans.length > 0) {
      setPlans(existingPlans);
      const firstId = existingPlans[0]!.id;
      setActivePlanId(firstId);
      await loadPlanMetadata(firstId);
    } else {
      const created = await client.createPlan({
        name: "My Budget Plan",
        currency_code: "USD",
      });
      setPlans([created]);
      setActivePlanId(created.id);
      await loadPlanMetadata(created.id);
    }
  }, [client, loadPlanMetadata]);

  // Bootstrap session on mount (safe under React StrictMode via single-flight refresh)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await client.bootstrapSession();
        if (!mounted) return;
        if (res) {
          setUser(res.user);
          await initializeUserPlans();
        }
      } catch {
        // Quietly stay logged out on initial bootstrap failure
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client, initializeUserPlans]);

  // Automatically fetch or re-fetch `currentMonth` whenever missing or invalidated
  useEffect(() => {
    const planId = activePlan?.id;
    if (!user || !planId) return;

    const currentEpoch = cacheEpochRef.current;
    const inFlightEpoch = inFlightMonthEpochRef.current[currentMonth] ?? null;

    if (
      !needsMonthRefetch(
        monthSummariesCache,
        currentMonth,
        inFlightEpoch,
        currentEpoch,
      )
    ) {
      return;
    }

    inFlightMonthEpochRef.current[currentMonth] = currentEpoch;

    void (async () => {
      try {
        const summary = await client.getPlanMonth(planId, currentMonth);
        if (shouldAcceptMonthFetchResponse(currentEpoch, cacheEpochRef.current)) {
          setMonthSummariesCache((prev) => ({
            ...prev,
            [currentMonth]: summary,
          }));
        } else {
          // Stale GET ignored -> trigger state check so this effect immediately re-fetches with latest epoch
          setCacheEpochState(cacheEpochRef.current);
        }
      } catch (err) {
        if (shouldAcceptMonthFetchResponse(currentEpoch, cacheEpochRef.current)) {
          setErrorBanner(
            err instanceof Error ? err.message : "Failed to load budget month",
          );
        }
      } finally {
        if (inFlightMonthEpochRef.current[currentMonth] === currentEpoch) {
          inFlightMonthEpochRef.current[currentMonth] = null;
        }
      }
    })();
  }, [
    user,
    activePlan?.id,
    currentMonth,
    monthSummariesCache,
    cacheEpochState,
    client,
  ]);

  const login = useCallback(
    async (email: string, password: string) => {
      setSessionExpiredMessage(null);
      const res = await client.login({ email, password });
      setUser(res.user);
      bumpEpoch();
      setMonthSummariesCache({});
      await initializeUserPlans();
    },
    [client, initializeUserPlans, bumpEpoch],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setSessionExpiredMessage(null);
      const res = await client.register({
        email,
        password,
        display_name: displayName ?? null,
      });
      setUser(res.user);
      bumpEpoch();
      setMonthSummariesCache({});
      await initializeUserPlans();
    },
    [client, initializeUserPlans, bumpEpoch],
  );

  const logout = useCallback(async () => {
    await client.logout();
    bumpEpoch();
    setUser(null);
    setPlans([]);
    setActivePlanId(null);
    setMonthSummariesCache({});
    setCategoryGroups([]);
    setAccounts([]);
    setPayees([]);
  }, [client, bumpEpoch]);

  const selectPlan = useCallback(
    (planId: string) => {
      bumpEpoch();
      setActivePlanId(planId);
      setMonthSummariesCache({});
      void loadPlanMetadata(planId);
    },
    [bumpEpoch, loadPlanMetadata],
  );

  const createPlan = useCallback(
    async (name: string, currencyCode: string) => {
      const created = await client.createPlan({
        name,
        currency_code: currencyCode,
      });
      setPlans((prev) => [...prev, created]);
      bumpEpoch();
      setActivePlanId(created.id);
      setMonthSummariesCache({});
      await loadPlanMetadata(created.id);
    },
    [client, bumpEpoch, loadPlanMetadata],
  );

  const updatePlan = useCallback(
    async (planId: string, name: string, currencyCode?: string) => {
      const updated = await client.updatePlan(planId, {
        name,
        currency_code: currencyCode,
      });
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
    },
    [client],
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      await client.deletePlan(planId);
      setPlans((prev) => {
        const remaining = prev.filter((p) => p.id !== planId);
        if (activePlanId === planId) {
          const nextPlan = remaining[0] ?? null;
          setActivePlanId(nextPlan ? nextPlan.id : null);
          if (nextPlan) {
            void loadPlanMetadata(nextPlan.id);
          }
        }
        return remaining;
      });
    },
    [client, activePlanId, loadPlanMetadata],
  );

  const updateAllocations = useCallback(
    async (monthIso: string, allocations: AllocationUpdate[]) => {
      if (!activePlan) throw new Error("No active plan");
      bumpEpoch(); // Start of mutation

      // Optimistic update on month M
      setMonthSummariesCache((prev) => {
        const existing = prev[monthIso];
        if (!existing) return prev;
        return {
          ...prev,
          [monthIso]: applyOptimisticAllocation(existing, allocations),
        };
      });

      try {
        const authoritative = await client.updateMonthAllocations(
          activePlan.id,
          monthIso,
          { allocations },
        );
        bumpEpoch(); // End of mutation
        setMonthSummariesCache((prev) => {
          const withCurrent = { ...prev, [monthIso]: authoritative };
          return invalidateMonthsFrom(withCurrent, monthIso, false);
        });
        return authoritative;
      } catch (err) {
        bumpEpoch();
        // Rollback by invalidating from monthIso inclusive so it re-fetches authoritative state
        setMonthSummariesCache((prev) =>
          invalidateMonthsFrom(prev, monthIso, true),
        );
        throw err;
      }
    },
    [activePlan, client, bumpEpoch],
  );

  // Category Group & Category mutations -> invalidate ALL months & reload categoryGroups
  const createCategoryGroup = useCallback(
    async (req: CreateCategoryGroupRequest) => {
      if (!activePlan) return;
      bumpEpoch();
      try {
        await client.createCategoryGroup(activePlan.id, req);
        const groupsData = await client.listCategoryGroups(activePlan.id, true);
        setCategoryGroups(groupsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache(invalidateAllMonths());
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const updateCategoryGroup = useCallback(
    async (groupId: string, req: UpdateCategoryGroupRequest) => {
      if (!activePlan) return;
      bumpEpoch();
      try {
        await client.updateCategoryGroup(activePlan.id, groupId, req);
        const groupsData = await client.listCategoryGroups(activePlan.id, true);
        setCategoryGroups(groupsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache(invalidateAllMonths());
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const deleteCategoryGroup = useCallback(
    async (groupId: string, reassignToCategoryId?: string) => {
      if (!activePlan) return;
      bumpEpoch();
      try {
        await client.deleteCategoryGroup(
          activePlan.id,
          groupId,
          reassignToCategoryId,
        );
        const groupsData = await client.listCategoryGroups(activePlan.id, true);
        setCategoryGroups(groupsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache(invalidateAllMonths());
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const createCategory = useCallback(
    async (req: CreateCategoryRequest) => {
      if (!activePlan) return;
      bumpEpoch();
      try {
        await client.createCategory(activePlan.id, req);
        const groupsData = await client.listCategoryGroups(activePlan.id, true);
        setCategoryGroups(groupsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache(invalidateAllMonths());
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const updateCategory = useCallback(
    async (categoryId: string, req: UpdateCategoryRequest) => {
      if (!activePlan) return;
      bumpEpoch();
      try {
        await client.updateCategory(activePlan.id, categoryId, req);
        const groupsData = await client.listCategoryGroups(activePlan.id, true);
        setCategoryGroups(groupsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache(invalidateAllMonths());
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const deleteCategory = useCallback(
    async (categoryId: string, reassignToCategoryId?: string) => {
      if (!activePlan) return;
      bumpEpoch();
      try {
        await client.deleteCategory(
          activePlan.id,
          categoryId,
          reassignToCategoryId,
        );
        const groupsData = await client.listCategoryGroups(activePlan.id, true);
        setCategoryGroups(groupsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache(invalidateAllMonths());
      }
    },
    [activePlan, client, bumpEpoch],
  );

  // Account & Reconciliation mutations
  const createAccount = useCallback(
    async (req: CreateAccountRequest) => {
      if (!activePlan) throw new Error("No active plan");
      bumpEpoch();
      try {
        const created = await client.createAccount(activePlan.id, req);
        await loadPlanMetadata(activePlan.id);
        return created;
      } finally {
        bumpEpoch();
        if (
          req.initial_balance_milliunits !== 0 ||
          req.type === "CREDIT_CARD"
        ) {
          setMonthSummariesCache(invalidateAllMonths());
        }
      }
    },
    [activePlan, client, bumpEpoch, loadPlanMetadata],
  );

  const updateAccount = useCallback(
    async (accountId: string, req: UpdateAccountRequest) => {
      if (!activePlan) throw new Error("No active plan");
      const updated = await client.updateAccount(activePlan.id, accountId, req);
      const [accountsData, groupsData] = await Promise.all([
        client.listAccounts(activePlan.id, true),
        client.listCategoryGroups(activePlan.id, true),
      ]);
      setAccounts(accountsData);
      setCategoryGroups(groupsData);
      return updated;
    },
    [activePlan, client],
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      if (!activePlan) return;
      await client.deleteAccount(activePlan.id, accountId);
      const [accountsData, groupsData] = await Promise.all([
        client.listAccounts(activePlan.id, true),
        client.listCategoryGroups(activePlan.id, true),
      ]);
      setAccounts(accountsData);
      setCategoryGroups(groupsData);
    },
    [activePlan, client],
  );

  const reconcileAccount = useCallback(
    async (accountId: string, req: ReconcileAccountRequest) => {
      if (!activePlan) throw new Error("No active plan");
      bumpEpoch();
      try {
        const updated = await client.reconcileAccount(
          activePlan.id,
          accountId,
          req,
        );
        const accountsData = await client.listAccounts(activePlan.id, true);
        setAccounts(accountsData);
        return updated;
      } finally {
        bumpEpoch();
        setMonthSummariesCache((prev) =>
          invalidateMonthsFrom(prev, currentMonth, true),
        );
      }
    },
    [activePlan, client, bumpEpoch, currentMonth],
  );

  // Transaction mutations -> invalidate from affected month M inclusive + reload accounts & payees
  const createTransaction = useCallback(
    async (req: SaveTransactionRequest) => {
      if (!activePlan) return;
      const affectedMonth = getMonthIsoFromDate(req.date);
      bumpEpoch();
      try {
        await client.createTransaction(activePlan.id, req);
        const [accountsData, payeesData] = await Promise.all([
          client.listAccounts(activePlan.id, true),
          client.listPayees(activePlan.id),
        ]);
        setAccounts(accountsData);
        setPayees(payeesData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache((prev) =>
          invalidateMonthsFrom(prev, affectedMonth, true),
        );
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const updateTransaction = useCallback(
    async (
      transactionId: string,
      req: SaveTransactionRequest,
      previousDateIso?: string,
    ) => {
      if (!activePlan) return;
      const newMonth = getMonthIsoFromDate(req.date);
      const oldMonth = previousDateIso
        ? getMonthIsoFromDate(previousDateIso)
        : newMonth;
      const minMonth = oldMonth < newMonth ? oldMonth : newMonth;

      bumpEpoch();
      try {
        await client.updateTransaction(activePlan.id, transactionId, req);
        const [accountsData, payeesData] = await Promise.all([
          client.listAccounts(activePlan.id, true),
          client.listPayees(activePlan.id),
        ]);
        setAccounts(accountsData);
        setPayees(payeesData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache((prev) =>
          invalidateMonthsFrom(prev, minMonth, true),
        );
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const deleteTransaction = useCallback(
    async (transactionId: string, transactionDateIso: string) => {
      if (!activePlan) return;
      const affectedMonth = getMonthIsoFromDate(transactionDateIso);
      bumpEpoch();
      try {
        await client.deleteTransaction(activePlan.id, transactionId);
        const accountsData = await client.listAccounts(activePlan.id, true);
        setAccounts(accountsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache((prev) =>
          invalidateMonthsFrom(prev, affectedMonth, true),
        );
      }
    },
    [activePlan, client, bumpEpoch],
  );

  const unreconcileTransaction = useCallback(
    async (transactionId: string, transactionDateIso: string) => {
      if (!activePlan) return;
      const affectedMonth = getMonthIsoFromDate(transactionDateIso);
      bumpEpoch();
      try {
        await client.unreconcileTransaction(activePlan.id, transactionId);
        const accountsData = await client.listAccounts(activePlan.id, true);
        setAccounts(accountsData);
      } finally {
        bumpEpoch();
        setMonthSummariesCache((prev) =>
          invalidateMonthsFrom(prev, affectedMonth, true),
        );
      }
    },
    [activePlan, client, bumpEpoch],
  );

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        sessionExpiredMessage,
        plans,
        activePlan,
        currentMonth,
        monthSummary: monthSummariesCache[currentMonth] ?? null,
        monthSummariesCache,
        categoryGroups,
        accounts,
        payees,
        errorBanner,
        clearErrorBanner: () => setErrorBanner(null),
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}
