"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  List,
  Target,
  Wallet,
  Settings,
  Plus,
} from "lucide-react";

const navigation = [
  { name: "dashboard.title", href: "/dashboard", icon: LayoutDashboard },
  { name: "transactions.title", href: "/transactions", icon: List },
  { name: "budgets.title", href: "/budgets", icon: Target },
  { name: "accounts.title", href: "/accounts", icon: Wallet },
  { name: "settings.title", href: "/settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:hidden"
      aria-label="Navigasi bawah"
    >
      <div className="flex h-16 items-center justify-around">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{t(item.name)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomFAB() {
  const pathname = usePathname();
  const isTransactions = pathname === "/transactions" || pathname.startsWith("/transactions/");

  if (!isTransactions) return null;

  return (
    <Link
      href="/transactions/new"
      className="fixed bottom-20 right-4 z-50 lg:hidden"
      aria-label="Tambah transaksi"
    >
      <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
        <Plus className="h-7 w-7" />
      </button>
    </Link>
  );
}