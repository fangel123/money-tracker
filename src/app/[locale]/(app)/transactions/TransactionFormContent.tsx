"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTransaction, updateTransaction } from "./actions";
import { transactionSchema, type TransactionFormData } from "@/lib/validators/transaction";
import { Category, Account } from "@/types/domain";
import { ArrowLeft, ArrowLeftRight, Plus, Calendar } from "lucide-react";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface TransactionFormContentProps {
  locale: "id" | "en";
  userId: string;
  initialType: "income" | "expense";
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
  const pathname = usePathname();
  const t = useTranslations("transactions");
  const ct = useTranslations("common");
  const [showRecurring, setShowRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const localeObj = locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale;

  const filteredCategories = categories.filter((c) => c.type === initialType);

  const defaultValues: TransactionFormData = {
    type: initialType,
    amount: 0,
    category_id: filteredCategories[0]?.id || "",
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
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("form.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Type Selector (only for new) */}
      {!isEdit && (
        <Card>
          <CardContent className="pt-6">
            <Label className="block text-sm font-medium text-muted-foreground mb-2">
              {t("form.typeLabel")}
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={watchedType === "income" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setValue("type", "income")}
              >
                {t("form.typeIncome")}
              </Button>
              <Button
                type="button"
                variant={watchedType === "expense" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setValue("type", "expense")}
              >
                {t("form.typeExpense")}
              </Button>
              <Button
                type="button"
                variant={watchedType === "transfer" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setValue("type", "transfer")}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                {t("form.typeTransfer")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amount */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="amount">{t("form.amountLabel")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Rp
              </span>
              <Input
                {...register("amount", { valueAsNumber: true })}
                id="amount"
                type="number"
                placeholder={t("form.amountPlaceholder")}
                className="pl-8 text-right text-lg font-mono"
                error={errors.amount?.message}
                disabled={isSubmitting}
                min="1"
                step="1"
                inputMode="numeric"
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive" role="alert">{errors.amount.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category (income/expense) atau Akun Tujuan (transfer) & Akun Sumber */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            {watchedType === "transfer" ? (
              <>
                <Label htmlFor="to_account_id">{t("form.toAccountLabel")}</Label>
                <Select
                  value={watch("to_account_id") || ""}
                  onValueChange={(value) => setValue("to_account_id", value)}
                >
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder={t("form.toAccountPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((acc) => acc.id !== watch("account_id"))
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="flex items-center">
                            {acc.icon && <DynamicIcon name={acc.icon} className="mr-2 h-4 w-4" style={{ color: acc.color || undefined }} />}
                            {acc.name} ({formatCurrency(acc.balance, acc.currency, locale)})
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.to_account_id && (
                  <p className="mt-1 text-sm text-destructive" role="alert">{errors.to_account_id.message}</p>
                )}
              </>
            ) : (
              <>
                <Label htmlFor="category_id">{t("form.categoryLabel")}</Label>
                <Select
                  value={watch("category_id") || ""}
                  onValueChange={(value) => setValue("category_id", value)}
                >
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder={t("form.categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center">
                          {cat.icon && <DynamicIcon name={cat.icon} className="mr-2 h-4 w-4" style={{ color: cat.color || undefined }} />}
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-destructive" role="alert">{errors.category_id.message}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label htmlFor="account_id">{t("form.accountLabel")}</Label>
            <Select
              value={watch("account_id")}
              onValueChange={(value) => setValue("account_id", value)}
            >
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue placeholder={t("form.accountPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <span className="flex items-center">
                      {acc.icon && <DynamicIcon name={acc.icon} className="mr-2 h-4 w-4" style={{ color: acc.color || undefined }} />}
                      {acc.name} ({formatCurrency(acc.balance, acc.currency, locale)})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="mt-1 text-sm text-destructive" role="alert">{errors.account_id.message}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Date */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="date">{t("form.dateLabel")}</Label>
          <div className="relative mt-1.5">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register("date")}
              id="date"
              type="date"
              className="pl-10"
              error={errors.date?.message}
              disabled={isSubmitting}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          {errors.date && (
            <p className="mt-1 text-sm text-destructive" role="alert">{errors.date.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="note">{t("form.noteLabel")}</Label>
          <Textarea
            {...register("note")}
            id="note"
            placeholder={t("form.notePlaceholder")}
            className="mt-1.5 min-h-[100px]"
            error={errors.note?.message}
            disabled={isSubmitting}
            maxLength={500}
          />
          {errors.note && (
            <p className="mt-1 text-sm text-destructive" role="alert">{errors.note.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Recurring Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("form.recurringLabel")}</Label>
              <p className="text-sm text-muted-foreground">{t("form.recurringDescription")}</p>
            </div>
            <Switch
              checked={watchedIsRecurring}
              onCheckedChange={(checked) => {
                setValue("is_recurring", checked);
                setShowRecurring(checked);
              }}
            />
          </div>

          {showRecurring && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("form.recurringFrequency")}</Label>
                <Select
                  value={watch("recurring_rule.frequency") || "monthly"}
                  onValueChange={(value) =>
                    setValue("recurring_rule.frequency", value as "daily" | "weekly" | "monthly" | "yearly")
                  }
                >
                  <SelectTrigger className="w-full mt-1.5">
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
                <Label>{t("form.recurringEndDate")}</Label>
                <Input
                  type="date"
                  {...register("recurring_rule.end_date")}
                  className="mt-1.5"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {submitError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {ct("cancel")}
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? t("form.updating") : t("form.submitting")) : ct("save")}
        </Button>
      </div>
    </form>
  );
}