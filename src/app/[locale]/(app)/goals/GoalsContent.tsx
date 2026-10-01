"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Plus, CheckCircle2, ChevronRight, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { CartoonBar } from "@/components/common/HeroCard";
import { Sticker } from "@/components/common/Sticker";
import { Mascot } from "@/components/common/Mascot";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { EmptyState } from "@/components/common/EmptyState";
import {
  goalSchema,
  type GoalFormData,
} from "@/lib/validators/goal";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface GoalsContentProps {
  user: any;
  initialGoals: any[];
  dbReady: boolean;
  accounts: any[];
  categories: any[];
}

const GOAL_COLORS = ["#9be7c4", "#8fd3ff", "#c9b6ff", "#ffd447", "#ff9ebb", "#ffb86b"];

export function GoalsContent({ user, initialGoals, dbReady, accounts, categories }: GoalsContentProps) {
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
    mutationFn: async ({
      id,
      amount,
      current,
      accountId,
      categoryId,
      goalName,
    }: {
      id: string;
      amount: number;
      current: number;
      accountId: string;
      categoryId: string;
      goalName: string;
    }) => {
      const supabase = createBrowserSupabaseClient();

      // 1. Catat sebagai transaksi pengeluaran sungguhan supaya saldo akun & riwayat ikut ter-update
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: accountId,
        category_id: categoryId,
        amount,
        type: "expense",
        date: new Date().toISOString(),
        note: `(Tabungan) ${goalName}`,
      });
      if (txError) throw new Error("Gagal mencatat transaksi: " + txError.message);

      // 2. Update jumlah terkumpul di goal
      const { error } = await supabase
        .from("goals")
        .update({ current_amount: current + amount })
        .eq("id", id);
      if (error) throw new Error("Gagal mengupdate tabungan: " + error.message);
    },
    onSuccess: () => {
      setContributingTo(null);
      router.refresh();
      toast.success("Tabungan berhasil ditambahkan");
    },
    onError: (error: any) => toast.error(error.message || "Gagal menabung"),
  });

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Goals"
        description="Wujudkan impian finansial Anda"
        action={
          <Button onClick={() => setShowForm(true)} aria-label="Tambah goal">
            <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
            <span className="hidden sm:inline">Impian Baru</span>
          </Button>
        }
      />

      {/* Total Ringkasan */}
      {displayGoals.length > 0 && (
        <section className="relative flex items-center gap-4 overflow-hidden rounded-cartoon border-3 border-line bg-cartoon-mint p-5 text-ink shadow-cartoon-lg lg:p-6">
          <Mascot size={88} className="hidden shrink-0 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.1em]">Sudah terkumpul</p>
            <p className="mt-1.5 font-display text-[40px] font-bold leading-none lg:text-[46px]">{formatCurrency(totalCurrent)}</p>
            <p className="mt-1.5 text-sm font-extrabold">
              dari total target {formatCurrency(totalTarget)} · {totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0}%
            </p>
            <CartoonBar
              className="mt-3 border-ink bg-cream"
              color="#ffffff"
              percent={totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0}
            />
          </div>
        </section>
      )}

      {/* Daftar Goals */}
      <div className="grid gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
        {displayGoals.length === 0 ? (
          <div className="bg-card rounded-cartoon border-3 border-line shadow-cartoon md:col-span-full">
            <EmptyState titleKey="goals.empty.title" descriptionKey="goals.empty.description" />
          </div>
        ) : (
          displayGoals.map((goal, index) => {
            const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            const isCompleted = progress >= 100;
            const color = GOAL_COLORS[index % GOAL_COLORS.length];

            return (
              <div key={goal.id} className="flex flex-col gap-3 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
                <div className="flex items-center justify-between">
                  <Sticker color={color} size="lg" tilt={index % 2 === 0 ? -4 : 4} className="text-2xl">
                    {!goal.icon ? <Flag /> : /^[a-z0-9-]+$/.test(goal.icon) ? <DynamicIcon name={goal.icon} /> : goal.icon}
                  </Sticker>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-cartoon-lime px-2.5 py-0.5 text-xs font-black text-ink">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} /> Tercapai!
                    </span>
                  ) : (
                    <span className="font-display text-[32px] font-bold leading-none">{progress}%</span>
                  )}
                </div>
                <div>
                  <h3 className="truncate font-display text-xl font-semibold">{goal.name}</h3>
                  {goal.deadline && (
                    <p className="text-[13px] font-bold text-muted-foreground">
                      Target {new Date(goal.deadline).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
                <CartoonBar percent={progress} color={color} className="h-[22px]" />
                <p className="text-sm font-black">
                  {formatCurrency(goal.current_amount)} <span className="font-bold text-muted-foreground">/ {formatCurrency(goal.target_amount)}</span>
                </p>
                <button
                  disabled={isCompleted}
                  onClick={() => setContributingTo(goal)}
                  className="mt-auto flex h-10 items-center justify-center gap-1 self-start rounded-xl border-2.5 border-ink px-4 text-sm font-black text-ink shadow-cartoon-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                  style={{ background: color }}
                >
                  <Plus className="h-4 w-4" strokeWidth={3} /> Nabung
                </button>
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
        accounts={accounts}
        categories={categories}
        onOpenChange={(open) => !open && setContributingTo(null)}
        onSubmit={(amount, accountId, categoryId) =>
          contributingTo &&
          contributeMutation.mutate({
            id: contributingTo.id,
            amount,
            current: Number(contributingTo.current_amount),
            accountId,
            categoryId,
            goalName: contributingTo.name,
          })
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
      <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Target Baru</DialogTitle>
        </DialogHeader>
        <form id="goal-form" onSubmit={handleSubmit(submit)} className="space-y-5 py-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Target</Label>
            <Input {...register("name")} placeholder="Dana Darurat" className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Jumlah</Label>
            <Input {...register("target_amount")} type="number" placeholder="0" className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
            {errors.target_amount && <p className="mt-1 text-xs text-destructive">{errors.target_amount.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sudah Terkumpul (opsional)</Label>
            <Input {...register("current_amount")} type="number" placeholder="0" className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Tanggal (opsional)</Label>
            <Input {...register("deadline")} type="date" className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
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
  accounts,
  categories,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  goal: any | null;
  accounts: any[];
  categories: any[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number, accountId: string, categoryId: string) => void;
  isPending: boolean;
}) {
  const contributeSchema = z.object({
    amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
    account_id: z.string().min(1, "Pilih akun terlebih dahulu"),
    category_id: z.string().min(1, "Pilih kategori terlebih dahulu"),
  });
  type ContributeFormData = z.infer<typeof contributeSchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContributeFormData>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amount: 0, account_id: "", category_id: "" },
  });

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const submit = (data: ContributeFormData) => {
    onSubmit(data.amount, data.account_id, data.category_id);
    reset();
  };

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-cartoon p-6 border-line shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Isi Tabungan: {goal?.name}</DialogTitle>
        </DialogHeader>
        <form id="contribute-form" onSubmit={handleSubmit(submit)} className="py-4 space-y-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah</Label>
            <Input {...register("amount")} type="number" placeholder="0" autoFocus className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dari Akun</Label>
            <Select value={watch("account_id")} onValueChange={(v) => setValue("account_id", v)}>
              <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-line bg-secondary">
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-line">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="rounded-xl">
                    {acc.name} ({formatCurrency(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && <p className="mt-1 text-xs text-destructive">{errors.account_id.message}</p>}
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kategori</Label>
            <Select value={watch("category_id")} onValueChange={(v) => setValue("category_id", v)}>
              <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-line bg-secondary">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-line">
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && <p className="mt-1 text-xs text-destructive">{errors.category_id.message}</p>}
          </div>
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
