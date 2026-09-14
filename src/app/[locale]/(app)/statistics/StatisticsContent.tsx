"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Activity, PieChart as PieChartIcon, TrendingUp, TrendingDown, ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatCurrency } from "@/lib/utils";
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
        healthColor = "text-primary";
      } else if (savingsRate > 0) {
        healthScore = 50 + (savingsRate * 1.5);
        healthStatus = "Cukup Baik 👍";
        healthColor = "text-orange-400";
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

  return (
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard"><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Statistik <BarChart3 className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">Analisis kesehatan finansial Anda</p>
        </div>
      </div>

      {/* Financial Health Card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 text-white shadow-lg border border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Activity className="h-4 w-4 text-primary" />
            <span>Kesehatan Keuangan</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-2 mb-6">
          <div className="relative flex items-center justify-center h-40 w-40 rounded-full border-[10px] border-white/5">
            <div 
              className="absolute inset-0 rounded-full border-[10px] border-primary transition-all duration-1000 ease-out"
              style={{ clipPath: `polygon(0 0, 100% 0, 100% ${stats.healthScore}%, 0 ${stats.healthScore}%)`, transform: 'rotate(180deg)' }} 
            />
            <div className="text-center z-10 flex flex-col items-center justify-center">
              <span className="text-5xl font-black">{stats.healthScore}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Skor</span>
            </div>
          </div>
          <p className={`text-lg font-bold ${stats.healthColor} mt-2`}>{stats.healthStatus}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pemasukan</p>
            <p className="text-sm font-bold text-primary flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {formatCurrency(stats.totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pengeluaran</p>
            <p className="text-sm font-bold text-pink-500 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> {formatCurrency(stats.totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Arus Kas (Tahun Ini)</h2>
        </div>
        
        <div className="h-64 w-full">
          {stats.areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.areaData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#CCFF00" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `Rp${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#CCFF00" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Belum ada data transaksi tahun ini.
            </div>
          )}
        </div>
      </div>

      {/* Expense by Category Pie Chart */}
      <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Distribusi Pengeluaran</h2>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-48 w-48 relative">
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm text-center">
                Belum ada pengeluaran
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-3">
            {stats.pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-sm font-bold">
                  {Math.round((item.value / stats.totalExpense) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
