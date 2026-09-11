import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "IDR",
  locale: string = "id-ID"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(
  amount: number,
  locale: string = "id-ID",
  decimals: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDate(
  date: Date | string,
  locale: string = "id-ID",
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatDateTime(
  date: Date | string,
  locale: string = "id-ID"
): string {
  return formatDate(date, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(
  date: Date | string,
  locale: string = "id-ID"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  return formatDate(d, locale);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const CURRENCIES = [
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", locale: "id-ID" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", locale: "ms-MY" },
  { code: "THB", name: "Thai Baht", symbol: "฿", locale: "th-TH" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", locale: "zh-CN" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", locale: "ko-KR" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CATEGORIES = {
  income: [
    { name: "Gaji", icon: "briefcase", color: "#059669" },
    { name: "Freelance", icon: "laptop", color: "#0891b2" },
    { name: "Investasi", icon: "trending-up", color: "#0d9488" },
    { name: "Hadiah", icon: "gift", color: "#7c3aed" },
    { name: "Lainnya", icon: "plus-circle", color: "#64748b" },
  ],
  expense: [
    { name: "Makanan", icon: "utensils-crossed", color: "#ef4444" },
    { name: "Transport", icon: "car", color: "#f97316" },
    { name: "Belanja", icon: "shopping-bag", color: "#eab308" },
    { name: "Hiburan", icon: "gamepad-2", color: "#a855f7" },
    { name: "Kesehatan", icon: "heart-pulse", color: "#ec4899" },
    { name: "Pendidikan", icon: "graduation-cap", color: "#06b6d4" },
    { name: "Tagihan", icon: "file-text", color: "#6366f1" },
    { name: "Lainnya", icon: "more-horizontal", color: "#64748b" },
  ],
} as const;

export const ACCOUNT_TYPES = [
  { value: "cash", label: "Tunai", icon: "wallet", color: "#22c55e" },
  { value: "bank", label: "Bank", icon: "building-2", color: "#3b82f6" },
  { value: "ewallet", label: "E-Wallet", icon: "smartphone", color: "#8b5cf6" },
  { value: "credit_card", label: "Kartu Kredit", icon: "credit-card", color: "#f59e0b" },
  { value: "investment", label: "Investasi", icon: "trending-up", color: "#06b6d4" },
  { value: "other", label: "Lainnya", icon: "briefcase", color: "#64748b" },
] as const;

export const BUDGET_PERIODS = [
  { value: "weekly", label: "Mingguan", days: 7 },
  { value: "monthly", label: "Bulanan", days: 30 },
  { value: "yearly", label: "Tahunan", days: 365 },
] as const;

export const RECURRING_FREQUENCIES = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
] as const;