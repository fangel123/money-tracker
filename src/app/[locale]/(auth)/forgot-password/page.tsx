"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth.forgotPassword");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
      });

      if (error) {
        setFormError("root", { message: t("error") });
        return;
      }

      setSuccess(true);
    } catch {
      setFormError("root", { message: "Gagal mengirim link reset" });
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

      {success ? (
        <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500" role="alert">
          {t("success")}
        </div>
      ) : (
        <>
          {/* Error message */}
          {errors.root && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {errors.root.message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  className="pl-10"
                  error={errors.email?.message}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Mengirim..." : t("submit")}
            </Button>
          </form>
        </>
      )}

      {/* Back to login */}
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}