"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Plus, Edit, Square, MoreVertical, Banknote, Repeat } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRefreshData } from "@/hooks/use-refresh-data";
import {
  FREQUENCY_LABEL,
  anchorDayOf,
  todayJakarta,
  upcomingOccurrence,
  type RecurringRuleConfig,
} from "@/lib/recurring";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { CategorySticker } from "@/components/common/CategorySticker";
import { Mascot } from "@/components/common/Mascot";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface RecurringItem {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  lastDate: string;
  note: string | null;
  recurring_rule: RecurringRuleConfig;
  category: { name: string; color: string | null; icon: string | null } | null;
  accountName: string;
  toAccountName: string | null;
}

/** Perkiraan nilai per bulan, untuk ringkasan di atas. */
function monthlyEquivalent(amount: number, rule: RecurringRuleConfig) {
  const n = Math.max(1, rule.interval || 1);
  const perPeriod = { daily: 30, weekly: 30 / 7, monthly: 1, yearly: 1 / 12 }[rule.frequency];
  return (Number(amount) * perPeriod) / n;
}

function describe(rule: RecurringRuleConfig, date: string) {
  const n = Math.max(1, rule.interval || 1);
  const base = n > 1 ? `Tiap ${n} ${({ daily: "hari", weekly: "minggu", monthly: "bulan", yearly: "tahun" })[rule.frequency]}` : FREQUENCY_LABEL[rule.frequency];
  if (rule.frequency !== "monthly") return base;
  const day = rule.day || anchorDayOf(date);
  return rule.follow_payday ? `${base} · tgl ${day}, ikut gajian` : `${base} · tgl ${day}`;
}

const formatDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

