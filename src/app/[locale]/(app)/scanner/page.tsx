import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScannerContent } from "./ScannerContent";
import { SCAN_PREFIX, type RecentScan } from "@/lib/scan";

export default async function ScannerPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [{ data: categories }, { data: accounts }, { data: recentScans }] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true).order("name"),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true).order("sort_order"),
    // Transaksi dari scanner ditandai dengan catatan berawalan "(Scan) "
    supabase
      .from("transactions")
      .select("id, amount, date, note, category:categories(name, color, icon)")
      .eq("user_id", user.id)
      .like("note", `${SCAN_PREFIX}%`)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <ScannerContent
      userId={user.id}
      categories={categories || []}
      accounts={accounts || []}
      recentScans={(recentScans || []) as unknown as RecentScan[]}
    />
  );
}
