"use client";

import { useRefreshData } from "@/hooks/use-refresh-data";
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
import { Coins, Plus, TrendingDown, TrendingUp, HandCoins, ChevronRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { CartoonBar } from "@/components/common/HeroCard";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { Mascot } from "@/components/common/Mascot";
import {
  debtSchema,
  type DebtFormData,
} from "@/lib/validators/debt";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface DebtsContentProps {
  user: any;
  initialDebts: any[];
  dbReady: boolean;
  accounts: any[];
  categories: any[];
}

export function DebtsContent({ user, initialDebts, dbReady, accounts, categories }: DebtsContentProps) {
  const router = useRouter();
  const refreshData = useRefreshData();
  const displayDebts = initialDebts;
  const [showForm, setShowForm] = useState(false);
  const [payingDebt, setPayingDebt] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paid">("all");

  const today = new Date().toISOString().split("T")[0];
  const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0];
  const active = displayDebts.filter((d) => d.status === "active");
  const dueSoon = active.filter((d) => d.due_date && d.due_date <= inAWeek);
  const paidCount = displayDebts.filter((d) => d.status === "paid").length;
  const visible = displayDebts.filter((d) => statusFilter === "all" || d.status === statusFilter);
  const payables = visible.filter((d) => d.type === "payable");
  const receivables = visible.filter((d) => d.type === "receivable");

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
      refreshData();
      toast.success("Data berhasil ditambahkan");
    },
    onError: (error: any) => toast.error(error.message || "Gagal menambahkan data"),
  });

  const payMutation = useMutation({
    mutationFn: async ({
      id,
      amount,
      remaining,
      accountId,
      categoryId,
      isPayable,
      debtName,
    }: {
      id: string;
      amount: number;
      remaining: number;
      accountId: string;
      categoryId: string;
      isPayable: boolean;
      debtName: string;
    }) => {
      const supabase = createBrowserSupabaseClient();

      // 1. Catat sebagai transaksi sungguhan supaya saldo akun & riwayat ikut ter-update
      //    (bayar cicilan = expense, terima pembayaran piutang = income)
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: accountId,
        category_id: categoryId,
        amount,
        type: isPayable ? "expense" : "income",
        date: new Date().toISOString(),
        note: `(${isPayable ? "Utang" : "Piutang"}) ${debtName}`,
      });
      if (txError) throw new Error("Gagal mencatat transaksi: " + txError.message);

      // 2. Update sisa utang/piutang
      const newRemaining = Math.max(0, remaining - amount);
      const { error } = await supabase
        .from("debts")
        .update({ remaining_amount: newRemaining, status: newRemaining === 0 ? "paid" : "active" })
        .eq("id", id);
      if (error) throw new Error("Gagal mengupdate sisa: " + error.message);
    },
    onSuccess: () => {
      setPayingDebt(null);
      refreshData();
      toast.success("Pembayaran tercatat");
    },
    onError: (error: any) => toast.error(error.message || "Gagal mencatat pembayaran"),
  });

  const statusPills = (
    <div className="flex gap-2">
      {([
        ["all", "Semua"],
        ["active", "Aktif"],
        ["paid", "Lunas"],
      ] as const).map(([value, label]) => (
        <Button
          key={value}
          size="sm"
          variant={statusFilter === value ? "default" : "outline"}
          aria-pressed={statusFilter === value}
          onClick={() => setStatusFilter(value)}
          className="rounded-full px-5"
        >
          {label}
        </Button>
      ))}
    </div>
  );

  const renderDebt = (debt: any) => {
    const progress = Math.min(100, Math.round(((debt.amount - debt.remaining_amount) / debt.amount) * 100));
    const isPayable = debt.type === "payable";
    const isPaid = debt.status === "paid";
    const isOverdue = !isPaid && !!debt.due_date && debt.due_date < today;
    const tint = isPayable ? "#ff9ebb" : "#9be7c4";

    return (
      <div key={debt.id} className="flex flex-col gap-2.5 rounded-[20px] border-2.5 border-line bg-background px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[17px] font-semibold">{debt.name}</h3>
            <p className="text-[13px] font-extrabold text-muted-foreground">
              Sisa {formatCurrency(debt.remaining_amount)} dari {formatCurrency(debt.amount)}
            </p>
          </div>
          {isPaid ? (
            <span className="shrink-0 rounded-full border-2 border-ink bg-cartoon-lime px-2.5 py-0.5 text-xs font-black text-ink">Lunas</span>
          ) : (
            debt.due_date && (
              <span
                className={cn(
                  "hidden shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-black text-ink sm:inline",
                  isOverdue ? "bg-cartoon-red" : "bg-cartoon-yellow"
                )}
              >
                {isOverdue ? "Lewat" : "Jatuh tempo"}{" "}
                {new Date(debt.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </span>
            )
          )}
          {!isPaid && (
            <Button size="sm" onClick={() => setPayingDebt(debt)}>
              {isPayable ? "Bayar" : "Terima"}
            </Button>
          )}
        </div>
        {!isPaid && debt.due_date && (
          <span
            className={cn(
              "self-start rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-black text-ink sm:hidden",
              isOverdue ? "bg-cartoon-red" : "bg-cartoon-yellow"
            )}
          >
            {isOverdue ? "Lewat" : "Jatuh tempo"}{" "}
            {new Date(debt.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          </span>
        )}
        <div className="flex items-center gap-2.5">
          <CartoonBar percent={progress} color={tint} className="h-4" />
          <span className="shrink-0 whitespace-nowrap text-right text-[13px] font-black">{progress}% lunas</span>
        </div>
      </div>
    );
  };

  const column = (title: string, tint: string, items: any[], emptyText: string, footer?: React.ReactNode) => (
    <section className="flex flex-col gap-3.5 rounded-cartoon border-3 border-line bg-card p-4 shadow-cartoon sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <span className="rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-black text-ink" style={{ background: tint }}>
          {items.filter((d) => d.status === "active").length} aktif
        </span>
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-sm font-bold text-muted-foreground">{emptyText}</p>
      ) : (
        items.map(renderDebt)
      )}
      {footer}
    </section>
  );

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Utang & Piutang"
        description="Kelola kewajiban dan hak finansial Anda"
        action={
          <>
            <div className="hidden lg:block">{statusPills}</div>
            <Button onClick={() => setShowForm(true)} aria-label="Tambah utang">
              <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
              <span className="hidden sm:inline">Tambah</span>
            </Button>
          </>
        }
      />

      {/* Ringkasan (mobile) */}
      <div className="grid grid-cols-2 gap-4 lg:hidden">
        <section className="rounded-cartoon border-3 border-line bg-cartoon-pink p-4 text-ink shadow-cartoon">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em]">
            <TrendingDown className="h-4 w-4" strokeWidth={3} /> Kamu berutang
          </div>
          <div className="mt-2 font-display text-2xl font-bold leading-none">{formatCurrency(totalPayable)}</div>
          <p className="mt-1.5 text-xs font-extrabold">Harus dibayar</p>
        </section>
        <section className="rounded-cartoon border-3 border-line bg-cartoon-mint p-4 text-ink shadow-cartoon">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em]">
            <TrendingUp className="h-4 w-4" strokeWidth={3} /> Orang berutang
          </div>
          <div className="mt-2 font-display text-2xl font-bold leading-none">{formatCurrency(totalReceivable)}</div>
          <p className="mt-1.5 text-xs font-extrabold">Bisa ditagih</p>
        </section>
      </div>
      <div className="lg:hidden">{statusPills}</div>

      {/* Ringkasan (desktop) */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-4">
        <StatCard
          color="#ff9ebb"
          label="Kamu berutang"
          value={formatCurrency(totalPayable)}
          note={`${active.filter((d) => d.type === "payable").length} utang aktif`}
          icon={<Coins />}
        />
        <StatCard
          color="#9be7c4"
          label="Orang berutang"
          value={formatCurrency(totalReceivable)}
          note={`${active.filter((d) => d.type === "receivable").length} piutang aktif`}
          icon={<HandCoins />}
        />
        <StatCard
          color="#ffd447"
          label="Jatuh tempo 7 hari"
          value={`${dueSoon.length} tagihan`}
          note={<span className="block truncate">{dueSoon.length ? dueSoon.map((d) => d.name).join(" · ") : "Aman, tidak ada"}</span>}
          icon={<CalendarClock />}
        />
        <StatCard label="Sudah lunas" value={paidCount} note="utang & piutang selesai" icon={<CheckCircle2 />} />
      </div>

      {displayDebts.length === 0 ? (
        <div className="rounded-cartoon border-3 border-line bg-card shadow-cartoon">
          <EmptyState titleKey="debts.empty.title" descriptionKey="debts.empty.description" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {column("Utang saya", "#ff9ebb", payables, "Tidak ada utang di sini.")}
          {column(
            "Piutang",
            "#9be7c4",
            receivables,
            "Tidak ada piutang di sini.",
            receivables.some((d) => d.status === "active") && (
              <div className="mt-auto flex items-center gap-3 rounded-[18px] border-2.5 border-dashed border-line px-3.5 py-3">
                <Mascot size={44} className="shrink-0" />
                <p className="text-[13px] font-extrabold">Ingetin teman dengan sopan ya — tekan “Terima” saat uangnya sudah masuk.</p>
              </div>
            )
          )}
        </div>
      )}

      <DebtFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
      <PayDebtDialog
        debt={payingDebt}
        accounts={accounts}
        categories={categories}
        onOpenChange={(open) => !open && setPayingDebt(null)}
        onSubmit={(amount, accountId, categoryId) =>
          payingDebt &&
          payMutation.mutate({
            id: payingDebt.id,
            amount,
            remaining: Number(payingDebt.remaining_amount),
            accountId,
            categoryId,
            isPayable: payingDebt.type === "payable",
            debtName: payingDebt.name,
          })
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
      <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Catat Utang / Piutang</DialogTitle>
        </DialogHeader>
        <form id="debt-form" onSubmit={handleSubmit(submit)} className="space-y-5 py-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama</Label>
            <Input {...register("name")} placeholder="Pinjaman Bank / Nama Orang" className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jenis</Label>
            <Select value={watch("type")} onValueChange={(v) => setValue("type", v as "payable" | "receivable")}>
              <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-line bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-line">
                <SelectItem value="payable" className="rounded-xl">Utang Saya (harus dibayar)</SelectItem>
                <SelectItem value="receivable" className="rounded-xl">Piutang (orang berutang ke saya)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah</Label>
            <Input {...register("amount")} type="number" placeholder="0" className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jatuh Tempo (opsional)</Label>
            <Input {...register("due_date")} type="date" className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
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
  accounts,
  categories,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  debt: any | null;
  accounts: any[];
  categories: any[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number, accountId: string, categoryId: string) => void;
  isPending: boolean;
}) {
  const paySchema = z.object({
    amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
    account_id: z.string().min(1, "Pilih akun terlebih dahulu"),
    category_id: z.string().min(1, "Pilih kategori terlebih dahulu"),
  });
  type PayFormData = z.infer<typeof paySchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PayFormData>({
    resolver: zodResolver(paySchema),
    defaultValues: { amount: 0, account_id: "", category_id: "" },
  });

  const isPayable = debt?.type === "payable";
  const relevantCategories = categories.filter((c) => c.type === (isPayable ? "expense" : "income"));

  const submit = (data: PayFormData) => {
    onSubmit(data.amount, data.account_id, data.category_id);
    reset();
  };

  return (
    <Dialog open={!!debt} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-cartoon p-6 border-line shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isPayable ? "Bayar Cicilan" : "Terima Pembayaran"}: {debt?.name}
          </DialogTitle>
        </DialogHeader>
        <form id="pay-debt-form" onSubmit={handleSubmit(submit)} className="py-4 space-y-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah</Label>
            <Input {...register("amount")} type="number" placeholder="0" autoFocus className="mt-1.5 h-12 rounded-xl bg-secondary border-line" />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
            {debt && <p className="mt-2 text-xs text-muted-foreground">Sisa saat ini: {formatCurrency(debt.remaining_amount)}</p>}
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isPayable ? "Bayar dari Akun" : "Terima ke Akun"}
            </Label>
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
                {relevantCategories.map((cat) => (
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
          <Button type="submit" form="pay-debt-form" className="rounded-full font-bold" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
