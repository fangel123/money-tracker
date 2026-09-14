"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flag, Plus, TrendingUp, CheckCircle2, ChevronRight, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function GoalsContent({ user, initialGoals, dbReady }: { user: any; initialGoals: any[]; dbReady: boolean }) {
  const displayGoals = initialGoals;

  return (
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Target Tabungan <Flag className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">Wujudkan impian finansial Anda</p>
        </div>
        <Button className="rounded-full h-12 w-12 p-0 shadow-lg" size="icon">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Total Ringkasan */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">
          <Target className="h-4 w-4 text-primary" />
          <span>TOTAL TERKUMPUL</span>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl font-black tracking-tight text-primary">
            {formatCurrency(displayGoals.reduce((sum, g) => sum + Number(g.current_amount), 0))}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-400">
          dari total target {formatCurrency(displayGoals.reduce((sum, g) => sum + Number(g.target_amount), 0))}
        </p>
        
        {/* Progress Bar Keseluruhan */}
        <div className="mt-6">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000" 
              style={{ 
                width: `${Math.min(100, Math.round((displayGoals.reduce((sum, g) => sum + Number(g.current_amount), 0) / displayGoals.reduce((sum, g) => sum + Number(g.target_amount), 0)) * 100))}%` 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Daftar Goals */}
      <div className="space-y-4">
        {displayGoals.length === 0 ? (
          <div className="bg-card rounded-[2rem] border border-border/50 p-8 text-center text-muted-foreground mt-4">
            <p>Belum ada target tabungan.</p>
            <p className="text-sm mt-1">Klik tombol + di atas untuk mulai menabung.</p>
          </div>
        ) : (
          displayGoals.map((goal) => {
            const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            const isCompleted = progress >= 100;

            return (
              <div key={goal.id} className="bg-card border border-border/50 rounded-[2rem] p-5 shadow-sm relative overflow-hidden group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl bg-secondary`}>
                      {goal.icon || "🎯"}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground font-medium">
                          Target: {new Date(goal.deadline).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                  {isCompleted && (
                    <div className="bg-primary/20 text-primary p-2 rounded-full">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className={isCompleted ? "text-primary" : "text-foreground"}>
                      {formatCurrency(goal.current_amount)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.target_amount)}
                    </span>
                  </div>
                  
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-primary' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded-lg">
                      {progress}% Tercapai
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold rounded-full group-hover:bg-primary/10 group-hover:text-primary">
                      Isi Tabungan <ChevronRight className="h-3 w-3 ml-1" />
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
