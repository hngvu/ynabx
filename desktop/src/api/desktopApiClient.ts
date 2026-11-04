import type {
  Account,
  AuthResponse,
  Category,
  CategoryGroup,
  CategoryGroupWithCategories,
  CategoryMonthAllocation,
  CreateAccountRequest,
  CreateCategoryGroupRequest,
  CreateCategoryRequest,
  CreatePayeeRequest,
  CreatePlanRequest,
  LoginRequest,
  Payee,
  PlanMonthSummary,
  PlanSummary,
  ReconcileAccountRequest,
  RegisterUserRequest,
  SaveTransactionRequest,
  Transaction,
  TransactionPage,
  UpdateAccountRequest,
  UpdateCategoryGroupRequest,
  UpdateCategoryRequest,
  UpdateMonthAllocationsRequest,
  UpdatePayeeRequest,
  UpdatePlanRequest,
  UserProfile,
} from "./types";
import type { ApiClient } from "./client";

const LOCAL_PLAN_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_USER: UserProfile = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "desktop@ynab.local",
  display_name: "Desktop User",
  created_at: new Date().toISOString(),
};

const DEFAULT_PLAN: PlanSummary = {
  id: LOCAL_PLAN_ID,
  name: "My Budget",
  currency_code: "USD",
  number_format: "#,##0.00",
  currency_symbol_first: true,
  currency_display_symbol: true,
  date_format: "YYYY-MM-DD",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const tauriInternals = (window as unknown as { __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: unknown) => Promise<T> } }).__TAURI_INTERNALS__;
  if (tauriInternals && typeof tauriInternals.invoke === "function") {
    return tauriInternals.invoke(cmd, args);
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, args);
  } catch {
    throw new Error(`Tauri invoke failed for command: ${cmd}`);
  }
}

