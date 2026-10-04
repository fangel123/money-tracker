"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, ArrowUp, ArrowDown, AlertTriangle, CalendarClock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Transaction, Account, Budget, Category, User } from "@/types/domain";
import { Mascot } from "@/components/common/Mascot";
import { Sticker, stickerTilt } from "@/components/common/Sticker";
import { CategorySticker } from "@/components/common/CategorySticker";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { getPayCycle, toDateStr } from "@/lib/payday";

interface DashboardContentProps {
  locale: "id" | "en";
  user: User;
  displayName: string | null;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  categories: Category[];
  budgetAlerts: (Budget & { spent: number; percent: number })[];
  debtReminders: any[];
  /** Tanggal gajian (1–31) dari Pengaturan; null = pakai bulan kalender. */
  payday: number | null;
}

const MENU_HREFS = ["/budgets", "/scanner", "/goals", "/debts", "/planner", "/statistics", "/ai-advisor", "/accounts"];
const mainMenuItems = MENU_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href)!);

const ACCOUNT_COLORS = ["#8fd3ff", "#ffd447", "#9be7c4", "#ff9ebb", "#c9b6ff", "#ffb86b"];

const card = "rounded-cartoon border-3 border-line bg-card shadow-cartoon";

export function DashboardContent({
  locale,
  displayName,
  transactions,
  accounts,
  categories,
  budgetAlerts,
  debtReminders,
  payday,
}: DashboardContentProps) {
  const ct = useTranslations("common");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [leftView, setLeftView] = useState<"recent" | "calendar">("recent");
  const intlLocale = locale === "id" ? "id-ID" : "en-US";

  // Calculate summary
  const currentMonth = new Date().toISOString().slice(0, 7);
  // Kalender tetap per bulan kalender
  const monthlyTransactions = transactions.filter((tx) => tx.date.startsWith(currentMonth));

  // Ringkasan & budget harian per siklus gajian (atau per bulan kalender kalau tanggal gajian belum diatur),
  // supaya gaji tanggal 25 tetap terhitung sampai gajian berikutnya
  const cycle = getPayCycle(
    new Date(),
    payday,
    transactions.filter((tx) => tx.type === "income").map((tx) => ({ date: tx.date, amount: Number(tx.amount) }))
  );
  const cycleStart = toDateStr(cycle.start);
  const cycleEnd = toDateStr(cycle.end);
  const cycleTransactions = transactions.filter((tx) => tx.date.slice(0, 10) >= cycleStart && tx.date.slice(0, 10) < cycleEnd);
  const income = cycleTransactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount), 0);
  const expense = cycleTransactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + Number(tx.amount), 0);
  const periodLabel = payday ? "Siklus gajian ini" : "Bulan ini";
  const nextPaydayLabel = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" }).format(cycle.end);

  // Sisa uang siklus ini dibagi sisa hari sampai gajian berikutnya (termasuk hari ini)
  const dailyBudgetRemaining = Math.max(0, Math.floor((income - expense) / cycle.daysLeft));

  // Progres Pengeluaran (Needs, Wants, Savings) — mapping sederhana dari nama kategori; sisanya dihitung sebagai kebutuhan
  const wantsKeywords = ["hiburan", "belanja", "hobi", "liburan", "jajan", "keinginan"];
  const savingsKeywords = ["tabungan", "investasi", "darurat", "saham", "reksa dana"];

  let needsTotal = 0;
  let wantsTotal = 0;
  let savingsTotal = 0;

  cycleTransactions.forEach((tx) => {
    if (tx.type === "expense") {
      const catName = categories.find((c) => c.id === tx.category_id)?.name?.toLowerCase() || "";
      if (savingsKeywords.some((k) => catName.includes(k))) {
        savingsTotal += tx.amount;
      } else if (wantsKeywords.some((k) => catName.includes(k))) {
        wantsTotal += tx.amount;
      } else {
        needsTotal += tx.amount;
      }
    }
  });

  const totalBudget = income || 5000000; // Asumsi jika tidak ada pemasukan
  const needsPercent = Math.min(100, Math.round((needsTotal / (totalBudget * 0.5)) * 100)); // Target 50%
  const wantsPercent = Math.min(100, Math.round((wantsTotal / (totalBudget * 0.3)) * 100)); // Target 30%
  const savingsPercent = Math.min(100, Math.round((savingsTotal / (totalBudget * 0.2)) * 100)); // Target 20%

  const progressBars = [
    { label: "Kebutuhan", percent: needsPercent, color: "#c9b6ff", status: needsPercent < 80 ? "Masih aman" : needsPercent < 100 ? "Hati-hati" : "Melebihi target" },
    { label: "Keinginan", percent: wantsPercent, color: "#ffb86b", status: wantsPercent < 80 ? "Masih aman" : wantsPercent < 100 ? "Hati-hati" : "Melebihi target" },
    { label: "Tabungan", percent: savingsPercent, color: "#9be7c4", status: savingsPercent > 80 ? "Sangat baik" : "Perlu ditingkatkan" },
  ];

  // Calendar
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday first
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthName = `${monthNames[month]} ${year}`;

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace(/\.0$/, "")}JT`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}RB`;
    return amount.toString();
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const recentTransactions = transactions.slice(0, 7);

  const mascotLine =
    expense === 0
      ? `Suppeeerrr! Belum ada pengeluaran ${payday ? "siklus ini" : "bulan ini"}.`
      : dailyBudgetRemaining > 0
        ? "Sisa jajan hari ini masih aman. Yuk, tahan checkout dulu!"
        : "Pengeluaran sudah menyalip pemasukan. Pelan-pelan dulu, ya!";

  const hasAlerts = budgetAlerts.length > 0 || debtReminders.length > 0;

  return (
    <div className="space-y-5 pb-4 lg:grid lg:grid-cols-4 lg:gap-5 lg:space-y-0">
      {/* Greeting (mobile — desktop shows the page title in the top bar) */}
      <div className="lg:hidden">
        <h1 className="font-display text-3xl font-bold leading-tight">Halo, {displayName || ct("user")}!</h1>
      </div>

      {/* Mascot bubble (mobile) */}
      <div className="flex items-end gap-2.5 lg:hidden">
        <Mascot size={80} />
        <div className="mb-6 flex-1 rounded-[20px] border-3 border-line bg-card px-3.5 py-3 shadow-cartoon">
          <p className="text-sm font-extrabold leading-snug">{mascotLine}</p>
        </div>
      </div>

      {/* Alerts: budget near/over limit & debts due */}
      {hasAlerts && (
        <div className="flex flex-col gap-3 lg:col-span-4 lg:flex-row lg:flex-wrap">
          {budgetAlerts.map((b) => (
            <Link
              key={`budget-${b.id}`}
              href="/budgets"
              className={cn(
                "flex items-center gap-3 rounded-[20px] border-3 border-line p-3.5 text-ink shadow-cartoon-sm transition-transform hover:-translate-y-px lg:min-w-[300px] lg:flex-1",
                b.percent >= 100 ? "bg-cartoon-red" : "bg-cartoon-orange"
              )}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" strokeWidth={2.5} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">
                  Budget {b.category?.name || "Kategori"} {b.percent >= 100 ? "sudah lewat batas" : "hampir habis"}
                </p>
                <p className="text-xs font-bold">
                  {formatCurrency(b.spent, "IDR", intlLocale)} dari {formatCurrency(b.amount, "IDR", intlLocale)} ({b.percent}%)
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={3} />
            </Link>
          ))}

          {debtReminders.map((d) => {
            const isOverdue = d.due_date < new Date().toISOString().split("T")[0];
            return (
              <Link
                key={`debt-${d.id}`}
                href="/debts"
                className={cn(
                  "flex items-center gap-3 rounded-[20px] border-3 border-line p-3.5 text-ink shadow-cartoon-sm transition-transform hover:-translate-y-px lg:min-w-[300px] lg:flex-1",
                  isOverdue ? "bg-cartoon-red" : "bg-cartoon-yellow"
                )}
              >
                <CalendarClock className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">
                    {d.type === "payable" ? "Utang" : "Piutang"} &ldquo;{d.name}&rdquo; {isOverdue ? "lewat jatuh tempo" : "segera jatuh tempo"}
                  </p>
                  <p className="text-xs font-bold">
                    Sisa {formatCurrency(d.remaining_amount, "IDR", intlLocale)} • {formatDate(d.due_date, intlLocale)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={3} />
              </Link>
            );
          })}
        </div>
      )}

      {/* Hero: daily budget */}
      <section className="relative overflow-hidden rounded-cartoon border-3 border-line bg-primary p-5 text-ink shadow-cartoon-lg lg:col-span-2 lg:flex lg:min-h-[176px] lg:flex-col lg:justify-between lg:px-6">
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <span className="text-xs font-black uppercase tracking-[0.1em]">Budget harian tersisa</span>
          <span className="rounded-full border-2.5 border-ink bg-white px-2.5 py-0.5 text-xs font-black">
            Hari {cycle.dayIndex}/{cycle.length}
          </span>
        </div>
        <p className="mt-3 font-display text-[44px] font-bold leading-none lg:mt-0 lg:text-[52px]">
          {formatCurrency(dailyBudgetRemaining, "IDR", intlLocale)}
        </p>
        <p className="mt-2 hidden pr-32 text-sm font-extrabold lg:block">{mascotLine}</p>
        <Mascot size={110} className="absolute right-5 top-6 hidden rotate-[8deg] lg:block" />

        {/* Income / expense chips (mobile) */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 lg:hidden">
          <StatChip label="Masuk" value={formatCurrency(income, "IDR", intlLocale)} color="#9be7c4" up />
          <StatChip label="Keluar" value={formatCurrency(expense, "IDR", intlLocale)} color="#ff9ebb" />
        </div>
      </section>

      {/* Income / expense cards (desktop) */}
      <StatCard label="Pemasukan" value={formatCurrency(income, "IDR", intlLocale)} note={periodLabel} color="#9be7c4" up />
      <StatCard
        label="Pengeluaran"
        value={formatCurrency(expense, "IDR", intlLocale)}
        note={income > 0 ? `${Math.round((expense / income) * 100)}% dari pemasukan` : periodLabel}
        color="#ff9ebb"
      />

      {/* Main menu (mobile — desktop uses the sidebar) */}
      <section className={cn(card, "p-4 lg:hidden")}>
        <h2 className="mb-4 px-1 font-display text-xl font-semibold">Menu Utama</h2>
        <div className="grid grid-cols-4 gap-x-1.5 gap-y-4">
          {mainMenuItems.map((item, i) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
              <Sticker color={item.color} size="lg" tilt={i % 2 === 0 ? -3 : 3} className="shadow-cartoon-sm">
                <item.icon />
              </Sticker>
              <span className="text-center text-xs font-extrabold">{item.label === "Akun" ? "Aset" : item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Left column (desktop): recent transactions / calendar */}
      <section className={cn(card, "hidden p-5 lg:col-span-2 lg:flex lg:flex-col lg:gap-1")}>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1 rounded-2xl border-2.5 border-line bg-background p-1">
            {(["recent", "calendar"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setLeftView(view)}
                aria-pressed={leftView === view}
                className={cn(
                  "rounded-xl border-2 px-3 py-1.5 text-sm font-black transition-colors",
                  leftView === view ? "border-ink bg-primary text-ink" : "border-transparent text-foreground"
                )}
              >
                {view === "recent" ? "Transaksi Terbaru" : "Kalender"}
              </button>
            ))}
          </div>
          <Link
            href="/transactions"
            className="rounded-full border-2.5 border-line bg-background px-3 py-1.5 text-sm font-black"
          >
            {ct("viewAll")}
          </Link>
        </div>
        {leftView === "recent" ? (
          recentTransactions.length === 0 ? (
            <p className="py-10 text-center text-sm font-bold text-muted-foreground">Belum ada transaksi bulan ini.</p>
          ) : (
            recentTransactions.map((tx, i) => (
              <TransactionRow key={tx.id} tx={tx} index={i} accounts={accounts} categories={categories} intlLocale={intlLocale} />
            ))
          )
        ) : (
          <CalendarGrid
            monthLabel={currentMonthName}
            year={year}
            month={month}
            today={today}
            daysInMonth={daysInMonth}
            startOffset={startOffset}
            transactions={monthlyTransactions}
            onSelect={setSelectedDay}
            formatShort={formatShortCurrency}
          />
        )}
      </section>

      {/* Right column: progress + accounts */}
      <div className="space-y-5 lg:col-span-2">
        <section className={cn(card, "p-5")}>
          <div className="mb-4 flex items-center gap-3.5">
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-3 border-line bg-background">
              <span className="text-[10px] font-black uppercase leading-none text-muted-foreground">Hari</span>
              <span className="font-display text-lg font-bold leading-none">{cycle.dayIndex}</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Progres Pengeluaran</h2>
              <p className="text-xs font-bold text-muted-foreground">
                Hari {cycle.dayIndex} dari {cycle.length}
                {payday ? ` · gajian ${nextPaydayLabel}` : ""} · target 50/30/20
              </p>
            </div>
          </div>
          <div className="space-y-3.5">
            {progressBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex justify-between text-[13px] font-black">
                  <span>
                    {bar.label} <span className="ml-1 font-bold text-muted-foreground">{bar.status}</span>
                  </span>
                  <span>{bar.percent}%</span>
                </div>
                <div className="h-[18px] overflow-hidden rounded-full border-2.5 border-line bg-background">
                  <div
                    className="h-full border-r-2.5 border-ink transition-all duration-500"
                    style={{ width: `${bar.percent}%`, background: bar.color, borderRightWidth: bar.percent === 0 ? 0 : undefined }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(card, "hidden p-5 lg:block")}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Saldo Akun</h2>
            <span className="text-sm font-black">Total {formatCurrency(totalBalance, "IDR", intlLocale)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {accounts.slice(0, 4).map((a, i) => (
              <Link
                key={a.id}
                href="/accounts"
                className="flex items-center gap-2.5 rounded-[18px] border-2.5 border-line bg-background px-3.5 py-3"
              >
                <Sticker color={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]} size="sm" className="font-display text-base font-bold">
                  {a.name.charAt(0).toUpperCase()}
                </Sticker>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-muted-foreground">{a.name}</p>
                  <p className="truncate text-[15px] font-black">{formatCurrency(Number(a.balance), "IDR", intlLocale)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Calendar (mobile) */}
      <section className={cn(card, "p-5 lg:hidden")}>
        <h2 className="mb-1 font-display text-xl font-semibold">Aktivitas Bulan Ini</h2>
        <CalendarGrid
          monthLabel={currentMonthName}
          year={year}
          month={month}
          today={today}
          daysInMonth={daysInMonth}
          startOffset={startOffset}
          transactions={monthlyTransactions}
          onSelect={setSelectedDay}
          formatShort={formatShortCurrency}
        />
      </section>

      {/* Day detail popup */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{selectedDay && formatDate(selectedDay, intlLocale)}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {selectedDay &&
              monthlyTransactions
                .filter((tx) => tx.date.startsWith(selectedDay))
                .map((tx, i) => (
                  <TransactionRow key={tx.id} tx={tx} index={i} accounts={accounts} categories={categories} intlLocale={intlLocale} />
                ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatChip({ label, value, color, up }: { label: string; value: string; color: string; up?: boolean }) {
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <div className="flex flex-col gap-1 rounded-2xl border-2.5 border-ink bg-card px-3 py-2.5 text-card-foreground">
      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink text-ink" style={{ background: color }}>
          <Icon className="h-3 w-3" strokeWidth={3.5} />
        </span>
        {label}
      </span>
      <span className="truncate text-[17px] font-black">{value}</span>
    </div>
  );
}

function StatCard({ label, value, note, color, up }: { label: string; value: string; note: string; color: string; up?: boolean }) {
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <section className={cn(card, "hidden flex-col justify-between p-5 lg:flex")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
        <Sticker color={color} size="md" tilt={up ? -4 : 4}>
          <Icon />
        </Sticker>
      </div>
      <span className="truncate font-display text-[30px] font-bold leading-none">{value}</span>
      <span className="self-start rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-black text-ink" style={{ background: color }}>
        {note}
      </span>
    </section>
  );
}

function TransactionRow({
  tx,
  index,
  accounts,
  categories,
  intlLocale,
}: {
  tx: Transaction;
  index: number;
  accounts: Account[];
  categories: Category[];
  intlLocale: string;
}) {
  const category = categories.find((c) => c.id === tx.category_id);
  const account = accounts.find((a) => a.id === tx.account_id);
  const toAccount = accounts.find((a) => a.id === tx.to_account_id);
  const isTransfer = tx.type === "transfer";
  const isIncome = tx.type === "income";
  return (
    <div className="flex items-center gap-3 border-b-2 border-dashed border-divider py-2 last:border-0">
      <CategorySticker category={category} isTransfer={isTransfer} size="sm" tilt={stickerTilt(index)} />
      <span className="w-32 shrink-0 truncate text-sm font-black">
        {isTransfer ? `${account?.name || "?"} → ${toAccount?.name || "?"}` : category?.name || "Kategori"}
      </span>
      <span className="shrink-0 rounded-full border-2 border-line bg-background px-2 text-xs font-black">
        {isTransfer ? "Transfer" : account?.name}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-muted-foreground">{tx.note}</span>
      <span
        className={cn(
          "shrink-0 text-right text-sm font-black",
          isTransfer ? "text-foreground" : isIncome ? "text-income" : "text-expense"
        )}
      >
        {isTransfer ? "" : isIncome ? "+" : "−"}
        {formatCurrency(tx.amount, "IDR", intlLocale)}
      </span>
    </div>
  );
}

function CalendarGrid({
  monthLabel,
  year,
  month,
  today,
  daysInMonth,
  startOffset,
  transactions,
  onSelect,
  formatShort,
}: {
  monthLabel: string;
  year: number;
  month: number;
  today: Date;
  daysInMonth: number;
  startOffset: number;
  transactions: Transaction[];
  onSelect: (date: string) => void;
  formatShort: (amount: number) => string;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">{monthLabel}</p>
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-black text-muted-foreground">
        <div>SN</div><div>SL</div><div>RB</div><div>KM</div><div>JM</div><div>SB</div><div>MG</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate();
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTxs = transactions.filter((tx) => tx.date.startsWith(dateStr));
          const dayExpense = dayTxs.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
          const dayIncome = dayTxs.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
          const hasActivity = dayTxs.length > 0;

          return (
            <button
              key={day}
              type="button"
              disabled={!hasActivity}
              onClick={() => hasActivity && onSelect(dateStr)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-black lg:aspect-auto lg:h-11",
                hasActivity ? "cursor-pointer border-2 border-line bg-background hover:bg-accent" : "cursor-default text-muted-foreground/60",
                isToday && "border-3 border-line bg-primary text-ink"
              )}
            >
              <span>{day}</span>
              {hasActivity && (
                <span className={cn("absolute bottom-0.5 text-[8px] leading-none", isToday ? "text-ink" : dayExpense > 0 ? "text-expense" : "text-income")}>
                  {dayExpense > 0 ? `-${formatShort(dayExpense)}` : `+${formatShort(dayIncome)}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
