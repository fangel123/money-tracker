"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, ACCOUNT_TYPES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, CreditCard, Wallet, Building2, Smartphone, TrendingUp, Briefcase, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema, type AccountFormData } from "@/lib/validators/account";
import { Account } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface AccountsContentProps {
  locale: "id" | "en";
  userId: string;
  initialAccounts: Account[];
}

const ACCOUNT_ICONS = {
  cash: Wallet,
  bank: Building2,
  ewallet: Smartphone,
  credit_card: CreditCard,
  investment: TrendingUp,
  other: Briefcase,
};

export function AccountsContent({ locale, userId, initialAccounts }: AccountsContentProps) {
  const t = useTranslations("accounts");
  const ct = useTranslations("common");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("accounts").select("*").eq("user_id", userId).eq("is_active", true).order("sort_order");
      return (data || []) as Account[];
    },
    initialData: initialAccounts,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const supabase = createBrowserSupabaseClient();
      if (editingAccount) {
        const { error } = await supabase.from("accounts").update(data).eq("id", editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert({ ...data, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowForm(false);
      setEditingAccount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("accounts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const totalBalance = accounts.reduce((sum, account) => {
    // Kurangi saldo kartu kredit dari total kekayaan
    if (account.type === "credit_card") {
      return sum - Number(account.balance);
    }
    return sum + Number(account.balance);
  }, 0);

  return (
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Aset & Rekening <Briefcase className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">{t("header.description")}</p>
        </div>
        <Button 
          onClick={() => { setEditingAccount(null); setShowForm(true); }}
          className="rounded-full h-12 w-12 p-0 shadow-lg" 
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Summary Card */}
      {accounts.length > 0 && (
        <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 text-white shadow-lg border border-border/20">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">
            <Wallet className="h-4 w-4 text-primary" />
            <span>TOTAL KEKAYAAN BERSIH</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className={cn("text-4xl font-black tracking-tight", totalBalance < 0 ? "text-destructive" : "text-primary")}>
              {formatCurrency(totalBalance, "IDR", locale)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400">
            Kombinasi saldo positif dikurangi utang kartu kredit
          </p>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="bg-card rounded-[2rem] border border-border/50 p-8">
            <EmptyState
              icon={<Wallet className="h-12 w-12" />}
              titleKey="accounts.empty.title"
              descriptionKey="accounts.empty.description"
              actionKey="accounts.empty.action"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              locale={locale}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingAccount ? t("form.editTitle") : t("form.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AccountForm
              initialData={editingAccount}
              onSubmit={(data) => saveMutation.mutate(data)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setShowForm(false)}>
              {ct("cancel")}
            </Button>
            <Button 
              type="submit" 
              form="account-form" 
              className="rounded-full font-bold"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? ct("saving") : ct("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountCard({
  account,
  locale,
  onEdit,
  onDelete,
}: {
  account: Account;
  locale: "id" | "en";
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("accounts");
  const ct = useTranslations("common");

  const Icon = ACCOUNT_ICONS[account.type as keyof typeof ACCOUNT_ICONS] || Briefcase;
  const isDebt = account.type === "credit_card";

  return (
    <div className="bg-card border border-border/50 rounded-[2rem] p-5 shadow-sm relative overflow-hidden group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div 
            className="h-12 w-12 rounded-full flex items-center justify-center text-xl bg-secondary"
            style={{ color: account.color || undefined, backgroundColor: account.color ? `${account.color}20` : undefined }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">{account.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
              {t(`types.${account.type}`)}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-border/50">
            <DropdownMenuItem onClick={() => onEdit(account)} className="rounded-xl cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              {ct("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(account.id)}
              className="text-destructive focus:text-destructive rounded-xl cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {ct("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-bold">
          <span className="text-muted-foreground">Saldo Saat Ini</span>
          <span className={cn("text-lg", isDebt ? "text-destructive" : "text-foreground")}>
            {formatCurrency(account.balance, account.currency, locale)}
          </span>
        </div>
      </div>
    </div>
  );
}

function AccountForm({
  onSubmit,
  isEditing,
  initialData,
}: {
  onSubmit: (data: AccountFormData) => void;
  isEditing?: boolean;
  initialData: Account | null;
}) {
  const t = useTranslations("accounts");
  const ct = useTranslations("common");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "bank",
      currency: initialData?.currency || "IDR",
      balance: initialData?.balance || 0,
      icon: initialData?.icon || "",
      color: initialData?.color || "",
      is_active: initialData?.is_active ?? true,
      sort_order: initialData?.sort_order || 0,
    },
  });

  return (
    <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.nameLabel")}</Label>
        <Input
          {...register("name")}
          placeholder={t("form.namePlaceholder")}
          className="mt-1.5 h-12 text-base font-bold rounded-xl border-border/50 bg-secondary/50"
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.typeLabel")}</Label>
        <Select
          value={watch("type")}
          onValueChange={(value) => setValue("type", value as Account["type"])}
        >
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-border/50 bg-secondary/50">
            <SelectValue placeholder={t("form.typeLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50">
            {ACCOUNT_TYPES.map((typeObj) => (
              <SelectItem key={typeObj.value} value={typeObj.value} className="rounded-xl">
                {t(`types.${typeObj.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.balanceLabel")}</Label>
        <Input
          {...register("balance", { valueAsNumber: true })}
          type="number"
          placeholder="0"
          className="mt-1.5 h-12 text-lg font-bold rounded-xl border-border/50 bg-secondary/50"
        />
        {errors.balance && <p className="mt-1 text-xs text-destructive">{errors.balance.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.currencyLabel")}</Label>
        <Input
          {...register("currency")}
          placeholder="IDR"
          className="mt-1.5 h-12 rounded-xl border-border/50 bg-secondary/50"
        />
      </div>
    </form>
  );
}