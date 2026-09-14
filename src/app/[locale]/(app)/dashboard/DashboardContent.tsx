"use client";

import { useTranslations } from "next-intl";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Wallet, Target, ArrowRight, Zap, PieChart, ScanLine, Flag, Briefcase, Coins, LineChart, MessageSquare, BarChart3, Lock, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Transaction, Account, Budget, Category, User } from "@/types/domain";

interface DashboardContentProps {
  locale: "id" | "en";
  user: User;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  categories: Category[];
}

const mainMenuItems = [
  { name: "Budget", icon: PieChart, href: "/budgets" },
  { name: "Scanner", icon: ScanLine, href: "/scanner" },
  { name: "Goals", icon: Flag, href: "/goals" },
  { name: "Aset", icon: Briefcase, href: "/accounts" },
  { name: "Utang", icon: Coins, href: "/debts" },
  { name: "Rencana", icon: LineChart, href: "/planner" },
  { name: "AI Advisor", icon: MessageSquare, href: "/ai-advisor" },
  { name: "Statistik", icon: BarChart3, href: "/statistics" },
];

export function DashboardContent({
  locale,
  user,
  transactions,
  accounts,
  budgets,
  categories,
}: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const ct = useTranslations("common");

  // Calculate summary
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = transactions.filter((tx) => tx.date.startsWith(currentMonth));
  const income = monthlyTransactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const expense = monthlyTransactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  
  // Real daily budget calculation (Total Income - Total Expense) / 30 days
  const dailyBudgetRemaining = Math.max(0, Math.round(income / 30) - Math.round(expense / 30));

  const recentTransactions = transactions.slice(0, 5);

  // Calculate Progres Pengeluaran (Needs, Wants, Savings)
  // Mapping sederhana jika tidak ada tipe kategori di DB
  const needsKeywords = ["makan", "listrik", "air", "sewa", "transport", "kesehatan", "pendidikan", "kebutuhan"];
  const wantsKeywords = ["hiburan", "belanja", "hobi", "liburan", "jajan", "keinginan"];
  const savingsKeywords = ["tabungan", "investasi", "darurat", "saham", "reksa dana"];

  let needsTotal = 0;
  let wantsTotal = 0;
  let savingsTotal = 0;

  monthlyTransactions.forEach(tx => {
    if (tx.type === "expense") {
      const catName = categories.find(c => c.id === tx.category_id)?.name?.toLowerCase() || "";
      if (savingsKeywords.some(k => catName.includes(k))) {
        savingsTotal += tx.amount;
      } else if (wantsKeywords.some(k => catName.includes(k))) {
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

  // Calculate Calendar
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; 
  
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthName = `${monthNames[month]} ${year}`;

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}JT`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}RB`;
    return amount.toString();
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Halo, {user.profile?.full_name || ct("user")} 🌙
          </p>
        </div>
      </div>

      {/* Black Summary Card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">
          <Zap className="h-4 w-4 text-primary fill-primary" />
          <span>SEKILAS HARI INI</span>
        </div>
        
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl font-black tracking-tight">
            {formatCurrency(dailyBudgetRemaining, "IDR", locale === "id" ? "id-ID" : "en-US")}
          </span>
          <Lock className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-8">
          <span className="text-xl">👇</span> budget harian yang tersisa
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pemasukan</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(income, "IDR", locale === "id" ? "id-ID" : "en-US")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pengeluaran</p>
            <p className="text-lg font-bold text-pink-500">
              {formatCurrency(expense, "IDR", locale === "id" ? "id-ID" : "en-US")}
            </p>
          </div>
        </div>

        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
           <div className="h-full bg-white/20" style={{ width: `${Math.min(100, (expense / (income || 1)) * 100)}%` }} />
        </div>
        <p className="text-xs text-center text-gray-500 italic">
          {expense === 0 ? "Suppeeerrr! Belum ada pengeluaran hari ini." : "Tetap hemat untuk sisa hari ini!"}
        </p>
      </div>

      {/* Menu Utama */}
      <div className="bg-[#151515] rounded-[2rem] p-6 shadow-sm border border-border/10 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Menu Utama</h2>
        </div>
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {mainMenuItems.map((item, idx) => (
            <Link key={idx} href={item.href} className="flex flex-col items-center gap-2 group">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground group-hover:bg-primary/20 transition-colors">
                <item.icon className="h-6 w-6 stroke-[1.5]" />
              </div>
              <span className="text-[10px] font-semibold text-center">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Progres Pengeluaran */}
      <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-4 border-muted">
            <span className="text-[10px] font-bold uppercase text-muted-foreground leading-none">Hari</span>
            <span className="text-base font-black leading-none">{today.getDate()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Progres Pengeluaran</h2>
            <p className="text-xs text-muted-foreground">Hari {today.getDate()} dari {daysInMonth}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1 font-bold">
              <span className="text-muted-foreground tracking-wider uppercase">Kebutuhan <span className="text-foreground ml-1 capitalize font-medium">{needsPercent < 80 ? "Masih aman" : needsPercent < 100 ? "Hati-hati" : "Melebihi target"}</span></span>
              <span>{needsPercent}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 transition-all" style={{ width: `${needsPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1 font-bold">
              <span className="text-muted-foreground tracking-wider uppercase">Keinginan <span className="text-foreground ml-1 capitalize font-medium">{wantsPercent < 80 ? "Masih aman" : wantsPercent < 100 ? "Hati-hati" : "Melebihi target"}</span></span>
              <span>{wantsPercent}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 transition-all" style={{ width: `${wantsPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1 font-bold">
              <span className="text-muted-foreground tracking-wider uppercase">Tabungan <span className="text-primary ml-1 capitalize font-medium">{savingsPercent > 80 ? "Sangat baik" : "Perlu ditingkatkan"}</span></span>
              <span>{savingsPercent}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${savingsPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Aktivitas Bulan Ini (Real Calendar Data) */}
      <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50">
        <h2 className="text-lg font-bold text-foreground mb-4">Aktivitas Bulan Ini</h2>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{currentMonthName}</p>
        
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
          <div>SN</div><div>SL</div><div>RB</div><div>KM</div><div>JM</div><div>SB</div><div>MG</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for padding before the 1st of the month */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-xl bg-transparent" />
          ))}
          
          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate();
            
            // Find transactions for this day
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTxs = monthlyTransactions.filter(tx => tx.date.startsWith(dateStr));
            const dayExpense = dayTxs.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
            const hasActivity = dayExpense > 0;

            return (
              <div 
                key={day} 
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center font-bold relative",
                  isToday ? "border-2 border-primary text-foreground" : 
                  hasActivity ? "bg-secondary text-foreground" : "bg-transparent text-muted-foreground/50",
                  (isToday && hasActivity) && "bg-secondary"
                )}
              >
                <span>{day}</span>
                {hasActivity && (
                  <span className="text-[8px] text-pink-500 absolute bottom-1 leading-none">
                    -{formatShortCurrency(dayExpense)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}