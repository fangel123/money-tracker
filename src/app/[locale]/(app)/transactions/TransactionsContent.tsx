"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, X, Download, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { downloadCsv } from "@/lib/csv";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  // Path lengkap termasuk locale (/id/transactions), supaya query filter tidak hilang
  const pathname = usePathname();
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

  // Filter akun & kategori boleh lebih dari satu: disimpan di URL sebagai daftar id dipisah koma
  const listParam = (key: string) => (searchParams.get(key) || "").split(",").filter(Boolean);
  const selectedAccounts = listParam("account_id");
  const selectedCategories = listParam("category_id");

  const params = new URLSearchParams();
  params.set("user_id", userId);
  if (searchParams.get("type")) params.set("type", searchParams.get("type")!);
  if (selectedCategories.length) params.set("category_id", selectedCategories.join(","));
  if (selectedAccounts.length) params.set("account_id", selectedAccounts.join(","));
  if (searchParams.get("date_from")) params.set("date_from", searchParams.get("date_from")!);
  if (searchParams.get("date_to")) params.set("date_to", searchParams.get("date_to")!);
  if (searchQuery) params.set("search", searchQuery);

  const pageStr = searchParams.get("page") || "1";
  const PAGE_SIZE = 20;

  params.set("page", pageStr);
  params.set("sort", searchParams.get("sort") || "date");
  params.set("order", searchParams.get("order") || "desc");

  // Filter yang sama dipakai untuk daftar dan untuk ekspor CSV
  const applyFilters = <Q extends { eq: Function; in: Function; gte: Function; lte: Function; ilike: Function }>(query: Q): Q => {
    let q: any = query;
    if (params.get("type")) q = q.eq("type", params.get("type"));
    if (selectedCategories.length === 1) q = q.eq("category_id", selectedCategories[0]);
    if (selectedCategories.length > 1) q = q.in("category_id", selectedCategories);
    if (selectedAccounts.length === 1) q = q.eq("account_id", selectedAccounts[0]);
    if (selectedAccounts.length > 1) q = q.in("account_id", selectedAccounts);
    if (params.get("date_from")) q = q.gte("date", params.get("date_from"));
    if (params.get("date_to")) q = q.lte("date", params.get("date_to"));
    if (params.get("search")) q = q.ilike("note", `%${params.get("search")}%`);
    return q;
  };

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["transactions", params.toString()],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      let query = applyFilters(supabase.from("transactions").select("*", { count: "exact" }).eq("user_id", userId));

      const sort = params.get("sort") || "date";
      const order = params.get("order") || "desc";
      query = query.order(sort, { ascending: order === "asc" });
      // Kunci pengurut kedua: transaksi dengan tanggal sama diurutkan berdasarkan waktu input (terbaru di atas)
      query = query.order("created_at", { ascending: false });

      const page = parseInt(params.get("page") || "1");
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

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
      // Menghapus transaksi mengubah saldo akun, budget, statistik — segarkan semuanya
      queryClient.invalidateQueries();
    },
  });

  const transactions = transactionsData?.data || [];
  const totalCount = transactionsData?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = parseInt(pageStr);

  const pushParams = (newParams: URLSearchParams) => {
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== "page") newParams.set("page", "1"); // reset halaman saat filter berubah
    pushParams(newParams);
  };

  const toggleListFilter = (key: "account_id" | "category_id", id: string) => {
    const current = listParam(key);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updateFilter(key, next.length ? next.join(",") : null);
  };

  const updateSort = (val: string) => {
    const [s, o] = val.split("_");
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("sort", s);
    newParams.set("order", o);
    pushParams(newParams);
  };

  const resetFilters = () => {
    setSearchQuery("");
    router.push(pathname);
  };

  const hasActiveFilters =
    !!searchParams.get("type") || selectedAccounts.length > 0 || selectedCategories.length > 0 ||
    !!searchParams.get("date_from") || !!searchParams.get("date_to") || !!searchQuery;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      // Pakai filter yang sama seperti tampilan (tipe, kategori, akun, tanggal, pencarian),
      // tapi TANPA pagination — supaya semua transaksi yang cocok filter ikut ter-export.
      let query = applyFilters(supabase.from("transactions").select("*").eq("user_id", userId));
      query = query.order("date", { ascending: false }).order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as Transaction[];
      const header = ["Tanggal", "Tipe", "Kategori", "Akun", "Akun Tujuan", "Catatan", "Jumlah"];
      const lines = rows.map((tx) => {
        const cat = categories.find((c) => c.id === tx.category_id);
        const acc = accounts.find((a) => a.id === tx.account_id);
        const toAcc = accounts.find((a) => a.id === tx.to_account_id);
        const typeLabel = tx.type === "income" ? "Pemasukan" : tx.type === "expense" ? "Pengeluaran" : "Transfer";
        return [
          tx.date.slice(0, 10),
          typeLabel,
          tx.type === "transfer" ? "" : cat?.name,
          acc?.name,
          tx.type === "transfer" ? toAcc?.name : "",
          tx.note,
          Number(tx.amount),
        ];
      });
      downloadCsv(`transaksi-${new Date().toISOString().split("T")[0]}.csv`, [header, ...lines]);
    } catch (e: any) {
      alert("Gagal export: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const typeOptions = [
    { value: null, label: "Semua", color: undefined },
    { value: "income", label: "Masuk", color: "#9be7c4" },
    { value: "expense", label: "Keluar", color: "#ff9ebb" },
    { value: "transfer", label: "Transfer", color: "#8fd3ff" },
  ];
  const activeType = searchParams.get("type") || null;
  const sortValue = `${searchParams.get("sort") || "date"}_${searchParams.get("order") || "desc"}`;

  const typePills = (
    <div className="flex flex-wrap gap-2">
      {typeOptions.map((opt) => {
        const active = activeType === opt.value;
        return (
          <button
            key={opt.label}
            onClick={() => updateFilter("type", opt.value)}
            aria-pressed={active}
            className={cn(
              "h-9 shrink-0 rounded-full border-2.5 border-line px-4 text-[13px] font-black transition-transform active:translate-y-px",
              active ? "bg-ink text-cream dark:bg-cream dark:text-ink" : opt.color ? "text-ink" : "bg-card"
            )}
            style={!active && opt.color ? { background: opt.color } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const searchBox = (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" strokeWidth={2.5} />
      <Input
        placeholder={t("filters.searchPlaceholder")}
        className="pl-11 shadow-cartoon-sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label={t("filters.searchPlaceholder")}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Hapus pencarian"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      )}
    </div>
  );

  const filterPanel = (
    <FilterPanel
      typePills={typePills}
      accounts={accounts}
      categories={categories}
      selectedAccounts={selectedAccounts}
      selectedCategories={selectedCategories}
      onToggle={toggleListFilter}
      dateFrom={searchParams.get("date_from") || ""}
      dateTo={searchParams.get("date_to") || ""}
      onDate={updateFilter}
      sortValue={sortValue}
      onSort={updateSort}
      sortLabels={{
        label: t("filters.sortLabel"),
        date_desc: t("filters.sortDateDesc"),
        date_asc: t("filters.sortDateAsc"),
        amount_desc: t("filters.sortAmountDesc"),
        amount_asc: t("filters.sortAmountAsc"),
      }}
      hasActiveFilters={hasActiveFilters}
      onReset={resetFilters}
      onExport={handleExport}
      isExporting={isExporting}
    />
  );

  const pagination = totalPages > 1 && (
    <div className="flex items-center justify-center gap-3 pt-2 lg:justify-end">
      <Button
        variant="outline"
        size="sm"
        className="h-10 px-4"
        disabled={currentPage <= 1}
        onClick={() => updateFilter("page", String(currentPage - 1))}
      >
        {t("pagination.prev")}
      </Button>
      <span className="px-1 text-sm font-black">
        Halaman {currentPage} / {totalPages}
      </span>
      <Button
        size="sm"
        className="h-10 bg-cartoon-yellow px-4 text-ink"
        disabled={currentPage >= totalPages}
        onClick={() => updateFilter("page", String(currentPage + 1))}
      >
        {t("pagination.next")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 pb-4 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
      {/* Mobile: header, search, quick filters */}
      <div className="space-y-4 lg:hidden">
        <PageHeader
          title="Transaksi"
          description={t("header.description")}
          action={
            <Button asChild aria-label="Catat transaksi">
              <Link href="/transactions/new">
                <Plus className="h-5 w-5" strokeWidth={3} />
              </Link>
            </Button>
          }
        />
        <div className="flex gap-2">
          {searchBox}
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
            aria-label={t("filters.title")}
            aria-expanded={showFilters}
          >
            <Filter className="h-5 w-5" strokeWidth={2.5} />
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={handleExport} disabled={isExporting} aria-label="Ekspor CSV">
            <Download className="h-5 w-5" strokeWidth={2.5} />
          </Button>
        </div>
        <div className="overflow-x-auto pb-1 scrollbar-hide [&>div]:flex-nowrap">{typePills}</div>
        {showFilters && <div className="animate-in fade-in slide-in-from-top-4">{filterPanel}</div>}
      </div>

      {/* Desktop: filter panel */}
      <aside className="hidden lg:sticky lg:top-0 lg:block">{filterPanel}</aside>

      {/* List */}
      <section className="min-w-0 lg:rounded-cartoon lg:border-3 lg:border-line lg:bg-card lg:p-5 lg:shadow-cartoon">
        {/* Desktop toolbar */}
        <div className="hidden items-center gap-3 pb-4 lg:flex">
          {searchBox}
          <span className="shrink-0 rounded-full border-2.5 border-line bg-background px-3 py-1 text-xs font-black">
            {transactions.length} dari {totalCount} transaksi
          </span>
          <Button asChild className="shrink-0">
            <Link href="/transactions/new">
              <Plus className="mr-1.5 h-5 w-5" strokeWidth={3} />
              Catat
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center font-bold text-muted-foreground animate-pulse">Memuat...</div>
        ) : transactions.length === 0 ? (
          <div className="rounded-cartoon border-3 border-line bg-card shadow-cartoon lg:border-0 lg:shadow-none">
            <EmptyState
              titleKey="transactions.empty.title"
              descriptionKey="transactions.empty.description"
              actionKey="transactions.empty.action"
              onAction={() => router.push(`${pathname}/new`)}
            />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="overflow-hidden rounded-cartoon border-3 border-line bg-card px-2 py-1 shadow-cartoon lg:hidden">
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

            {/* Desktop table */}
            <div className="hidden lg:block" role="table" aria-label="Daftar transaksi">
              <div role="row" className={cn(TABLE_COLS, "border-b-3 border-line pb-2 text-xs font-black uppercase tracking-[0.1em] text-muted-foreground")}>
                <span role="columnheader"><span className="sr-only">Ikon</span></span>
                <span role="columnheader">Kategori</span>
                <span role="columnheader">Akun</span>
                <span role="columnheader">Catatan</span>
                <span role="columnheader">Tanggal</span>
                <span role="columnheader" className="text-right">Jumlah</span>
                <span role="columnheader"><span className="sr-only">Aksi</span></span>
              </div>
              {transactions.map((tx, idx) => (
                <TransactionRow
                  key={tx.id}
                  index={idx}
                  transaction={tx}
                  categories={categories}
                  accounts={accounts}
                  locale={locale}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </>
        )}

        <div className="pt-3">{pagination}</div>
      </section>
    </div>
  );
}

const TABLE_COLS = "grid grid-cols-[40px_minmax(0,1.1fr)_110px_minmax(0,1.6fr)_80px_140px_36px] items-center gap-3";

function FilterPanel({
  typePills,
  accounts,
  categories,
  selectedAccounts,
  selectedCategories,
  onToggle,
  dateFrom,
  dateTo,
  onDate,
  sortValue,
  onSort,
  sortLabels,
  hasActiveFilters,
  onReset,
  onExport,
  isExporting,
}: {
  typePills: React.ReactNode;
  accounts: Account[];
  categories: Category[];
  selectedAccounts: string[];
  selectedCategories: string[];
  onToggle: (key: "account_id" | "category_id", id: string) => void;
  dateFrom: string;
  dateTo: string;
  onDate: (key: string, value: string | null) => void;
  sortValue: string;
  onSort: (value: string) => void;
  sortLabels: Record<string, string>;
  hasActiveFilters: boolean;
  onReset: () => void;
  onExport: () => void;
  isExporting: boolean;
}) {
  const section = "text-xs font-black uppercase tracking-[0.1em] text-muted-foreground";
  return (
    <div className="flex flex-col gap-5 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Filter</h2>
        {hasActiveFilters && (
          <button onClick={onReset} className="text-xs font-black underline decoration-primary decoration-[3px] underline-offset-4">
            Reset
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <p className={section}>Jenis</p>
        {typePills}
      </div>

      {accounts.length > 0 && (
        <fieldset className="space-y-2">
          <legend className={cn(section, "mb-2")}>Akun</legend>
          {accounts.map((acc) => {
            const checked = selectedAccounts.includes(acc.id);
            return (
              <label key={acc.id} className="flex cursor-pointer items-center gap-2.5 text-sm font-extrabold">
                <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => onToggle("account_id", acc.id)} />
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg border-2.5 border-line peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                    checked ? "bg-primary text-ink" : "bg-background"
                  )}
                  aria-hidden="true"
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={4} />}
                </span>
                {acc.name}
              </label>
            );
          })}
        </fieldset>
      )}

      {categories.length > 0 && (
        <div className="space-y-2.5">
          <p className={section}>Kategori</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => onToggle("category_id", cat.id)}
                  aria-pressed={active}
                  className={cn(
                    "h-8 rounded-full border-2.5 px-3 text-xs font-black transition-transform active:translate-y-px",
                    active ? "border-ink text-ink shadow-cartoon-sm" : "border-line bg-background text-foreground"
                  )}
                  style={active ? { background: `color-mix(in srgb, ${cat.color || "#c8f031"} 55%, #ffffff)` } : undefined}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <p className={section}>Tanggal</p>
        <div className="grid grid-cols-1 gap-2">
          <Input type="date" aria-label="Dari tanggal" value={dateFrom} onChange={(e) => onDate("date_from", e.target.value || null)} className="h-11 px-2 text-xs" />
          <Input type="date" aria-label="Sampai tanggal" value={dateTo} onChange={(e) => onDate("date_to", e.target.value || null)} className="h-11 px-2 text-xs" />
        </div>
      </div>

      <div className="space-y-2.5">
        <p className={section}>{sortLabels.label}</p>
        <Select value={sortValue} onValueChange={onSort}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">{sortLabels.date_desc}</SelectItem>
            <SelectItem value="date_asc">{sortLabels.date_asc}</SelectItem>
            <SelectItem value="amount_desc">{sortLabels.amount_desc}</SelectItem>
            <SelectItem value="amount_asc">{sortLabels.amount_asc}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onExport} disabled={isExporting} className="w-full bg-cartoon-yellow text-ink">
        <Download className="mr-2 h-5 w-5" strokeWidth={2.5} />
        {isExporting ? "Mengekspor..." : "Ekspor CSV"}
      </Button>
    </div>
  );
}

function TransactionRow({
  index,
  transaction,
  categories,
  accounts,
  locale,
  onDelete,
}: {
  index: number;
  transaction: Transaction;
  categories: Category[];
  accounts: Account[];
  locale: "id" | "en";
  onDelete: (id: string) => void;
}) {
  const ct = useTranslations("common");
  const category = categories.find((c) => c.id === transaction.category_id);
  const account = accounts.find((a) => a.id === transaction.account_id);
  const toAccount = accounts.find((a) => a.id === transaction.to_account_id);
  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";

  return (
    <div role="row" className={cn(TABLE_COLS, "group border-b-2 border-dashed border-divider py-2.5 last:border-0")}>
      <span role="cell">
        <CategorySticker category={category} isTransfer={isTransfer} size="sm" tilt={stickerTilt(index)} />
      </span>
      <span role="cell" className="truncate text-sm font-black">
        {isTransfer ? `${account?.name || "?"} → ${toAccount?.name || "?"}` : category?.name || "Kategori"}
      </span>
      <span role="cell" className="min-w-0">
        <span className="inline-block max-w-full truncate rounded-full border-2 border-line bg-background px-2.5 py-0.5 text-xs font-black">
          {isTransfer ? "Transfer" : account?.name || "?"}
        </span>
      </span>
      <span role="cell" className="truncate text-[13px] font-bold text-muted-foreground">{transaction.note}</span>
      <span role="cell" className="text-[13px] font-extrabold text-muted-foreground">
        {formatDate(transaction.date, locale, { day: "numeric", month: "short" })}
      </span>
      <span
        role="cell"
        className={cn("text-right text-sm font-black tabular-nums", isTransfer ? "text-foreground" : isIncome ? "text-income" : "text-expense")}
      >
        {isTransfer ? "" : isIncome ? "+" : "−"}
        {formatCurrency(transaction.amount, "IDR", locale)}
      </span>
      <span role="cell">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-line bg-background" aria-label={ct("actions")}>
              <MoreVertical className="h-4 w-4" strokeWidth={3} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/transactions/${transaction.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                {ct("edit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(transaction.id)} className="cursor-pointer text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {ct("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
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