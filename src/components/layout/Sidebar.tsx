"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  ArrowRightLeft,
  Target,
  Wallet,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Flag,
  Coins,
  LineChart,
  BarChart3,
  MessageSquare,
  ScanLine,
} from "lucide-react";
import { useUIStore } from "@/store";

const navigation = [
  { name: "dashboard.title", label: null, href: "/dashboard", icon: LayoutGrid },
  { name: "transactions.title", label: null, href: "/transactions", icon: ArrowRightLeft },
  { name: "budgets.title", label: null, href: "/budgets", icon: Target },
  { name: "accounts.title", label: null, href: "/accounts", icon: Wallet },
  { name: "", label: "Goals", href: "/goals", icon: Flag },
  { name: "", label: "Utang", href: "/debts", icon: Coins },
  { name: "", label: "Rencana", href: "/planner", icon: LineChart },
  { name: "", label: "Statistik", href: "/statistics", icon: BarChart3 },
  { name: "", label: "Scanner", href: "/scanner", icon: ScanLine },
  { name: "", label: "AI Advisor", href: "/ai-advisor", icon: MessageSquare },
  { name: "settings.title", label: null, href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const t = useTranslations();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r bg-card transition-transform duration-200 lg:sticky lg:translate-x-0 lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Navigasi utama"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-4 lg:justify-center">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <Wallet className="h-6 w-6 text-primary" />
              <span className="hidden lg:inline">Money Tracker</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent"
              aria-label="Tutup sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto" aria-label="Menu navigasi">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span>{item.label || t(item.name)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4 lg:hidden">
            <div className="text-xs text-muted-foreground text-center">
              Money Tracker v1.0
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}