"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, ACCOUNT_TYPES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, CreditCard, Wallet, Building2, Smartphone, PiggyBank, TrendingUp, Briefcase } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema, type AccountFormData } from "@/lib/validators/account";
import { Account } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface AccountsContentProps {
  locale: "id" | "en" | "zh" | "ja" | "ko";
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
  const [selectedIcon, setSelectedIcon] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("accounts").select("*").eq("user_id", userId).eq("is_active", true).order("sort_order");
      return data as Account[];
    },
    initialData: initialAccounts,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("transactions").select("account_id, amount, type").eq("user_id", userId);
      return data as any[];
    },
  });

  const accountsWithBalance = accounts.map((account) => {
    const accountTransactions = transactions.filter((tx) => tx.account_id === account.id);
    const calculatedBalance = accountTransactions.reduce((sum, tx) => {
      return tx.type === "income" ? sum + tx.amount : sum - tx.amount;
    }, 0);
    
    return {
      ...account,
      currentBalance: account.balance + calculatedBalance,
    };
  });

  const totalBalance = accountsWithBalance.reduce((sum, acc) => sum + acc.currentBalance, 0);

  const createMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const supabase = createBrowserSupabaseClient();
      const { data: result, error } = await supabase.from("accounts").insert({
        ...data,
        user_id: userId,
        balance: data.balance || 0,
        color: data.color || ACCOUNT_TYPES.find(t => t.value === data.type)?.color || "#64748b",
        icon: data.icon || "wallet",
      }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setEditingAccount(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AccountFormData> }) => {
      const supabase = createBrowserSupabaseClient();
      const { data: result, error } = await supabase.from("accounts").update({
        ...data,
        balance: data.balance ?? 0,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("user_id", userId).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditingAccount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { data: txs } = await supabase.from("transactions").select("id").eq("account_id", id).limit(1);
      if (txs && txs.length > 0) {
        const { error } = await supabase.from("accounts").update({ is_active: false }).eq("id", id).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleSubmit = (data: AccountFormData) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreate = () => {
    const defaultType = ACCOUNT_TYPES[0];
    setSelectedIcon(defaultType.icon);
    setSelectedColor(defaultType.color);
    setEditingAccount(null);
    setShowForm(true);
  };

  const openEdit = (account: Account) => {
    setSelectedIcon(account.icon || "");
    setSelectedColor(account.color || "");
    setEditingAccount(account);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  const localeObj = locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground">{accounts.length} {ct("accounts")}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t("totalBalance")}</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalBalance, "IDR", localeObj)}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addTitle")}
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<PiggyBank className="h-12 w-12" />}
              titleKey="accounts.empty.title"
              descriptionKey="accounts.empty.description"
              actionKey="accounts.empty.action"
              onAction={openCreate}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accountsWithBalance.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              locale={locale}
              onEdit={openEdit}
              onDelete={deleteMutation.mutate}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? t("editTitle") : t("addTitle")}</DialogTitle>
          </DialogHeader>
          <AccountForm
            onSubmit={handleSubmit}
            isEditing={!!editingAccount}
            initialData={editingAccount}
            selectedIcon={selectedIcon}
            setSelectedIcon={setSelectedIcon}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>
              {ct("cancel")}
            </Button>
            <Button type="submit" form="account-form" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : ct("save")}
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
  account: Account & { currentBalance: number };
  locale: "id" | "en" | "zh" | "ja" | "ko";
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("accounts");
  const ct = useTranslations("common");
  const localeObj = locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale;
  const IconComponent = ACCOUNT_ICONS[account.type] || Wallet;
  const typeInfo = ACCOUNT_TYPES.find((t) => t.value === account.type);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: account.color || typeInfo?.color }}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: account.color ? `${account.color}20` : "var(--muted)" }}
            >
              <IconComponent className="h-5 w-5" style={{ color: account.color || typeInfo?.color }} />
            </div>
            <div>
              <h3 className="font-medium">{account.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{typeInfo?.label || account.type}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
                <span className="h-5 w-5">⋮</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Edit className="mr-2 h-4 w-4" />
                {ct("edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(account.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {ct("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{t("balance")}</p>
          <p className="text-2xl font-bold text-foreground" style={{ color: account.currentBalance >= 0 ? "var(--primary)" : "var(--destructive)" }}>
            {formatCurrency(account.currentBalance, account.currency, localeObj)}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded-full bg-muted">
            {account.currency}
          </span>
          {account.is_active && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
              Aktif
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AccountForm({
  onSubmit,
  isEditing,
  initialData,
  selectedIcon,
  setSelectedIcon,
  selectedColor,
  setSelectedColor,
}: {
  onSubmit: (data: AccountFormData) => void;
  isEditing: boolean;
  initialData: Account | null;
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
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
      type: initialData?.type || "cash",
      currency: initialData?.currency || "IDR",
      balance: initialData?.balance || 0,
      icon: initialData?.icon || "",
      color: initialData?.color || "",
    },
  });

  const watchedType = watch("type");
  const typeInfo = ACCOUNT_TYPES.find((t) => t.value === watchedType);
  const defaultIcon = typeInfo?.icon || "wallet";
  const defaultColor = typeInfo?.color || "#64748b";

  const handleTypeChange = (value: string) => {
    setValue("type", value as any);
    const info = ACCOUNT_TYPES.find((t) => t.value === value);
    if (info) {
      setSelectedIcon(info.icon);
      setSelectedColor(info.color);
      setValue("icon", info.icon);
      setValue("color", info.color);
    }
  };

  return (
    <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">{t("form.nameLabel")}</Label>
        <Input
          {...register("name")}
          id="name"
          placeholder={t("form.namePlaceholder")}
          error={errors.name?.message}
        />
        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label>{t("form.typeLabel")}</Label>
        <Select
          value={watchedType}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder={t("form.typeLabel")} />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((type) => {
              const Icon = ACCOUNT_ICONS[type.value as keyof typeof ACCOUNT_ICONS];
              return (
                <SelectItem key={type.value} value={type.value}>
                  <Icon className="mr-2 h-4 w-4" style={{ color: type.color }} />
                  {type.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="currency">{t("form.currencyLabel")}</Label>
        <Select
          value={watch("currency")}
          onValueChange={(value) => setValue("currency", value)}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder={t("form.currencyLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IDR">IDR - Rupiah Indonesia</SelectItem>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
            <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="balance">{t("form.balanceLabel")}</Label>
        <Input
          {...register("balance", { valueAsNumber: true })}
          id="balance"
          type="number"
          placeholder="0"
          className="mt-1.5 text-right font-mono"
          error={errors.balance?.message}
          step="1000"
        />
        {errors.balance && <p className="mt-1 text-sm text-destructive">{errors.balance.message}</p>}
      </div>

      <div>
        <Label>{t("form.iconLabel")}</Label>
        <div className="mt-1.5 flex flex-wrap gap-1 max-h-40 overflow-y-auto p-2 border rounded-lg">
          {Object.values(ACCOUNT_ICONS).map((Icon) => {
            const iconName = Icon.displayName || "wallet";
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  setSelectedIcon(iconName);
                  setValue("icon", iconName);
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  selectedIcon === iconName
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>{t("form.colorLabel")}</Label>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.color}
              type="button"
              onClick={() => {
                setSelectedColor(type.color);
                setValue("color", type.color);
              }}
              className={cn(
                "h-8 w-8 rounded-lg border-2 transition-all",
                selectedColor === type.color
                  ? "border-primary scale-110"
                  : "border-transparent hover:border-muted-foreground/50"
              )}
              style={{ backgroundColor: type.color }}
            />
          ))}
        </div>
      </div>
    </form>
  );
}