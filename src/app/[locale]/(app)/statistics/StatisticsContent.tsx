"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Activity, PieChart as PieChartIcon, TrendingUp, TrendingDown, ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Mascot } from "@/components/common/Mascot";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function StatisticsContent({ user, transactions }: { user: any; transactions: any[] }) {
  
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    // Monthly data for Area Chart
    const monthlyDataMap: Record<string, { name: string; income: number; expense: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    
    // Category data for Pie Chart
    const categoryDataMap: Record<string, { name: string; value: number; color: string }> = {};
    const colors = ["#CCFF00", "#FF4560", "#00E396", "#FEB019", "#775DD0", "#FF9800", "#F44336", "#9C27B0"];

    transactions.forEach(tx => {
      // Transfer antar akun bukan pemasukan/pengeluaran — uangnya hanya pindah dompet
      if (tx.type === "transfer") return;
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = monthNames[date.getMonth()];

      if (!monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey] = { name: monthLabel, income: 0, expense: 0 };
      }

      if (tx.type === "income") {
        totalIncome += tx.amount;
        monthlyDataMap[monthKey].income += tx.amount;
      } else {
        totalExpense += tx.amount;
        monthlyDataMap[monthKey].expense += tx.amount;
        
        // Category Pie Chart
        const catName = (tx.category as any)?.name || "Lainnya";
        if (!categoryDataMap[catName]) {
          categoryDataMap[catName] = { 
            name: catName, 
            value: 0, 
            color: (tx.category as any)?.color || colors[Object.keys(categoryDataMap).length % colors.length] 
          };
        }
        categoryDataMap[catName].value += tx.amount;
      }
    });

    const areaData = Object.keys(monthlyDataMap).sort().map(k => monthlyDataMap[k]);
    const pieData = Object.values(categoryDataMap).sort((a, b) => b.value - a.value);

    // Financial Health Score
    let healthScore = 0;
    let healthStatus = "Perlu Perbaikan";
    let healthColor = "text-destructive";

    if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
      if (savingsRate >= 20) {
        healthScore = Math.min(100, 80 + (savingsRate - 20));
        healthStatus = "Sangat Sehat 🌟";
        healthColor = "text-income";
      } else if (savingsRate > 0) {
        healthScore = 50 + (savingsRate * 1.5);
        healthStatus = "Cukup Baik 👍";
        healthColor = "text-orange-600 dark:text-cartoon-orange";
      } else {
        healthScore = Math.max(0, 50 - (Math.abs(savingsRate) * 2));
        healthStatus = "Bahaya ⚠️";
        healthColor = "text-destructive";
      }
    } else if (totalExpense > 0) {
      healthScore = 10; // Only expenses
      healthStatus = "Bahaya ⚠️";
      healthColor = "text-destructive";
    }

    return { totalIncome, totalExpense, areaData, pieData, healthScore: Math.round(healthScore), healthStatus, healthColor };
  }, [transactions]);

  const scoreColor = stats.healthScore >= 80 ? "#c8f031" : stats.healthScore >= 50 ? "#ffd447" : "#ff5c7a";
  const ringCirc = 2 * Math.PI * 62;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Statistik" description="Analisis kesehatan finansial Anda" />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Financial Health Card */}
        <section className="flex flex-col gap-4 rounded-cartoon border-3 border-line p-5 text-ink shadow-cartoon-lg" style={{ background: scoreColor }}>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em]">
            <Activity className="h-4 w-4" strokeWidth={3} />
            Kesehatan Keuangan
          </div>
          <div className="flex items-center gap-4">
            <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label={`Skor ${stats.healthScore} dari 100`} className="shrink-0">
              <circle cx="75" cy="75" r="62" fill="#ffffff" stroke="#1e1b18" strokeWidth="3" />
              <circle cx="75" cy="75" r="62" fill="none" stroke="#fff4de" strokeWidth="16" />
              <circle
                cx="75"
                cy="75"
                r="62"
                fill="none"
                stroke="#1e1b18"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${(ringCirc * stats.healthScore) / 100} ${ringCirc}`}
                transform="rotate(-90 75 75)"
              />
              <circle cx="75" cy="75" r="70" fill="none" stroke="#1e1b18" strokeWidth="3" />
              <circle cx="75" cy="75" r="54" fill="none" stroke="#1e1b18" strokeWidth="3" />
              <text x="75" y="80" textAnchor="middle" fontFamily="var(--font-fredoka)" fontWeight="700" fontSize="40" fill="#1e1b18">
                {stats.healthScore}
              </text>
              <text x="75" y="100" textAnchor="middle" fontFamily="var(--font-nunito)" fontWeight="900" fontSize="10" fill="#1e1b18" letterSpacing="2">
                SKOR
              </text>
            </svg>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold leading-tight">{stats.healthStatus}</p>
              <Mascot size={56} mood={stats.healthScore >= 50 ? "happy" : "worried"} className="mt-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border-2.5 border-ink bg-white px-3 py-2">
              <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider">
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={3} /> Masuk
              </p>
              <p className="truncate text-sm font-black">{formatCurrency(stats.totalIncome)}</p>
            </div>
            <div className="rounded-2xl border-2.5 border-ink bg-white px-3 py-2">
              <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider">
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={3} /> Keluar
              </p>
              <p className="truncate text-sm font-black">{formatCurrency(stats.totalExpense)}</p>
            </div>
          </div>
        </section>

        {/* Cash Flow Chart */}
        <section className="rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">Arus Kas (Tahun Ini)</h2>
            <div className="flex gap-3 text-xs font-black">
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[5px] border-2 border-ink bg-cartoon-mint" /> Pemasukan</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[5px] border-2 border-ink bg-cartoon-pink" /> Pengeluaran</span>
            </div>
          </div>

          <div className="h-64 w-full lg:h-[290px]">
            {stats.areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.areaData} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="rgb(var(--divider))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 800, fill: "rgb(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: "rgb(var(--muted-foreground))" }} tickFormatter={(val) => `${val / 1000}rb`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgb(var(--card))", borderRadius: "16px", border: "3px solid rgb(var(--line))", boxShadow: "4px 4px 0 rgb(var(--line))", fontWeight: 800 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="income" name="Pemasukan" stroke="rgb(var(--foreground))" strokeWidth={3} fill="#9be7c4" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="rgb(var(--foreground))" strokeWidth={3} fill="#ff9ebb" fillOpacity={0.85} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-bold text-muted-foreground">
                Belum ada data transaksi tahun ini.
              </div>
            )}
          </div>
        </section>

        {/* Expense by Category */}
        <section className="rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon lg:col-span-3">
          <h2 className="mb-4 font-display text-xl font-semibold">Distribusi Pengeluaran</h2>

          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="relative h-52 w-52 shrink-0">
              {stats.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="rgb(var(--line))"
                      strokeWidth={3}
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pastel(entry.color)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgb(var(--card))", borderRadius: "16px", border: "3px solid rgb(var(--line))", fontWeight: 800 }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-bold text-muted-foreground">
                  Belum ada pengeluaran
                </div>
              )}
            </div>

            <div className="grid w-full flex-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {stats.pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 border-b-2 border-dashed border-divider pb-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded-[5px] border-2 border-ink" style={{ backgroundColor: pastel(item.color) }} />
                    <span className="truncate text-sm font-black">{item.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="font-bold text-muted-foreground">{formatCurrency(item.value)}</span>
                    <span className="w-10 text-right font-black">{Math.round((item.value / stats.totalExpense) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
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
