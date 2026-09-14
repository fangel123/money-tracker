import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransactionFormContent } from "../TransactionFormContent";

export default async function TransactionNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const { type } = await searchParams;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch categories and accounts for the form
  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id).eq("is_active", true).eq("type", type || "expense"),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true),
  ]);

  return (
    <TransactionFormContent
      locale={locale as "id" | "en"}
      userId={user.id}
      initialType={(type as "income" | "expense") || "expense"}
      categories={categories || []}
      accounts={accounts || []}
      isEdit={false}
    />
  );
}