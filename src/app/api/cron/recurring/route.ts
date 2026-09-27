import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// Route ini dipanggil otomatis oleh Vercel Cron (lihat vercel.json).
// Jangan cache — harus selalu jalan fresh tiap dipanggil.
export const dynamic = "force-dynamic";

type RecurringRule = {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  end_date?: string;
};

function addInterval(dateStr: string, frequency: RecurringRule["frequency"], interval: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  switch (frequency) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + interval);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + interval * 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + interval);
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + interval);
      break;
  }
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  // Lindungi endpoint ini dari akses publik — Vercel Cron otomatis mengirim
  // header ini kalau env var CRON_SECRET diset (lihat instruksi setup).
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

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
      const rule = root.recurring_rule as RecurringRule;
      if (!rule?.frequency) continue;

      // Cari tanggal PALING BARU dalam rantai ini (transaksi induk + semua anak
      // hasil generate sebelumnya), supaya cron yang jalan berkali-kali tidak
      // pernah membuat transaksi duplikat untuk tanggal yang sama.
      const { data: chain } = await supabase
        .from("transactions")
        .select("date")
        .or(`id.eq.${root.id},parent_transaction_id.eq.${root.id}`)
        .order("date", { ascending: false })
        .limit(1);

      let lastDate: string = chain?.[0]?.date || root.date;
      let nextDate = addInterval(lastDate, rule.frequency, rule.interval || 1);
      let iterations = 0;

      // Catch-up: kalau cron sempat tidak jalan beberapa hari, semua occurrence
      // yang terlewat tetap dibuat satu-satu (maks 366 supaya tidak infinite loop).
      while (
        nextDate <= today &&
        (!rule.end_date || nextDate <= rule.end_date) &&
        iterations < 366
      ) {
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: root.user_id,
          account_id: root.account_id,
          category_id: root.category_id,
          to_account_id: root.to_account_id,
          amount: root.amount,
          type: root.type,
          date: nextDate,
          note: root.note,
          is_recurring: false,
          parent_transaction_id: root.id,
        });
        if (insertError) throw insertError;

        created++;
        lastDate = nextDate;
        nextDate = addInterval(lastDate, rule.frequency, rule.interval || 1);
        iterations++;
      }
    } catch (e: unknown) {
      errors.push(`${root.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ processed: roots?.length || 0, created, errors });
}