export function RecurringContent({
  items,
  payday,
  lastSalary,
}: {
  items: RecurringItem[];
  payday: number | null;
  lastSalary: { id: string; date: string; amount: number } | null;
}) {
  const refreshData = useRefreshData();
  const [stopping, setStopping] = useState<RecurringItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = todayJakarta();

  const active = items.filter((i) => !i.recurring_rule.paused);
  const monthlyIncome = active.filter((i) => i.type === "income").reduce((s, i) => s + monthlyEquivalent(i.amount, i.recurring_rule), 0);
  const monthlyExpense = active.filter((i) => i.type === "expense").reduce((s, i) => s + monthlyEquivalent(i.amount, i.recurring_rule), 0);
  const hasSalary = items.some((i) => i.type === "income");

  const updateRule = async (item: RecurringItem, patch: Partial<RecurringRuleConfig>, extra: Record<string, unknown> = {}, message: string) => {
    setBusyId(item.id);
    const { error } = await createBrowserSupabaseClient()
      .from("transactions")
      .update({ recurring_rule: { ...item.recurring_rule, ...patch }, ...extra })
      .eq("id", item.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Gagal menyimpan");
      return;
    }
    toast.success(message);
    refreshData();
  };

  const pause = (item: RecurringItem) => updateRule(item, { paused: true }, {}, "Dijeda. Tidak ada transaksi baru sampai dilanjutkan.");
  // Lanjutkan tanpa membuat susulan untuk tanggal yang terlewat selama dijeda
  const resume = (item: RecurringItem) => updateRule(item, { paused: false, resume_from: today }, {}, "Dilanjutkan.");
  const stop = (item: RecurringItem) =>
    updateRule(item, { end_date: today }, { is_recurring: false }, "Dihentikan. Transaksi yang sudah tercatat tetap ada.");

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Rutin"
        description="Gaji, tagihan, dan langganan yang tercatat otomatis"
        action={
          <Button asChild>
            <Link href="/transactions/new?recurring=1">
              <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
              <span className="hidden sm:inline">Rutin Baru</span>
            </Link>
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5">
          <StatCard color="#9be7c4" label="Masuk rutin / bln" value={<span className="text-[22px] sm:text-[28px]">{formatCurrency(Math.round(monthlyIncome))}</span>} note={`${active.filter((i) => i.type === "income").length} aktif`} icon={<Banknote />} />
          <StatCard color="#ff9ebb" label="Keluar rutin / bln" value={<span className="text-[22px] sm:text-[28px]">{formatCurrency(Math.round(monthlyExpense))}</span>} note={`${active.filter((i) => i.type === "expense").length} aktif`} icon={<Repeat />} />
          <StatCard
            className="col-span-2 lg:col-span-1"
            label="Sisa setelah rutin"
            value={<span className="text-[22px] sm:text-[28px]">{formatCurrency(Math.round(monthlyIncome - monthlyExpense))}</span>}
            note="perkiraan per bulan"
            valueClassName={monthlyIncome - monthlyExpense < 0 ? "text-expense" : undefined}
          />
        </div>
      )}

      {!hasSalary && (
        <section className="flex flex-col gap-4 rounded-cartoon border-3 border-line bg-cartoon-lime p-5 text-ink shadow-cartoon sm:flex-row sm:items-center">
          <Mascot size={64} className="shrink-0" />
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">Catat gaji otomatis</h2>
            <p className="text-sm font-extrabold">
              Gaji tercatat sendiri tiap bulan{payday ? ` tanggal ${payday}` : ""}. Kalau jatuh Sabtu/Minggu, otomatis maju ke Jumat.
              {lastSalary &&
                ` Pakai gaji terakhirmu (${formatDay(lastSalary.date)}, ${formatCurrency(lastSalary.amount)}) sebagai patokan, jadi tidak ada yang dobel.`}
              {!payday && " Atur dulu Tanggal gajian di Pengaturan supaya ikut aturan Sabtu/Minggu."}
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 bg-white text-ink">
            <Link
              href={
                lastSalary
                  ? `/transactions/${lastSalary.id}/edit?recurring=1&payday=1`
                  : "/transactions/new?type=income&recurring=1&payday=1"
              }
            >
              Atur gaji
            </Link>
          </Button>
        </section>
      )}

      {items.length === 0 ? (
        <section className="flex flex-col items-center gap-2 rounded-cartoon border-3 border-line bg-card px-6 py-12 text-center shadow-cartoon">
          <h2 className="font-display text-xl font-semibold">Belum ada transaksi rutin</h2>
          <p className="max-w-md text-sm font-bold text-muted-foreground">
            Tagihan internet, kos, langganan, atau cicilan bisa dicatat otomatis. Buat dari tombol Rutin Baru, atau aktifkan “Transaksi berulang” saat mencatat transaksi.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-5">
          {items.map((item, idx) => {
            const rule = item.recurring_rule;
            const next = upcomingOccurrence(item.lastDate, rule, anchorDayOf(item.date), today);
            const paused = Boolean(rule.paused);
            const title = item.note || (item.type === "transfer" ? `${item.accountName} → ${item.toAccountName}` : item.category?.name) || "Transaksi rutin";
            return (
              <article key={item.id} className={cn("flex flex-col gap-3 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon", paused && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <CategorySticker category={item.category} isTransfer={item.type === "transfer"} size="lg" tilt={idx % 2 ? 3 : -3} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-semibold">{title}</h3>
                    <p className="text-xs font-bold text-muted-foreground">
                      {describe(rule, item.date)} · {item.accountName}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-background" aria-label={`Aksi untuk ${title}`}>
                        <MoreVertical className="h-4 w-4" strokeWidth={3} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/transactions/${item.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" /> Ubah
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setStopping(item)} className="cursor-pointer text-destructive focus:text-destructive">
                        <Square className="mr-2 h-4 w-4" /> Hentikan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className={cn("font-display text-[28px] font-bold leading-none", item.type === "income" ? "text-income" : item.type === "expense" ? "text-expense" : "")}>
                  {item.type === "income" ? "+" : item.type === "expense" ? "−" : ""}
                  {formatCurrency(Number(item.amount))}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-black text-ink",
                      paused ? "bg-cartoon-sand" : "bg-cartoon-yellow"
                    )}
                  >
                    {paused ? "Dijeda" : next ? `Berikutnya ${formatDay(next)}` : "Selesai"}
                  </span>
                  <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => (paused ? resume(item) : pause(item))}>
                    {paused ? <Play className="mr-1.5 h-4 w-4" strokeWidth={3} /> : <Pause className="mr-1.5 h-4 w-4" strokeWidth={3} />}
                    {paused ? "Lanjutkan" : "Jeda"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!stopping} onOpenChange={(open) => !open && setStopping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hentikan “{stopping?.note || stopping?.category?.name || "transaksi rutin"}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Tidak akan ada transaksi baru lagi. Transaksi yang sudah tercatat tetap ada di halaman Transaksi. Kalau hanya ingin berhenti sementara, pakai Jeda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive"
              onClick={() => {
                if (stopping) stop(stopping);
                setStopping(null);
              }}
            >
              Hentikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
