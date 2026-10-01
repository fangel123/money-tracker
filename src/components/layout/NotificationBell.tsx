"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { computeReminders, readReminderPrefs, type Reminder } from "@/lib/reminders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTIFIED_KEY = "koin-notified-reminders";

interface NotificationBellProps {
  buttonClassName: string;
}

/** Lonceng pengingat di header: budget yang hampir/lewat batas dan utang yang jatuh tempo besok atau lewat. */
export function NotificationBell({ buttonClassName }: NotificationBellProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: async (): Promise<Reminder[]> => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const now = new Date();
      const [{ data: budgets }, { data: expenses }, { data: debts }] = await Promise.all([
        supabase.from("budgets").select("id, category_id, amount, period, alert_threshold, category:categories(name)").eq("user_id", user.id),
        supabase
          .from("transactions")
          .select("category_id, amount, date")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .gte("date", `${now.getFullYear()}-01-01`),
        supabase.from("debts").select("id, name, type, remaining_amount, due_date").eq("user_id", user.id).eq("status", "active"),
      ]);

      return computeReminders({
        budgets: (budgets || []) as unknown as Parameters<typeof computeReminders>[0]["budgets"],
        expenses: expenses || [],
        debts: (debts || []) as Parameters<typeof computeReminders>[0]["debts"],
        prefs: readReminderPrefs(user.user_metadata),
        now,
      });
    },
    staleTime: 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  // Notifikasi browser: tiap pengingat cukup sekali (id-nya sudah memuat tanggal/periode)
  useEffect(() => {
    if (permission !== "granted" || reminders.length === 0) return;
    let notified: string[] = [];
    try {
      notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]");
    } catch {
      notified = [];
    }
    const fresh = reminders.filter((r) => !notified.includes(r.id));
    for (const r of fresh) {
      try {
        new Notification(r.title, { body: r.detail, icon: "/icon-192.png", tag: r.id });
      } catch {
        // Beberapa browser (mis. Android Chrome) hanya mengizinkan notifikasi lewat service worker
      }
    }
    if (fresh.length) {
      try {
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified, ...fresh.map((r) => r.id)].slice(-100)));
      } catch {
        // abaikan storage penuh / diblokir
      }
    }
  }, [reminders, permission]);

  const enableBrowserNotifications = async () => {
    if (!("Notification" in window)) return;
    setPermission(await Notification.requestPermission());
  };

  const count = reminders.length;
  const hasDanger = reminders.some((r) => r.severity === "danger");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(buttonClassName, "relative")} aria-label={count ? `Pengingat (${count})` : "Pengingat"}>
          {count ? <BellRing className="h-5 w-5" strokeWidth={2.5} /> : <Bell className="h-5 w-5" strokeWidth={2.5} />}
          {count > 0 && (
            <span
              className={cn(
                "absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink px-1 text-[11px] font-black text-ink",
                hasDanger ? "bg-cartoon-red" : "bg-cartoon-yellow"
              )}
            >
              {count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <p className="px-2 pb-1.5 pt-1 font-display text-base font-semibold">Pengingat</p>
        {count === 0 ? (
          <p className="px-2 pb-2 text-sm font-bold text-muted-foreground">Semua aman. Belum ada budget atau utang yang perlu diingatkan.</p>
        ) : (
          reminders.map((r) => (
            <DropdownMenuItem key={r.id} asChild className="cursor-pointer items-start gap-2.5 rounded-xl py-2">
              <Link href={r.href}>
                <span
                  className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink", r.severity === "danger" ? "bg-cartoon-red" : "bg-cartoon-yellow")}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-snug">{r.title}</span>
                  <span className="block text-xs font-bold text-muted-foreground">{r.detail}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        {permission === "default" && (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); enableBrowserNotifications(); }} className="cursor-pointer rounded-xl text-sm font-bold">
            <BellRing className="mr-2 h-4 w-4" /> Aktifkan notifikasi browser
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-sm font-bold">
          <Link href="/settings#preferensi">
            <Settings className="mr-2 h-4 w-4" /> Atur pengingat
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
