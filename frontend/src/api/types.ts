export interface UserProfile {
  id: string;
  email: string;
  display_name?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: UserProfile;
}

export interface RegisterUserRequest {
  email: string;
  password: string;
  display_name?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PlanSummary {
  id: string;
  owner_user_id?: string | null;
  name: string;
  currency_code: string;
  number_format: string;
  currency_symbol_first: boolean;
  currency_display_symbol: boolean;
  date_format: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanRequest {
  name: string;
  currency_code?: string;
  number_format?: string;
  currency_symbol_first?: boolean;
  currency_display_symbol?: boolean;
  date_format?: string;
}

export interface UpdatePlanRequest {
  name?: string;
  currency_code?: string;
  number_format?: string;
  currency_symbol_first?: boolean;
  currency_display_symbol?: boolean;
  date_format?: string;
}

export interface CategoryMonthAllocation {
  category_id: string;
  group_id: string;
  name: string;
  note?: string | null;
  assigned_milliunits: number;
  activity_milliunits: number;
  available_milliunits: number;
  is_credit_card_payment: boolean;
  credit_card_account_id?: string | null;
  hidden: boolean;
  sort_order: number;
}

export interface PlanMonthSummary {
  month: string;
  ready_to_assign_milliunits: number;
  total_assigned_milliunits: number;
  total_activity_milliunits: number;
  total_available_milliunits: number;
  categories: CategoryMonthAllocation[];
}

export interface AllocationUpdate {
  category_id: string;
  assigned_milliunits: number;
}

export interface UpdateMonthAllocationsRequest {
  allocations: AllocationUpdate[];
}

export interface Category {
  id: string;
  plan_id: string;
  group_id: string;
  name: string;
  note?: string | null;
  is_inflow_category: boolean;
  is_credit_card_payment: boolean;
  credit_card_account_id?: string | null;
  hidden: boolean;
  sort_order: number;
}

export interface CategoryGroup {
  id: string;
  plan_id: string;
  name: string;
  is_system: boolean;
  hidden: boolean;
  sort_order: number;
}

export interface CategoryGroupWithCategories extends CategoryGroup {
  categories: Category[];
}

export interface CreateCategoryGroupRequest {
  name: string;
  sort_order?: number;
}

export interface UpdateCategoryGroupRequest {
  name?: string;
  hidden?: boolean;
  sort_order?: number;
}

export interface CreateCategoryRequest {
  group_id: string;
  name: string;
  note?: string | null;
  sort_order?: number;
}

export interface UpdateCategoryRequest {
  group_id?: string;
  name?: string;
  note?: string | null;
  hidden?: boolean;
  sort_order?: number;
}

export type AccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH";

export interface Account {
  id: string;
  plan_id: string;
  name: string;
  type: AccountType;
  on_budget: boolean;
  closed: boolean;
  balance_milliunits: number;
  cleared_balance_milliunits: number;
  uncleared_balance_milliunits: number;
  note?: string | null;
  transfer_payee_id?: string | null;
  last_reconciled_at?: string | null;
  sort_order: number;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  on_budget?: boolean;
  initial_balance_milliunits: number;
  note?: string | null;
  sort_order?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  note?: string | null;
  closed?: boolean;
  sort_order?: number;
}

export interface ReconcileAccountRequest {
  statement_balance_milliunits: number;
  create_adjustment_transaction?: boolean;
}

export interface Payee {
  id: string;
  plan_id: string;
  name: string;
  transfer_account_id?: string | null;
}

export interface CreatePayeeRequest {
  name: string;
}

export interface UpdatePayeeRequest {
  name: string;
}

export type ClearedStatus = "UNCLEARED" | "CLEARED" | "RECONCILED";
export type EditableClearedStatus = "UNCLEARED" | "CLEARED";
export type FlagColor = "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE" | "PURPLE";

export interface Transaction {
  id: string;
  plan_id: string;
  account_id: string;
  category_id?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  date: string;
  amount_milliunits: number;
  memo?: string | null;
  cleared: ClearedStatus;
  approved: boolean;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  flag_color?: FlagColor | null;
}

export interface TransactionPage {
  data: Transaction[];
  next_cursor: string | null;
}

export interface SaveTransactionRequest {
  account_id: string;
  category_id?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  date: string;
  amount_milliunits: number;
  memo?: string | null;
  cleared?: EditableClearedStatus;
  approved?: boolean;
  transfer_account_id?: string | null;
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export class ApiProblemError extends Error {
  public readonly status: number;
  public readonly problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP Error ${problem.status}`);
    this.name = "ApiProblemError";
    this.status = problem.status;
    this.problem = problem;
  }
}
