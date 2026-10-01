"use client";

import { useRefreshData } from "@/hooks/use-refresh-data";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createTransaction, updateTransaction } from "./actions";
import { transactionSchema, type TransactionFormData } from "@/lib/validators/transaction";
import { Category, Account } from "@/types/domain";
import { ArrowLeft, ArrowLeftRight, Calendar, Check } from "lucide-react";
import { CategorySticker } from "@/components/common/CategorySticker";
import { Sticker } from "@/components/common/Sticker";
import { Mascot } from "@/components/common/Mascot";
import { PageHeader } from "@/components/common/PageHeader";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface TransactionFormContentProps {
  locale: "id" | "en";
  userId: string;
  initialType: "income" | "expense" | "transfer";
  categories: Category[];
  accounts: Account[];
  isEdit: boolean;
  transactionId?: string;
  initialData?: TransactionFormData & { date: string; category_id: string; account_id: string };
}

export function TransactionFormContent({
  locale,
  userId,
  initialType,
  categories,
  accounts,
  isEdit,
  transactionId,
  initialData,
}: TransactionFormContentProps) {
  const router = useRouter();
  const refreshData = useRefreshData();
  const pathname = usePathname();
  const t = useTranslations("transactions");
  const ct = useTranslations("common");
  const [showRecurring, setShowRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const localeObj = locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale;

  const filteredCategoriesInitial = categories.filter((c) => c.type === initialType);

  const defaultValues: TransactionFormData = {
    type: initialType,
    amount: 0,
    category_id: filteredCategoriesInitial[0]?.id || "",
    account_id: accounts[0]?.id || "",
    to_account_id: undefined,
    date: new Date().toISOString().split("T")[0],
    note: "",
    is_recurring: false,
    recurring_rule: undefined,
  };

  if (initialData) {
    Object.assign(defaultValues, {
      ...initialData,
      amount: Number(initialData.amount),
      is_recurring: initialData.is_recurring || false,
    });
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const watchedType = watch("type");
  const filteredCategories = categories.filter((c) => c.type === watchedType);
  const watchedIsRecurring = watch("is_recurring");

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result =
        isEdit && transactionId
          ? await updateTransaction(transactionId, data)
          : await createTransaction(data);

      if (!result.success) {
        setSubmitError(result.error || t("form.error"));
        return;
      }

      router.push("/transactions");
      refreshData();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("form.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: "expense" as const, label: t("form.typeExpense"), color: "#ff9ebb" },
    { value: "income" as const, label: t("form.typeIncome"), color: "#9be7c4" },
    { value: "transfer" as const, label: t("form.typeTransfer"), color: "#8fd3ff" },
  ];
  const activeType = typeOptions.find((o) => o.value === watchedType) ?? typeOptions[0];
  const today = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];
  const watchedDate = watch("date");
  const watchedCategoryId = watch("category_id");
  const watchedAccountId = watch("account_id");

  const changeType = (type: "income" | "expense" | "transfer") => {
    setValue("type", type);
    // Kategori harus sesuai tipe: pilih kategori pertama dari tipe baru
    const first = categories.find((c) => c.type === type);
    setValue("category_id", type === "transfer" ? "" : first?.id || "");
  };

  const section = "rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon";
  const sectionLabel = "mb-2.5 block text-xs font-black uppercase tracking-[0.1em] text-muted-foreground";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-4" noValidate>
      <PageHeader
        title={isEdit ? "Ubah Transaksi" : "Catat Transaksi"}
        description={isEdit ? "Perbarui detail transaksi" : "Catat langsung setelah bayar biar nggak lupa"}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {/* Type Selector (only for new) */}
          {!isEdit && (
            <div className="grid grid-cols-3 gap-1.5 rounded-[20px] border-3 border-line bg-card p-1.5 shadow-cartoon-sm sm:max-w-md">
              {typeOptions.map((opt) => {
                const active = watchedType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => changeType(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-11 items-center justify-center gap-1.5 rounded-[14px] border-2.5 text-sm font-black transition-colors",
                      active ? "border-ink text-ink" : "border-transparent text-foreground hover:bg-accent"
                    )}
                    style={active ? { background: opt.color } : undefined}
                  >
                    {opt.value === "transfer" && <ArrowLeftRight className="h-4 w-4" strokeWidth={3} />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Amount */}
          <div
            className="rounded-cartoon border-3 border-line px-5 py-4 text-ink shadow-cartoon-lg"
            style={{ background: activeType.color }}
          >
            <label htmlFor="amount" className="text-xs font-black uppercase tracking-[0.1em]">
              {t("form.amountLabel")}
            </label>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-semibold">Rp</span>
              <input
                {...register("amount", { valueAsNumber: true })}
                id="amount"
                type="number"
                placeholder="0"
                className="w-full min-w-0 border-0 bg-transparent p-0 font-display text-5xl font-bold text-ink outline-none placeholder:text-ink/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none lg:text-6xl"
                disabled={isSubmitting}
                min="1"
                step="1"
                inputMode="numeric"
                aria-invalid={errors.amount ? "true" : "false"}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm font-black" role="alert">{errors.amount.message}</p>
            )}
          </div>

          {/* Category or destination account */}
          <div className={section}>
            {watchedType === "transfer" ? (
              <>
                <span className={sectionLabel}>{t("form.toAccountLabel")}</span>
                <AccountPicker
                  accounts={accounts.filter((acc) => acc.id !== watchedAccountId)}
                  value={watch("to_account_id") || ""}
                  onChange={(id) => setValue("to_account_id", id)}
                  locale={localeObj}
                />
                {errors.to_account_id && (
                  <p className="mt-2 text-sm font-bold text-destructive" role="alert">{errors.to_account_id.message}</p>
                )}
              </>
            ) : (
              <>
                <span className={sectionLabel}>{t("form.categoryLabel")}</span>
                {filteredCategories.length === 0 ? (
                  <p className="text-sm font-bold text-muted-foreground">Belum ada kategori untuk tipe ini.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 xl:grid-cols-8">
                    {filteredCategories.map((cat, i) => {
                      const selected = watchedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setValue("category_id", cat.id)}
                          aria-pressed={selected}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <CategorySticker
                            category={cat}
                            size="lg"
                            tilt={selected ? (i % 2 === 0 ? -6 : 6) : 0}
                            className={cn("transition-transform", selected && "scale-110 shadow-cartoon")}
                          />
                          <span className={cn("text-center text-xs leading-tight", selected ? "font-black" : "font-bold text-muted-foreground")}>
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.category_id && (
                  <p className="mt-2 text-sm font-bold text-destructive" role="alert">{errors.category_id.message}</p>
                )}
              </>
            )}
          </div>

          {/* Source account */}
          <div className={section}>
            <span className={sectionLabel}>{t("form.accountLabel")}</span>
            <AccountPicker
              accounts={accounts}
              value={watchedAccountId}
              onChange={(id) => setValue("account_id", id)}
              locale={localeObj}
            />
            {errors.account_id && (
              <p className="mt-2 text-sm font-bold text-destructive" role="alert">{errors.account_id.message}</p>
            )}
          </div>

          {/* Date + note */}
          <div className={cn(section, "grid gap-5 sm:grid-cols-[260px_minmax(0,1fr)]")}>
            <div>
              <Label htmlFor="date" className={sectionLabel}>{t("form.dateLabel")}</Label>
              <div className="mb-2.5 flex gap-2">
                {[
                  { label: "Hari ini", value: today },
                  { label: "Kemarin", value: yesterday },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setValue("date", chip.value)}
                    className={cn(
                      "h-8 rounded-full border-2.5 border-line px-3 text-xs font-black",
                      watchedDate === chip.value ? "bg-primary text-ink" : "bg-background"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2" strokeWidth={2.5} />
                <Input
                  {...register("date")}
                  id="date"
                  type="date"
                  className="pl-11"
                  disabled={isSubmitting}
                  max={today}
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-sm font-bold text-destructive" role="alert">{errors.date.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="note" className={sectionLabel}>{t("form.noteLabel")}</Label>
              <Textarea
                {...register("note")}
                id="note"
                placeholder={t("form.notePlaceholder")}
                className="min-h-[96px]"
                disabled={isSubmitting}
                maxLength={500}
              />
              {errors.note && (
                <p className="mt-1 text-sm font-bold text-destructive" role="alert">{errors.note.message}</p>
              )}
            </div>
          </div>

          {/* Recurring Toggle */}
          <div className={section}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-display text-lg font-semibold">{t("form.recurringLabel")}</Label>
                <p className="text-sm font-bold text-muted-foreground">{t("form.recurringDescription")}</p>
              </div>
              <Switch
                checked={watchedIsRecurring}
                onCheckedChange={(checked) => {
                  setValue("is_recurring", checked);
                  setShowRecurring(checked);
                }}
                aria-label={t("form.recurringLabel")}
              />
            </div>

            {showRecurring && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className={sectionLabel}>{t("form.recurringFrequency")}</Label>
                  <Select
                    value={watch("recurring_rule.frequency") || "monthly"}
                    onValueChange={(value) =>
                      setValue("recurring_rule.frequency", value as "daily" | "weekly" | "monthly" | "yearly")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("form.recurringFrequencyPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("form.frequencyDaily")}</SelectItem>
                      <SelectItem value="weekly">{t("form.frequencyWeekly")}</SelectItem>
                      <SelectItem value="monthly">{t("form.frequencyMonthly")}</SelectItem>
                      <SelectItem value="yearly">{t("form.frequencyYearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={sectionLabel}>{t("form.recurringEndDate")}</Label>
                  <Input
                    type="date"
                    {...register("recurring_rule.end_date")}
                    min={today}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="rounded-2xl border-2.5 border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive" role="alert">
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={3} />
              {ct("cancel")}
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting}>
              <Check className="mr-2 h-5 w-5" strokeWidth={3.5} />
              {isSubmitting ? (isEdit ? t("form.updating") : t("form.submitting")) : ct("save")}
            </Button>
          </div>
        </div>

        {/* Side tip (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-0 flex flex-col items-center gap-2.5 rounded-cartoon border-3 border-line bg-cartoon-yellow p-5 text-center text-ink shadow-cartoon">
            <Mascot size={96} />
            <p className="font-display text-lg font-semibold">Tips dari Koin</p>
            <p className="text-sm font-extrabold">
              Catat langsung setelah bayar biar nggak lupa. Kopi kecil-kecil lama-lama jadi bukit!
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

const ACCOUNT_COLORS = ["#8fd3ff", "#ffd447", "#9be7c4", "#ff9ebb", "#c9b6ff", "#ffb86b"];

function AccountPicker({
  accounts,
  value,
  onChange,
  locale,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  locale: string;
}) {
  if (accounts.length === 0) {
    return <p className="text-sm font-bold text-muted-foreground">Belum ada akun.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
      {accounts.map((acc, i) => {
        const selected = value === acc.id;
        const color = acc.color || ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onChange(acc.id)}
            aria-pressed={selected}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-2xl border-3 px-3 py-2.5 text-left transition-all",
              selected ? "border-ink bg-primary text-ink shadow-cartoon-sm" : "border-line bg-background"
            )}
          >
            <Sticker color={color} size="sm" className="font-display text-sm font-bold">
              {acc.name.charAt(0).toUpperCase()}
            </Sticker>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{acc.name}</span>
              <span className="block truncate text-[11px] font-extrabold opacity-75">
                {formatCurrency(acc.balance, acc.currency, locale)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
