import { expectedPayday, toDateStr } from "@/lib/payday";

/**
 * Aturan transaksi rutin, disimpan di kolom JSONB transactions.recurring_rule pada transaksi induk.
 * Field tambahan bersifat opsional, jadi tidak perlu migrasi.
 */
export interface RecurringRuleConfig {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  end_date?: string;
  /** Bulanan: tanggal patokan (1–31). Kalau tidak diisi, pakai tanggal transaksi induk. */
  day?: number;
  /** Bulanan: ikuti aturan gajian — Sabtu/Minggu maju ke Jumat. */
  follow_payday?: boolean;
  /** Dijeda: cron tidak membuat transaksi baru. */
  paused?: boolean;
  /** Setelah dilanjutkan: tanggal sebelum ini dilewati (tidak dibuat susulan). */
  resume_from?: string;
}

export const FREQUENCY_LABEL: Record<RecurringRuleConfig["frequency"], string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

function parse(dateStr: string) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Tanggal bulanan dengan hari patokan, dipotong ke akhir bulan (31 → 30/28). */
function monthlyDate(year: number, month: number, day: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

/** Kejadian berikutnya setelah `lastDate` (YYYY-MM-DD). `anchorDay` = tanggal transaksi induk. */
export function nextOccurrence(lastDate: string, rule: RecurringRuleConfig, anchorDay: number): string {
  const interval = Math.max(1, rule.interval || 1);
  const last = parse(lastDate);

  if (rule.frequency === "daily") return toDateStr(new Date(last.getFullYear(), last.getMonth(), last.getDate() + interval));
  if (rule.frequency === "weekly") return toDateStr(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 7 * interval));
  if (rule.frequency === "yearly") return toDateStr(monthlyDate(last.getFullYear() + interval, last.getMonth(), anchorDay));

  const day = rule.day || anchorDay;
  if (rule.follow_payday) {
    // Tanggal gajian bisa maju ke bulan sebelumnya (mis. tgl 1 jatuh Sabtu → Jumat akhir bulan),
    // jadi cari bulan pertama yang perkiraan gajiannya benar-benar setelah lastDate.
    let m = new Date(last.getFullYear(), last.getMonth() + interval, 1);
    let candidate = expectedPayday(m.getFullYear(), m.getMonth(), day);
    if (candidate <= last) {
      m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      candidate = expectedPayday(m.getFullYear(), m.getMonth(), day);
    }
    return toDateStr(candidate);
  }
  return toDateStr(monthlyDate(last.getFullYear(), last.getMonth() + interval, day));
}

/**
 * Tanggal-tanggal yang perlu dibuat sampai `today` (inklusif), mulai setelah `lastDate`.
 * Menghormati jeda, tanggal berhenti, dan resume_from. Dibatasi supaya tidak loop tanpa akhir.
 */
export function dueOccurrences(lastDate: string, rule: RecurringRuleConfig, anchorDay: number, today: string, limit = 366): string[] {
  if (rule.paused) return [];
  const dates: string[] = [];
  let next = nextOccurrence(lastDate, rule, anchorDay);
  for (let i = 0; i < limit && next <= today && (!rule.end_date || next <= rule.end_date); i++) {
    if (!rule.resume_from || next >= rule.resume_from) dates.push(next);
    next = nextOccurrence(next, rule, anchorDay);
  }
  return dates;
}

/** Kejadian berikutnya yang akan datang (untuk ditampilkan), atau null kalau sudah berakhir. */
export function upcomingOccurrence(lastDate: string, rule: RecurringRuleConfig, anchorDay: number, today: string): string | null {
  let next = nextOccurrence(lastDate, rule, anchorDay);
  for (let i = 0; i < 400 && (next < today || (rule.resume_from && next < rule.resume_from)); i++) {
    next = nextOccurrence(next, rule, anchorDay);
  }
  if (rule.end_date && next > rule.end_date) return null;
  return next;
}

/** Hari ini menurut WIB — cron Vercel berjalan di UTC. */
export function todayJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

export function anchorDayOf(dateStr: string) {
  return Number(dateStr.slice(8, 10));
}
