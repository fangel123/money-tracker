"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, Square, MoreVertical, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryFormData } from "@/lib/validators/category";
import { Category } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { CategorySticker } from "@/components/common/CategorySticker";
import { stickerTilt } from "@/components/common/Sticker";
import { PageHeader } from "@/components/common/PageHeader";

interface CategoriesContentProps {
  locale: "id" | "en";
  userId: string;
  initialCategories: Category[];
}

const DEFAULT_ICONS = [
  "briefcase", "laptop", "trending-up", "gift", "plus-circle", 
  "utensils-crossed", "car", "shopping-bag", "gamepad-2", "heart-pulse", 
  "graduation-cap", "file-text", "more-horizontal", "home", "coffee", "music"
];

// Palet kartun — sticker otomatis dilunakkan jadi pastel
const DEFAULT_COLORS = ["#ff9ebb", "#ffb86b", "#ffd447", "#c8f031", "#9be7c4", "#8fd3ff", "#c9b6ff", "#e4d6bc"];

/** True on the lg breakpoint, where the editor sits beside the grid instead of in a dialog. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function CategoriesContent({ locale, userId, initialCategories }: CategoriesContentProps) {
  const t = useTranslations("categories");
  const ct = useTranslations("common");
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("categories").select("*").eq("user_id", userId).eq("is_active", true).order("sort_order");
      return (data || []) as Category[];
    },
    initialData: initialCategories,
  });

  // Jumlah transaksi per kategori (ditampilkan di tiap kartu)
  const { data: txCounts = {} } = useQuery({
    queryKey: ["transactions", userId, "category-counts"],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("transactions").select("category_id").eq("user_id", userId);
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        if (row.category_id) counts[row.category_id] = (counts[row.category_id] || 0) + 1;
      }
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const supabase = createBrowserSupabaseClient();
      if (editingCategory) {
        const { error } = await supabase.from("categories").update(data).eq("id", editingCategory.id);
        if (error) throw error;
        return { ...editingCategory, ...data } as Category;
      }
      const { data: created, error } = await supabase.from("categories").insert({ ...data, user_id: userId }).select().single();
      if (error) throw error;
      return created as Category;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowForm(false);
      // Di desktop editor tetap terbuka dengan kategori yang baru disimpan
      setEditingCategory(isDesktop ? saved : null);
      if (saved?.type) setActiveTab(saved.type);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("categories").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      if (editingCategory?.id === id) setEditingCategory(null);
    },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const tabs = (
    <div className="grid grid-cols-2 gap-1.5 rounded-[20px] border-3 border-line bg-card p-1.5 shadow-cartoon-sm sm:max-w-md lg:w-[360px] lg:bg-background lg:shadow-none">
      {(["expense", "income"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          aria-pressed={activeTab === tab}
          className={cn(
            "h-11 rounded-[14px] border-2.5 text-sm font-black transition-colors",
            activeTab === tab
              ? cn("border-ink text-ink", tab === "expense" ? "bg-cartoon-pink" : "bg-cartoon-mint")
              : "border-transparent hover:bg-accent"
          )}
        >
          {t(`tabs.${tab}`)} · {categories.filter((c) => c.type === tab).length}
        </button>
      ))}
    </div>
  );

  const newButton = (
    <Button onClick={handleNew} aria-label={t("addTitle")}>
      <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
      <span className="hidden sm:inline">Kategori Baru</span>
    </Button>
  );

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Kategori"
        description={t("header.description")}
        action={<div className="lg:hidden">{newButton}</div>}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-5">
        <section className="space-y-5 lg:rounded-cartoon lg:border-3 lg:border-line lg:bg-card lg:p-5 lg:shadow-cartoon">
          <div className="flex items-center justify-between gap-3">
            {tabs}
            <div className="hidden lg:block">{newButton}</div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="rounded-cartoon border-3 border-line bg-card p-8 shadow-cartoon lg:border-0 lg:p-4 lg:shadow-none">
              <EmptyState
                icon={<Square className="h-12 w-12" />}
                titleKey="categories.empty.title"
                descriptionKey="categories.empty.description"
                actionKey="categories.empty.action"
                onAction={handleNew}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {filteredCategories.map((category, idx) => (
                <CategoryCard
                  key={category.id}
                  index={idx}
                  category={category}
                  count={txCounts[category.id] || 0}
                  selected={isDesktop && editingCategory?.id === category.id}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Desktop editor panel */}
        {isDesktop && (
          <aside className="sticky top-6 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
            <h2 className="mb-4 font-display text-xl font-semibold">
              {editingCategory ? t("editTitle") : t("addTitle")}
            </h2>
            <CategoryForm
              key={editingCategory?.id ?? `new-${activeTab}`}
              formId="category-panel-form"
              initialData={editingCategory}
              count={editingCategory ? txCounts[editingCategory.id] || 0 : undefined}
              onSubmit={(data) => saveMutation.mutate(data)}
              defaultType={activeTab}
            />
            <div className="mt-5 flex gap-3">
              {editingCategory && !editingCategory.is_default && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(editingCategory.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={3} />
                  {ct("delete")}
                </Button>
              )}
              <Button type="submit" form="category-panel-form" className="flex-1" disabled={saveMutation.isPending}>
                <Check className="mr-1.5 h-4 w-4" strokeWidth={3} />
                {saveMutation.isPending ? ct("saving") : ct("save")}
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* Form Modal (mobile) */}
      <Dialog open={showForm && !isDesktop} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCategory ? t("editTitle") : t("addTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <CategoryForm
              key={editingCategory?.id ?? `new-${activeTab}`}
              formId="category-form"
              initialData={editingCategory}
              count={editingCategory ? txCounts[editingCategory.id] || 0 : undefined}
              onSubmit={(data) => saveMutation.mutate(data)}
              defaultType={activeTab}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setShowForm(false)}>
              {ct("cancel")}
            </Button>
            <Button
              type="submit"
              form="category-form"
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

function CategoryCard({
  index,
  category,
  count,
  selected,
  onEdit,
  onDelete,
}: {
  index: number;
  category: Category;
  count: number;
  selected: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}) {
  const ct = useTranslations("common");

  return (
    <div
      className={cn(
        "relative flex flex-col items-center rounded-cartoon border-3 border-line bg-card px-2 pb-4 pt-5 shadow-cartoon",
        selected && "outline outline-4 outline-offset-2 outline-cartoon-lime"
      )}
    >
      <button
        onClick={() => onEdit(category)}
        aria-pressed={selected}
        className="flex w-full flex-col items-center gap-2"
        aria-label={`${ct("edit")} ${category.name}`}
      >
        <CategorySticker category={category} size="lg" tilt={stickerTilt(index) * 1.3} />
        <h3 className="mt-0.5 max-w-full truncate px-1 text-sm font-black">{category.name}</h3>
        <span className="text-xs font-bold text-muted-foreground">{count} transaksi</span>
      </button>
      <div className="absolute right-2 top-2 lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-line bg-background" aria-label={ct("actions")}>
            <MoreVertical className="h-4 w-4" strokeWidth={3} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl border-line shadow-xl">
          <DropdownMenuItem onClick={() => onEdit(category)} className="rounded-xl cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            {ct("edit")}
          </DropdownMenuItem>
          {!category.is_default && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(category.id)}
                className="text-destructive focus:text-destructive rounded-xl cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {ct("delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );
}

function CategoryForm({
  formId,
  onSubmit,
  initialData,
  defaultType,
  count,
}: {
  formId: string;
  onSubmit: (data: CategoryFormData) => void;
  initialData: Category | null;
  defaultType: "expense" | "income";
  count?: number;
}) {
  const t = useTranslations("categories");

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
      icon: initialData?.icon || DEFAULT_ICONS[0],
      color: initialData?.color || DEFAULT_COLORS[0],
      parent_id: initialData?.parent_id || null,
    },
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");
  const name = watch("name");
  const type = watch("type");

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Preview */}
      <div className="flex items-center gap-3.5">
        <CategorySticker category={{ icon: selectedIcon ?? null, color: selectedColor ?? null }} size="lg" tilt={-6} className="h-[72px] w-[72px] rounded-[22px] [&_svg]:h-8 [&_svg]:w-8" />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold">{name || t("form.namePlaceholder")}</p>
          <p className="text-[13px] font-bold text-muted-foreground">
            {t(`tabs.${type}`)}
            {count !== undefined && ` · ${count} transaksi`}
          </p>
        </div>
      </div>

      <div>
        <Label className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{t("form.nameLabel")}</Label>
        <Input {...register("name")} placeholder={t("form.namePlaceholder")} className="mt-1.5" />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{t("form.typeLabel")}</Label>
        <Select value={type} onValueChange={(value) => setValue("type", value as "income" | "expense")}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder={t("form.typeLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">{t("tabs.expense")}</SelectItem>
            <SelectItem value="income">{t("tabs.income")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{t("form.iconLabel")}</Label>
        <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-6">
          {DEFAULT_ICONS.map((icon) => {
            const active = selectedIcon === icon;
            return (
              <button
                key={icon}
                type="button"
                onClick={() => setValue("icon", icon)}
                aria-pressed={active}
                aria-label={`Ikon ${icon}`}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl border-2.5 transition-colors",
                  active ? "border-ink text-ink" : "border-line bg-background hover:bg-accent"
                )}
                style={active ? { background: `color-mix(in srgb, ${selectedColor || "#ff9ebb"} 55%, #ffffff)` } : undefined}
              >
                <DynamicIcon name={icon} className="h-5 w-5 stroke-[2.5]" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{t("form.colorLabel")}</Label>
        <div className="mt-2 grid grid-cols-8 gap-2">
          {DEFAULT_COLORS.map((color) => {
            const active = selectedColor?.toLowerCase() === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => setValue("color", color)}
                aria-pressed={active}
                aria-label={`Warna ${color}`}
                className={cn("h-10 rounded-xl border-ink transition-transform", active ? "border-[3.5px] shadow-cartoon-sm" : "border-2.5 hover:scale-105")}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>
    </form>
  );
}
