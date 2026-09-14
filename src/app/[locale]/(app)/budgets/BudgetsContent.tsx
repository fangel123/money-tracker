"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, AlertTriangle, Calendar, Target, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetFormData } from "@/lib/validators/budget";
import { Budget, Category } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { DynamicIcon } from "@/components/common/DynamicIcon";

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
      return (data || []) as Budget[];
    },
    initialData: initialBudgets,
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

  return (
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Budget <Target className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">{t("header.description")}</p>
        </div>
        <Button 
          onClick={() => { setEditingBudget(null); setShowForm(true); }}
          className="rounded-full h-12 w-12 p-0 shadow-lg" 
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Summary Card */}
      {filteredBudgets.length > 0 && (
        <div className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-6 text-white shadow-lg border border-border/20">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">
            <Target className="h-4 w-4 text-primary" />
            <span>TOTAL BUDGET ({t(`list.${currentPeriod}`).toUpperCase()})</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-4xl font-black tracking-tight text-primary">
              {formatCurrency(totalBudgetSpent, "IDR", { locale })}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400">
            dari total {formatCurrency(totalBudgetAmount, "IDR", { locale })}
          </p>
          
          <div className="mt-6">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", totalBudgetProgress > 100 ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${Math.min(100, totalBudgetProgress)}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(["weekly", "monthly", "yearly"] as const).map((period) => (
          <Button
            key={period}
            variant={currentPeriod === period ? "default" : "outline"}
            onClick={() => setCurrentPeriod(period)}
            className={cn(
              "rounded-full px-6 font-semibold",
              currentPeriod === period 
                ? "bg-foreground text-background hover:bg-foreground/90" 
                : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {t(`list.${period}`)}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredBudgets.length === 0 ? (
          <div className="bg-card rounded-[2rem] border border-border/50 p-8">
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
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingBudget ? t("form.editTitle") : t("form.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <BudgetForm
              initialData={editingBudget}
              categories={categories}
              defaultPeriod={currentPeriod}
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
  const localeObj = { locale };

  // Note: progress calculation
  const spent = budget.spent || 0;
  const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const isOverBudget = progress > 100;
  const isNearLimit = progress >= ((budget.alert_threshold || 0.8) * 100) && !isOverBudget;
  const remaining = budget.amount - spent;

  return (
    <div className="bg-card border border-border/50 rounded-[2rem] p-5 shadow-sm relative overflow-hidden group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div 
            className="h-12 w-12 rounded-full flex items-center justify-center text-xl bg-secondary"
            style={{ color: budget.category?.color || undefined }}
          >
            {budget.category?.icon ? <DynamicIcon name={budget.category.icon} /> : "🎯"}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              {budget.category?.name || "Kategori"}
              {isOverBudget && <AlertTriangle className="h-4 w-4 text-destructive" />}
              {isNearLimit && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            </h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
              {t(`list.${budget.period}`)}
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
            <DropdownMenuItem onClick={() => onEdit(budget)} className="rounded-xl cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              {ct("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(budget.id)}
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
          <span className={cn(isOverBudget ? "text-destructive" : "text-foreground")}>
            {formatCurrency(spent, "IDR", localeObj)} <span className="text-xs font-normal text-muted-foreground">Terpakai</span>
          </span>
          <span className="text-muted-foreground">
            Batas {formatCurrency(budget.amount, "IDR", localeObj)}
          </span>
        </div>
        
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-1000", isOverBudget ? 'bg-destructive' : isNearLimit ? 'bg-orange-500' : 'bg-primary')}
            style={{ width: `${Math.min(progress, 100)}%` }} 
          />
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-lg",
            isOverBudget ? "bg-destructive/10 text-destructive" : isNearLimit ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"
          )}>
            {isOverBudget ? 'Lebih Budget!' : isNearLimit ? 'Hampir Habis' : 'Aman'}
          </span>
          <span className="text-xs font-bold text-muted-foreground">
            Sisa {formatCurrency(Math.max(remaining, 0), "IDR", localeObj)}
          </span>
        </div>
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
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-border/50 bg-secondary/50">
            <SelectValue placeholder={t("form.categoryLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50">
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
          className="mt-1.5 h-12 text-lg font-bold rounded-xl border-border/50 bg-secondary/50"
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
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-border/50 bg-secondary/50">
            <SelectValue placeholder={t("form.periodLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50">
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
          className="mt-1.5 h-12 rounded-xl border-border/50 bg-secondary/50"
        />
        {errors.start_date && <p className="mt-1 text-xs text-destructive">{errors.start_date.message}</p>}
      </div>
    </form>
  );
}