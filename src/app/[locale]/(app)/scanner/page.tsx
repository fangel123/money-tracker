import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScannerContent } from "./ScannerContent";

export default async function ScannerPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: categories } = await supabase.from("categories").select("*").order("name");
  const { data: accounts } = await supabase.from("accounts").select("*").order("name");

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-4">
      <ScannerContent 
        user={user} 
        categories={categories || []} 
        accounts={accounts || []} 
      />
    </div>
  );
}
