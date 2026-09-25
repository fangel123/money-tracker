"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Flag, Plus, CheckCircle2, ChevronRight, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  goalSchema,
  goalContributionSchema,
  type GoalFormData,
  type GoalContributionData,
} from "@/lib/validators/goal";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface GoalsContentProps {
  user: any;
  initialGoals: any[];
  dbReady: boolean;
}

export function GoalsContent({ user, initialGoals, dbReady }: GoalsContentProps) {
  const router = useRouter();
  const displayGoals = initialGoals;
  const [showForm, setShowForm] = useState(false);
  const [contributingTo, setContributingTo] = useState<any | null>(null);

  const totalCurrent = displayGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalTarget = displayGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);

  const createMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("goals").insert({
        name: data.name,
        target_amount: data.target_amount,
        current_amount: data.current_amount,
        deadline: data.deadline || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false);
      router.refresh();
      toast.success("Target tabungan ditambahkan");
    },
    onError: (error: any) => toast.error(error.message || "Gagal menambahkan target"),
  });

  const contributeMutation = useMutation({
    mutationFn: async ({ id, amount, current }: { id: string; amount: number; current: number }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("goals")
        .update({ current_amount: current + amount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setContributingTo(null);
      router.refresh();
      toast.success("Tabungan berhasil ditambahkan");
    },
    onError: (error: any) => toast.error(error.message || "Gagal menabung"),
  });

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
        <Button onClick={() => setShowForm(true)} className="rounded-full h-12 w-12 p-0 shadow-lg" size="icon">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Total Ringkasan */}
      {displayGoals.length > 0 && (
        <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">
            <Target className="h-4 w-4 text-primary" />
            <span>TOTAL TERKUMPUL</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-4xl font-black tracking-tight text-primary">
              {formatCurrency(totalCurrent)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400">
            dari total target {formatCurrency(totalTarget)}
          </p>
          <div className="mt-6">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

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
                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-2xl bg-secondary">
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
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded-lg">
                      {progress}% Tercapai
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isCompleted}
                      onClick={() => setContributingTo(goal)}
                      className="h-8 text-xs font-semibold rounded-full group-hover:bg-primary/10 group-hover:text-primary"
                    >
                      Isi Tabungan <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <GoalFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
      <ContributeDialog
        goal={contributingTo}
        onOpenChange={(open) => !open && setContributingTo(null)}
        onSubmit={(amount) =>
          contributingTo &&
          contributeMutation.mutate({ id: contributingTo.id, amount, current: Number(contributingTo.current_amount) })
        }
        isPending={contributeMutation.isPending}
      />
    </div>
  );
}

function GoalFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GoalFormData) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: "", target_amount: 0, current_amount: 0, deadline: "" },
  });

  const submit = (data: GoalFormData) => {
    onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Target Baru</DialogTitle>
        </DialogHeader>
        <form id="goal-form" onSubmit={handleSubmit(submit)} className="space-y-5 py-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Target</Label>
            <Input {...register("name")} placeholder="Dana Darurat" className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Jumlah</Label>
            <Input {...register("target_amount")} type="number" placeholder="0" className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
            {errors.target_amount && <p className="mt-1 text-xs text-destructive">{errors.target_amount.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sudah Terkumpul (opsional)</Label>
            <Input {...register("current_amount")} type="number" placeholder="0" className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Tanggal (opsional)</Label>
            <Input {...register("deadline")} type="date" className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="goal-form" className="rounded-full font-bold" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContributeDialog({
  goal,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  goal: any | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalContributionData>({
    resolver: zodResolver(goalContributionSchema),
    defaultValues: { amount: 0 },
  });

  const submit = (data: GoalContributionData) => {
    onSubmit(data.amount);
    reset();
  };

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Isi Tabungan: {goal?.name}</DialogTitle>
        </DialogHeader>
        <form id="contribute-form" onSubmit={handleSubmit(submit)} className="py-4">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah</Label>
          <Input {...register("amount")} type="number" placeholder="0" autoFocus className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
          {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="contribute-form" className="rounded-full font-bold" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
