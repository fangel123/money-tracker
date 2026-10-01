"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, CalendarDays } from "lucide-react";
import { cn, formatCurrency, getPeriodRange } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Mascot } from "@/components/common/Mascot";
import { StatCard } from "@/components/common/StatCard";
import { CategorySticker } from "@/components/common/CategorySticker";

type Period = "weekly" | "monthly" | "yearly";

export interface StatTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  category_id: string | null;
  category?: { name: string; color: string | null; icon: string | null } | null;
}

const PERIODS: { value: Period; label: string; noun: string; prev: string }[] = [
  { value: "weekly", label: "Minggu", noun: "minggu ini", prev: "minggu lalu" },
  { value: "monthly", label: "Bulan", noun: "bulan ini", prev: "bulan lalu" },
  { value: "yearly", label: "Tahun", noun: "tahun ini", prev: "tahun lalu" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const FALLBACK_COLORS = ["#ffd447", "#8fd3ff", "#c9b6ff", "#ff9ebb", "#ffb86b", "#9be7c4", "#e4d6bc"];

/** Same reference date shifted one period back, for "vs last period" comparisons. */
function previousReference(period: Period, now: Date) {
  if (period === "weekly") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  if (period === "yearly") return new Date(now.getFullYear() - 1, now.getMonth(), 1);
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function sumBy(txs: StatTransaction[], type: "income" | "expense") {
  return txs.filter((t) => t.type === type).reduce((sum, t) => sum + Number(t.amount), 0);
}

function compact(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 10_000) return `Rp ${Math.round(n / 1_000).toLocaleString("id-ID")} rb`;
  return formatCurrency(n);
}

export function StatisticsContent({ transactions }: { transactions: StatTransaction[] }) {
  const [period, setPeriod] = useState<Period>("monthly");
  const meta = PERIODS.find((p) => p.value === period)!;

  const stats = useMemo(() => {
    const now = new Date();
    const inRange = (range: { start: string; end: string }) =>
      transactions.filter((t) => t.type !== "transfer" && t.date.slice(0, 10) >= range.start && t.date.slice(0, 10) < range.end);

    const range = getPeriodRange(period, now);
    const current = inRange(range);
    const previous = inRange(getPeriodRange(period, previousReference(period, now)));

    const income = sumBy(current, "income");
    const expense = sumBy(current, "expense");
    const prevIncome = sumBy(previous, "income");
    const prevExpense = sumBy(previous, "expense");

    // Hari yang sudah lewat di periode ini (termasuk hari ini), untuk rata-rata harian
    const start = new Date(`${range.start}T00:00:00`);
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);

    // Pengeluaran per kategori
    const byCategory = new Map<string, { name: string; color: string; icon: string | null; value: number; count: number }>();
    for (const t of current) {
      if (t.type !== "expense") continue;
      const key = t.category_id ?? "none";
      const entry = byCategory.get(key) ?? {
        name: t.category?.name ?? "Lainnya",
        color: t.category?.color || FALLBACK_COLORS[byCategory.size % FALLBACK_COLORS.length],
        icon: t.category?.icon ?? null,
        value: 0,
        count: 0,
      };
      entry.value += Number(t.amount);
      entry.count += 1;
      byCategory.set(key, entry);
    }
    const categories = Array.from(byCategory.values()).sort((a, b) => b.value - a.value);

    // 6 bulan terakhir (selalu per bulan, apa pun periodenya)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const r = getPeriodRange("monthly", d);
      const txs = inRange(r);
      return { label: MONTHS[d.getMonth()], income: sumBy(txs, "income"), expense: sumBy(txs, "expense") };
    });

    return { income, expense, prevIncome, prevExpense, daysElapsed, categories, months };
  }, [transactions, period]);

  const change = (curr: number, prev: number) => {
    if (prev <= 0) return null;
    const pct = Math.round(((curr - prev) / prev) * 100);
    return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}% dari ${meta.prev}`;
  };
  const savingsRate = stats.income > 0 ? Math.round(((stats.income - stats.expense) / stats.income) * 100) : null;
  const top = stats.categories[0];
  const topShare = top && stats.expense > 0 ? Math.round((top.value / stats.expense) * 100) : 0;

  const periodPills = (
    <div className="flex gap-2">
      {PERIODS.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={period === p.value ? "default" : "outline"}
          aria-pressed={period === p.value}
          onClick={() => setPeriod(p.value)}
          className="rounded-full px-5"
        >
          {p.label}
        </Button>
      ))}
    </div>
  );

  const kpiValue = (text: string) => <span className="text-[22px] sm:text-[28px] xl:text-[30px]">{text}</span>;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Statistik"
        description="Analisis pemasukan dan pengeluaran Anda"
        action={<div className="hidden lg:block">{periodPills}</div>}
      />
      <div className="lg:hidden">{periodPills}</div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <StatCard
          color="#9be7c4"
          label={`Pemasukan`}
          value={kpiValue(compact(stats.income))}
          note={change(stats.income, stats.prevIncome) ?? meta.noun}
          icon={<ArrowDownLeft />}
        />
        <StatCard
          color="#ff9ebb"
          label={`Pengeluaran`}
          value={kpiValue(compact(stats.expense))}
          note={change(stats.expense, stats.prevExpense) ?? meta.noun}
          icon={<ArrowUpRight />}
        />
        <StatCard
          color="#ffd447"
          label="Rasio tabungan"
          value={kpiValue(savingsRate === null ? "—" : `${savingsRate}%`)}
          note={savingsRate === null ? "Belum ada pemasukan" : savingsRate >= 20 ? "Target 20% ✓" : "Target 20%"}
          icon={<PiggyBank />}
        />
        <StatCard
          label="Rata-rata harian"
          value={kpiValue(formatCurrency(Math.round(stats.expense / stats.daysElapsed)))}
          note={`pengeluaran · ${stats.daysElapsed} hari`}
          icon={<CalendarDays />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Per kategori */}
        <section className="flex flex-col gap-4 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
          <h2 className="font-display text-xl font-semibold">Per kategori · {meta.noun}</h2>
          {stats.categories.length === 0 ? (
            <p className="py-6 text-center text-sm font-bold text-muted-foreground">Belum ada pengeluaran {meta.noun}.</p>
          ) : (
            <div className="flex items-center gap-5 lg:flex-col">
              <Donut segments={stats.categories} total={stats.expense} />
              <ul className="w-full min-w-0 flex-1 space-y-2.5">
                {stats.categories.slice(0, 6).map((c) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="h-4 w-4 shrink-0 rounded-[5px] border-2 border-ink" style={{ background: pastel(c.color) }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-black">{c.name}</span>
                    <span className="text-sm font-black">{Math.round((c.value / stats.expense) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Masuk vs keluar */}
        <section className="flex flex-col gap-3 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">Masuk vs keluar · 6 bulan</h2>
            <div className="flex gap-3.5 text-[13px] font-black">
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-[4px] border-2 border-ink bg-cartoon-mint" /> Masuk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-[4px] border-2 border-ink bg-cartoon-pink" /> Keluar
              </span>
            </div>
          </div>
          <MonthBars months={stats.months} />
        </section>

        {/* Paling boros + insight */}
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
            <h2 className="font-display text-xl font-semibold">Paling boros</h2>
            {stats.categories.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">Belum ada data.</p>
            ) : (
              <ol className="space-y-3">
                {stats.categories.slice(0, 4).map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2.5">
                    <span className="w-4 font-display text-lg font-bold">{i + 1}</span>
                    <CategorySticker category={{ icon: c.icon, color: c.color }} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{c.name}</p>
                      <p className="text-xs font-bold text-muted-foreground">{c.count} transaksi</p>
                    </div>
                    <span className="text-sm font-black text-expense">−{formatCurrency(c.value)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {top && (
            <section className="flex items-center gap-3 rounded-cartoon border-3 border-line bg-cartoon-orange p-4 text-ink shadow-cartoon">
              <Mascot size={52} mood={topShare >= 50 ? "worried" : "happy"} className="shrink-0" />
              <p className="text-[13px] font-extrabold">
                {top.name} makan {topShare}% pengeluaran {meta.noun}.{" "}
                {topShare >= 50 ? `Coba kasih budget ${top.name}, yuk!` : "Pengeluaranmu cukup merata 👍"}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Donut({ segments, total }: { segments: { name: string; color: string; value: number }[]; total: number }) {
  const r = 62;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 180 180" className="h-40 w-40 shrink-0 lg:h-48 lg:w-48" role="img" aria-label="Pengeluaran per kategori">
      {segments.map((s) => {
        const len = total > 0 ? (circ * s.value) / total : 0;
        const el = (
          <circle
            key={s.name}
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke={pastel(s.color)}
            strokeWidth="28"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 90 90)"
          />
        );
        offset += len;
        return el;
      })}
      <circle cx="90" cy="90" r="77" fill="none" stroke="rgb(var(--line))" strokeWidth="3" />
      <circle cx="90" cy="90" r="47" fill="rgb(var(--card))" stroke="rgb(var(--line))" strokeWidth="3" />
      <text x="90" y="95" textAnchor="middle" fontFamily="var(--font-fredoka)" fontWeight="700" fontSize="17" fill="rgb(var(--foreground))">
        {compact(total)}
      </text>
    </svg>
  );
}

function MonthBars({ months }: { months: { label: string; income: number; expense: number }[] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  return (
    <div className="flex h-56 items-end gap-3 pt-2 lg:h-auto lg:min-h-[240px] lg:flex-1">
      {months.map((m, i) => {
        const isCurrent = i === months.length - 1;
        return (
          <div key={m.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end gap-1">
              {(["income", "expense"] as const).map((key) => (
                <div
                  key={key}
                  title={`${key === "income" ? "Masuk" : "Keluar"} ${m.label}: ${formatCurrency(m[key])}`}
                  className={cn(
                    "flex-1 rounded-t-[10px] rounded-b-[4px] border-2.5 border-ink",
                    key === "income" ? "bg-cartoon-mint" : isCurrent ? "bg-cartoon-red" : "bg-cartoon-pink"
                  )}
                  style={{ height: `${Math.max(m[key] > 0 ? 4 : 0, (m[key] / max) * 100)}%` }}
                />
              ))}
            </div>
            <span className={cn("text-[13px] font-black", isCurrent ? "text-foreground" : "text-muted-foreground")}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Soften a category color into the cartoon pastel used by stickers. */
function pastel(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c * 0.55 + 255 * 0.45);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
