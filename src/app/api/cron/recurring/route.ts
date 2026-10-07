import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { anchorDayOf, dueOccurrences, todayJakarta, type RecurringRuleConfig } from "@/lib/recurring";

// Route ini dipanggil otomatis oleh Vercel Cron (lihat vercel.json).
// Jangan cache — harus selalu jalan fresh tiap dipanggil.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Lindungi endpoint ini dari akses publik — Vercel Cron otomatis mengirim
  // header ini kalau env var CRON_SECRET diset (lihat instruksi setup).
  // Tanpa CRON_SECRET endpoint ditolak, karena route ini memakai admin client.
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  // Cron jalan 18:00 UTC = 01:00 WIB; pakai tanggal WIB supaya tidak telat sehari
  const today = todayJakarta();

  // Ambil semua transaksi ROOT (induk) yang berulang, dari SEMUA user
  const { data: roots, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("is_recurring", true)
    .is("parent_transaction_id", null)
    .not("recurring_rule", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  const errors: string[] = [];

  for (const root of roots || []) {
    try {
      const rule = root.recurring_rule as RecurringRuleConfig;
      if (!rule?.frequency || rule.paused) continue;

      // Cari tanggal PALING BARU dalam rantai ini (transaksi induk + semua anak
      // hasil generate sebelumnya), supaya cron yang jalan berkali-kali tidak
      // pernah membuat transaksi duplikat untuk tanggal yang sama.
      const { data: chain } = await supabase
        .from("transactions")
        .select("date")
        .or(`id.eq.${root.id},parent_transaction_id.eq.${root.id}`)
        .order("date", { ascending: false })
        .limit(1);

      const lastDate = String(chain?.[0]?.date || root.date).slice(0, 10);

      // Catch-up: kalau cron sempat tidak jalan beberapa hari, semua tanggal yang
      // terlewat tetap dibuat (kecuali sebelum resume_from setelah dijeda).
      for (const date of dueOccurrences(lastDate, rule, anchorDayOf(String(root.date)), today)) {
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: root.user_id,
          account_id: root.account_id,
          category_id: root.category_id,
          to_account_id: root.to_account_id,
          amount: root.amount,
          type: root.type,
          date,
          note: root.note,
          is_recurring: false,
          parent_transaction_id: root.id,
        });
        if (insertError) throw insertError;
        created++;
      }
    } catch (e: unknown) {
      errors.push(`${root.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ processed: roots?.length || 0, created, errors });
}
