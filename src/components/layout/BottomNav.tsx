"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Wallet,
  ArrowRightLeft,
  Plus,
  Menu as MenuIcon,
  Target,
  Flag,
  Coins,
  LineChart,
  BarChart3,
  ScanLine,
  MessageSquare,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const navigation = [
  { name: "dashboard", href: "/dashboard", icon: LayoutGrid },
  { name: "accounts", href: "/accounts", icon: Wallet },
  { name: "transactions", href: "/transactions", icon: ArrowRightLeft },
] as const;

const moreMenuItems = [
  { label: "Budget", href: "/budgets", icon: Target },
  { label: "Goals", href: "/goals", icon: Flag },
  { label: "Utang", href: "/debts", icon: Coins },
  { label: "Rencana", href: "/planner", icon: LineChart },
  { label: "Statistik", href: "/statistics", icon: BarChart3 },
  { label: "Scanner", href: "/scanner", icon: ScanLine },
  { label: "AI Advisor", href: "/ai-advisor", icon: MessageSquare },
  { label: "Pengaturan", href: "/settings", icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-6 left-6 right-6 z-50 rounded-[2rem] bg-card/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md border border-border lg:hidden supports-[backdrop-filter]:bg-card/75"
        aria-label="Navigasi bawah"
      >
        <div className="flex h-[4.5rem] items-center justify-around px-2 relative">

          <NavItem item={navigation[0]} pathname={pathname} />
          <NavItem item={navigation[1]} pathname={pathname} />

          {/* Center FAB */}
          <div className="flex flex-col items-center justify-center w-14">
            <Link
              href="/transactions/new"
              className="absolute -top-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(204,255,0,0.4)] hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 border-[6px] border-background"
              aria-label="Tambah transaksi"
            >
              <Plus className="h-8 w-8 stroke-[3]" />
            </Link>
          </div>

          <NavItem item={navigation[2]} pathname={pathname} />

          {/* Lainnya: buka sheet berisi semua menu lain, supaya tidak harus lewat Dashboard dulu */}
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all text-muted-foreground hover:bg-secondary"
            aria-label="Menu lainnya"
          >
            <MenuIcon className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
          </button>

        </div>
      </nav>
      {/* Spacer so content isn't hidden behind the floating nav */}
      <div className="h-28 lg:hidden" aria-hidden="true" />

      <Dialog open={showMore} onOpenChange={setShowMore}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
          <div className="grid grid-cols-4 gap-4">
            {moreMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NavItem({ item, pathname }: { item: { name: string, href: string, icon: any }, pathname: string }) {
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all",
        isActive
          ? "text-foreground bg-secondary"
          : "text-muted-foreground hover:bg-secondary"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
    </Link>
  );
}

export function BottomFAB() {
  return null;
}
