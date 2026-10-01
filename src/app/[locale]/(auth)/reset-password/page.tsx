"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type LinkStatus = "verifying" | "valid" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth.resetPassword");
  const [status, setStatus] = useState<LinkStatus>("verifying");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Link dari email membawa ?code=... (PKCE) atau #access_token=... (implicit).
  // Browser client otomatis menukarnya jadi sesi saat inisialisasi;
  // getSession() menunggu proses itu selesai.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setStatus("valid");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setStatus((prev) => (prev === "valid" || session ? "valid" : "invalid"));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: data.password });

      if (error) {
        setFormError("root", { message: t("error") });
        return;
      }

      setSuccess(true);
      router.refresh();
      router.push("/dashboard");
    } catch {
      setFormError("root", { message: t("error") });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {status === "verifying" && (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {t("verifying")}
        </p>
      )}

      {status === "invalid" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {t("invalidLink")}
          </div>
          <Button asChild className="w-full" size="lg">
            <Link href="/forgot-password">{t("requestNewLink")}</Link>
          </Button>
        </div>
      )}

      {status === "valid" && success && (
        <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500" role="alert">
          {t("success")}
        </div>
      )}

      {status === "valid" && !success && (
        <>
          {/* Error message */}
          {errors.root && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {errors.root.message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* New Password */}
            <div>
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm_password">{t("confirmLabel")}</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  {...register("confirm_password")}
                  id="confirm_password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? t("submitting") : t("submit")}
            </Button>
          </form>
        </>
      )}

      {/* Back to login */}
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
