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
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Kategori <Tags className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">{t("header.description")}</p>
        </div>
        <Button 
          onClick={() => { setEditingCategory(null); setShowForm(true); }}
          className="rounded-full h-12 w-12 p-0 shadow-lg" 
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "expense" ? "default" : "outline"}
          onClick={() => setActiveTab("expense")}
          className={cn(
            "rounded-full px-6 font-semibold flex-1",
            activeTab === "expense" 
              ? "bg-foreground text-background hover:bg-foreground/90" 
              : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
          )}
        >
          {t("tabs.expense")}
        </Button>
        <Button
          variant={activeTab === "income" ? "default" : "outline"}
          onClick={() => setActiveTab("income")}
          className={cn(
            "rounded-full px-6 font-semibold flex-1",
            activeTab === "income" 
              ? "bg-foreground text-background hover:bg-foreground/90" 
              : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
          )}
        >
          {t("tabs.income")}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredCategories.length === 0 ? (
          <div className="bg-card rounded-[2rem] border border-border/50 p-8">
            <EmptyState
              icon={<Square className="h-12 w-12" />}
              titleKey="categories.empty.title"
              descriptionKey="categories.empty.description"
              actionKey="categories.empty.action"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          <div className="bg-card rounded-[2rem] border border-border/50 p-2 shadow-sm overflow-hidden">
            {filteredCategories.map((category, idx) => (
              <CategoryCard
                key={category.id}
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
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCategory ? t("form.editTitle") : t("form.createTitle")}
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
  category,
  onEdit,
  onDelete,
  isLast
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const t = useTranslations("categories");
  const ct = useTranslations("common");

  return (
    <div className={cn("p-4 hover:bg-secondary/30 transition-colors group flex items-center justify-between gap-3", !isLast && "border-b border-border/30")}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div 
          className="h-12 w-12 rounded-2xl flex items-center justify-center bg-secondary"
          style={{ color: category.color || undefined, backgroundColor: category.color ? `${category.color}20` : undefined }}
        >
          {category.icon ? <DynamicIcon name={category.icon} className="h-6 w-6" /> : <Square className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-foreground text-base truncate">{category.name}</h3>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100">
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-xl">
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
          className="mt-1.5 h-12 text-base font-bold rounded-xl border-border/50 bg-secondary/50"
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("form.typeLabel")}</Label>
        <Select
          value={watch("type")}
          onValueChange={(value) => setValue("type", value as "income" | "expense")}
        >
          <SelectTrigger className="w-full mt-1.5 rounded-xl h-12 border-border/50 bg-secondary/50">
            <SelectValue placeholder={t("form.typeLabel")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50">
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