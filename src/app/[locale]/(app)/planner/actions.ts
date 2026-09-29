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

  // 1. Insert into transactions (ambil id-nya supaya item planner bisa "mengingat" transaksi ini)
  const { data: newTx, error: txError } = await supabase
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
    )
    .select("id")
    .single();

  if (txError || !newTx) throw new Error("Gagal menyimpan transaksi: " + (txError?.message || "tidak ada data"));

  // 2. Update planner item: tandai lunas + simpan tautan ke transaksinya
  const tag = type === "income" ? "diterima!" : "bayar lunas!";
  const { error: updateError } = await supabase
    .from("planner_items")
    .update({ status_tag: tag, transaction_id: newTx.id })
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

  // Kalau item ini punya tautan ke transaksi, hapus transaksinya juga.
  // Trigger saldo di database otomatis mengembalikan uang ke akun yang dipakai.
  const { data: item } = await supabase
    .from("planner_items")
    .select("transaction_id")
    .eq("id", itemId)
    .single();

  let deletedTransaction = false;
  if (item?.transaction_id) {
    const { error: delError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", item.transaction_id)
      .eq("user_id", user.id);
    if (delError) throw new Error("Gagal menghapus transaksi: " + delError.message);
    deletedTransaction = true;
  }

  const { error: updateError } = await supabase
    .from("planner_items")
    .update({ status_tag: null, transaction_id: null })
    .eq("id", itemId);

  if (updateError) throw new Error("Gagal mengupdate planner: " + updateError.message);

  revalidatePath("/[locale]", "layout");
  // deletedTransaction = false artinya item lama yang dibayar sebelum fitur tautan ada
  return { success: true, deletedTransaction };
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

// Bawa cuma item yang BELUM lunas dari planner lama ke planner baru
// (beda dari createPlanner+duplicateFromId yang menyalin SEMUA item).
export async function carryOverUnpaidItems(fromPlannerId: string, newTitle: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Buat planner baru
  const { data: newPlanner, error: plannerError } = await supabase
    .from("planners")
    .insert({ user_id: user.id, title: newTitle, notes_top: "", notes_bottom: "" })
    .select()
    .single();
  if (plannerError) throw new Error(plannerError.message);

  // 2. Ambil semua item planner lama, filter yang belum lunas
  //    (pola sama seperti "isLunas" di tampilan: tag mengandung "lunas" atau "diterima")
  const { data: oldItems } = await supabase
    .from("planner_items")
    .select("*")
    .eq("planner_id", fromPlannerId)
    .order("sort_order", { ascending: true });

  const unpaidItems = (oldItems || []).filter(
    (i) => !(i.status_tag?.includes("lunas") || i.status_tag?.includes("diterima"))
  );

  if (unpaidItems.length > 0) {
    const itemsToInsert = unpaidItems.map((item) => ({
      planner_id: newPlanner.id,
      category: item.category,
      type: item.type,
      name: item.name,
      amount: item.amount,
      status_tag: null,
      sort_order: item.sort_order,
    }));
    const { error: insertError } = await supabase.from("planner_items").insert(itemsToInsert);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/[locale]/planner", "layout");
  return { planner: newPlanner, carriedCount: unpaidItems.length };
}
