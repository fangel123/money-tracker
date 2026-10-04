/**
 * Siklus gajian: dari hari gaji cair sampai sehari sebelum gajian berikutnya.
 * Tanggal gajian disimpan di auth user_metadata.payday (1–31), tanpa migrasi.
 */

export function readPayday(metadata: Record<string, unknown> | null | undefined): number | null {
  const raw = Number(metadata?.payday);
  return Number.isInteger(raw) && raw >= 1 && raw <= 31 ? raw : null;
}

/**
 * Perkiraan hari gaji cair di bulan tertentu: tanggal gajian (dipotong ke akhir bulan kalau
 * bulannya lebih pendek), lalu mundur ke Jumat kalau jatuh di Sabtu/Minggu.
 * Libur nasional tidak diketahui di sini — itu ditangani oleh pemasukan asli (lihat getPayCycle).
 */
export function expectedPayday(year: number, month: number, payday: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const d = new Date(year, month, Math.min(payday, lastDay));
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

export function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY = 86_400_000;
/** Gaji yang cair sampai sekian hari sebelum perkiraan (mis. karena tanggal merah) tetap dihitung untuk siklus barunya. */
const EARLY_WINDOW_DAYS = 7;

export interface PayCycle {
  /** Inklusif. */
  start: Date;
  /** Eksklusif: perkiraan gajian berikutnya. */
  end: Date;
  dayIndex: number;
  length: number;
  daysLeft: number;
}

/**
 * Siklus yang sedang berjalan. Tanpa tanggal gajian → bulan kalender.
 * Dengan tanggal gajian, awal siklus = hari gaji benar-benar masuk: pemasukan terbesar dalam
 * 7 hari sebelum perkiraan gajian (yang nilainya minimal separuh pemasukan terbesar yang diketahui,
 * supaya transfer kecil tidak dikira gaji). Kalau belum ada, pakai tanggal perkiraannya.
 */
export function getPayCycle(today: Date, payday: number | null, incomes: { date: string; amount: number }[]): PayCycle {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start: Date;
  let end: Date;

  if (!payday) {
    start = new Date(t.getFullYear(), t.getMonth(), 1);
    end = new Date(t.getFullYear(), t.getMonth() + 1, 1);
  } else {
    const biggest = Math.max(0, ...incomes.map((i) => Number(i.amount)));
    const anchor = (year: number, month: number) => {
      const expected = expectedPayday(year, month, payday);
      const from = toDateStr(new Date(expected.getTime() - EARLY_WINDOW_DAYS * DAY));
      const to = toDateStr(expected);
      const salary = incomes
        .filter((i) => {
          const d = i.date.slice(0, 10);
          return d >= from && d <= to && Number(i.amount) >= biggest * 0.5;
        })
        .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
      return salary ? new Date(`${salary.date.slice(0, 10)}T00:00:00`) : expected;
    };

    // Awal siklus = anchor terakhir yang sudah lewat (atau hari ini)
    let startMonth = new Date(t.getFullYear(), t.getMonth() + 1, 1);
    start = anchor(startMonth.getFullYear(), startMonth.getMonth());
    while (start > t) {
      startMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() - 1, 1);
      start = anchor(startMonth.getFullYear(), startMonth.getMonth());
    }
    end = expectedPayday(startMonth.getFullYear(), startMonth.getMonth() + 1, payday);
    // Gaji bulan depan cair lebih awal dari perkiraan bulan ini? (jarang, tapi jaga agar end > start)
    if (end <= start) end = new Date(start.getTime() + 30 * DAY);
  }

  const length = Math.round((end.getTime() - start.getTime()) / DAY);
  const dayIndex = Math.round((t.getTime() - start.getTime()) / DAY) + 1;
  return { start, end, length, dayIndex, daysLeft: Math.max(1, length - dayIndex + 1) };
}
