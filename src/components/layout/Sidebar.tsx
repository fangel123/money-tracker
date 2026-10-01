"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useUIStore } from "@/store";
import { Mascot } from "@/components/common/Mascot";
import { NAV_ITEMS, isNavActive } from "@/components/layout/nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-3 top-3 bottom-3 z-50 flex w-[248px] flex-col gap-4 rounded-[28px] border-3 border-line bg-card px-3.5 py-5 shadow-cartoon-lg transition-transform duration-200",
          "lg:static lg:inset-auto lg:z-auto lg:h-full lg:flex-shrink-0 lg:translate-x-0 lg:shadow-cartoon",
          sidebarOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0"
        )}
        aria-label="Navigasi utama"
      >
        <div className="flex items-center justify-between px-1.5">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <Mascot size={40} />
            <span className="font-display text-[28px] font-bold leading-none">Koin</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2.5 border-line bg-background lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-hide" aria-label="Menu navigasi">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex h-[42px] shrink-0 items-center gap-3 rounded-[14px] border-2.5 px-3 text-sm font-black transition-colors",
                  isActive
                    ? "border-ink bg-primary text-ink"
                    : "border-transparent text-foreground hover:bg-accent"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/transactions/new"
          onClick={() => setSidebarOpen(false)}
          className="flex h-[54px] shrink-0 items-center justify-center gap-2 rounded-[18px] border-3 border-ink bg-cartoon-pink font-display text-lg font-bold text-ink shadow-cartoon transition-all hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="h-5 w-5" strokeWidth={3.5} />
          Catat Transaksi
        </Link>
      </aside>
    </>
  );
}
