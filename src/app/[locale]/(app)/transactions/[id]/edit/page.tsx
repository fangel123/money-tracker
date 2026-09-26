import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TransactionFormContent } from "../../TransactionFormContent";

export default async function TransactionEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !transaction) {
    notFound();
  }

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    transaction.type === "transfer"
      ? Promise.resolve({ data: [] as any[] })
      : supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .eq("type", transaction.type),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true),
  ]);

  return (
    <TransactionFormContent
      locale={locale as "id" | "en"}
      userId={user.id}
      initialType={(transaction.type === "transfer" ? "expense" : transaction.type) as "income" | "expense"}
      categories={categories || []}
      accounts={accounts || []}
      isEdit={true}
      transactionId={transaction.id}
      initialData={{
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category_id,
        account_id: transaction.account_id,
        to_account_id: transaction.to_account_id,
        date: transaction.date,
        note: transaction.note || "",
        is_recurring: transaction.is_recurring,
        recurring_rule: transaction.recurring_rule || undefined,
      }}
    />
  );
}
