import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPeriodRange } from "@/lib/utils";
import { DashboardContent } from "./DashboardContent";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = createServerSupabaseClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations({ locale, namespace: "dashboard" });

  // Rentang bulan berjalan, supaya ringkasan Dashboard menghitung SEMUA transaksi
  // bulan ini (bukan cuma 5 baris terakhir seperti sebelumnya)
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  // Fetch dashboard data
  const [
    { data: transactions },
    { data: accounts },
    { data: budgets },
    { data: categories },
    { data: debts },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lt("date", monthEnd)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true),
    supabase.from("budgets").select("*, category:categories(*)").eq("user_id", user.id),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true),
    supabase.from("debts").select("*").eq("user_id", user.id).eq("status", "active"),
  ]);

  // Hitung "spent" tiap budget dari transaksi expense sepanjang tahun ini,
  // lalu filter yang sudah melewati alert_threshold-nya masing-masing untuk ditampilkan sebagai peringatan
  const budgetAlerts: any[] = [];
  if (budgets && budgets.length > 0) {
    const yearStart = `${now.getFullYear()}-01-01`;
    const { data: yearTxs } = await supabase
      .from("transactions")
      .select("category_id, amount, date")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", yearStart);

    for (const b of budgets) {
      const { start, end } = getPeriodRange(b.period, now);
      const spent = (yearTxs || [])
        .filter((t) => t.category_id === b.category_id && t.date >= start && t.date < end)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const percent = b.amount > 0 ? (spent / Number(b.amount)) * 100 : 0;
      if (percent >= (b.alert_threshold ?? 80)) {
        budgetAlerts.push({ ...b, spent, percent: Math.round(percent) });
      }
    }
  }

  // Utang/piutang yang jatuh tempo dalam 7 hari ke depan (atau sudah lewat)
  const in7Days = new Date(now);
  in7Days.setDate(now.getDate() + 7);
  const in7DaysStr = `${in7Days.getFullYear()}-${String(in7Days.getMonth() + 1).padStart(2, "0")}-${String(in7Days.getDate()).padStart(2, "0")}`;
  const debtReminders = (debts || []).filter((d) => d.due_date && d.due_date <= in7DaysStr);

  return (
    <DashboardContent
      locale={locale as "id" | "en"}
      user={user}
      transactions={transactions || []}
      accounts={accounts || []}
      budgets={budgets || []}
      categories={categories || []}
      budgetAlerts={budgetAlerts}
      debtReminders={debtReminders}
    />
  );
}