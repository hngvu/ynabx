import {
  ApiProblemError,
  type Account,
  type AuthResponse,
  type Category,
  type CategoryGroup,
  type CategoryGroupWithCategories,
  type CreateAccountRequest,
  type CreateCategoryGroupRequest,
  type CreateCategoryRequest,
  type CreatePayeeRequest,
  type CreatePlanRequest,
  type LoginRequest,
  type Payee,
  type PlanMonthSummary,
  type PlanSummary,
  type ProblemDetail,
  type ReconcileAccountRequest,
  type RegisterUserRequest,
  type SaveTransactionRequest,
  type Transaction,
  type TransactionPage,
  type UpdateAccountRequest,
  type UpdateCategoryGroupRequest,
  type UpdateCategoryRequest,
  type UpdateMonthAllocationsRequest,
  type UpdatePayeeRequest,
  type UpdatePlanRequest,
  type UserProfile,
} from "./types";

export interface ApiClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  onSessionExpired?: () => void;
}

interface InternalRequestOptions {
  method?: string;
  body?: unknown;
  contentType?: string;
  skipAuthRefresh?: boolean;
  _retried?: boolean;
}

export function createApiClient(options?: ApiClientOptions) {
  // Always default to same-origin "/api/v1" so Vite proxy forwards cookies cleanly
  const baseUrl = options?.baseUrl ?? "/api/v1";
  const fetchFn: typeof fetch =
    options?.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
  let onSessionExpiredCallback = options?.onSessionExpired;

  let accessToken: string | null = null;
  let hasHadActiveSession = false;
  let refreshInFlight: Promise<AuthResponse> | null = null;

  function setAccessToken(token: string | null): void {
    accessToken = token;
    if (token !== null) {
      hasHadActiveSession = true;
    }
  }

  function getAccessToken(): string | null {
    return accessToken;
  }

  function setOnSessionExpired(cb: (() => void) | undefined): void {
    onSessionExpiredCallback = cb;
  }

  async function parseErrorResponse(res: Response): Promise<ApiProblemError> {
    try {
      const json = (await res.json()) as Partial<ProblemDetail>;
      return new ApiProblemError({
        type: json.type ?? "about:blank",
        title: json.title ?? (res.statusText || "Request Error"),
        status: json.status ?? res.status,
        detail: json.detail,
        instance: json.instance,
      });
    } catch {
      return new ApiProblemError({
        type: "about:blank",
        title: res.statusText || "Request Error",
        status: res.status,
        detail: `HTTP ${res.status}`,
      });
    }
  }

  /**
   * Single-flight token refresh shared by both bootstrapSession() and 401 retry interceptor.
   * Never triggers a recursive refresh if /auth/refresh itself returns 401.
   */
  async function refreshSessionSingleFlight(): Promise<AuthResponse> {
    if (!refreshInFlight) {
      const wasActive = hasHadActiveSession;
      refreshInFlight = (async () => {
        const res = await fetchFn(`${baseUrl}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          accessToken = null;
          hasHadActiveSession = false;
          if (wasActive && res.status === 401) {
            onSessionExpiredCallback?.();
          }
          throw await parseErrorResponse(res);
        }

        const data = (await res.json()) as AuthResponse;
        setAccessToken(data.access_token);
        return data;
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  /**
   * Called on page load (F5) to restore session from HttpOnly refresh_token cookie.
   * If unauthenticated (401 with no prior session), returns null quietly.
   */
  async function bootstrapSession(): Promise<AuthResponse | null> {
    try {
      return await refreshSessionSingleFlight();
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 401) {
        return null;
      }
      throw err;
    }
  }

  async function request<T>(
    path: string,
    reqOptions: InternalRequestOptions = {},
  ): Promise<T> {
    const method = reqOptions.method ?? "GET";
    const headers: Record<string, string> = {};

    if (reqOptions.body !== undefined) {
      headers["Content-Type"] = reqOptions.contentType ?? "application/json";
    }
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers,
      body:
        reqOptions.body !== undefined
          ? JSON.stringify(reqOptions.body)
          : undefined,
      credentials: "include",
    });

    if (
      res.status === 401 &&
      !reqOptions.skipAuthRefresh &&
      !reqOptions._retried
    ) {
      await refreshSessionSingleFlight();
      return request<T>(path, { ...reqOptions, _retried: true });
    }

    if (!res.ok) {
      throw await parseErrorResponse(res);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }

  return {
    setAccessToken,
    getAccessToken,
    setOnSessionExpired,
    refreshSessionSingleFlight,
    bootstrapSession,

    // Auth
    async register(payload: RegisterUserRequest): Promise<AuthResponse> {
      const data = await request<AuthResponse>("/auth/register", {
        method: "POST",
        body: payload,
        skipAuthRefresh: true,
      });
      setAccessToken(data.access_token);
      return data;
    },

    async login(payload: LoginRequest): Promise<AuthResponse> {
      const data = await request<AuthResponse>("/auth/login", {
        method: "POST",
        body: payload,
        skipAuthRefresh: true,
      });
      setAccessToken(data.access_token);
      return data;
    },

    async logout(): Promise<void> {
      try {
        await request<void>("/auth/logout", {
          method: "POST",
          skipAuthRefresh: true,
        });
      } finally {
        accessToken = null;
        hasHadActiveSession = false;
      }
    },

    getCurrentUser(): Promise<UserProfile> {
      return request<UserProfile>("/auth/me");
    },

    // Plans & Monthly Budget
    listPlans(): Promise<PlanSummary[]> {
      return request<PlanSummary[]>("/plans");
    },

    createPlan(payload: CreatePlanRequest): Promise<PlanSummary> {
      return request<PlanSummary>("/plans", { method: "POST", body: payload });
    },

    getPlan(planId: string): Promise<PlanSummary> {
      return request<PlanSummary>(`/plans/${planId}`);
    },

    updatePlan(
      planId: string,
      payload: UpdatePlanRequest,
    ): Promise<PlanSummary> {
      return request<PlanSummary>(`/plans/${planId}`, {
        method: "PATCH",
        body: payload,
        contentType: "application/merge-patch+json",
      });
    },

    deletePlan(planId: string): Promise<void> {
      return request<void>(`/plans/${planId}`, { method: "DELETE" });
    },

    getPlanMonth(planId: string, month: string): Promise<PlanMonthSummary> {
      return request<PlanMonthSummary>(`/plans/${planId}/months/${month}`);
    },

    updateMonthAllocations(
      planId: string,
      month: string,
      payload: UpdateMonthAllocationsRequest,
    ): Promise<PlanMonthSummary> {
      return request<PlanMonthSummary>(
        `/plans/${planId}/months/${month}/allocations`,
        {
          method: "PATCH",
          body: payload,
        },
      );
    },

    // Category Groups & Categories
    listCategoryGroups(
      planId: string,
      includeHidden = true,
    ): Promise<CategoryGroupWithCategories[]> {
      return request<CategoryGroupWithCategories[]>(
        `/plans/${planId}/category-groups?include_hidden=${includeHidden}`,
      );
    },

    createCategoryGroup(
      planId: string,
      payload: CreateCategoryGroupRequest,
    ): Promise<CategoryGroup> {
      return request<CategoryGroup>(`/plans/${planId}/category-groups`, {
        method: "POST",
        body: payload,
      });
    },

    updateCategoryGroup(
      planId: string,
      groupId: string,
      payload: UpdateCategoryGroupRequest,
    ): Promise<CategoryGroup> {
      return request<CategoryGroup>(
        `/plans/${planId}/category-groups/${groupId}`,
        {
          method: "PATCH",
          body: payload,
          contentType: "application/merge-patch+json",
        },
      );
    },

    deleteCategoryGroup(
      planId: string,
      groupId: string,
      reassignToCategoryId?: string,
    ): Promise<void> {
      const qs = reassignToCategoryId
        ? `?reassign_to_category_id=${encodeURIComponent(reassignToCategoryId)}`
        : "";
      return request<void>(
        `/plans/${planId}/category-groups/${groupId}${qs}`,
        { method: "DELETE" },
      );
    },

    listCategories(planId: string, includeHidden = true): Promise<Category[]> {
      return request<Category[]>(
        `/plans/${planId}/categories?include_hidden=${includeHidden}`,
      );
    },

    createCategory(
      planId: string,
      payload: CreateCategoryRequest,
    ): Promise<Category> {
      return request<Category>(`/plans/${planId}/categories`, {
        method: "POST",
        body: payload,
      });
    },

    updateCategory(
      planId: string,
      categoryId: string,
      payload: UpdateCategoryRequest,
    ): Promise<Category> {
      return request<Category>(`/plans/${planId}/categories/${categoryId}`, {
        method: "PATCH",
        body: payload,
        contentType: "application/merge-patch+json",
      });
    },

    deleteCategory(
      planId: string,
      categoryId: string,
      reassignToCategoryId?: string,
    ): Promise<void> {
      const qs = reassignToCategoryId
        ? `?reassign_to_category_id=${encodeURIComponent(reassignToCategoryId)}`
        : "";
      return request<void>(`/plans/${planId}/categories/${categoryId}${qs}`, {
        method: "DELETE",
      });
    },

    // Accounts & Reconciliation
    listAccounts(planId: string, includeClosed = true): Promise<Account[]> {
      return request<Account[]>(
        `/plans/${planId}/accounts?include_closed=${includeClosed}`,
      );
    },

    createAccount(
      planId: string,
      payload: CreateAccountRequest,
    ): Promise<Account> {
      return request<Account>(`/plans/${planId}/accounts`, {
        method: "POST",
        body: payload,
      });
    },

    updateAccount(
      planId: string,
      accountId: string,
      payload: UpdateAccountRequest,
    ): Promise<Account> {
      return request<Account>(`/plans/${planId}/accounts/${accountId}`, {
        method: "PATCH",
        body: payload,
        contentType: "application/merge-patch+json",
      });
    },

    deleteAccount(planId: string, accountId: string): Promise<void> {
      return request<void>(`/plans/${planId}/accounts/${accountId}`, {
        method: "DELETE",
      });
    },

    reconcileAccount(
      planId: string,
      accountId: string,
      payload: ReconcileAccountRequest,
    ): Promise<Account> {
      return request<Account>(
        `/plans/${planId}/accounts/${accountId}/reconcile`,
        {
          method: "POST",
          body: payload,
        },
      );
    },

    // Payees
    listPayees(planId: string): Promise<Payee[]> {
      return request<Payee[]>(`/plans/${planId}/payees`);
    },

    createPayee(planId: string, payload: CreatePayeeRequest): Promise<Payee> {
      return request<Payee>(`/plans/${planId}/payees`, {
        method: "POST",
        body: payload,
      });
    },

    updatePayee(
      planId: string,
      payeeId: string,
      payload: UpdatePayeeRequest,
    ): Promise<Payee> {
      return request<Payee>(`/plans/${planId}/payees/${payeeId}`, {
        method: "PATCH",
        body: payload,
        contentType: "application/merge-patch+json",
      });
    },

    deletePayee(planId: string, payeeId: string): Promise<void> {
      return request<void>(`/plans/${planId}/payees/${payeeId}`, {
        method: "DELETE",
      });
    },

    // Transactions
    listTransactions(
      planId: string,
      params?: {
        account_id?: string;
        category_id?: string;
        payee_id?: string;
        since_date?: string;
        until_date?: string;
        limit?: number;
        cursor?: string;
      },
    ): Promise<TransactionPage> {
      const searchParams = new URLSearchParams();
      if (params?.account_id) searchParams.set("account_id", params.account_id);
      if (params?.category_id)
        searchParams.set("category_id", params.category_id);
      if (params?.payee_id) searchParams.set("payee_id", params.payee_id);
      if (params?.since_date) searchParams.set("since_date", params.since_date);
      if (params?.until_date) searchParams.set("until_date", params.until_date);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.cursor) searchParams.set("cursor", params.cursor);

      const qs = searchParams.toString();
      return request<TransactionPage>(
        `/plans/${planId}/transactions${qs ? `?${qs}` : ""}`,
      );
    },

    createTransaction(
      planId: string,
      payload: SaveTransactionRequest,
    ): Promise<Transaction> {
      return request<Transaction>(`/plans/${planId}/transactions`, {
        method: "POST",
        body: payload,
      });
    },

    updateTransaction(
      planId: string,
      transactionId: string,
      payload: SaveTransactionRequest,
    ): Promise<Transaction> {
      return request<Transaction>(
        `/plans/${planId}/transactions/${transactionId}`,
        {
          method: "PUT",
          body: payload,
        },
      );
    },

    deleteTransaction(planId: string, transactionId: string): Promise<void> {
      return request<void>(`/plans/${planId}/transactions/${transactionId}`, {
        method: "DELETE",
      });
    },

    unreconcileTransaction(
      planId: string,
      transactionId: string,
    ): Promise<Transaction> {
      return request<Transaction>(
        `/plans/${planId}/transactions/${transactionId}/unreconcile`,
        {
          method: "POST",
        },
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export const apiClient = createApiClient();
