"use client";

import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { useUIStore, useThemeStore, useLocaleStore } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Sun, Moon, Monitor, Globe, LogOut, User, Settings } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Mascot } from "@/components/common/Mascot";
import { pageTitleFor } from "@/components/layout/nav-items";
import { NotificationBell } from "@/components/layout/NotificationBell";

const locales = [
  { code: "id", name: "Indonesia", short: "ID" },
  { code: "en", name: "English", short: "EN" },
] as const;

const iconButton =
  "flex h-11 w-11 items-center justify-center rounded-2xl border-3 border-line bg-card text-foreground shadow-cartoon-sm transition-all hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none lg:h-12 lg:w-12";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const activeLocale = useLocale();
  const { setTheme, resolvedTheme } = useThemeStore();
  const { setLocale } = useLocaleStore();

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const currentLocale = locales.find((l) => l.code === activeLocale) || locales[0];
  const today = new Intl.DateTimeFormat(activeLocale === "en" ? "en-US" : "id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:bg-transparent lg:backdrop-blur-none">
      <div className="flex h-[72px] items-center justify-between gap-3 px-4 lg:h-[60px] lg:pl-0 lg:pr-1.5 lg:pt-1">
        {/* Mobile: menu + brand */}
        <div className="flex items-center gap-3 lg:hidden">
          <button onClick={() => useUIStore.getState().toggleSidebar()} className={iconButton} aria-label="Buka menu">
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Mascot size={36} />
            <span className="font-display text-2xl font-bold">Koin</span>
          </Link>
        </div>

        {/* Desktop: date + page title */}
        <div className="hidden min-w-0 flex-col lg:flex">
          <span className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{today}</span>
          <h1 className="truncate font-display text-[30px] font-bold leading-tight">{pageTitleFor(pathname)}</h1>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <NotificationBell buttonClassName={iconButton} />

          {/* Theme */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={iconButton} aria-label="Ubah tema">
                {resolvedTheme === "dark" ? <Moon className="h-5 w-5" strokeWidth={2.5} /> : <Sun className="h-5 w-5" strokeWidth={2.5} />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                {t("common.light")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                {t("common.dark")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                {t("common.system")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(iconButton, "hidden w-auto gap-2 px-3 sm:flex lg:w-auto")}
                aria-label={`Bahasa: ${currentLocale.name}`}
              >
                <Globe className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-sm font-black">{currentLocale.short}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {locales.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => {
                    setLocale(l.code);
                    router.replace(pathname, { locale: l.code });
                  }}
                  className={cn("flex items-center gap-2", activeLocale === l.code && "bg-accent")}
                >
                  <span className="w-6 text-xs font-black">{l.short}</span>
                  <span>{l.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full border-3 border-line bg-cartoon-lilac text-ink shadow-cartoon-sm transition-all hover:-translate-y-px lg:h-12 lg:w-12"
                aria-label="Menu akun"
              >
                <User className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex w-full items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("common.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex w-full items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t("common.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("common.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
