"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Coins, Plus, TrendingDown, TrendingUp, HandCoins, ChevronRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export function DebtsContent({ user, initialDebts, dbReady }: { user: any; initialDebts: any[]; dbReady: boolean }) {
  const displayDebts = initialDebts;

  const totalPayable = displayDebts.filter(d => d.type === 'payable' && d.status === 'active').reduce((sum, d) => sum + Number(d.remaining_amount), 0);
  const totalReceivable = displayDebts.filter(d => d.type === 'receivable' && d.status === 'active').reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  return (
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Utang & Piutang <HandCoins className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">Kelola kewajiban dan hak finansial Anda</p>
        </div>
        <Button className="rounded-full h-12 w-12 p-0 shadow-lg" size="icon">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Ringkasan Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-destructive/10 rounded-[2rem] p-5 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider mb-2">
            <TrendingDown className="h-4 w-4" /> Utang Saya
          </div>
          <div className="text-2xl font-black text-destructive">
            {formatCurrency(totalPayable)}
          </div>
          <p className="text-[10px] font-bold text-destructive/70 mt-1 uppercase">Harus Dibayar</p>
        </div>

        <div className="bg-primary/10 rounded-[2rem] p-5 border border-primary/20">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
            <TrendingUp className="h-4 w-4" /> Uang Saya
          </div>
          <div className="text-2xl font-black text-primary">
            {formatCurrency(totalReceivable)}
          </div>
          <p className="text-[10px] font-bold text-primary/70 mt-1 uppercase">Bisa Ditagih</p>
        </div>
      </div>

      {/* Daftar Utang */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold">Daftar Pinjaman</h2>
        
        {displayDebts.length === 0 ? (
          <div className="bg-card rounded-[2rem] border border-border/50 p-8 text-center text-muted-foreground mt-4">
            <p>Belum ada catatan utang atau piutang.</p>
            <p className="text-sm mt-1">Klik tombol + di atas untuk menambahkan data.</p>
          </div>
        ) : (
          displayDebts.map((debt) => {
            const progress = Math.min(100, Math.round(((debt.amount - debt.remaining_amount) / debt.amount) * 100));
            const isPayable = debt.type === "payable";

            return (
              <div key={debt.id} className="bg-card border border-border/50 rounded-[2rem] p-5 shadow-sm relative overflow-hidden group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center text-xl",
                      isPayable ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    )}>
                      {isPayable ? <TrendingDown className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{debt.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          isPayable ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        )}>
                          {isPayable ? "Utang Saya" : "Piutang (Orang Utang)"}
                        </span>
                        {debt.due_date && (
                          <span className="text-xs text-muted-foreground font-medium">
                            Jatuh tempo: {new Date(debt.due_date).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-muted-foreground">
                      Sisa: <span className={isPayable ? "text-destructive" : "text-primary"}>{formatCurrency(debt.remaining_amount)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Total: {formatCurrency(debt.amount)}
                    </span>
                  </div>
                  
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-1000", isPayable ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded-lg">
                      {progress}% Lunas
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold rounded-full group-hover:bg-secondary">
                      {isPayable ? "Bayar Cicilan" : "Terima Pembayaran"} <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
