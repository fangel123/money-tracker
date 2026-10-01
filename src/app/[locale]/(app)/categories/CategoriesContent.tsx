"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronUp, Palette, Square, Tags, MoreVertical } from "lucide-react";
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

const DEFAULT_COLORS = [
  "#CCFF00", "#059669", "#0891b2", "#0d9488", "#7c3aed", "#64748b",
  "#ef4444", "#f97316", "#eab308", "#a855f7", "#ec4899", "#06b6d4", "#6366f1"
];

export function CategoriesContent({ locale, userId, initialCategories }: CategoriesContentProps) {
  const t = useTranslations("categories");
  const ct = useTranslations("common");
  const queryClient = useQueryClient();
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

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const supabase = createBrowserSupabaseClient();
      if (editingCategory) {
        const { error } = await supabase.from("categories").update(data).eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({ ...data, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowForm(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("categories").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Kategori"
        description={t("header.description")}
        action={
          <Button onClick={() => { setEditingCategory(null); setShowForm(true); }} aria-label={t("addTitle")}>
            <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
            <span className="hidden sm:inline">Kategori Baru</span>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1.5 rounded-[20px] border-3 border-line bg-card p-1.5 shadow-cartoon-sm sm:max-w-md">
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

      {/* List */}
      <div className="space-y-2">
        {filteredCategories.length === 0 ? (
          <div className="bg-card rounded-cartoon border-3 border-line p-8 shadow-cartoon">
            <EmptyState
              icon={<Square className="h-12 w-12" />}
              titleKey="categories.empty.title"
              descriptionKey="categories.empty.description"
              actionKey="categories.empty.action"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {filteredCategories.map((category, idx) => (
              <CategoryCard
                key={category.id}
                index={idx}
                category={category}
                onEdit={handleEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                isLast={idx === filteredCategories.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCategory ? t("editTitle") : t("addTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <CategoryForm
              initialData={editingCategory}
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
  onEdit,
  onDelete,
  isLast
}: {
  index: number;
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const t = useTranslations("categories");
  const ct = useTranslations("common");

  return (
    <div className="relative flex flex-col items-center gap-2.5 rounded-cartoon border-3 border-line bg-card px-2 pb-4 pt-5 shadow-cartoon">
      <button onClick={() => onEdit(category)} className="flex flex-col items-center gap-2.5" aria-label={`${ct("edit")} ${category.name}`}>
        <CategorySticker category={category} size="lg" tilt={stickerTilt(index) * 1.3} />
        <h3 className="max-w-full truncate px-1 text-sm font-black">{category.name}</h3>
      </button>
      <div className="absolute right-2 top-2">
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
  onSubmit,
  isEditing,
  initialData,
  defaultType,
}: {
  onSubmit: (data: CategoryFormData) => void;
  isEditing?: boolean;
  initialData: Category | null;
  defaultType: "expense" | "income";
}) {
  const t = useTranslations("categories");

  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || DEFAULT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(initialData?.color || DEFAULT_COLORS[0]);

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

  return (
    <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          onValueChange={(value) => setValue("type", value as "income" | "expense")}
        >
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-line bg-secondary">
            <SelectValue placeholder={t("form.typeLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-line">
            <SelectItem value="expense" className="rounded-xl">{t("tabs.expense")}</SelectItem>
            <SelectItem value="income" className="rounded-xl">{t("tabs.income")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.iconLabel")}</Label>
        <div className="mt-1.5 grid grid-cols-8 gap-2">
          {DEFAULT_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                setSelectedIcon(icon);
                setValue("icon", icon);
              }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                selectedIcon === icon
                  ? "bg-primary text-primary-foreground scale-110 shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <DynamicIcon name={icon} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.colorLabel")}</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setSelectedColor(color);
                setValue("color", color);
              }}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-all",
                selectedColor === color
                  ? "border-foreground scale-110 shadow-sm"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      </div>
    </form>
  );
}