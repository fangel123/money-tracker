"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, preferencesSchema, changePasswordSchema, type ProfileFormData, type PreferencesFormData, type ChangePasswordFormData } from "@/lib/validators/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { User, Mail, Lock, Globe, Sun, Moon, Monitor, Palette, Download, Upload, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter, usePathname } from "next/navigation";
import { useLocaleStore, useThemeStore } from "@/store";
import { toast } from "@/store";

interface SettingsContentProps {
  locale: "id" | "en" | "zh" | "ja" | "ko";
  user: { id: string; email: string };
  profile: { full_name: string | null; avatar_url: string | null; default_currency: string; locale: string; theme: "light" | "dark" | "system" } | null;
}

const LOCALES = [
  { code: "id", name: "Indonesia", flag: "🇮🇩" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  {code: "ko", name: "한국어", flag: "🇰🇷" },
] as const;

const CURRENCIES = [
  { code: "IDR", name: "Rupiah Indonesia (Rp)" },
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "SGD", name: "Singapore Dollar (S$)" },
  { code: "MYR", name: "Malaysian Ringgit (RM)" },
] as const;

export function SettingsContent({ locale, user, profile }: SettingsContentProps) {
  const t = useTranslations("settings");
  const ct = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { setLocale } = useLocaleStore();
  const { setTheme, theme } = useThemeStore();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);

  const supabase = createBrowserSupabaseClient();

  const currentLocale = LOCALES.find((l) => l.code === locale) || LOCALES[0];

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
      locale: (profile?.locale as "id" | "en" | "zh" | "ja" | "ko") || "id",
      currency: profile?.default_currency || "IDR",
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
      setLocale(data.locale as any);
      setTheme(data.theme);
      // Update URL with new locale
      const newPath = pathname.replace(/^\/[a-z]{2}/, `/${data.locale}`);
      router.push(newPath);
      router.refresh();
      toast.success(t("preferences.saved"));
    },
    onError: () => {
      toast.error("Gagal menyimpan preferensi");
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
      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Kata sandi berhasil diubah");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePasswordSubmit = (data: ChangePasswordFormData) => {
    passwordMutation.mutate(data);
  };

  // Export Data
  const exportData = async () => {
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `money-tracker-export-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Data berhasil diekspor");
      }
    } catch {
      toast.error("Gagal mengekspor data");
    }
  };

  // Delete Account Dialog
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "HAPUS") {
      toast.error("Ketik 'HAPUS' untuk konfirmasi");
      return;
    }

    try {
      // Delete all user data first
      await supabase.from("transactions").delete().eq("user_id", user.id);
      await supabase.from("categories").delete().eq("user_id", user.id);
      await supabase.from("budgets").delete().eq("user_id", user.id);
      await supabase.from("accounts").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.admin.deleteUser(user.id); // Requires service role key
      
      await supabase.auth.signOut();
      router.push(`/${locale}/auth/login`);
      router.refresh();
    } catch {
      toast.error("Gagal menghapus akun");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">{t("profile.title")}</TabsTrigger>
          <TabsTrigger value="preferences">{t("preferences.title")}</TabsTrigger>
          <TabsTrigger value="security">{t("security.title")}</TabsTrigger>
          <TabsTrigger value="data">{t("data.title")}</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.title")}</CardTitle>
              <CardDescription>{t("profile.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview || "/avatar.png"} alt={profile?.full_name || "User"} />
                    <AvatarFallback className="text-2xl">
                      {profile?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label>{t("profile.avatarLabel")}</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => setAvatarPreview(e.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">PNG/JPG, max 2MB</p>
                  </div>
                </div>

                <Separator />

                {/* Name */}
                <div>
                  <Label htmlFor="full_name">{t("profile.nameLabel")}</Label>
                  <Input
                    {...profileForm.register("full_name")}
                    id="full_name"
                    placeholder={t("profile.namePlaceholder")}
                    error={profileForm.formState.errors.full_name?.message}
                  />
                  {profileForm.formState.errors.full_name && (
                    <p className="mt-1 text-sm text-destructive">{profileForm.formState.errors.full_name.message}</p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <Label htmlFor="email">{t("profile.emailLabel")}</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Email tidak dapat diubah. Hubungi support untuk mengubah email.
                  </p>
                </div>

                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? "Menyimpan..." : t("profile.save")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("preferences.title")}</CardTitle>
              <CardDescription>{t("preferences.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)} className="space-y-4">
                {/* Language */}
                <div>
                  <Label>{t("preferences.languageLabel")}</Label>
                  <Select
                    value={preferencesForm.watch("locale")}
                    onValueChange={(value) => preferencesForm.setValue("locale", value as any)}
                  >
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder={t("preferences.languageLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          <span className="flex items-center gap-2">
                            <span>{l.flag}</span>
                            <span>{l.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency */}
                <div>
                  <Label htmlFor="currency">{t("preferences.currencyLabel")}</Label>
                  <Select
                    value={preferencesForm.watch("currency")}
                    onValueChange={(value) => preferencesForm.setValue("currency", value)}
                  >
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder={t("preferences.currencyLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme */}
                <div>
                  <Label>{t("preferences.themeLabel")}</Label>
                  <Select
                    value={preferencesForm.watch("theme")}
                    onValueChange={(value) => preferencesForm.setValue("theme", value as any)}
                  >
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder={t("preferences.themeLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <Sun className="mr-2 h-4 w-4" />
                        {t("preferences.themeLight")}
                      </SelectItem>
                      <SelectItem value="dark">
                        <Moon className="mr-2 h-4 w-4" />
                        {t("preferences.themeDark")}
                      </SelectItem>
                      <SelectItem value="system">
                        <Monitor className="mr-2 h-4 w-4" />
                        {t("preferences.themeSystem")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={preferencesMutation.isPending}>
                  {preferencesMutation.isPending ? "Menyimpan..." : t("preferences.save")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("security.title")}</CardTitle>
              <CardDescription>{t("security.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                {/* Current Password */}
                <div>
                  <Label htmlFor="current_password">{t("security.currentPasswordLabel")}</Label>
                  <Input
                    {...passwordForm.register("current_password")}
                    id="current_password"
                    type="password"
                    placeholder={t("security.currentPasswordLabel")}
                    error={passwordForm.formState.errors.current_password?.message}
                    className="mt-1.5"
                  />
                  {passwordForm.formState.errors.current_password && (
                    <p className="mt-1 text-sm text-destructive">{passwordForm.formState.errors.current_password.message}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <Label htmlFor="new_password">{t("security.newPasswordLabel")}</Label>
                  <Input
                    {...passwordForm.register("new_password")}
                    id="new_password"
                    type="password"
                    placeholder={t("security.newPasswordLabel")}
                    error={passwordForm.formState.errors.new_password?.message}
                    className="mt-1.5"
                  />
                  {passwordForm.formState.errors.new_password && (
                    <p className="mt-1 text-sm text-destructive">{passwordForm.formState.errors.new_password.message}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Minimal 8 karakter, huruf besar, huruf kecil, angka, simbol
                  </p>
                </div>

                {/* Confirm New Password */}
                <div>
                  <Label htmlFor="confirm_password">{t("security.confirmNewPasswordLabel")}</Label>
                  <Input
                    {...passwordForm.register("confirm_password")}
                    id="confirm_password"
                    type="password"
                    placeholder={t("security.confirmNewPasswordLabel")}
                    error={passwordForm.formState.errors.confirm_password?.message}
                    className="mt-1.5"
                  />
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="mt-1 text-sm text-destructive">{passwordForm.formState.errors.confirm_password.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Mengupdate..." : t("security.update")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("data.exportTitle")}</CardTitle>
              <CardDescription>{t("data.exportDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={exportData} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {t("data.exportButton")}
              </Button>
              <p className="text-sm text-muted-foreground">
                Ekspor semua transaksi, kategori, budget, dan akun ke file CSV.
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t("dangerZone.title")}
              </CardTitle>
              <CardDescription>{t("dangerZone.deleteAccountDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="delete_confirm">{t("dangerZone.confirmDelete")}</Label>
                <Input
                  id="delete_confirm"
                  type="text"
                  placeholder="HAPUS"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="mt-1.5 font-mono"
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== "HAPUS"}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("dangerZone.deleteAccountButton")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("dangerZone.deleteAccountTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("dangerZone.deleteAccountDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{ct("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirm !== "HAPUS"}>
                      {t("dangerZone.deleteAccountButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}