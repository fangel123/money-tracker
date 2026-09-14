import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatisticsContent } from "./StatisticsContent";

export default async function StatisticsPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch all transactions for the current year or month to build statistics
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01T00:00:00.000Z`;
  
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, category:categories(name, type, color)")
    .gte("date", startDate)
    .order("date", { ascending: true });

  return (
    <StatisticsContent 
      user={user} 
      transactions={transactions || []} 
    />
  );
}
