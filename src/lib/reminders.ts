import { formatCurrency, getPeriodRange } from "@/lib/utils";

/** Disimpan di auth user_metadata.reminders — tidak perlu kolom/migrasi baru. */
export interface ReminderPrefs {
  budget: boolean;
  debt: boolean;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { budget: true, debt: true };

export function readReminderPrefs(metadata: Record<string, unknown> | null | undefined): ReminderPrefs {
  const raw = (metadata?.reminders ?? {}) as Partial<ReminderPrefs>;
  return {
    budget: typeof raw.budget === "boolean" ? raw.budget : DEFAULT_REMINDER_PREFS.budget,
    debt: typeof raw.debt === "boolean" ? raw.debt : DEFAULT_REMINDER_PREFS.debt,
  };
}

export interface Reminder {
  /** Stabil per hari, dipakai supaya notifikasi browser tidak muncul berulang. */
  id: string;
  kind: "budget" | "debt";
  severity: "warning" | "danger";
  title: string;
  detail: string;
  href: string;
}

interface BudgetInput {
  id: string;
  category_id: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  alert_threshold: number | null;
  category?: { name: string } | null;
}

interface DebtInput {
  id: string;
  name: string;
  type: "payable" | "receivable";
  remaining_amount: number;
  due_date: string | null;
}

interface ExpenseInput {
  category_id: string | null;
  amount: number;
  date: string;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Budget yang sudah melewati batas peringatannya, dan utang/piutang yang jatuh tempo besok atau sudah lewat. */
export function computeReminders({
  budgets,
  expenses,
  debts,
  prefs,
  now = new Date(),
}: {
  budgets: BudgetInput[];
  expenses: ExpenseInput[];
  debts: DebtInput[];
  prefs: ReminderPrefs;
  now?: Date;
}): Reminder[] {
  const reminders: Reminder[] = [];
  const today = toDateStr(now);
  const tomorrow = toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  if (prefs.budget) {
    for (const b of budgets) {
      const { start, end } = getPeriodRange(b.period, now);
      const spent = expenses
        .filter((t) => t.category_id === b.category_id && t.date.slice(0, 10) >= start && t.date.slice(0, 10) < end)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const percent = Number(b.amount) > 0 ? (spent / Number(b.amount)) * 100 : 0;
      // alert_threshold disimpan sebagai pecahan (0.8 = 80%)
      const raw = Number(b.alert_threshold ?? 0.8);
      const threshold = raw <= 1 ? raw * 100 : raw;
      if (percent < threshold) continue;

      const over = percent >= 100;
      const name = b.category?.name ?? "Budget";
      reminders.push({
        id: `budget:${b.id}:${start}:${over ? "over" : "near"}`,
        kind: "budget",
        severity: over ? "danger" : "warning",
        title: over ? `Budget ${name} lewat batas` : `Budget ${name} sudah ${Math.round(percent)}%`,
        detail: `${formatCurrency(spent)} dari ${formatCurrency(Number(b.amount))}`,
        href: "/budgets",
      });
    }
  }

  if (prefs.debt) {
    for (const d of debts) {
      if (!d.due_date || d.due_date > tomorrow) continue;
      const overdue = d.due_date < today;
      const label = d.type === "payable" ? "Utang" : "Piutang";
      const when = overdue ? "lewat jatuh tempo" : d.due_date === today ? "jatuh tempo hari ini" : "jatuh tempo besok";
      reminders.push({
        id: `debt:${d.id}:${d.due_date}:${overdue ? "overdue" : "due"}`,
        kind: "debt",
        severity: overdue ? "danger" : "warning",
        title: `${label} “${d.name}” ${when}`,
        detail: `Sisa ${formatCurrency(Number(d.remaining_amount))}`,
        href: "/debts",
      });
    }
  }

  // Yang paling mendesak di atas
  return reminders.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "danger" ? -1 : 1));
}
