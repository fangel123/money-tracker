import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CategoriesContent } from "./CategoriesContent";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("type")
    .order("sort_order");

  return (
    <CategoriesContent
      locale={locale as "id" | "en"}
      userId={user.id}
      initialCategories={categories || []}
    />
  );
}