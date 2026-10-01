"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, Wallet, ArrowRightLeft, Plus, Menu as MenuIcon, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sticker } from "@/components/common/Sticker";
import { NAV_ITEMS, isNavActive } from "@/components/layout/nav-items";

const PRIMARY = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Akun", href: "/accounts", icon: Wallet },
  { label: "Transaksi", href: "/transactions", icon: ArrowRightLeft },
] as const;

const MORE_ITEMS = NAV_ITEMS.filter((item) => !PRIMARY.some((p) => p.href === item.href));

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => isNavActive(pathname, item.href));

  return (
    <>
      <nav
        className="fixed bottom-4 left-4 right-4 z-40 rounded-cartoon border-3 border-line bg-card shadow-cartoon lg:hidden"
        aria-label="Navigasi bawah"
      >
        <div className="flex h-[72px] items-center justify-around px-2">
          <NavItem {...PRIMARY[0]} active={isNavActive(pathname, PRIMARY[0].href)} />
          <NavItem {...PRIMARY[1]} active={isNavActive(pathname, PRIMARY[1].href)} />

          <Link
            href="/transactions/new"
            className="-mt-9 flex h-[62px] w-[62px] -rotate-[4deg] items-center justify-center rounded-[22px] border-3 border-ink bg-cartoon-pink text-ink shadow-cartoon transition-transform hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none"
            aria-label="Tambah transaksi"
          >
            <Plus className="h-8 w-8" strokeWidth={3.5} />
          </Link>

          <NavItem {...PRIMARY[2]} active={isNavActive(pathname, PRIMARY[2].href)} />

          <button
            type="button"
            onClick={() => setShowMore(true)}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl border-2.5 transition-colors",
              moreActive ? "border-ink bg-primary text-ink" : "border-transparent text-foreground hover:bg-accent"
            )}
            aria-label="Menu lainnya"
          >
            <MenuIcon className="h-[22px] w-[22px]" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <Dialog open={showMore} onOpenChange={setShowMore}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Menu lainnya</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 pt-2">
            {MORE_ITEMS.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className="flex flex-col items-center gap-2 text-center"
              >
                <Sticker color={item.color} size="lg" tilt={i % 2 === 0 ? -4 : 4}>
                  <item.icon />
                </Sticker>
                <span className="text-xs font-extrabold">{item.label}</span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NavItem({ label, href, icon: Icon, active }: { label: string; href: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl border-2.5 transition-colors",
        active ? "border-ink bg-primary text-ink" : "border-transparent text-foreground hover:bg-accent"
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={2.5} aria-hidden="true" />
    </Link>
  );
}

export function BottomFAB() {
  return null;
}
