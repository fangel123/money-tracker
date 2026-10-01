import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScannerContent } from "./ScannerContent";

export default async function ScannerPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true).order("name"),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true).order("sort_order"),
  ]);

  return <ScannerContent userId={user.id} categories={categories || []} accounts={accounts || []} />;
}
