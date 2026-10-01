"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Search, Filter, ChevronRight, MoreVertical, Edit, Trash2, ArrowLeftRight, X, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { Transaction, Category, Account } from "@/types/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { CategorySticker } from "@/components/common/CategorySticker";
import { stickerTilt } from "@/components/common/Sticker";
import { PageHeader } from "@/components/common/PageHeader";

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
  const [isExporting, setIsExporting] = useState(false);

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
      // Kunci pengurut kedua: transaksi dengan tanggal sama diurutkan berdasarkan waktu input (terbaru di atas)
      query = query.order("created_at", { ascending: false });

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

  // Escape satu field CSV: bungkus dengan tanda kutip kalau mengandung koma, kutip, atau baris baru
  const csvEscape = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      // Pakai filter yang sama seperti tampilan (tipe, kategori, akun, tanggal, pencarian),
      // tapi TANPA pagination — supaya semua transaksi yang cocok filter ikut ter-export.
      let query = supabase.from("transactions").select("*").eq("user_id", userId);
      if (params.get("type")) query = query.eq("type", params.get("type"));
      if (params.get("category_id")) query = query.eq("category_id", params.get("category_id"));
      if (params.get("account_id")) query = query.eq("account_id", params.get("account_id"));
      if (params.get("date_from")) query = query.gte("date", params.get("date_from"));
      if (params.get("date_to")) query = query.lte("date", params.get("date_to"));
      if (params.get("search")) query = query.ilike("note", `%${params.get("search")}%`);
      query = query.order("date", { ascending: false }).order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as Transaction[];
      const header = ["Tanggal", "Tipe", "Kategori", "Akun", "Akun Tujuan", "Catatan", "Jumlah"];
      const lines = [header.join(",")];

      for (const tx of rows) {
        const cat = categories.find((c) => c.id === tx.category_id);
        const acc = accounts.find((a) => a.id === tx.account_id);
        const toAcc = accounts.find((a) => a.id === tx.to_account_id);
        const typeLabel = tx.type === "income" ? "Pemasukan" : tx.type === "expense" ? "Pengeluaran" : "Transfer";
        lines.push(
          [
            tx.date,
            typeLabel,
            tx.type === "transfer" ? "" : cat?.name || "",
            acc?.name || "",
            tx.type === "transfer" ? toAcc?.name || "" : "",
            csvEscape(tx.note || ""),
            tx.amount.toString(),
          ].join(",")
        );
      }

      // BOM di depan supaya Excel membaca karakter non-ASCII (mis. huruf é, tanda kutip pintar) dengan benar
      const csvContent = "\uFEFF" + lines.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const todayStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `transaksi-${todayStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Gagal export: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Transaksi"
        description={t("header.description")}
        action={
          <Button asChild aria-label="Catat transaksi">
            <Link href="/transactions/new">
              <Plus className="h-5 w-5 sm:mr-1.5" strokeWidth={3} />
              <span className="hidden sm:inline">Catat</span>
            </Link>
          </Button>
        }
      />

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground" strokeWidth={2.5} />
            <Input
              placeholder={t("filters.searchPlaceholder")}
              className="pl-11 shadow-cartoon-sm"
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
            className="h-12 px-4"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("filters.title")}</span>
          </Button>
          <Button
            variant="outline"
            className="h-12 px-4"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{isExporting ? "Mengekspor..." : "Export CSV"}</span>
          </Button>
        </div>

        {/* Quick type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { value: null, label: t("filters.typeAll"), color: undefined },
            { value: "income", label: "Masuk", color: "#9be7c4" },
            { value: "expense", label: "Keluar", color: "#ff9ebb" },
            { value: "transfer", label: "Transfer", color: "#8fd3ff" },
          ].map((opt) => {
            const active = (searchParams.get("type") || null) === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => updateFilter("type", opt.value)}
                aria-pressed={active}
                className={cn(
                  "h-10 shrink-0 rounded-full border-2.5 border-line px-4 text-[13px] font-black transition-transform active:translate-y-px",
                  active ? "bg-ink text-cream dark:bg-cream dark:text-ink" : opt.color ? "text-ink" : "bg-card"
                )}
                style={!active && opt.color ? { background: opt.color } : undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="bg-card border-3 border-line rounded-cartoon p-5 space-y-4 shadow-cartoon animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.typeLabel")}</Label>
                <Select
                  value={searchParams.get("type") || "all"}
                  onValueChange={(val) => updateFilter("type", val === "all" ? null : val)}
                >
                  <SelectTrigger className="rounded-xl border-line bg-secondary h-10">
                    <SelectValue placeholder={t("filters.typeAll")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-line">
                    <SelectItem value="all" className="rounded-xl">{t("filters.typeAll")}</SelectItem>
                    <SelectItem value="income" className="rounded-xl">{t("filters.typeIncome")}</SelectItem>
                    <SelectItem value="expense" className="rounded-xl">{t("filters.typeExpense")}</SelectItem>
                    <SelectItem value="transfer" className="rounded-xl">{t("form.typeTransfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.categoryLabel")}</Label>
                <Select
                  value={searchParams.get("category_id") || "all"}
                  onValueChange={(val) => updateFilter("category_id", val === "all" ? null : val)}
                >
                  <SelectTrigger className="rounded-xl border-line bg-secondary h-10">
                    <SelectValue placeholder={t("filters.categoryAll")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-line max-h-[200px]">
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
                  <SelectTrigger className="rounded-xl border-line bg-secondary h-10">
                    <SelectValue placeholder={t("filters.accountAll")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-line max-h-[200px]">
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
                  <SelectTrigger className="rounded-xl border-line bg-secondary h-10">
                    <SelectValue placeholder={t("filters.sortDateDesc")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-line">
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
          <div className="bg-card rounded-cartoon border-3 border-line p-8 mt-4 shadow-cartoon">
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              titleKey="transactions.empty.title"
              descriptionKey="transactions.empty.description"
              actionKey="transactions.empty.action"
              onAction={() => router.push("/transactions/new")}
            />
          </div>
        ) : (
          <div className="bg-card rounded-cartoon border-3 border-line px-2 py-1 shadow-cartoon overflow-hidden">
            {transactions.map((tx, idx) => (
              <TransactionCard
                key={tx.id}
                index={idx}
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
            className="h-10 px-4"
            disabled={parseInt(pageStr) <= 1}
            onClick={() => updateFilter("page", String(parseInt(pageStr) - 1))}
          >
            {t("pagination.prev")}
          </Button>
          <span className="px-2 text-sm font-black">
            {pageStr} / {totalPages}
          </span>
          <Button
            variant="default"
            size="sm"
            className="h-10 bg-cartoon-yellow px-4 text-ink"
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
  index,
  transaction,
  categories,
  accounts,
  locale,
  onDelete,
  isLast,
}: {
  index: number;
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
  const toAccount = accounts.find((a) => a.id === transaction.to_account_id);
  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";

  return (
    <div className={cn("group flex items-center justify-between gap-3 rounded-2xl px-2.5 py-3 transition-colors hover:bg-background", !isLast && "border-b-2 border-dashed border-divider")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CategorySticker category={category} isTransfer={isTransfer} size="md" tilt={stickerTilt(index)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black text-foreground">
            {isTransfer ? `${account?.name || "?"} → ${toAccount?.name || "?"}` : category?.name || "Kategori"}
          </p>
          <div className="mt-1 flex items-center gap-1.5 truncate text-xs font-bold text-muted-foreground">
            <span className="shrink-0 rounded-full border-2 border-line bg-background px-2 font-black text-foreground">
              {isTransfer ? "Transfer" : account?.name || "?"}
            </span>
            <span className="shrink-0">{formatDate(transaction.date, locale, { day: "numeric", month: "short" })}</span>
            {transaction.note && <span className="truncate">· {transaction.note}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end gap-1">
          <span className={cn("text-[15px] font-black tabular-nums md:text-base", isTransfer ? "text-foreground" : !isIncome ? "text-expense" : "text-income")}>
            {isTransfer ? "" : !isIncome ? "−" : "+"}{formatCurrency(transaction.amount, "IDR", locale)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-line bg-background focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100" aria-label={ct("actions")}>
              <MoreVertical className="h-4 w-4" strokeWidth={3} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-line shadow-xl">
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