import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AIAdvisorContent } from "./AIAdvisorContent";

export default async function AIAdvisorPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <AIAdvisorContent user={user} />
    </div>
  );
}
