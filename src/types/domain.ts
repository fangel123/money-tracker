export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  to_account_id: string | null; // diisi hanya kalau type === "transfer"
  amount: number;
  type: TransactionType;
  date: string; // ISO date string
  note: string | null;
  is_recurring: boolean;
  recurring_rule: RecurringRule | null;
  parent_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  account?: Account;
  to_account?: Account;
  category?: Category;
}

export interface RecurringRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  end_date?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  parent?: Category;
  children?: Category[];
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "credit_card" | "investment" | "other";
  currency: string;
  balance: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string | null;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
  // Relations
  category?: Category;
  // Computed
  spent?: number;
  remaining?: number;
  progress?: number;
  is_over_budget?: boolean;
  is_near_limit?: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  locale: string;
  theme: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  profile?: Profile;
}

// Summary types for dashboard
export interface MonthlySummary {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
  savings_rate: number;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  type: TransactionType;
  total: number;
  count: number;
  percentage: number;
}

export interface AccountSummary {
  account_id: string;
  account_name: string;
  account_type: string;
  account_icon: string | null;
  account_color: string | null;
  currency: string;
  balance: number;
  income: number;
  expense: number;
}
export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: "payable" | "receivable";
  amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: "active" | "paid";
  created_at: string;
  updated_at: string;
}

export interface Planner {
  id: string;
  user_id: string;
  title: string;
  notes_top: string | null;
  notes_bottom: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PlannerCategory = "income" | "wajib" | "tabungan" | "kebutuhan";

export interface PlannerItem {
  id: string;
  planner_id: string;
  category: PlannerCategory;
  type: "income" | "expense";
  name: string;
  amount: number;
  status_tag: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
