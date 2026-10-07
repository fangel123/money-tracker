/**
 * "Catat cepat": ubah teks bebas seperti "angkot 7rb tunai" atau "+gaji 3jt bca" jadi transaksi.
 * Murni di browser (tanpa AI) — cepat dan gratis. Kategori/akun ditebak dari riwayat transaksi
 * pengguna dulu, baru dari kata kunci umum.
 */

export interface QuickAccount {
  id: string;
  name: string;
  type?: string;
}
export interface QuickCategory {
  id: string;
  name: string;
  type: "income" | "expense";
}
export interface QuickHistory {
  type: string;
  amount: number;
  note: string | null;
  account_id: string;
  category_id: string | null;
  date: string;
}

export interface QuickDraft {
  type: "income" | "expense";
  amount: number;
  note: string;
  accountId: string | null;
  categoryId: string | null;
}

/** Favorit disimpan di auth user_metadata.favorites (maks 8), tanpa migrasi. */
export interface QuickFavorite {
  id: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  accountId: string;
  categoryId: string;
}

const INCOME_WORDS = ["gaji", "terima", "dapat", "dapet", "bonus", "thr", "masuk", "refund", "cashback"];
const FILLER = new Set(["pakai", "pake", "via", "dari", "ke", "di", "buat", "untuk", "bayar", "beli", "rp", "+"]);

/** Kata kunci → potongan nama kategori yang umum. Dicocokkan ke nama kategori milik pengguna. */
const KEYWORDS: [string[], string[]][] = [
  [["makan", "kopi", "ngopi", "nasi", "jajan", "minum", "sarapan", "bakso", "mie", "ayam", "snack", "indomaret", "alfamart", "warteg", "angkringan"], ["makan"]],
  [["angkot", "krl", "kereta", "gojek", "grab", "ojek", "ojol", "bensin", "parkir", "tol", "busway", "transjakarta", "mrt", "lrt", "bus", "taksi", "st"], ["transport"]],
  [["listrik", "pulsa", "internet", "intenet", "wifi", "token", "pdam", "air", "kuota", "admin", "tagihan", "bpjs"], ["tagihan"]],
  [["obat", "dokter", "apotek", "vitamin", "klinik"], ["kesehatan"]],
  [["baju", "sepatu", "shopee", "tokopedia", "belanja", "celana", "skincare"], ["belanja"]],
  [["nonton", "bioskop", "game", "netflix", "spotify", "youtube", "hiburan"], ["hiburan"]],
  [["buku", "kursus", "kuliah", "sekolah", "les"], ["pendidikan"]],
  [["gaji", "salary", "thr"], ["gaji"]],
  [["freelance", "project", "proyek"], ["freelance"]],
];

