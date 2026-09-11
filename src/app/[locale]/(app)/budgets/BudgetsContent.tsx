"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle, Calendar, Target } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetFormData } from "@/lib/validators/budget";
import { Budget, Category } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Progress } from "@/components/ui/progress";

interface BudgetsContentProps {
  locale: "id" | "en" | "zh" | "ja" | "ko";
  userId: string;
  initialBudgets: Budget[];
  initialCategories: Category[];
}

export function BudgetsContent({ locale, userId, initialBudgets, initialCategories }: BudgetsContentProps) {
  const t = useTranslations("budgets");
  const ct = useTranslations("common");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("budgets").select("*").eq("user_id", userId);
      return data as Budget[];
    },
    initialData: initialBudgets,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("categories").select("*").eq("user_id", userId).eq("is_active", true).eq("type", "expense");
      return data as Category[];
    },
    initialData: initialCategories,
  });

  // Fetch transactions for budget calculation
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", userId, currentPeriod],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const now = new Date();
      let startDate: Date;
      
      switch (currentPeriod) {
        case "weekly":
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          break;
        case "monthly":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "yearly":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", startDate.toISOString().split("T")[0]);
      return data as any[];
    },
  });

  const filteredBudgets = budgets.filter((b) => b.period === currentPeriod);

  // Calculate budget progress
  const budgetsWithProgress = filteredBudgets.map((budget) => {
    const category = categories.find((c) => c.id === budget.category_id);
    const spent = transactions
      .filter((tx) => tx.category_id === budget.category_id)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const remaining = budget.amount - spent;
    const isOverBudget = progress >= 100;
    const isNearLimit = progress >= (budget.alert_threshold || 0.8) * 100 && !isOverBudget;

    return { ...budget, category, spent, progress, remaining, isOverBudget, isNearLimit };
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const supabase = createBrowserSupabaseClient();
      const { data: result, error } = await supabase.from("budgets").insert({
        ...data,
        user_id: userId,
        amount: data.amount,
        alert_threshold: data.alert_threshold || 0.8,
      }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetFormData> }) => {
      const supabase = createBrowserSupabaseClient();
      const { data: result, error } = await supabase.from("budgets").update({
        ...data,
        amount: data.amount,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("user_id", userId).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setEditingBudget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const handleSubmit = (data: BudgetFormData) => {
    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreate = () => {
    setEditingBudget(null);
    setShowForm(true);
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBudget(null);
  };

  const localeObj = locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground">{filteredBudgets.length} {ct("budgets")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{t("list.period")}</Label>
            <Select value={currentPeriod} onValueChange={(v) => setCurrentPeriod(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("list.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("list.monthly")}</SelectItem>
                <SelectItem value="yearly">{t("list.yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addTitle")}
          </Button>
        </div>
      </div>

      {/* Budget List */}
      {filteredBudgets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<Target className="h-12 w-12" />}
              titleKey="budgets.empty.title"
              descriptionKey="budgets.empty.description"
              actionKey="budgets.empty.action"
              onAction={openCreate}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgetsWithProgress.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              locale={locale}
              onEdit={openEdit}
              onDelete={deleteMutation.mutate}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? t("editTitle") : t("addTitle")}</DialogTitle>
          </DialogHeader>
          <BudgetForm
            onSubmit={handleSubmit}
            isEditing={!!editingBudget}
            initialData={editingBudget}
            categories={categories}
            defaultPeriod={currentPeriod}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>
              {ct("cancel")}
            </Button>
            <Button type="submit" form="budget-form" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : ct("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetCard({
  budget,
  locale,
  onEdit,
  onDelete,
}: {
  budget: Budget & { category?: Category; spent: number; progress: number; remaining: number; isOverBudget: boolean; isNearLimit: boolean };
  locale: "id" | "en" | "zh" | "ja" | "ko";
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("budgets");
  const ct = useTranslations("common");
  const localeObj = locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale;

  const getProgressColor = () => {
    if (budget.isOverBudget) return "bg-red-500";
    if (budget.isNearLimit) return "bg-amber-500";
    return "bg-primary";
  };

  const getProgressBg = () => {
    if (budget.isOverBudget) return "bg-red-500/10";
    if (budget.isNearLimit) return "bg-amber-500/10";
    return "bg-primary/10";
  };

  return (
    <Card className={cn("border-l-4", budget.isOverBudget ? "border-l-red-500" : budget.isNearLimit ? "border-l-amber-500" : "border-l-primary")}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {budget.category?.icon && (
                <span style={{ color: budget.category?.color || undefined }}>{budget.category.icon}</span>
              )}
              <h3 className="font-medium truncate">{budget.category?.name || "Kategori"}</h3>
              {budget.isOverBudget && (
                <AlertTriangle className="h-4 w-4 text-red-500" aria-label={t("list.overBudget")} />
              )}
              {budget.isNearLimit && !budget.isOverBudget && (
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-label={t("list.nearLimit")} />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{budget.period}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
                <span className="h-5 w-5">⋮</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(budget)}>
                <Edit className="mr-2 h-4 w-4" />
                {ct("edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(budget.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {ct("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {formatCurrency(budget.spent, "IDR", localeObj)} / {formatCurrency(budget.amount, "IDR", localeObj)}
            </span>
            <span className={cn("font-medium", budget.isOverBudget ? "text-red-500" : budget.isNearLimit ? "text-amber-500" : "text-primary")}>
              {budget.progress.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(budget.progress, 100)} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sisa: {formatCurrency(Math.max(budget.remaining, 0), "IDR", localeObj)}</span>
            <span>
              {budget.isOverBudget ? t("list.overBudget") : budget.isNearLimit ? t("list.nearLimit") : "Aman"}
            </span>
          </div>
        </div>

        {/* Date range */}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Mulai: {formatDate(budget.start_date, locale)}</span>
          {budget.end_date && (
            <>
              <span>•</span>
              <span>Berakhir: {formatDate(budget.end_date, locale)}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetForm({
  onSubmit,
  isEditing,
  initialData,
  categories,
  defaultPeriod,
}: {
  onSubmit: (data: BudgetFormData) => void;
  isEditing: boolean;
  initialData: Budget | null;
  categories: Category[];
  defaultPeriod: "weekly" | "monthly" | "yearly";
}) {
  const t = useTranslations("budgets");
  const ct = useTranslations("common");

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: initialData?.category_id || categories[0]?.id || "",
      amount: initialData?.amount || 0,
      period: initialData?.period || defaultPeriod,
      start_date: initialData?.start_date || today,
      end_date: initialData?.end_date || "",
      alert_threshold: initialData?.alert_threshold || 0.8,
    },
  });

  return (
    <form id="budget-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Category */}
      <div>
        <Label htmlFor="category_id">{t("form.categoryLabel")}</Label>
        <Select
          value={watch("category_id")}
          onValueChange={(value) => setValue("category_id", value)}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder={t("form.categoryLabel")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon && <span className="mr-2" style={{ color: cat.color || undefined }}>{cat.icon}</span>}
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id && <p className="mt-1 text-sm text-destructive">{errors.category_id.message}</p>}
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="amount">{t("form.amountLabel")}</Label>
        <Input
          {...register("amount", { valueAsNumber: true })}
          id="amount"
          type="number"
          placeholder={t("form.amountLabel")}
          className="mt-1.5 text-right font-mono"
          error={errors.amount?.message}
          min="1"
          step="1000"
        />
        {errors.amount && <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Period */}
      <div>
        <Label>{t("form.periodLabel")}</Label>
        <Select
          value={watch("period")}
          onValueChange={(value) => setValue("period", value as "weekly" | "monthly" | "yearly")}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder={t("form.periodLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">{t("list.weekly")}</SelectItem>
            <SelectItem value="monthly">{t("list.monthly")}</SelectItem>
            <SelectItem value="yearly">{t("list.yearly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start Date */}
      <div>
        <Label htmlFor="start_date">{t("form.startDateLabel")}</Label>
        <Input
          {...register("start_date")}
          id="start_date"
          type="date"
          className="mt-1.5"
          error={errors.start_date?.message}
        />
        {errors.start_date && <p className="mt-1 text-sm text-destructive">{errors.start_date.message}</p>}
      </div>

      {/* End Date (optional) */}
      <div>
        <Label htmlFor="end_date">{t("form.endDateLabel")}</Label>
        <Input
          {...register("end_date")}
          id="end_date"
          type="date"
          className="mt-1.5"
          placeholder={t("form.endDateLabel")}
        />
      </div>

      {/* Alert Threshold */}
      <div>
        <Label htmlFor="alert_threshold">{t("form.thresholdLabel")}</Label>
        <Input
          {...register("alert_threshold", { valueAsNumber: true })}
          id="alert_threshold"
          type="number"
          placeholder="80"
          className="mt-1.5 w-[100px]"
          min="0"
          max="1"
          step="0.05"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {ct("percent")} - {t("form.thresholdDescription")}
        </p>
      </div>
    </form>
  );
}