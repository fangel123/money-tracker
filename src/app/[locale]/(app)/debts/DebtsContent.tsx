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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Plus, TrendingDown, TrendingUp, HandCoins, ChevronRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  debtSchema,
  debtPaymentSchema,
  type DebtFormData,
  type DebtPaymentData,
} from "@/lib/validators/debt";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface DebtsContentProps {
  user: any;
  initialDebts: any[];
  dbReady: boolean;
}

export function DebtsContent({ user, initialDebts, dbReady }: DebtsContentProps) {
  const router = useRouter();
  const displayDebts = initialDebts;
  const [showForm, setShowForm] = useState(false);
  const [payingDebt, setPayingDebt] = useState<any | null>(null);

  const totalPayable = displayDebts
    .filter((d) => d.type === "payable" && d.status === "active")
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);
  const totalReceivable = displayDebts
    .filter((d) => d.type === "receivable" && d.status === "active")
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  const createMutation = useMutation({
    mutationFn: async (data: DebtFormData) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("debts").insert({
        name: data.name,
        type: data.type,
        amount: data.amount,
        remaining_amount: data.amount,
        due_date: data.due_date || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false);
      router.refresh();
      toast.success("Data berhasil ditambahkan");
    },
    onError: (error: any) => toast.error(error.message || "Gagal menambahkan data"),
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, amount, remaining }: { id: string; amount: number; remaining: number }) => {
      const supabase = createBrowserSupabaseClient();
      const newRemaining = Math.max(0, remaining - amount);
      const { error } = await supabase
        .from("debts")
        .update({ remaining_amount: newRemaining, status: newRemaining === 0 ? "paid" : "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setPayingDebt(null);
      router.refresh();
      toast.success("Pembayaran tercatat");
    },
    onError: (error: any) => toast.error(error.message || "Gagal mencatat pembayaran"),
  });

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
        <Button onClick={() => setShowForm(true)} className="rounded-full h-12 w-12 p-0 shadow-lg" size="icon">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Ringkasan Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-destructive/10 rounded-[2rem] p-5 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider mb-2">
            <TrendingDown className="h-4 w-4" /> Utang Saya
          </div>
          <div className="text-2xl font-black text-destructive">{formatCurrency(totalPayable)}</div>
          <p className="text-[10px] font-bold text-destructive/70 mt-1 uppercase">Harus Dibayar</p>
        </div>
        <div className="bg-primary/10 rounded-[2rem] p-5 border border-primary/20">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
            <TrendingUp className="h-4 w-4" /> Uang Saya
          </div>
          <div className="text-2xl font-black text-primary">{formatCurrency(totalReceivable)}</div>
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
            const isPaid = debt.status === "paid";

            return (
              <div key={debt.id} className="bg-card border border-border/50 rounded-[2rem] p-5 shadow-sm relative overflow-hidden group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-xl", isPayable ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                      {isPayable ? <TrendingDown className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground text-lg">{debt.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", isPayable ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
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
                    <span className="text-muted-foreground">Total: {formatCurrency(debt.amount)}</span>
                  </div>
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-1000", isPayable ? "bg-destructive" : "bg-primary")} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded-lg">
                      {isPaid ? "Lunas" : `${progress}% Lunas`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPaid}
                      onClick={() => setPayingDebt(debt)}
                      className="h-8 text-xs font-semibold rounded-full group-hover:bg-secondary"
                    >
                      {isPayable ? "Bayar Cicilan" : "Terima Pembayaran"} <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DebtFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
      <PayDebtDialog
        debt={payingDebt}
        onOpenChange={(open) => !open && setPayingDebt(null)}
        onSubmit={(amount) =>
          payingDebt && payMutation.mutate({ id: payingDebt.id, amount, remaining: Number(payingDebt.remaining_amount) })
        }
        isPending={payMutation.isPending}
      />
    </div>
  );
}

function DebtFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DebtFormData) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    defaultValues: { name: "", type: "payable", amount: 0, due_date: "" },
  });

  const submit = (data: DebtFormData) => {
    onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Catat Utang / Piutang</DialogTitle>
        </DialogHeader>
        <form id="debt-form" onSubmit={handleSubmit(submit)} className="space-y-5 py-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama</Label>
            <Input {...register("name")} placeholder="Pinjaman Bank / Nama Orang" className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jenis</Label>
            <Select value={watch("type")} onValueChange={(v) => setValue("type", v as "payable" | "receivable")}>
              <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-border/50 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50">
                <SelectItem value="payable" className="rounded-xl">Utang Saya (harus dibayar)</SelectItem>
                <SelectItem value="receivable" className="rounded-xl">Piutang (orang berutang ke saya)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah</Label>
            <Input {...register("amount")} type="number" placeholder="0" className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jatuh Tempo (opsional)</Label>
            <Input {...register("due_date")} type="date" className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="debt-form" className="rounded-full font-bold" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDebtDialog({
  debt,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  debt: any | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DebtPaymentData>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: { amount: 0 },
  });

  const submit = (data: DebtPaymentData) => {
    onSubmit(data.amount);
    reset();
  };

  const isPayable = debt?.type === "payable";

  return (
    <Dialog open={!!debt} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isPayable ? "Bayar Cicilan" : "Terima Pembayaran"}: {debt?.name}
          </DialogTitle>
        </DialogHeader>
        <form id="pay-debt-form" onSubmit={handleSubmit(submit)} className="py-4">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah</Label>
          <Input {...register("amount")} type="number" placeholder="0" autoFocus className="mt-1.5 h-12 rounded-xl bg-secondary border-border/50" />
          {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
          {debt && <p className="mt-2 text-xs text-muted-foreground">Sisa saat ini: {formatCurrency(debt.remaining_amount)}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="pay-debt-form" className="rounded-full font-bold" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
