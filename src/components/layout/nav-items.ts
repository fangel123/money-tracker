import {
  LayoutGrid,
  ArrowRightLeft,
  Target,
  Wallet,
  Flag,
  Coins,
  CalendarDays,
  BarChart3,
  ScanLine,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Sticker color used in the "Lainnya" sheet and dashboard menu. */
  color: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid, color: "#c8f031" },
  { label: "Transaksi", href: "/transactions", icon: ArrowRightLeft, color: "#8fd3ff" },
  { label: "Budget", href: "/budgets", icon: Target, color: "#ffd447" },
  { label: "Akun", href: "/accounts", icon: Wallet, color: "#c8f031" },
  { label: "Goals", href: "/goals", icon: Flag, color: "#9be7c4" },
  { label: "Utang", href: "/debts", icon: Coins, color: "#ff9ebb" },
  { label: "Rencana", href: "/planner", icon: CalendarDays, color: "#c9b6ff" },
  { label: "Statistik", href: "/statistics", icon: BarChart3, color: "#ffb86b" },
  { label: "Scanner", href: "/scanner", icon: ScanLine, color: "#8fd3ff" },
  { label: "AI Advisor", href: "/ai-advisor", icon: MessageSquare, color: "#ffffff" },
  { label: "Pengaturan", href: "/settings", icon: Settings, color: "#e4d6bc" },
];

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function pageTitleFor(pathname: string) {
  if (pathname.startsWith("/transactions/new")) return "Catat Transaksi";
  if (pathname.includes("/edit")) return "Ubah Transaksi";
  if (pathname.startsWith("/categories")) return "Kategori";
  return NAV_ITEMS.find((item) => isNavActive(pathname, item.href))?.label ?? "Koin";
}