/** "7rb" → 7000, "1,5jt" → 1500000, "25.000" → 25000, "25" → 25000 (kebiasaan "25" = 25 ribu). */
export function parseAmountToken(token: string): number | null {
  const m = /^(\d+(?:[.,]\d+)*)(rb|ribu|k|jt|juta)?$/i.exec(token.replace(/^rp\.?/i, ""));
  if (!m) return null;
  const unit = (m[2] || "").toLowerCase();
  let raw = m[1];
  let value: number;
  if (unit) {
    // Dengan satuan, koma/titik = desimal: 1,5jt / 1.5jt
    value = Number(raw.replace(",", "."));
    value *= unit === "jt" || unit === "juta" ? 1_000_000 : 1_000;
  } else {
    // Tanpa satuan, titik/koma = pemisah ribuan: 25.000 / 25,000
    raw = raw.replace(/[.,]/g, "");
    value = Number(raw);
    if (value > 0 && value < 1000) value *= 1000;
  }
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function parseQuickEntry(
  text: string,
  { accounts, categories, history }: { accounts: QuickAccount[]; categories: QuickCategory[]; history: QuickHistory[] }
): QuickDraft | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/);
  let amount = 0;
  let accountId: string | null = null;
  const noteTokens: string[] = [];

  for (const token of tokens) {
    const clean = token.replace(/^\+/, "");
    if (!amount) {
      const n = parseAmountToken(clean);
      if (n) {
        amount = n;
        continue;
      }
    }
    const lower = clean.toLowerCase();
    if (!accountId) {
      const acc =
        accounts.find((a) => a.name.toLowerCase() === lower) ||
        ((lower === "cash" || lower === "tunai") ? accounts.find((a) => a.type === "cash" || a.name.toLowerCase() === "tunai") : undefined);
      if (acc) {
        accountId = acc.id;
        continue;
      }
    }
    if (FILLER.has(lower)) continue;
    noteTokens.push(clean);
  }

  const note = noteTokens.join(" ");
  const noteWords = words(note);
  const type: "income" | "expense" =
    trimmed.startsWith("+") || noteWords.some((w) => INCOME_WORDS.includes(w)) ? "income" : "expense";

  // 1) Riwayat: transaksi bertipe sama yang catatannya paling mirip (kata pertama sama / banyak kata sama)
  let categoryId: string | null = null;
  let historyAccount: string | null = null;
  if (noteWords.length) {
    let best = 0;
    for (const h of history) {
      if (h.type !== type || !h.note) continue;
      const hw = words(h.note);
      const overlap = noteWords.filter((w) => hw.includes(w)).length + (hw[0] === noteWords[0] ? 1 : 0);
      if (overlap > best) {
        best = overlap;
        categoryId = h.category_id;
        historyAccount = h.account_id;
      }
    }
  }

  // 2) Kata kunci umum
  const ofType = categories.filter((c) => c.type === type);
  if (!categoryId) {
    for (const [keys, names] of KEYWORDS) {
      if (!noteWords.some((w) => keys.includes(w))) continue;
      const cat = ofType.find((c) => names.some((n) => c.name.toLowerCase().includes(n)));
      if (cat) {
        categoryId = cat.id;
        break;
      }
    }
  }
  if (categoryId && !ofType.some((c) => c.id === categoryId)) categoryId = null;

  // 3) Akun: yang disebut > dari riwayat yang mirip > paling sering dipakai untuk kategori ini
  //    (mis. Transport biasanya Gopay) > paling sering dipakai secara umum
  if (!accountId) accountId = historyAccount;
  if (!accountId) {
    const mostUsed = (items: QuickHistory[]) => {
      const counts = new Map<string, number>();
      for (const h of items) counts.set(h.account_id, (counts.get(h.account_id) || 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    };
    accountId = (categoryId && mostUsed(history.filter((h) => h.category_id === categoryId))) || mostUsed(history) || accounts[0]?.id || null;
  }
  if (accountId && !accounts.some((a) => a.id === accountId)) accountId = accounts[0]?.id ?? null;

  return {
    type,
    amount,
    note: note ? note.charAt(0).toUpperCase() + note.slice(1) : "",
    accountId,
    categoryId: categoryId ?? ofType.find((c) => /lain/i.test(c.name))?.id ?? ofType[0]?.id ?? null,
  };
}

/** Transaksi yang sering diulang (catatan + jumlah + akun sama, ≥3 kali) — kandidat favorit. */
export function frequentEntries(history: QuickHistory[], exclude: QuickFavorite[], limit = 4): QuickFavorite[] {
  const groups = new Map<string, { item: QuickFavorite; count: number }>();
  for (const h of history) {
    if ((h.type !== "income" && h.type !== "expense") || !h.note || !h.category_id) continue;
    const key = `${h.type}|${h.note.trim().toLowerCase()}|${Number(h.amount)}|${h.account_id}`;
    const g = groups.get(key);
    if (g) g.count++;
    else
      groups.set(key, {
        count: 1,
        item: { id: key, type: h.type, amount: Number(h.amount), note: h.note.trim(), accountId: h.account_id, categoryId: h.category_id },
      });
  }
  const taken = new Set(exclude.map((f) => `${f.type}|${f.note.toLowerCase()}|${f.amount}|${f.accountId}`));
  return [...groups.values()]
    .filter((g) => g.count >= 3 && !taken.has(g.item.id))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((g) => g.item);
}

export function readFavorites(metadata: Record<string, unknown> | null | undefined): QuickFavorite[] {
  const raw = metadata?.favorites;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (f): f is QuickFavorite =>
        !!f && typeof f === "object" && typeof f.id === "string" && typeof f.amount === "number" && typeof f.accountId === "string"
    )
    .slice(0, 8);
}
