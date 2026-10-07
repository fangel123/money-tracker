import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TransactionFormContent } from "../../TransactionFormContent";
import { readPayday } from "@/lib/payday";

export default async function TransactionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ recurring?: string; payday?: string }>;
}) {
  const { locale, id } = await params;
  // ?recurring=1&payday=1 — dari halaman Rutin: jadikan transaksi ini (mis. gaji terakhir) rutin ikut tanggal gajian
  const { recurring, payday: followPayday } = await searchParams;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
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
      payday={readPayday(user.user_metadata)}
      initialData={{
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category_id,
        account_id: transaction.account_id,
        to_account_id: transaction.to_account_id,
        date: transaction.date,
        note: transaction.note || "",
        is_recurring: recurring === "1" || transaction.is_recurring,
        recurring_rule:
          transaction.recurring_rule ||
          (recurring === "1"
            ? {
                frequency: "monthly" as const,
                interval: 1,
                ...(followPayday === "1" && readPayday(user.user_metadata)
                  ? { follow_payday: true, day: readPayday(user.user_metadata) as number }
                  : {}),
              }
            : undefined),
      }}
    />
  );
}
