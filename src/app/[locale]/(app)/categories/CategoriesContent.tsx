"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronUp, Palette, Square } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryFormData } from "@/lib/validators/category";
import { Category } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface CategoriesContentProps {
  locale: "id" | "en" | "zh" | "ja" | "ko";
  userId: string;
  initialCategories: Category[];
}

const DEFAULT_ICONS = [
  "briefcase", "laptop", "trending-up", "gift", "plus-circle",
  "utensils-crossed", "car", "shopping-bag", "gamepad-2", "heart-pulse",
  "graduation-cap", "file-text", "building-2", "smartphone", "credit-card",
  "wallet", "coffee", "shirt", "home", "car", "plane", "bus", "train",
  "dumbbell", "pill", "stethoscope", "book", "music", "film", "camera",
  "wifi", "zap", "droplet", "fire", "leaf", "sun", "moon", "cloud"
];

const DEFAULT_COLORS = [
  "#059669", "#0891b2", "#0d9488", "#7c3aed", "#64748b",
  "#ef4444", "#f97316", "#eab308", "#a855f7", "#ec4899",
  "#06b6d4", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e",
  "#fb923c", "#f59e0b", "#84cc16", "#22c55e", "#14b8a6",
];

export function CategoriesContent({ locale, userId, initialCategories }: CategoriesContentProps) {
  const t = useTranslations("categories");
  const ct = useTranslations("common");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // Use initial data as initial query data
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("categories").select("*").eq("user_id", userId).eq("is_active", true).order("type").order("sort_order");
      return data as Category[];
    },
    initialData: initialCategories,
  });

  // Separate income and expense categories
  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const supabase = createBrowserSupabaseClient();
      const { data: result, error } = await supabase.from("categories").insert({
        ...data,
        user_id: userId,
        is_default: false,
        color: data.color || DEFAULT_COLORS[0],
        icon: data.icon || "plus-circle",
      }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setShowForm(false);
      setEditingCategory(null);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      const supabase = createBrowserSupabaseClient();
      const { data: result, error } = await supabase.from("categories").update({
        ...data,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("user_id", userId).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setEditingCategory(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("categories").update({ is_active: false }).eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const supabase = createBrowserSupabaseClient();
      for (const update of updates) {
        await supabase.from("categories").update({ sort_order: update.sort_order }).eq("id", update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const handleSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreate = (type: "income" | "expense") => {
    setSelectedIcon(DEFAULT_ICONS[0]);
    setSelectedColor(type === "income" ? DEFAULT_COLORS[0] : DEFAULT_COLORS[5]);
    setEditingCategory(null);
    setShowForm(true);
  };

  const openEdit = (category: Category) => {
    setSelectedIcon(category.icon || "");
    setSelectedColor(category.color || "");
    setEditingCategory(category);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground">{categories.length} {ct("categories")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("income")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addTitle")} ({ct("income")})
          </Button>
          <Button onClick={() => openCreate("expense")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addTitle")} ({ct("expense")})
          </Button>
        </div>
      </div>

      {/* Income Categories */}
      <CategorySection
        title={ct("income")}
        categories={incomeCategories}
        onEdit={openEdit}
        onDelete={deleteMutation.mutate}
        locale={locale}
      />

      {/* Expense Categories */}
      <CategorySection
        title={ct("expense")}
        categories={expenseCategories}
        onEdit={openEdit}
        onDelete={deleteMutation.mutate}
        locale={locale}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? t("editTitle") : t("addTitle")}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSubmit={handleSubmit}
            isEditing={!!editingCategory}
            initialData={editingCategory}
            selectedIcon={selectedIcon}
            setSelectedIcon={setSelectedIcon}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            defaultType={editingCategory?.type || "expense"}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>
              {ct("cancel")}
            </Button>
            <Button type="submit" form="category-form" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : ct("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategorySection({
  title,
  categories,
  onEdit,
  onDelete,
  locale,
}: {
  title: string;
  categories: Category[];
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  locale: "id" | "en" | "zh" | "ja" | "ko";
}) {
  const t = useTranslations("categories");
  const ct = useTranslations("common");

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<Square className="h-12 w-12" />}
            titleKey="categories.empty.title"
            descriptionKey="categories.empty.description"
            actionKey="categories.empty.action"
            onAction={() => {}}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">{title === ct("income") ? "📈" : "📉"}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: cat.color ? `${cat.color}20` : "var(--muted)" }}
                >
                  {cat.icon && (
                    <span className="text-lg" style={{ color: cat.color || "var(--foreground)" }}>
                      {cat.icon}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cat.is_default ? "Default" : "Custom"} • Urutan: {cat.sort_order}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-lg hover:bg-muted transition-colors">
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(cat)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {ct("edit")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(cat.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {ct("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryForm({
  onSubmit,
  isEditing,
  initialData,
  selectedIcon,
  setSelectedIcon,
  selectedColor,
  setSelectedColor,
  defaultType,
}: {
  onSubmit: (data: CategoryFormData) => void;
  isEditing: boolean;
  initialData: Category | null;
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  defaultType: "income" | "expense";
}) {
  const t = useTranslations("categories");
  const ct = useTranslations("common");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || defaultType,
      icon: initialData?.icon || "",
      color: initialData?.color || "",
      parent_id: initialData?.parent_id || null,
    },
  });

  const watchedType = watch("type");

  return (
    <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
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

      {/* Type */}
      <div>
        <Label>{t("form.typeLabel")}</Label>
        <Select
          value={watchedType}
          onValueChange={(value) => {
            setValue("type", value as "income" | "expense");
            setSelectedIcon("");
            setSelectedColor(value === "income" ? DEFAULT_COLORS[0] : DEFAULT_COLORS[5]);
          }}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder={t("form.typeLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">{t("form.typeIncome")}</SelectItem>
            <SelectItem value="expense">{t("form.typeExpense")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Icon Picker */}
      <div>
        <Label>{t("form.iconLabel")}</Label>
        <div className="mt-1.5 flex flex-wrap gap-1 max-h-40 overflow-y-auto p-2 border rounded-lg">
          {DEFAULT_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                setSelectedIcon(icon);
                setValue("icon", icon);
              }}
              className={cn(
                "p-2 rounded-lg transition-colors",
                selectedIcon === icon
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
              aria-label={icon}
            >
              <span className="text-lg">{icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <Label>{t("form.colorLabel")}</Label>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setSelectedColor(color);
                setValue("color", color);
              }}
              className={cn(
                "h-8 w-8 rounded-lg border-2 transition-all",
                selectedColor === color
                  ? "border-primary scale-110"
                  : "border-transparent hover:border-muted-foreground/50"
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      </div>

      {/* Parent Category (optional) */}
      <div>
        <Label htmlFor="parent_id">{t("form.parentLabel")}</Label>
        <Select
          value={watch("parent_id") || ""}
          onValueChange={(value) => setValue("parent_id", value || null)}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder={t("form.parentLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tidak ada (Kategori utama)</SelectItem>
            {/* Parent categories would be loaded here */}
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}