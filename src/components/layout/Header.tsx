"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Sun, Moon, Monitor, Globe, LogOut, User, Settings } from "lucide-react";
import { useThemeStore, useLocaleStore } from "@/store";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const locales = [
  { code: "id", name: "Indonesia", flag: "🇮🇩" },
  { code: "en", name: "English", flag: "🇺🇸" },
] as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const supabase = createBrowserSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left: Mobile menu button + Title */}
        <div className="flex items-center gap-4 lg:hidden">
          <button
            onClick={() => useUIStore.getState().toggleSidebar()}
            className="p-2 rounded-lg hover:bg-accent"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-lg">Money Tracker</h1>
        </div>

        {/* Center: Page title (desktop) */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
          <h1 className="font-semibold text-lg">
            {getPageTitle(pathname, t)}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ubah tema">
                {resolvedTheme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-background border shadow-md">
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

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 hidden sm:flex">
                <Globe className="h-4 w-4" />
                <span>{currentLocale.flag}</span>
                <span className="text-xs font-medium">{currentLocale.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border shadow-md">
              {locales.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => {
                    setLocale(l.code);
                    router.replace(pathname, { locale: l.code });
                  }}
                  className={cn("flex items-center gap-2", locale === l.code && "bg-accent")}
                >
                  <span>{l.flag}</span>
                  <span>{l.name}</span>
                  {locale === l.code && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background border shadow-md">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex w-full items-center gap-2" onClick={() => setUserMenuOpen(false)}>
                  <User className="h-4 w-4" />
                  {t("common.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex w-full items-center gap-2" onClick={() => setUserMenuOpen(false)}>
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

function getPageTitle(pathname: string, t: ReturnType<typeof useTranslations>) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Money Tracker";
  const page = segments[0];
  switch (page) {
    case "dashboard":
      return t("dashboard.title");
    case "transactions":
      return t("transactions.title");
    case "budgets":
      return t("budgets.title");
    case "accounts":
      return t("accounts.title");
    case "settings":
      return t("settings.title");
    case "categories":
      return t("categories.title");
    default:
      return "Money Tracker";
  }
}