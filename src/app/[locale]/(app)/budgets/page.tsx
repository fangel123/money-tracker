import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BudgetsContent } from "./BudgetsContent";

export default async function BudgetsPage({
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

  const [{ data: budgets }, { data: categories }] = await Promise.all([
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true).eq("type", "expense"),
  ]);

  return (
    <BudgetsContent
      locale={locale as "id" | "en"}
      userId={user.id}
      initialBudgets={budgets || []}
      initialCategories={categories || []}
    />
  );
}