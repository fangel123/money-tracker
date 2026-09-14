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
  const { data: debts, error } = await supabase.from("debts").select("*").order("created_at", { ascending: false });

  return (
    <DebtsContent 
      user={user} 
      initialDebts={debts || []} 
      dbReady={!error} 
    />
  );
}
