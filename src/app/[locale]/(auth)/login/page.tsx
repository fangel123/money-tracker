"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      remember: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        setFormError("root", { message: "Email atau kata sandi salah" });
        setIsLoading(false);
        return;
      }

      // Berhasil login, refresh router untuk memastikan cookies terbaru terbaca
      router.refresh();
      // Pindah ke dashboard
      router.push("/dashboard");
    } catch {
      setFormError("root", { message: "Terjadi kesalahan. Silakan coba lagi." });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Masuk ke Akun Anda</h1>
        <p className="text-muted-foreground">Masuk untuk melanjutkan ke Money Tracker</p>
      </div>

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
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register("email")}
              id="email"
              type="email"
              placeholder="anda@email.com"
              className="pl-10"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Kata Sandi</Label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan kata sandi"
              className="pl-10 pr-10"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("remember")}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">Ingat saya</span>
          </label>
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? "Memuat..." : "Masuk"}
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/auth/register" className="text-primary font-medium hover:underline">
          Daftar di sini
        </Link>
      </p>
    </div>
  );
}