import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoalsContent } from "./GoalsContent";

export default async function GoalsPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Coba ambil data goals, jika error (tabel belum ada), tangkap errornya
  const [{ data: goals, error }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("goals").select("*").order("created_at", { ascending: false }),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true),
  ]);

  return (
    <GoalsContent 
      user={user} 
      initialGoals={goals || []} 
      dbReady={!error} 
      accounts={accounts || []}
      categories={categories || []}
    />
  );
}
