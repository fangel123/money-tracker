import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DebtsContent } from "./DebtsContent";

export default async function DebtsPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Coba ambil data debts, tangkap error jika tabel belum ada
  const [{ data: debts, error }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("debts").select("*").order("created_at", { ascending: false }),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true),
  ]);

  return (
    <DebtsContent 
      user={user} 
      initialDebts={debts || []} 
      dbReady={!error} 
      accounts={accounts || []}
      categories={categories || []}
    />
  );
}
