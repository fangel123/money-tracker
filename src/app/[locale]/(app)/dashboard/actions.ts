"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readFavorites, type QuickFavorite } from "@/lib/quick-add";

/**
 * Simpan favorit "Catat cepat" ke auth user_metadata.
 * Lewat server action supaya Dashboard tidak perlu memuat supabase-js di browser.
 */
export async function saveFavorites(favorites: QuickFavorite[]) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Validasi bentuk data & batasi jumlahnya (readFavorites menyaring item yang tidak valid)
  const clean = readFavorites({ favorites }).map((f) => ({
    id: f.id,
    type: f.type === "income" ? "income" : "expense",
    amount: Math.max(0, Math.round(Number(f.amount))),
    note: String(f.note ?? "").slice(0, 100),
    accountId: f.accountId,
    categoryId: f.categoryId,
  }));

  const { error } = await supabase.auth.updateUser({ data: { favorites: clean } });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
