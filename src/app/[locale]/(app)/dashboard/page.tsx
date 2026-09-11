import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations({ locale, namespace: "dashboard" });

  // Fetch dashboard data
  const [
    { data: transactions },
    { data: accounts },
    { data: budgets },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true),
  ]);

  return (
    <DashboardContent
      locale={locale as "id" | "en" | "zh" | "ja" | "ko"}
      user={user}
      transactions={transactions || []}
      accounts={accounts || []}
      budgets={budgets || []}
      categories={categories || []}
    />
  );
}