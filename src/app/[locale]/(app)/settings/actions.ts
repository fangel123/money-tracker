"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function deleteAccount() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", success: false };
  }

  try {
    const admin = createAdminSupabaseClient();

    // Transaksi mereferensikan accounts/categories dengan ON DELETE RESTRICT,
    // jadi harus dihapus dulu supaya cascade dari auth.users tidak tertahan.
    const { error: txError } = await admin.from("transactions").delete().eq("user_id", user.id);
    if (txError) {
      return { error: txError.message, success: false };
    }

    // Menghapus user di auth.users meng-cascade ke profiles, accounts, categories,
    // budgets, goals, debts, planners, dan planner_items.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return { error: error.message, success: false };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error", success: false };
  }

  await supabase.auth.signOut();

  return { success: true };
}
