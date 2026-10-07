import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { readPayday } from "@/lib/payday";
import { RecurringContent, type RecurringItem } from "./RecurringContent";

export default async function RecurringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Transaksi induk yang berulang; anak-anaknya dibuat oleh cron harian
  const [{ data: roots }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount, date, note, account_id, to_account_id, category_id, recurring_rule")
      .eq("user_id", user.id)
      .eq("is_recurring", true)
      .is("parent_transaction_id", null)
      .order("date", { ascending: true }),
    supabase.from("categories").select("id, name, color, icon").eq("user_id", user.id),
    supabase.from("accounts").select("id, name").eq("user_id", user.id),
  ]);

  // Tanggal terakhir yang sudah dibuat per rantai, untuk menghitung jadwal berikutnya
  const ids = (roots || []).map((r) => r.id);
  const lastDates: Record<string, string> = {};
  if (ids.length) {
    const { data: children } = await supabase
      .from("transactions")
      .select("parent_transaction_id, date")
      .in("parent_transaction_id", ids)
      .order("date", { ascending: false });
    for (const c of children || []) {
      const key = String(c.parent_transaction_id);
      if (!lastDates[key]) lastDates[key] = String(c.date).slice(0, 10);
    }
  }

  const items: RecurringItem[] = (roots || [])
    .filter((r) => r.recurring_rule)
    .map((r) => ({
      ...r,
      date: String(r.date).slice(0, 10),
      lastDate: lastDates[r.id] && lastDates[r.id] > String(r.date).slice(0, 10) ? lastDates[r.id] : String(r.date).slice(0, 10),
      category: (categories || []).find((c) => c.id === r.category_id) ?? null,
      accountName: (accounts || []).find((a) => a.id === r.account_id)?.name ?? "Akun",
      toAccountName: (accounts || []).find((a) => a.id === r.to_account_id)?.name ?? null,
    })) as RecurringItem[];

  // Gaji terakhir yang dicatat manual (kategori bernama "gaji") — bisa langsung dijadikan rutin
  // tanpa membuat transaksi gaji baru yang dobel
  const salaryCategoryIds = (categories || []).filter((c) => /gaji/i.test(c.name)).map((c) => c.id);
  let lastSalary: { id: string; date: string; amount: number } | null = null;
  if (salaryCategoryIds.length && !items.some((i) => i.type === "income")) {
    const { data } = await supabase
      .from("transactions")
      .select("id, date, amount")
      .eq("user_id", user.id)
      .eq("type", "income")
      .in("category_id", salaryCategoryIds)
      .is("parent_transaction_id", null)
      .order("date", { ascending: false })
      .limit(1);
    if (data?.[0]) lastSalary = { id: data[0].id, date: String(data[0].date).slice(0, 10), amount: Number(data[0].amount) };
  }

  return <RecurringContent items={items} payday={readPayday(user.user_metadata)} lastSalary={lastSalary} />;
}
