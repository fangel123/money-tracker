"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, formatDate, getPeriodRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, AlertTriangle, Calendar, Target, MoreVertical, BarChart3, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetFormData } from "@/lib/validators/budget";
import { Budget, Category } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { CategorySticker } from "@/components/common/CategorySticker";
import { PageHeader } from "@/components/common/PageHeader";
import { HeroCard, CartoonBar } from "@/components/common/HeroCard";
import { StatCard } from "@/components/common/StatCard";

interface BudgetsContentProps {
  locale: "id" | "en";
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
      const { data } = await supabase.from("budgets").select("*, category:categories(*)").eq("user_id", userId);
      const rows = (data || []) as Budget[];
      if (rows.length === 0) return rows;

      // "spent" tidak ada di database — dihitung dinamis dari transaksi expense
      // sepanjang tahun ini, lalu di-filter per rentang periode masing-masing budget.
      const now = new Date();
      const yearStart = `${now.getFullYear()}-01-01`;
      const { data: txs } = await supabase
        .from("transactions")
        .select("category_id, amount, date")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", yearStart);

      return rows.map((b) => {
        const { start, end } = getPeriodRange(b.period, now);
        const spent = (txs || [])
          .filter((t) => t.category_id === b.category_id && t.date >= start && t.date < end)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return { ...b, spent, remaining: Number(b.amount) - spent };
      });
    },
    initialData: initialBudgets,
    // initialBudgets dari server belum punya "spent" — anggap basi supaya langsung dihitung ulang
    initialDataUpdatedAt: 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("categories").select("*").eq("user_id", userId).eq("type", "expense");
      return (data || []) as Category[];
    },
    initialData: initialCategories,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const supabase = createBrowserSupabaseClient();
      if (editingBudget) {
        const { error } = await supabase.from("budgets").update(data).eq("id", editingBudget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budgets").insert({ ...data, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setShowForm(true);
  };

  const filteredBudgets = budgets.filter((b) => b.period === currentPeriod);

  // Totals for current period
  const totalBudgetAmount = filteredBudgets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalBudgetSpent = filteredBudgets.reduce((sum, b) => sum + Number(b.spent || 0), 0);
  const totalBudgetProgress = totalBudgetAmount > 0 ? (totalBudgetSpent / totalBudgetAmount) * 100 : 0;
  const totalRemaining = Math.max(totalBudgetAmount - totalBudgetSpent, 0);
  // Sisa hari di periode berjalan (termasuk hari ini), untuk saran jatah harian
  const periodEnd = new Date(`${getPeriodRange(currentPeriod).end}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(1, Math.round((periodEnd.getTime() - today.getTime()) / 86_400_000));

  const periodPills = (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {(["weekly", "monthly", "yearly"] as const).map((period) => (
        <Button
          key={period}
          variant={currentPeriod === period ? "default" : "outline"}
          onClick={() => setCurrentPeriod(period)}
          size="sm"
          aria-pressed={currentPeriod === period}
          className="rounded-full px-5"
        >
          {t(`list.${period}`)}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Budget"
        description={t("header.description")}
        action={
          <>
          <div className="hidden lg:block">{periodPills}</div>
          <Button onClick={() => { setEditingBudget(null); setShowForm(true); }} aria-label={t("addTitle")}>
            <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
            <span className="hidden sm:inline">Buat Budget</span>
          </Button>
          </>
        }
      />

      {/* Summary Card */}
      {filteredBudgets.length > 0 && (
        <HeroCard
          color="#ffd447"
          label={`Total budget ${t(`list.${currentPeriod}`).toLowerCase()}`}
          value={formatCurrency(totalBudgetSpent, "IDR", locale)}
          className="lg:hidden"
        >
          <p className="mt-1.5 text-sm font-extrabold">dari total {formatCurrency(totalBudgetAmount, "IDR", locale)}</p>
          <div className="mt-4 flex items-center gap-3">
            <CartoonBar percent={totalBudgetProgress} color={totalBudgetProgress > 100 ? "#ff5c7a" : "#ffffff"} className="border-ink bg-cream" />
            <span className="text-sm font-black">{Math.round(totalBudgetProgress)}%</span>
          </div>
        </HeroCard>
      )}

      {/* Desktop stats */}
      {filteredBudgets.length > 0 && (
        <div className="hidden gap-5 lg:grid lg:grid-cols-3">
          <StatCard
            color="#ffd447"
            label="Total budget"
            value={formatCurrency(totalBudgetAmount, "IDR", locale)}
            note={`${filteredBudgets.length} kategori dianggarkan`}
            icon={<Target />}
          />
          <StatCard
            label="Terpakai"
            value={formatCurrency(totalBudgetSpent, "IDR", locale)}
            note={`${Math.round(totalBudgetProgress)}% dari total`}
            icon={<BarChart3 />}
            valueClassName={totalBudgetProgress > 100 ? "text-expense" : undefined}
          />
          <StatCard
            color="#9be7c4"
            label="Sisa"
            value={formatCurrency(totalRemaining, "IDR", locale)}
            note={`± ${formatCurrency(Math.floor(totalRemaining / daysLeft), "IDR", locale)} per hari`}
            icon={<Wallet />}
          />
        </div>
      )}

      {/* Tabs (mobile) */}
      <div className="pb-2 lg:hidden">{periodPills}</div>

      {/* List */}
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:grid-cols-3">
        {filteredBudgets.length === 0 ? (
          <div className="bg-card rounded-cartoon border-3 border-line p-8 shadow-cartoon lg:col-span-full">
            <EmptyState
              icon={<Target className="h-12 w-12" />}
              titleKey="budgets.empty.title"
              descriptionKey="budgets.empty.description"
              actionKey="budgets.empty.action"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          filteredBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
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
                {editingBudget ? t("editTitle") : t("addTitle")}
              </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <BudgetForm
              initialData={editingBudget}
              categories={categories}
              defaultPeriod={currentPeriod}
              isEditing={!!editingBudget}
              onSubmit={(data) => saveMutation.mutate(data)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setShowForm(false)}>
              {ct("cancel")}
            </Button>
            <Button 
              type="submit" 
              form="budget-form" 
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

function BudgetCard({
  budget,
  locale,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  locale: "id" | "en";
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("budgets");
  const ct = useTranslations("common");

  // Note: progress calculation
  const spent = budget.spent || 0;
  const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const isOverBudget = progress > 100;
  const isNearLimit = progress >= ((budget.alert_threshold || 0.8) * 100) && !isOverBudget;
  const remaining = budget.amount - spent;

  const status = isOverBudget
    ? { label: "Lewat batas", color: "#ff5c7a" }
    : isNearLimit
      ? { label: "Hampir habis", color: "#ffb86b" }
      : { label: "Aman", color: "#9be7c4" };

  return (
    <div className="flex flex-col gap-3 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
      <div className="flex items-center gap-3">
        <CategorySticker category={budget.category} size="lg" tilt={-3} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 truncate font-display text-lg font-semibold">
            {budget.category?.name || "Kategori"}
          </h3>
          <p className="text-xs font-bold text-muted-foreground">
            {t(`list.${budget.period}`)} · peringatan {Math.round((budget.alert_threshold || 0.8) * 100)}%
          </p>
        </div>
        <span
          className="flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-black text-ink"
          style={{ background: status.color }}
        >
          {(isOverBudget || isNearLimit) && <AlertTriangle className="h-3 w-3" strokeWidth={3} />}
          {status.label}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-line bg-background" aria-label={ct("actions")}>
              <MoreVertical className="h-4 w-4" strokeWidth={3} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(budget)} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              {ct("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(budget.id)}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {ct("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className={cn("font-display text-[28px] font-bold leading-none", isOverBudget && "text-expense")}>
        {formatCurrency(spent, "IDR", locale)}
      </p>
      <p className="-mt-1 text-[13px] font-extrabold text-muted-foreground">
        dari {formatCurrency(budget.amount, "IDR", locale)} · sisa {formatCurrency(Math.max(remaining, 0), "IDR", locale)}
      </p>

      <div className="flex items-center gap-2.5">
        <CartoonBar percent={progress} color={isOverBudget || isNearLimit ? status.color : budget.category?.color ? `color-mix(in srgb, ${budget.category.color} 55%, #ffffff)` : "#c8f031"} />
        <span className="w-11 text-right text-sm font-black">{Math.round(progress)}%</span>
      </div>
    </div>
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
      category_id: initialData?.category_id || (categories[0]?.id ?? ""),
      amount: initialData?.amount || 0,
      period: initialData?.period || defaultPeriod,
      start_date: initialData?.start_date || today,
      end_date: initialData?.end_date || "",
      alert_threshold: initialData?.alert_threshold || 0.8,
    },
  });

  return (
    <form id="budget-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.categoryLabel")}</Label>
        <Select
          value={watch("category_id")}
          onValueChange={(value) => setValue("category_id", value)}
        >
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-line bg-secondary">
            <SelectValue placeholder={t("form.categoryLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-line">
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                <span className="flex items-center">
                  {cat.icon && <DynamicIcon name={cat.icon} className="mr-2 h-4 w-4" style={{ color: cat.color || undefined }} />}
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id && <p className="mt-1 text-xs text-destructive">{errors.category_id.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.amountLabel")}</Label>
        <Input
          {...register("amount", { valueAsNumber: true })}
          type="number"
          placeholder="0"
          className="mt-1.5 h-12 text-lg font-bold rounded-xl border-line bg-secondary"
          min="1"
        />
        {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.periodLabel")}</Label>
        <Select
          value={watch("period")}
          onValueChange={(value) => setValue("period", value as "weekly" | "monthly" | "yearly")}
        >
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-line bg-secondary">
            <SelectValue placeholder={t("form.periodLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-line">
            <SelectItem value="weekly" className="rounded-xl">{t("list.weekly")}</SelectItem>
            <SelectItem value="monthly" className="rounded-xl">{t("list.monthly")}</SelectItem>
            <SelectItem value="yearly" className="rounded-xl">{t("list.yearly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.startDateLabel")}</Label>
        <Input
          {...register("start_date")}
          type="date"
          className="mt-1.5 h-12 rounded-xl border-line bg-secondary"
        />
        {errors.start_date && <p className="mt-1 text-xs text-destructive">{errors.start_date.message}</p>}
      </div>
    </form>
  );
}