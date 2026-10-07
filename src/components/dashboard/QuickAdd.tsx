"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Zap, Star, X, ChevronDown, Check } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toDateStr } from "@/lib/payday";
import { useRefreshData } from "@/hooks/use-refresh-data";
import { createTransaction } from "@/app/[locale]/(app)/transactions/actions";
import { saveFavorites } from "@/app/[locale]/(app)/dashboard/actions";
import {
  frequentEntries,
  parseQuickEntry,
  type QuickAccount,
  type QuickCategory,
  type QuickDraft,
  type QuickFavorite,
  type QuickHistory,
} from "@/lib/quick-add";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface QuickAddProps {
  accounts: QuickAccount[];
  categories: QuickCategory[];
  history: QuickHistory[];
  initialFavorites: QuickFavorite[];
  className?: string;
}

const MAX_FAVORITES = 8;
const DISMISSED_KEY = "koin-dismissed-suggestions";
/** Kunci yang sama dengan id saran di frequentEntries. */
const suggestionKey = (f: Pick<QuickFavorite, "type" | "note" | "amount" | "accountId">) =>
  `${f.type}|${f.note.trim().toLowerCase()}|${f.amount}|${f.accountId}`;
const chip = "inline-flex h-8 items-center gap-1 rounded-full border-2 px-3 text-xs font-black";

