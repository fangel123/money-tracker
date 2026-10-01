import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AIAdvisorContent } from "./AIAdvisorContent";

export default async function AIAdvisorPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-4">
      <AIAdvisorContent user={user} />
    </div>
  );
}
