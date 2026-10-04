"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, preferencesSchema, changePasswordSchema, type ProfileFormData, type PreferencesFormData, type ChangePasswordFormData } from "@/lib/validators/auth";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { User, Lock, Globe, Sun, Moon, Monitor, Download, Trash2, Tags, LogOut, Check } from "lucide-react";
import { Sticker } from "@/components/common/Sticker";
import { Link } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter, usePathname } from "next/navigation";
import { useLocaleStore, useThemeStore } from "@/store";
import { toast } from "@/store";
import { deleteAccount } from "./actions";
import { downloadCsv } from "@/lib/csv";
import { Switch } from "@/components/ui/switch";
import type { ReminderPrefs } from "@/lib/reminders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsContentProps {
  reminders: ReminderPrefs;
  payday: number | null;
  locale: "id" | "en";
  user: { id: string; email: string };
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    default_currency: string;
    locale: string;
    theme: "light" | "dark" | "system";
    created_at?: string;
  } | null;
}

const LOCALES = [
  { code: "id", name: "Indonesia", flag: "🇮🇩" },
  { code: "en", name: "English", flag: "🇺🇸" },
] as const;

export function SettingsContent({ locale, user, profile, reminders: initialReminders, payday: initialPayday }: SettingsContentProps) {
  const t = useTranslations("settings");
  const ct = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [reminders, setReminders] = useState<ReminderPrefs>(initialReminders);

  // Disimpan langsung ke user_metadata akun Supabase, tanpa tombol simpan
  const toggleReminder = async (key: keyof ReminderPrefs, value: boolean) => {
    const previous = reminders;
    const next = { ...reminders, [key]: value };
    setReminders(next);
    const { error } = await createBrowserSupabaseClient().auth.updateUser({ data: { reminders: next } });
    if (error) {
      setReminders(previous);
      toast.error("Gagal menyimpan pengingat");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
  };

  const [payday, setPayday] = useState<number | null>(initialPayday);
  const changePayday = async (value: string) => {
    const previous = payday;
    const next = value === "none" ? null : Number(value);
    setPayday(next);
    const { error } = await createBrowserSupabaseClient().auth.updateUser({ data: { payday: next } });
    if (error) {
      setPayday(previous);
      toast.error("Gagal menyimpan tanggal gajian");
      return;
    }
    toast.success(next ? `Tanggal gajian: ${next}` : "Tanggal gajian dihapus");
    router.refresh();
  };
  const { setLocale } = useLocaleStore();
  const { setTheme, theme } = useThemeStore();

  const supabase = createBrowserSupabaseClient();


  // Profile Form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      avatar_url: profile?.avatar_url || "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const { error } = await supabase
        .from("profiles")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(t("profile.saved"));
    },
    onError: () => {
      toast.error(t("profile.error"));
    },
  });

  const handleProfileSubmit = (data: ProfileFormData) => {
    profileMutation.mutate(data);
  };

  // Preferences Form
  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      locale: (profile?.locale as "id" | "en") || "id",
      theme: profile?.theme || "system",
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: async (data: PreferencesFormData): Promise<PreferencesFormData> => {
      const { error } = await supabase
        .from("profiles")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setLocale(data.locale as "id" | "en");
      setTheme(data.theme);
      // Update URL with new locale
      const newPath = pathname.replace(/^\/[a-z]{2}/, `/${data.locale}`);
      router.push(newPath);
      router.refresh();
      toast.success(t("preferences.saved"));
    },
    onError: () => {
      toast.error(t("preferences.error"));
    },
  });

  const handlePreferencesSubmit = (data: PreferencesFormData) => {
    preferencesMutation.mutate(data);
  };

  // Change Password Form
  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      // Pastikan sandi lama benar sebelum menggantinya
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.current_password,
      });
      if (verifyError) throw new Error("Kata sandi saat ini salah");

      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success(t("security.passwordChanged"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePasswordSubmit = (data: ChangePasswordFormData) => {
    passwordMutation.mutate(data);
  };

  // Export Data — semua transaksi ke CSV, dibuat di browser
  const [isExporting, setIsExporting] = useState(false);
  const exportData = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "date, type, amount, note, category:categories(name), account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name)"
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;

      const typeLabel: Record<string, string> = { income: "Pemasukan", expense: "Pengeluaran", transfer: "Transfer" };
      const rows = ((data || []) as unknown as {
        date: string;
        type: string;
        amount: number;
        note: string | null;
        category: { name: string } | null;
        account: { name: string } | null;
        to_account: { name: string } | null;
      }[]).map((tx) => [
        tx.date.slice(0, 10),
        typeLabel[tx.type] ?? tx.type,
        tx.category?.name,
        tx.account?.name,
        tx.to_account?.name,
        tx.note,
        Number(tx.amount),
      ]);
      downloadCsv(`koin-export-${new Date().toISOString().split("T")[0]}.csv`, [
        ["Tanggal", "Tipe", "Kategori", "Akun", "Akun Tujuan", "Catatan", "Jumlah"],
        ...rows,
      ]);
      toast.success(t("data.exportSuccess"));
    } catch {
      toast.error(t("data.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  };

  // Delete Account Dialog
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== t("dangerZone.confirmDeleteWord")) {
      toast.error(t("dangerZone.confirmDelete"));
      return;
    }

    try {
      // Hapus akun lewat server action (butuh service role key, tidak bisa dari browser)
      const result = await deleteAccount();
      if (!result.success) {
        toast.error(t("dangerZone.deleteError"));
        return;
      }

      router.push(`/${locale}/login`);
      router.refresh();
    } catch {
      toast.error(t("dangerZone.deleteError"));
    }
  };

  const displayName = profile?.full_name || user.email.split("@")[0];
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" })
    : null;
  const fieldLabel = "text-xs font-black uppercase tracking-[0.1em] text-muted-foreground";
  const card = "scroll-mt-6 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon";

  const sections = [
    { id: "profil", label: t("profile.title"), icon: User },
    { id: "preferensi", label: t("preferences.title"), icon: Globe },
    { id: "keamanan", label: t("security.title"), icon: Lock },
    { id: "data", label: t("data.title"), icon: Download },
    { id: "bahaya", label: t("dangerZone.title"), icon: Trash2 },
  ];
  const themeOptions = [
    { value: "light", label: t("preferences.themeLight"), icon: Sun },
    { value: "dark", label: t("preferences.themeDark"), icon: Moon },
    { value: "system", label: "Sistem", icon: Monitor },
  ] as const;

  const dataCard = (id?: string) => (
    <section id={id} className={card}>
      <h2 className="font-display text-xl font-semibold">{t("data.title")}</h2>
      <p className="mt-1 text-[13px] font-bold text-muted-foreground">Unduh semua transaksi ke file CSV.</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <Button onClick={exportData} disabled={isExporting} className="bg-cartoon-yellow text-ink hover:bg-cartoon-yellow">
          <Download className="mr-2 h-4 w-4" strokeWidth={3} />
          {isExporting ? "Mengekspor…" : "Ekspor CSV"}
        </Button>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" strokeWidth={3} /> Keluar
        </Button>
      </div>
    </section>
  );

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-5">
        {/* Side nav (desktop) */}
        <div className="sticky top-6 hidden flex-col gap-5 lg:flex">
          <nav className="flex flex-col gap-1 rounded-cartoon border-3 border-line bg-card p-3.5 shadow-cartoon" aria-label="Bagian pengaturan">
            {sections.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id === "data" ? "data-panel" : id}`}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-[14px] border-2.5 border-transparent px-3 text-[15px] font-black transition-colors hover:border-line hover:bg-background",
                  id === "bahaya" && "text-expense"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2.5} />
                {label}
              </a>
            ))}
            <Link
              href="/categories"
              className="flex h-12 items-center gap-3 rounded-[14px] border-2.5 border-transparent px-3 text-[15px] font-black transition-colors hover:border-line hover:bg-background"
            >
              <Tags className="h-5 w-5" strokeWidth={2.5} />
              Kategori
            </Link>
          </nav>
          {dataCard("data-panel")}
        </div>

        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            {/* Profil */}
            <section id="profil" className={card}>
              <h2 className="font-display text-xl font-semibold">{t("profile.title")}</h2>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="mt-4 flex flex-col gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-3 border-ink bg-cartoon-lilac font-display text-3xl font-bold text-ink shadow-cartoon-sm">
                    {displayName[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl font-semibold">{displayName}</p>
                    {joined && <p className="text-[13px] font-bold text-muted-foreground">Bergabung {joined}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="full_name" className={fieldLabel}>{t("profile.nameLabel")}</Label>
                  <Input {...profileForm.register("full_name")} id="full_name" placeholder={t("profile.namePlaceholder")} className="mt-1.5" />
                  {profileForm.formState.errors.full_name && (
                    <p className="mt-1 text-sm text-destructive">{profileForm.formState.errors.full_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className={fieldLabel}>{t("profile.emailLabel")}</Label>
                  <Input id="email" value={user.email} disabled className="mt-1.5" />
                  <p className="mt-1 text-xs font-bold text-muted-foreground">{t("profile.emailNote")}</p>
                </div>
                <Button type="submit" className="self-end" disabled={profileMutation.isPending}>
                  <Check className="mr-1.5 h-4 w-4" strokeWidth={3} />
                  {profileMutation.isPending ? t("profile.saving") : "Simpan Profil"}
                </Button>
              </form>
            </section>

            {/* Preferensi */}
            <section id="preferensi" className={card}>
              <h2 className="font-display text-xl font-semibold">{t("preferences.title")}</h2>
              <form onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)} className="mt-4 flex flex-col gap-4">
                <div>
                  <p className={fieldLabel}>{t("preferences.languageLabel")}</p>
                  <div className="mt-2 flex gap-2">
                    {LOCALES.map((l) => {
                      const active = preferencesForm.watch("locale") === l.code;
                      return (
                        <button
                          key={l.code}
                          type="button"
                          aria-pressed={active}
                          onClick={() => preferencesForm.setValue("locale", l.code)}
                          className={cn(
                            "h-10 rounded-full border-2.5 px-4 text-sm font-black transition-colors",
                            active ? "border-ink bg-cartoon-sky text-ink shadow-cartoon-sm" : "border-line bg-background hover:bg-accent"
                          )}
                        >
                          {l.flag} {l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className={fieldLabel}>{t("preferences.themeLabel")}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2.5">
                    {themeOptions.map(({ value, label, icon: Icon }) => {
                      const active = preferencesForm.watch("theme") === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => preferencesForm.setValue("theme", value)}
                          className={cn(
                            "flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-[18px] border-3 text-sm font-black transition-colors",
                            active ? "border-ink bg-cartoon-lilac text-ink shadow-cartoon-sm" : "border-line bg-background hover:bg-accent"
                          )}
                        >
                          <Icon className="h-6 w-6" strokeWidth={2.5} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-divider pt-4">
                  <p className={fieldLabel}>Tanggal gajian</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Select value={payday ? String(payday) : "none"} onValueChange={changePayday}>
                      <SelectTrigger className="w-[150px] shrink-0" aria-label="Tanggal gajian">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="none">Tidak diatur</SelectItem>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            Tanggal {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="min-w-[180px] flex-1 text-xs font-bold text-muted-foreground">
                      Budget harian dihitung dari gajian ke gajian. Sabtu/Minggu otomatis maju ke Jumat; gaji yang cair lebih awal ikut terbaca.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 border-t-2 border-dashed border-divider pt-4">
                  {([
                    ["budget", "Pengingat budget", "Kabari kalau budget sudah lewat batas peringatannya"],
                    ["debt", "Pengingat utang", "H-1 sebelum jatuh tempo, dan saat sudah lewat"],
                  ] as const).map(([key, label, hint]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p id={`reminder-${key}`} className="text-[15px] font-black">{label}</p>
                        <p className="text-xs font-bold text-muted-foreground">{hint}</p>
                      </div>
                      <Switch
                        aria-labelledby={`reminder-${key}`}
                        checked={reminders[key]}
                        onCheckedChange={(v) => toggleReminder(key, v)}
                      />
                    </div>
                  ))}
                </div>
                <Button type="submit" className="self-end" disabled={preferencesMutation.isPending}>
                  <Check className="mr-1.5 h-4 w-4" strokeWidth={3} />
                  {preferencesMutation.isPending ? t("preferences.saving") : t("preferences.save")}
                </Button>
              </form>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* Keamanan */}
            <section id="keamanan" className={card}>
              <h2 className="font-display text-xl font-semibold">{t("security.title")}</h2>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="mt-4 flex flex-col gap-4">
                <div className="grid gap-3.5 md:grid-cols-3">
                  {([
                    ["current_password", "Sandi sekarang", "current-password"],
                    ["new_password", "Sandi baru", "new-password"],
                    ["confirm_password", "Ulangi sandi", "new-password"],
                  ] as const).map(([name, label, autoComplete]) => (
                    <div key={name}>
                      <Label htmlFor={name} className={fieldLabel}>{label}</Label>
                      <Input {...passwordForm.register(name)} id={name} type="password" autoComplete={autoComplete} className="mt-1.5" />
                      {passwordForm.formState.errors[name] && (
                        <p className="mt-1 text-sm text-destructive">{passwordForm.formState.errors[name]?.message}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] font-bold text-muted-foreground">{t("security.newPasswordNote")}</p>
                  <Button type="submit" disabled={passwordMutation.isPending} className="bg-cartoon-mint text-ink hover:bg-cartoon-mint">
                    <Lock className="mr-1.5 h-4 w-4" strokeWidth={3} />
                    {passwordMutation.isPending ? t("security.updating") : "Ganti Sandi"}
                  </Button>
                </div>
              </form>
            </section>

            {/* Zona bahaya */}
            <section id="bahaya" className="scroll-mt-6 flex flex-col gap-3 rounded-cartoon border-3 border-cartoon-red bg-card p-5 shadow-[4px_4px_0_0_#ff5c7a]">
              <div className="flex items-center gap-3">
                <Sticker color="#ff5c7a" size="md">
                  <Trash2 />
                </Sticker>
                <div>
                  <h2 className="font-display text-lg font-semibold">{t("dangerZone.title")}</h2>
                  <p className="text-xs font-bold text-muted-foreground">Hapus akun & semua data permanen</p>
                </div>
              </div>
              <div>
                <Label htmlFor="delete_confirm" className={fieldLabel}>{t("dangerZone.confirmDelete")}</Label>
                <Input
                  id="delete_confirm"
                  type="text"
                  placeholder={t("dangerZone.confirmDeleteWord")}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={deleteConfirm !== t("dangerZone.confirmDeleteWord")}>
                    {t("dangerZone.deleteAccountButton")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("dangerZone.deleteAccountTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("dangerZone.deleteAccountDescription")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{ct("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirm !== t("dangerZone.confirmDeleteWord")}>
                      {t("dangerZone.deleteAccountButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          </div>

          <div className="lg:hidden">{dataCard("data")}</div>
        </div>
      </div>
    </div>
  );
}
