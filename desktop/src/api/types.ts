// API Types matching YNAB v26.160.1 be_* domain models

export interface PlanSummary {
  id: string;
  name: string;
  currency_code: string;
  number_format: string;
  currency_symbol_first: boolean;
  currency_display_symbol: boolean;
  date_format: string;
}

export interface Account {
  id: string;
  budget_id: string;
  name: string;
  type: string;
  on_budget: boolean;
  closed: boolean;
  balance_milliunits: number;
  cleared_balance_milliunits: number;
  uncleared_balance_milliunits: number;
  note: string | null;
  last_reconciled_at: string | null;
  sort_order: number;
}

export interface Category {
  id: string;
  budget_id: string;
  group_id: string;
  name: string;
  note: string | null;
  type: "DFT" | "DBT";
  internal_name: string | null;
  is_credit_card_payment: boolean;
  credit_card_account_id: string | null;
  hidden: boolean;
  sort_order: number;
  assigned_milliunits: number;
  activity_milliunits: number;
  available_milliunits: number;
  cash_overspent_milliunits: number;
  credit_overspent_milliunits: number;
  goal_type: string | null;
  goal_target_amount: number | null;
  goal_under_funded: number | null;
  goal_percentage_complete: number | null;
  is_snoozed: boolean;
}

export interface CategoryGroup {
  id: string;
  budget_id: string;
  name: string;
  is_system: boolean;
  internal_name: string | null;
  hidden: boolean;
  sort_order: number;
  categories: Category[];
}

export interface PlanMonthSummary {
  month: string;
  ready_to_assign_milliunits: number;
  total_assigned_milliunits: number;
  total_activity_milliunits: number;
  total_available_milliunits: number;
  funded_in_future_milliunits: number;
  category_groups: CategoryGroup[];
}

export interface Transaction {
  id: string;
  budget_id: string;
  account_id: string;
  payee_id: string | null;
  payee_name: string | null;
  category_id: string | null;
  category_name: string | null;
  date: string;
  amount_milliunits: number;
  memo: string | null;
  cleared: "Uncleared" | "Cleared" | "Reconciled";
  approved: boolean;
  flag: string | null;
  transfer_account_id: string | null;
  transfer_transaction_id: string | null;
}

export interface Payee {
  id: string;
  budget_id: string;
  name: string;
  internal_name: string | null;
  entities_account_id: string | null;
  auto_fill_subcategory_id: string | null;
}