/** Kartu "Catat cepat" di Dashboard: ketik sekali → transaksi, plus tombol favorit sekali klik. */
export function QuickAdd({ accounts, categories, history, initialFavorites, className }: QuickAddProps) {
  const refreshData = useRefreshData();
  const [text, setText] = useState("");
  const [override, setOverride] = useState<Partial<QuickDraft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<QuickFavorite[]>(initialFavorites);
  const [editing, setEditing] = useState(false);
  // Dari pintasan ikon aplikasi (PWA): /dashboard?quick=1 → langsung fokus ke kotak Catat cepat
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("quick") !== "1") return;
    const input = document.getElementById("quick-add");
    input?.scrollIntoView({ block: "center" });
    input?.focus();
  }, []);

  // Saran yang disembunyikan (termasuk favorit yang dihapus) — supaya tidak langsung muncul lagi sebagai saran
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
    } catch {
      setDismissed([]);
    }
  }, []);
  const dismiss = (key: string) => {
    const next = [...new Set([...dismissed, key])].slice(-50);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // abaikan storage diblokir
    }
  };

  const parsed = useMemo(() => parseQuickEntry(text, { accounts, categories, history }), [text, accounts, categories, history]);
  const draft = parsed ? { ...parsed, ...override } : null;
  const suggestions = useMemo(
    () => frequentEntries(history, favorites, 8).filter((s) => !dismissed.includes(s.id)).slice(0, Math.max(0, 4 - favorites.length)),
    [history, favorites, dismissed]
  );

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "Pilih akun";
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Pilih kategori";
  const label = (f: Pick<QuickFavorite, "note" | "amount">) => `${f.note} ${formatCurrency(f.amount)}`;

  const save = async (entry: { type: "income" | "expense"; amount: number; note: string; accountId: string | null; categoryId: string | null }, key: string) => {
    if (!entry.amount) {
      toast.error("Tulis jumlahnya, misal 7rb atau 25.000");
      return false;
    }
    if (!entry.accountId || !entry.categoryId) {
      toast.error("Pilih akun dan kategori dulu");
      return false;
    }
    setSaving(key);
    const result = await createTransaction({
      type: entry.type,
      amount: entry.amount,
      note: entry.note,
      account_id: entry.accountId,
      category_id: entry.categoryId,
      date: toDateStr(new Date()),
      is_recurring: false,
    });
    setSaving(null);
    if (!result.success) {
      toast.error(result.error || "Gagal menyimpan");
      return false;
    }
    toast.success(`Tercatat: ${entry.note || categoryName(entry.categoryId)} ${formatCurrency(entry.amount)}`);
    refreshData();
    return true;
  };

  const persistFavorites = async (next: QuickFavorite[]) => {
    const previous = favorites;
    setFavorites(next);
    const result = await saveFavorites(next);
    if (!result.success) {
      setFavorites(previous);
      toast.error("Gagal menyimpan favorit");
    }
  };

  const addFavorite = (f: Omit<QuickFavorite, "id">) => {
    if (favorites.length >= MAX_FAVORITES) return toast.error(`Maksimal ${MAX_FAVORITES} favorit`);
    persistFavorites([...favorites, { ...f, id: crypto.randomUUID() }]);
    toast.success("Ditambahkan ke favorit");
  };

  const submit = async (alsoFavorite = false) => {
    if (!draft) return;
    const ok = await save(draft, "draft");
    if (!ok) return;
    if (alsoFavorite && draft.accountId && draft.categoryId) {
      addFavorite({ type: draft.type, amount: draft.amount, note: draft.note, accountId: draft.accountId, categoryId: draft.categoryId });
    }
    setText("");
    setOverride({});
  };

  const ofType = categories.filter((c) => c.type === (draft?.type ?? "expense"));

  return (
    <section className={cn("rounded-cartoon border-3 border-line bg-card p-4 shadow-cartoon sm:p-5", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2.5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2.5 border-ink bg-cartoon-yellow text-ink">
          <Zap className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <label className="sr-only" htmlFor="quick-add">
          Catat cepat
        </label>
        <Input
          id="quick-add"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOverride({});
          }}
          placeholder="Catat cepat: angkot 7rb tunai, kopi 14rb gopay, +gaji 3jt bca"
          autoComplete="off"
          className="h-11 flex-1"
        />
        <Button type="submit" disabled={!draft?.amount || saving === "draft"} className="h-11 shrink-0">
          <Check className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
          <span className="hidden sm:inline">Simpan</span>
        </Button>
      </form>

      {/* Pratinjau: bisa diubah sebelum disimpan */}
      {draft && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
          <button
            type="button"
            onClick={() => setOverride((o) => ({ ...o, type: draft.type === "income" ? "expense" : "income", categoryId: null }))}
            className={cn(chip, "border-ink text-ink", draft.type === "income" ? "bg-cartoon-mint" : "bg-cartoon-pink")}
            title="Ganti jenis"
          >
            {draft.type === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
          <span className={cn(chip, "border-line", !draft.amount && "text-destructive")}>
            {draft.amount ? formatCurrency(draft.amount) : "Jumlah belum ada"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(chip, "border-line bg-background")}>
              {categoryName(draft.categoryId)} <ChevronDown className="h-3 w-3" strokeWidth={3} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              {ofType.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => setOverride((o) => ({ ...o, categoryId: c.id }))}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(chip, "border-line bg-background")}>
              {accountName(draft.accountId)} <ChevronDown className="h-3 w-3" strokeWidth={3} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {accounts.map((a) => (
                <DropdownMenuItem key={a.id} onClick={() => setOverride((o) => ({ ...o, accountId: a.id }))}>
                  {a.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {draft.note && <span className="truncate text-xs font-bold text-muted-foreground">“{draft.note}”</span>}
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!draft.amount || saving === "draft"}
            className="ml-auto inline-flex items-center gap-1 text-xs font-black text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Star className="h-3.5 w-3.5" strokeWidth={3} /> Simpan + jadikan favorit
          </button>
        </div>
      )}

      {/* Favorit & saran */}
      {(favorites.length > 0 || suggestions.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-divider pt-3">
          {favorites.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={saving === f.id || editing}
                onClick={() => save(f, f.id)}
                className={cn(
                  chip,
                  "border-ink bg-cartoon-lime text-ink shadow-cartoon-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-70"
                )}
                title="Catat sekarang"
              >
                <Star className="h-3 w-3 fill-current" strokeWidth={3} />
                {label(f)}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    dismiss(suggestionKey(f));
                    persistFavorites(favorites.filter((x) => x.id !== f.id));
                    toast.success("Dihapus dari favorit");
                  }}
                  className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-cartoon-red text-ink"
                  aria-label={`Hapus favorit ${f.note}`}
                  title="Hapus dari favorit"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              )}
            </span>
          ))}
          {!editing &&
            suggestions.map((s) => (
              <span key={s.id} className={cn(chip, "border-dashed border-line pr-1")}>
                <button type="button" disabled={saving === s.id} onClick={() => save(s, s.id)} title="Catat sekarang">
                  {label(s)}
                </button>
                <button
                  type="button"
                  onClick={() => addFavorite({ type: s.type, amount: s.amount, note: s.note, accountId: s.accountId, categoryId: s.categoryId })}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent"
                  aria-label={`Jadikan favorit: ${s.note}`}
                  title="Jadikan favorit"
                >
                  <Star className="h-3 w-3" strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(s.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                  aria-label={`Sembunyikan saran: ${s.note}`}
                  title="Sembunyikan saran"
                >
                  <X className="h-3 w-3" strokeWidth={3} />
                </button>
              </span>
            ))}
          {favorites.length > 0 && (
            <button type="button" onClick={() => setEditing((e) => !e)} className="ml-auto text-xs font-black text-muted-foreground hover:text-foreground">
              {editing ? "Selesai" : "Atur favorit"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