// In-memory / LocalStorage fallback for browser dev mode
function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`ynab_desktop_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`ynab_desktop_${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

export function createDesktopApiClient(): ApiClient {
  return {
    setAccessToken(_token: string | null): void {},
    getAccessToken(): string | null {
      return "local-desktop-token";
    },
    setOnSessionExpired(_cb?: () => void): void {},
    async refreshSessionSingleFlight(): Promise<AuthResponse> {
      return {
        access_token: "local-desktop-token",
        token_type: "Bearer",
        expires_in: 999999999,
        user: DEFAULT_USER,
      };
    },

    async register(_payload: RegisterUserRequest): Promise<AuthResponse> {
      return {
        access_token: "local-desktop-token",
        token_type: "Bearer",
        expires_in: 999999999,
        user: DEFAULT_USER,
      };
    },

    async login(_payload: LoginRequest): Promise<AuthResponse> {
      return {
        access_token: "local-desktop-token",
        token_type: "Bearer",
        expires_in: 999999999,
        user: DEFAULT_USER,
      };
    },

    async logout(): Promise<void> {
      // No-op for local desktop client
    },

    async bootstrapSession(): Promise<AuthResponse | null> {
      return {
        access_token: "local-desktop-token",
        token_type: "Bearer",
        expires_in: 999999999,
        user: DEFAULT_USER,
      };
    },

    async getCurrentUser(): Promise<UserProfile> {
      return DEFAULT_USER;
    },

    async listPlans(): Promise<PlanSummary[]> {
      if (isTauriEnvironment()) {
        const plans = await tauriInvoke<PlanSummary[]>("get_plans");
        return plans.length > 0 ? plans : [DEFAULT_PLAN];
      }
      return getStorageItem<PlanSummary[]>("plans", [DEFAULT_PLAN]);
    },

    async getPlan(planId: string): Promise<PlanSummary> {
      const plans = await this.listPlans();
      return plans.find((p) => p.id === planId) ?? DEFAULT_PLAN;
    },

    async createPlan(payload: CreatePlanRequest): Promise<PlanSummary> {
      const plan: PlanSummary = {
        id: crypto.randomUUID(),
        name: payload.name,
        currency_code: payload.currency_code ?? "USD",
        number_format: payload.number_format ?? "#,##0.00",
        currency_symbol_first: payload.currency_symbol_first ?? true,
        currency_display_symbol: payload.currency_display_symbol ?? true,
        date_format: payload.date_format ?? "YYYY-MM-DD",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const plans = await this.listPlans();
      plans.push(plan);
      setStorageItem("plans", plans);
      return plan;
    },

    async updatePlan(planId: string, payload: UpdatePlanRequest): Promise<PlanSummary> {
      const plans = await this.listPlans();
      const plan = plans.find((p) => p.id === planId) ?? DEFAULT_PLAN;
      Object.assign(plan, payload, { updated_at: new Date().toISOString() });
      setStorageItem("plans", plans);
      return plan;
    },

    async deletePlan(_planId: string): Promise<void> {
      // Single plan retained
    },

    async listCategoryGroups(_planId: string): Promise<CategoryGroupWithCategories[]> {
      if (isTauriEnvironment()) {
        return tauriInvoke<CategoryGroupWithCategories[]>("get_category_groups");
      }
      return getStorageItem<CategoryGroupWithCategories[]>("category_groups", [
        {
          id: "group-1",
          plan_id: LOCAL_PLAN_ID,
          name: "Immediate Obligations",
          is_system: false,
          hidden: false,
          sort_order: 0,
          categories: [
            { id: "cat-rent", plan_id: LOCAL_PLAN_ID, group_id: "group-1", name: "Rent / Mortgage", is_inflow_category: false, is_credit_card_payment: false, hidden: false, sort_order: 0 },
            { id: "cat-groceries", plan_id: LOCAL_PLAN_ID, group_id: "group-1", name: "Groceries", is_inflow_category: false, is_credit_card_payment: false, hidden: false, sort_order: 1 },
            { id: "cat-electric", plan_id: LOCAL_PLAN_ID, group_id: "group-1", name: "Electricity", is_inflow_category: false, is_credit_card_payment: false, hidden: false, sort_order: 2 },
          ],
        },
        {
          id: "group-2",
          plan_id: LOCAL_PLAN_ID,
          name: "True Expenses",
          is_system: false,
          hidden: false,
          sort_order: 1,
          categories: [
            { id: "cat-medical", plan_id: LOCAL_PLAN_ID, group_id: "group-2", name: "Medical", is_inflow_category: false, is_credit_card_payment: false, hidden: false, sort_order: 0 },
            { id: "cat-auto", plan_id: LOCAL_PLAN_ID, group_id: "group-2", name: "Auto Maintenance", is_inflow_category: false, is_credit_card_payment: false, hidden: false, sort_order: 1 },
          ],
        },
        {
          id: "group-3",
          plan_id: LOCAL_PLAN_ID,
          name: "Quality of Life Goals",
          is_system: false,
          hidden: false,
          sort_order: 2,
          categories: [
            { id: "cat-vacation", plan_id: LOCAL_PLAN_ID, group_id: "group-3", name: "Vacation", is_inflow_category: false, is_credit_card_payment: false, hidden: false, sort_order: 0 },
            { id: "cat-dining", plan_id: LOCAL_PLAN_ID, group_id: "group-3", name: "Dining Out", is_inflow_category: false, is_credit_card_payment: false, hidden: false, sort_order: 1 },
          ],
        },
      ]);
    },

    async createCategoryGroup(planId: string, payload: CreateCategoryGroupRequest): Promise<CategoryGroup> {
      const groups = await this.listCategoryGroups(planId);
      const newGroup: CategoryGroupWithCategories = {
        id: crypto.randomUUID(),
        plan_id: planId,
        name: payload.name,
        is_system: false,
        hidden: false,
        sort_order: payload.sort_order ?? groups.length,
        categories: [],
      };
      groups.push(newGroup);
      setStorageItem("category_groups", groups);
      return newGroup;
    },

    async updateCategoryGroup(planId: string, groupId: string, payload: UpdateCategoryGroupRequest): Promise<CategoryGroup> {
      const groups = await this.listCategoryGroups(planId);
      const group = groups.find((g) => g.id === groupId);
      if (group) Object.assign(group, payload);
      setStorageItem("category_groups", groups);
      return group!;
    },

    async deleteCategoryGroup(planId: string, groupId: string): Promise<void> {
      let groups = await this.listCategoryGroups(planId);
      groups = groups.filter((g) => g.id !== groupId);
      setStorageItem("category_groups", groups);
    },

    async listCategories(planId: string): Promise<Category[]> {
      const groups = await this.listCategoryGroups(planId);
      return groups.flatMap((g) => g.categories);
    },

    async createCategory(planId: string, payload: CreateCategoryRequest): Promise<Category> {
      const groups = await this.listCategoryGroups(planId);
      const group = groups.find((g) => g.id === payload.group_id);
      const cat: Category = {
        id: crypto.randomUUID(),
        plan_id: planId,
        group_id: payload.group_id,
        name: payload.name,
        note: payload.note ?? null,
        is_inflow_category: false,
        is_credit_card_payment: false,
        hidden: false,
        sort_order: payload.sort_order ?? (group?.categories.length ?? 0),
      };
      if (group) group.categories.push(cat);
      setStorageItem("category_groups", groups);
      return cat;
    },

    async updateCategory(planId: string, categoryId: string, payload: UpdateCategoryRequest): Promise<Category> {
      const groups = await this.listCategoryGroups(planId);
      for (const g of groups) {
        const c = g.categories.find((cat) => cat.id === categoryId);
        if (c) {
          Object.assign(c, payload);
          setStorageItem("category_groups", groups);
          return c;
        }
      }
      throw new Error("Category not found");
    },

    async deleteCategory(planId: string, categoryId: string): Promise<void> {
      const groups = await this.listCategoryGroups(planId);
      for (const g of groups) {
        g.categories = g.categories.filter((c) => c.id !== categoryId);
      }
      setStorageItem("category_groups", groups);
    },

    async getPlanMonth(planId: string, month: string): Promise<PlanMonthSummary> {
      if (isTauriEnvironment()) {
        const summary = await tauriInvoke<{
          month: string;
          ready_to_assign_milliunits: number;
          total_assigned_milliunits: number;
          total_activity_milliunits: number;
          total_available_milliunits: number;
          category_allocations: Array<{
            category_id: string;
            assigned_milliunits: number;
            activity_milliunits: number;
            available_milliunits: number;
          }>;
        }>("get_month_budget", { month });

        const groups = await this.listCategoryGroups(planId);
        const allCats = groups.flatMap((g) => g.categories);

        const categories: CategoryMonthAllocation[] = allCats.map((cat) => {
          const alloc = summary.category_allocations.find((a) => a.category_id === cat.id);
          return {
            category_id: cat.id,
            group_id: cat.group_id,
            name: cat.name,
            note: cat.note,
            assigned_milliunits: alloc?.assigned_milliunits ?? 0,
            activity_milliunits: alloc?.activity_milliunits ?? 0,
            available_milliunits: alloc?.available_milliunits ?? 0,
            is_credit_card_payment: cat.is_credit_card_payment,
            credit_card_account_id: cat.credit_card_account_id,
            hidden: cat.hidden,
            sort_order: cat.sort_order,
          };
        });

        return {
          month: summary.month,
          ready_to_assign_milliunits: summary.ready_to_assign_milliunits,
          total_assigned_milliunits: summary.total_assigned_milliunits,
          total_activity_milliunits: summary.total_activity_milliunits,
          total_available_milliunits: summary.total_available_milliunits,
          categories,
        };
      }

      // Browser fallback
      const groups = await this.listCategoryGroups(planId);
      const storedAllocations = getStorageItem<Record<string, Record<string, number>>>("allocations", {});
      const monthAlloc = storedAllocations[month] ?? {};

      let totalAssigned = 0;
      const categories: CategoryMonthAllocation[] = groups.flatMap((g) =>
        g.categories.map((c) => {
          const assigned = monthAlloc[c.id] ?? 0;
          totalAssigned += assigned;
          return {
            category_id: c.id,
            group_id: c.group_id,
            name: c.name,
            note: c.note,
            assigned_milliunits: assigned,
            activity_milliunits: 0,
            available_milliunits: assigned,
            is_credit_card_payment: c.is_credit_card_payment,
            credit_card_account_id: c.credit_card_account_id,
            hidden: c.hidden,
            sort_order: c.sort_order,
          };
        }),
      );

      return {
        month,
        ready_to_assign_milliunits: 2500000 - totalAssigned,
        total_assigned_milliunits: totalAssigned,
        total_activity_milliunits: 0,
        total_available_milliunits: totalAssigned,
        categories,
      };
    },

    async updateMonthAllocations(
      planId: string,
      month: string,
      payload: UpdateMonthAllocationsRequest,
    ): Promise<PlanMonthSummary> {
      if (isTauriEnvironment()) {
        for (const alloc of payload.allocations) {
          await tauriInvoke("update_category_allocation", {
            categoryId: alloc.category_id,
            month,
            assignedMilliunits: alloc.assigned_milliunits,
          });
        }
        return this.getPlanMonth(planId, month);
      }

      const storedAllocations = getStorageItem<Record<string, Record<string, number>>>("allocations", {});
      if (!storedAllocations[month]) storedAllocations[month] = {};
      for (const alloc of payload.allocations) {
        storedAllocations[month]![alloc.category_id] = alloc.assigned_milliunits;
      }
      setStorageItem("allocations", storedAllocations);
      return this.getPlanMonth(planId, month);
    },

    async listAccounts(planId: string): Promise<Account[]> {
      if (isTauriEnvironment()) {
        return tauriInvoke<Account[]>("get_accounts");
      }
      return getStorageItem<Account[]>("accounts", [
        {
          id: "acc-checking",
          plan_id: planId,
          name: "Checking",
          type: "CHECKING",
          on_budget: true,
          closed: false,
          balance_milliunits: 2500000,
          cleared_balance_milliunits: 2500000,
          uncleared_balance_milliunits: 0,
          sort_order: 0,
        },
      ]);
    },

    async createAccount(planId: string, payload: CreateAccountRequest): Promise<Account> {
      if (isTauriEnvironment()) {
        return tauriInvoke<Account>("create_account", {
          payload: {
            name: payload.name,
            type: payload.type,
            balance_milliunits: payload.initial_balance_milliunits,
          },
        });
      }

      const accounts = await this.listAccounts(planId);
      const acc: Account = {
        id: crypto.randomUUID(),
        plan_id: planId,
        name: payload.name,
        type: payload.type,
        on_budget: payload.type !== "CREDIT_CARD",
        closed: false,
        balance_milliunits: payload.initial_balance_milliunits,
        cleared_balance_milliunits: payload.initial_balance_milliunits,
        uncleared_balance_milliunits: 0,
        sort_order: accounts.length,
      };
      accounts.push(acc);
      setStorageItem("accounts", accounts);
      return acc;
    },

    async updateAccount(planId: string, accountId: string, payload: UpdateAccountRequest): Promise<Account> {
      const accounts = await this.listAccounts(planId);
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) Object.assign(acc, payload);
      setStorageItem("accounts", accounts);
      return acc!;
    },

    async deleteAccount(planId: string, accountId: string): Promise<void> {
      let accounts = await this.listAccounts(planId);
      accounts = accounts.filter((a) => a.id !== accountId);
      setStorageItem("accounts", accounts);
    },

    async reconcileAccount(planId: string, accountId: string, payload: ReconcileAccountRequest): Promise<Account> {
      const accounts = await this.listAccounts(planId);
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        acc.cleared_balance_milliunits = payload.statement_balance_milliunits;
        acc.balance_milliunits = payload.statement_balance_milliunits;
        acc.last_reconciled_at = new Date().toISOString();
      }
      setStorageItem("accounts", accounts);
      return acc!;
    },

    async listPayees(planId: string): Promise<Payee[]> {
      return getStorageItem<Payee[]>("payees", [
        { id: "payee-landlord", plan_id: planId, name: "Landlord" },
        { id: "payee-supermarket", plan_id: planId, name: "Supermarket" },
        { id: "payee-employer", plan_id: planId, name: "Employer" },
      ]);
    },

    async createPayee(planId: string, payload: CreatePayeeRequest): Promise<Payee> {
      const payees = await this.listPayees(planId);
      const p: Payee = { id: crypto.randomUUID(), plan_id: planId, name: payload.name };
      payees.push(p);
      setStorageItem("payees", payees);
      return p;
    },

    async updatePayee(planId: string, payeeId: string, payload: UpdatePayeeRequest): Promise<Payee> {
      const payees = await this.listPayees(planId);
      const p = payees.find((item) => item.id === payeeId);
      if (p) Object.assign(p, payload);
      setStorageItem("payees", payees);
      return p!;
    },

    async deletePayee(planId: string, payeeId: string): Promise<void> {
      let payees = await this.listPayees(planId);
      payees = payees.filter((p) => p.id !== payeeId);
      setStorageItem("payees", payees);
    },

    async listTransactions(
      _planId: string,
      params?: { account_id?: string; category_id?: string; since_date?: string },
    ): Promise<TransactionPage> {
      if (isTauriEnvironment()) {
        const txs = await tauriInvoke<Transaction[]>("get_transactions", {
          accountId: params?.account_id ?? null,
        });
        return {
          data: txs,
          next_cursor: null,
        };
      }

      const all = getStorageItem<Transaction[]>("transactions", []);
      const filtered = all.filter((t) => {
        if (params?.account_id && t.account_id !== params.account_id) return false;
        if (params?.category_id && t.category_id !== params.category_id) return false;
        return true;
      });
      return {
        data: filtered,
        next_cursor: null,
      };
    },

    async createTransaction(planId: string, payload: SaveTransactionRequest): Promise<Transaction> {
      if (isTauriEnvironment()) {
        return tauriInvoke<Transaction>("save_transaction", {
          payload: {
            account_id: payload.account_id,
            payee_id: payload.payee_id ?? null,
            payee_name: payload.payee_name ?? null,
            category_id: payload.category_id ?? null,
            date: payload.date,
            amount_milliunits: payload.amount_milliunits,
            memo: payload.memo ?? null,
            cleared: payload.cleared ?? "UNCLEARED",
            approved: payload.approved ?? true,
          },
        });
      }

      const txs = getStorageItem<Transaction[]>("transactions", []);
      const tx: Transaction = {
        id: crypto.randomUUID(),
        plan_id: planId,
        account_id: payload.account_id,
        payee_id: payload.payee_id ?? null,
        payee_name: payload.payee_name ?? null,
        category_id: payload.category_id ?? null,
        date: payload.date,
        amount_milliunits: payload.amount_milliunits,
        memo: payload.memo ?? null,
        cleared: payload.cleared ?? "UNCLEARED",
        approved: payload.approved ?? true,
      };
      txs.unshift(tx);
      setStorageItem("transactions", txs);
      return tx;
    },

    async updateTransaction(planId: string, transactionId: string, payload: SaveTransactionRequest): Promise<Transaction> {
      if (isTauriEnvironment()) {
        return tauriInvoke<Transaction>("save_transaction", {
          payload: {
            id: transactionId,
            account_id: payload.account_id,
            payee_id: payload.payee_id ?? null,
            payee_name: payload.payee_name ?? null,
            category_id: payload.category_id ?? null,
            date: payload.date,
            amount_milliunits: payload.amount_milliunits,
            memo: payload.memo ?? null,
            cleared: payload.cleared ?? "UNCLEARED",
            approved: payload.approved ?? true,
          },
        });
      }

      const txs = getStorageItem<Transaction[]>("transactions", []);
      const tx = txs.find((t) => t.id === transactionId);
      if (tx) {
        Object.assign(tx, payload);
        setStorageItem("transactions", txs);
        return tx;
      }
      return this.createTransaction(planId, payload);
    },

    async deleteTransaction(_planId: string, transactionId: string): Promise<void> {
      let txs = getStorageItem<Transaction[]>("transactions", []);
      txs = txs.filter((t) => t.id !== transactionId);
      setStorageItem("transactions", txs);
    },

    async unreconcileTransaction(_planId: string, _transactionId: string): Promise<Transaction> {
      throw new Error("Unreconcile not supported in local desktop");
    },
  };
}
