"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { transactionSchema, type TransactionFormData } from "@/lib/validators/transaction";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTransaction(data: TransactionFormData) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const parsed = transactionSchema.safeParse({
    ...data,
    amount: Number(data.amount),
    recurring_rule: data.recurring_rule || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const validatedData = parsed.data;

  const { error } = await supabase.from("transactions").insert({
    ...validatedData,
    user_id: user.id,
    amount: validatedData.amount,
    category_id: validatedData.type === "transfer" ? null : validatedData.category_id,
    to_account_id: validatedData.type === "transfer" ? validatedData.to_account_id : null,
    recurring_rule: validatedData.recurring_rule || null,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");

  return { success: true };
}

export async function updateTransaction(id: string, data: TransactionFormData) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const parsed = transactionSchema.safeParse({
    ...data,
    amount: Number(data.amount),
    recurring_rule: data.recurring_rule || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const validatedData = parsed.data;

  const { error } = await supabase
    .from("transactions")
    .update({
      ...validatedData,
      amount: validatedData.amount,
      category_id: validatedData.type === "transfer" ? null : validatedData.category_id,
      to_account_id: validatedData.type === "transfer" ? validatedData.to_account_id : null,
      recurring_rule: validatedData.recurring_rule || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");

  return { success: true };
}

export async function deleteTransaction(id: string) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");

  return { success: true };
}

export async function duplicateTransaction(id: string) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !transaction) {
    return { error: "Transaksi tidak ditemukan", success: false };
  }

  const { error } = await supabase.from("transactions").insert({
    ...transaction,
    id: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date: new Date().toISOString().split("T")[0],
    is_recurring: false,
    recurring_rule: null,
    parent_transaction_id: id,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function bulkDeleteTransactions(ids: string[]) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.from("transactions").delete().in("id", ids).eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");

  return { success: true };
}