import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlannerContent } from "./PlannerContent";

export default async function PlannerPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: planners, error: plannersError } = await supabase
    .from("planners")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: plannerItems } = await supabase
    .from("planner_items")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: accounts } = await supabase.from("accounts").select("id, name, type").eq("is_active", true);
  const { data: categories } = await supabase.from("categories").select("id, name, type").eq("is_active", true);

  return (
    <PlannerContent 
      user={user} 
      initialPlanners={planners || []} 
      initialItems={plannerItems || []} 
      accounts={accounts || []}
      categories={categories || []}
    />
  );
}
