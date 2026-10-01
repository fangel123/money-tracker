import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatisticsContent, type StatTransaction } from "./StatisticsContent";

export default async function StatisticsPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Mulai 1 Januari tahun lalu: cukup untuk periode "Tahun" + perbandingan dengan tahun lalu
  const startDate = `${new Date().getFullYear() - 1}-01-01`;

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, type, amount, date, category_id, category:categories(name, color, icon)")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .order("date", { ascending: true });

  return <StatisticsContent transactions={(transactions || []) as unknown as StatTransaction[]} />;
}
