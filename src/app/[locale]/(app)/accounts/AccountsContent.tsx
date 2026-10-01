"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, ACCOUNT_TYPES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { HeroCard } from "@/components/common/HeroCard";
import { Sticker } from "@/components/common/Sticker";
import { Plus, Edit, Trash2, CreditCard, Wallet, Building2, Smartphone, TrendingUp, Briefcase, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema, type AccountFormData } from "@/lib/validators/account";
import { Account } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

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
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Akun"
        description={t("header.description")}
        action={
          <Button onClick={() => { setEditingAccount(null); setShowForm(true); }} aria-label={t("addTitle")}>
            <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
            <span className="hidden sm:inline">Akun Baru</span>
          </Button>
        }
      />

      {/* Summary Card */}
      {accounts.length > 0 && (
        <HeroCard color="#8fd3ff" label="Total kekayaan bersih" value={formatCurrency(totalBalance, "IDR", locale)}>
          <p className="mt-2 text-sm font-extrabold">Saldo semua akun dikurangi utang kartu kredit</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-black">{accounts.length} akun aktif</span>
          </div>
        </HeroCard>
      )}

      {/* List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
        {accounts.length === 0 ? (
          <div className="bg-card rounded-cartoon border-3 border-line p-8 shadow-cartoon sm:col-span-full">
            <EmptyState
              icon={<Wallet className="h-12 w-12" />}
              titleKey="accounts.empty.title"
              descriptionKey="accounts.empty.description"
              actionKey="accounts.empty.action"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          accounts.map((account, index) => (
            <AccountCard
              key={account.id}
              index={index}
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
        <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingAccount ? t("editTitle") : t("addTitle")}
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

const ACCOUNT_COLORS = ["#8fd3ff", "#ffd447", "#9be7c4", "#ff9ebb", "#c9b6ff", "#ffb86b"];

function AccountCard({
  account,
  index,
  locale,
  onEdit,
  onDelete,
}: {
  account: Account;
  index: number;
  locale: "id" | "en";
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("accounts");
  const ct = useTranslations("common");

  const Icon = ACCOUNT_ICONS[account.type as keyof typeof ACCOUNT_ICONS] || Briefcase;
  const isDebt = account.type === "credit_card";

  const color = account.color || ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];

  return (
    <div className="flex flex-col gap-4 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
      <div className="flex items-center justify-between gap-2">
        <Sticker color={color} size="lg" tilt={index % 2 === 0 ? -3 : 3}>
          <Icon />
        </Sticker>
        <div className="flex items-center gap-2">
          <span className="rounded-full border-2 border-line bg-background px-2.5 py-0.5 text-xs font-black">
            {t(`types.${account.type}`)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-line bg-background" aria-label={ct("actions")}>
                <MoreVertical className="h-4 w-4" strokeWidth={3} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                {ct("edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(account.id)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {ct("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div>
        <h3 className="truncate text-sm font-black text-muted-foreground">{account.name}</h3>
        <p className={cn("mt-1 truncate font-display text-[28px] font-bold leading-none", isDebt && "text-expense")}>
          {formatCurrency(account.balance, account.currency, locale)}
        </p>
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
      icon: initialData?.icon ?? undefined,
      color: initialData?.color ?? undefined,
    },
  });

  return (
    <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.nameLabel")}</Label>
        <Input
          {...register("name")}
          placeholder={t("form.namePlaceholder")}
          className="mt-1.5 h-12 text-base font-bold rounded-xl border-line bg-secondary"
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.typeLabel")}</Label>
        <Select
          value={watch("type")}
          onValueChange={(value) => setValue("type", value as Account["type"])}
        >
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-line bg-secondary">
            <SelectValue placeholder={t("form.typeLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-line">
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
          className="mt-1.5 h-12 text-lg font-bold rounded-xl border-line bg-secondary"
        />
        {errors.balance && <p className="mt-1 text-xs text-destructive">{errors.balance.message}</p>}
      </div>
    </form>
  );
}