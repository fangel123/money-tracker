import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScannerContent } from "./ScannerContent";

export default async function ScannerPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: categories } = await supabase.from("categories").select("*").order("name");
  const { data: accounts } = await supabase.from("accounts").select("*").order("name");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <ScannerContent 
        user={user} 
        categories={categories || []} 
        accounts={accounts || []} 
      />
    </div>
  );
}
