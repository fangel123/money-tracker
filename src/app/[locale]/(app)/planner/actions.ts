"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPlanner(title: string, notesTop: string, notesBottom: string, duplicateFromId?: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("planners")
    .insert({
      user_id: user.id,
      title,
      notes_top: notesTop,
      notes_bottom: notesBottom
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (duplicateFromId) {
    const { data: items } = await supabase.from("planner_items").select("*").eq("planner_id", duplicateFromId);
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        planner_id: data.id,
        category: item.category,
        type: item.type,
        name: item.name,
        amount: item.amount,
        status_tag: null, // Reset status
      }));
      await supabase.from("planner_items").insert(itemsToInsert);
    }
  }

  revalidatePath("/[locale]/planner", "layout");
  return data;
}

export async function updatePlanner(id: string, title: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("planners").update({ title }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/planner", "layout");
}

export async function deletePlanner(id: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("planners").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/planner", "layout");
}

export async function createPlannerItem(
  plannerId: string, 
  category: "income" | "wajib" | "tabungan" | "kebutuhan", 
  type: "income" | "expense", 
  name: string, 
  amount: number, 
  statusTag: string = ""
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Item baru selalu ditaruh setelah item terakhir di kategori yang sama,
  // supaya urutan tampil konsisten (bukan kebetulan ikut urutan insert DB)
  const { data: maxRow } = await supabase
    .from("planner_items")
    .select("sort_order")
    .eq("planner_id", plannerId)
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("planner_items")
    .insert({
      planner_id: plannerId,
      category,
      type,
      name,
      amount,
      status_tag: statusTag || null,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/planner", "layout");
  return data;
}

export async function realizePlannerItem(
  itemId: string, 
  amount: number, 
  type: "income" | "expense", 
  name: string, 
  accountId: string, 
  categoryId: string,
  toAccountId?: string
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Jika toAccountId diisi, item ini direalisasikan sebagai Transfer Antar Akun
  // (mis. "Angkot" = ambil cash dari BCA, "Kereta + Isi Gopay" = top up dari BCA ke Gopay)
  // bukan sebagai pengeluaran biasa, supaya tidak dihitung ganda di laporan.
  const isTransfer = !!toAccountId;

  if (isTransfer && toAccountId === accountId) {
    throw new Error("Akun asal dan tujuan transfer tidak boleh sama");
  }

  // 1. Insert into transactions
  const { error: txError } = await supabase
    .from("transactions")
    .insert(
      isTransfer
        ? {
            user_id: user.id,
            account_id: accountId,
            to_account_id: toAccountId,
            category_id: null,
            amount: amount,
            type: "transfer",
            date: new Date().toISOString(),
            note: `(Planner) ${name}`,
          }
        : {
            user_id: user.id,
            account_id: accountId,
            category_id: categoryId,
            amount: amount,
            type: type,
            date: new Date().toISOString(),
            note: `(Planner) ${name}`,
          }
    );

  if (txError) throw new Error("Gagal menyimpan transaksi: " + txError.message);

  // 2. Update planner item status to 'bayar lunas!' or 'diterima'
  const tag = type === "income" ? "diterima!" : "bayar lunas!";
  const { error: updateError } = await supabase
    .from("planner_items")
    .update({ status_tag: tag })
    .eq("id", itemId);

  if (updateError) throw new Error("Gagal mengupdate planner: " + updateError.message);

  revalidatePath("/[locale]", "layout"); // Revalidate everything (dashboard, planner, accounts)
  return { success: true };
}

export async function deletePlannerItem(itemId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("planner_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/planner", "layout");
}
export async function unrealizePlannerItem(itemId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error: updateError } = await supabase
    .from("planner_items")
    .update({ status_tag: null })
    .eq("id", itemId);

  if (updateError) throw new Error("Gagal mengupdate planner: " + updateError.message);

  revalidatePath("/[locale]", "layout");
  return { success: true };
}

export async function updatePlannerItem(itemId: string, name: string, amount: number) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("planner_items")
    .update({ name, amount })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/planner", "layout");
}
