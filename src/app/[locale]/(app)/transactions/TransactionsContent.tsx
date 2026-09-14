"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Search, Filter, ChevronRight, MoreVertical, Edit, Trash2, ArrowLeftRight, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { Transaction, Category, Account } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { DynamicIcon } from "@/components/common/DynamicIcon";

interface TransactionsContentProps {
  locale: "id" | "en";
  userId: string;
  initialSearchParams: { [key: string]: string | string[] | undefined };
}

export function TransactionsContent({ locale, userId, initialSearchParams }: TransactionsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("transactions");
  const ct = useTranslations("common");
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("categories").select("*").eq("user_id", userId).eq("is_active", true);
      return data as Category[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("accounts").select("*").eq("user_id", userId).eq("is_active", true);
      return data as Account[];
    },
  });

  const params = new URLSearchParams();
  params.set("user_id", userId);
  if (searchParams.get("type")) params.set("type", searchParams.get("type")!);
  if (searchParams.get("category_id")) params.set("category_id", searchParams.get("category_id")!);
  if (searchParams.get("account_id")) params.set("account_id", searchParams.get("account_id")!);
  if (searchParams.get("date_from")) params.set("date_from", searchParams.get("date_from")!);
  if (searchParams.get("date_to")) params.set("date_to", searchParams.get("date_to")!);
  if (searchQuery) params.set("search", searchQuery);
  
  const pageStr = searchParams.get("page") || "1";
  const limitStr = "20";
  
  params.set("page", pageStr);
  params.set("limit", limitStr);
  params.set("sort", searchParams.get("sort") || "date");
  params.set("order", searchParams.get("order") || "desc");

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["transactions", params.toString()],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      let query = supabase.from("transactions").select("*", { count: "exact" }).eq("user_id", userId);
      
      if (params.get("type")) query = query.eq("type", params.get("type"));
      if (params.get("category_id")) query = query.eq("category_id", params.get("category_id"));
      if (params.get("account_id")) query = query.eq("account_id", params.get("account_id"));
      if (params.get("date_from")) query = query.gte("date", params.get("date_from"));
      if (params.get("date_to")) query = query.lte("date", params.get("date_to"));
      
      if (params.get("search")) {
        query = query.ilike("note", `%${params.get("search")}%`);
      }

      const sort = params.get("sort") || "date";
      const order = params.get("order") || "desc";
      query = query.order(sort, { ascending: order === "asc" });

      const page = parseInt(params.get("page") || "1");
      const limit = parseInt(params.get("limit") || "20");
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count } = await query;
      return { data: (data || []) as Transaction[], count: count || 0 };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Juga refresh dashboard queries etc if needed
    },
  });

  const transactions = transactionsData?.data || [];
  const totalCount = transactionsData?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set("page", "1"); // reset page on filter
    router.push(`/transactions?${newParams.toString()}`);
  };

  return (
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Transaksi <ArrowLeftRight className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">{t("header.description")}</p>
        </div>
        <Button 
          asChild
          className="rounded-full h-12 w-12 p-0 shadow-lg" 
          size="icon"
        >
          <Link href="/transactions/new"><Plus className="h-6 w-6" /></Link>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("filters.searchPlaceholder")}
              className="pl-9 rounded-full bg-card border-border/50 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateFilter("search", searchQuery);
                }
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); updateFilter("search", null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            className="rounded-full h-12 px-4 border-border/50"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("filters.title")}</span>
          </Button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="bg-card border border-border/50 rounded-[2rem] p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.typeLabel")}</Label>
                <Select
                  value={searchParams.get("type") || "all"}
                  onValueChange={(val) => updateFilter("type", val === "all" ? null : val)}
                >
                  <SelectTrigger className="rounded-xl border-border/50 bg-secondary/50 h-10">
                    <SelectValue placeholder={t("filters.typeAll")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50">
                    <SelectItem value="all" className="rounded-xl">{t("filters.typeAll")}</SelectItem>
                    <SelectItem value="income" className="rounded-xl">{t("filters.typeIncome")}</SelectItem>
                    <SelectItem value="expense" className="rounded-xl">{t("filters.typeExpense")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.categoryLabel")}</Label>
                <Select
                  value={searchParams.get("category_id") || "all"}
                  onValueChange={(val) => updateFilter("category_id", val === "all" ? null : val)}
                >
                  <SelectTrigger className="rounded-xl border-border/50 bg-secondary/50 h-10">
                    <SelectValue placeholder={t("filters.categoryAll")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50 max-h-[200px]">
                    <SelectItem value="all" className="rounded-xl">{t("filters.categoryAll")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="rounded-xl">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.accountLabel")}</Label>
                <Select
                  value={searchParams.get("account_id") || "all"}
                  onValueChange={(val) => updateFilter("account_id", val === "all" ? null : val)}
                >
                  <SelectTrigger className="rounded-xl border-border/50 bg-secondary/50 h-10">
                    <SelectValue placeholder={t("filters.accountAll")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50 max-h-[200px]">
                    <SelectItem value="all" className="rounded-xl">{t("filters.accountAll")}</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="rounded-xl">{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.sortLabel")}</Label>
                <Select
                  value={`${searchParams.get("sort") || "date"}_${searchParams.get("order") || "desc"}`}
                  onValueChange={(val) => {
                    const [s, o] = val.split("_");
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.set("sort", s);
                    newParams.set("order", o);
                    router.push(`/transactions?${newParams.toString()}`);
                  }}
                >
                  <SelectTrigger className="rounded-xl border-border/50 bg-secondary/50 h-10">
                    <SelectValue placeholder={t("filters.sortDateDesc")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50">
                    <SelectItem value="date_desc" className="rounded-xl">{t("filters.sortDateDesc")}</SelectItem>
                    <SelectItem value="date_asc" className="rounded-xl">{t("filters.sortDateAsc")}</SelectItem>
                    <SelectItem value="amount_desc" className="rounded-xl">{t("filters.sortAmountDesc")}</SelectItem>
                    <SelectItem value="amount_asc" className="rounded-xl">{t("filters.sortAmountAsc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  router.push("/transactions");
                  setShowFilters(false);
                }}
                className="text-muted-foreground text-xs font-bold hover:text-foreground rounded-full"
              >
                Reset Filter
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">Memuat...</div>
        ) : transactions.length === 0 ? (
          <div className="bg-card rounded-[2rem] border border-border/50 p-8 mt-4">
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              titleKey="transactions.empty.title"
              descriptionKey="transactions.empty.description"
              actionKey="transactions.empty.action"
              onAction={() => router.push("/transactions/new")}
            />
          </div>
        ) : (
          <div className="bg-card rounded-[2rem] border border-border/50 p-2 shadow-sm overflow-hidden">
            {transactions.map((tx, idx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                categories={categories}
                accounts={accounts}
                locale={locale}
                onDelete={(id) => deleteMutation.mutate(id)}
                isLast={idx === transactions.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-border/50 h-10 px-4"
            disabled={parseInt(pageStr) <= 1}
            onClick={() => updateFilter("page", String(parseInt(pageStr) - 1))}
          >
            {t("pagination.prev")}
          </Button>
          <span className="text-sm font-bold text-muted-foreground px-2">
            {pageStr} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-border/50 h-10 px-4"
            disabled={parseInt(pageStr) >= totalPages}
            onClick={() => updateFilter("page", String(parseInt(pageStr) + 1))}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}

function TransactionCard({
  transaction,
  categories,
  accounts,
  locale,
  onDelete,
  isLast,
}: {
  transaction: Transaction;
  categories: Category[];
  accounts: Account[];
  locale: "id" | "en";
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const t = useTranslations("transactions");
  const ct = useTranslations("common");
  const category = categories.find((c) => c.id === transaction.category_id);
  const account = accounts.find((a) => a.id === transaction.account_id);
  const isIncome = transaction.type === "income";

  return (
    <div className={cn("p-4 hover:bg-secondary/30 transition-colors group flex items-center justify-between gap-3", !isLast && "border-b border-border/30")}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: category?.color ? `${category.color}20` : "var(--muted)" }}
        >
          {category?.icon && (
            <DynamicIcon name={category.icon} className="h-6 w-6" style={{ color: category.color || "var(--foreground)" }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground truncate">{category?.name || "Kategori"}</p>
          <div className="flex items-center text-xs text-muted-foreground mt-0.5 truncate gap-1.5">
            <span className="font-medium bg-secondary/50 px-1.5 py-0.5 rounded-md">{account?.name || "?"}</span>
            <span>•</span>
            <span>{formatDate(transaction.date, locale)}</span>
          </div>
          {transaction.note && (
            <p className="text-xs text-muted-foreground truncate mt-1 italic opacity-80">"{transaction.note}"</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end gap-1">
          <span className={cn("font-bold text-base md:text-lg tabular-nums", !isIncome ? "text-red-500" : "text-green-500")}>
            {!isIncome ? "-" : "+"}{formatCurrency(transaction.amount, "IDR", locale)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-xl">
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
              <Link href={`/transactions/${transaction.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                {ct("edit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(transaction.id)}
              className="text-destructive focus:text-destructive rounded-xl cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {ct("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}