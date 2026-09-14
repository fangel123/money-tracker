"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
          },
        },
      });

      if (authError) {
        setFormError("root", { message: authError.message || "Gagal mendaftar. Silakan coba lagi." });
        return;
      }

      router.push("/auth/login?registered=true");
      router.refresh();
    } catch {
      setFormError("root", { message: "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Buat Akun Baru</h1>
        <p className="text-muted-foreground">Mulai kelola keuangan Anda hari ini</p>
      </div>

      {/* Error message */}
      {errors.root && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {errors.root.message}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Name */}
        <div>
          <Label htmlFor="full_name">Nama Lengkap</Label>
          <div className="relative mt-1.5">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register("full_name")}
              id="full_name"
              type="text"
              placeholder="Nama Anda"
              className="pl-10"
              disabled={isLoading}
              autoComplete="name"
            />
          </div>
          {errors.full_name && <p className="mt-1 text-sm text-destructive">{errors.full_name.message}</p>}
        </div>

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
          <Label htmlFor="password">Kata Sandi</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              className="pl-10 pr-10"
              disabled={isLoading}
              autoComplete="new-password"
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

        {/* Confirm Password */}
        <div>
          <Label htmlFor="confirm_password">Konfirmasi Kata Sandi</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register("confirm_password")}
              id="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Ulangi kata sandi"
              className="pl-10 pr-10"
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirm_password && <p className="mt-1 text-sm text-destructive">{errors.confirm_password.message}</p>}
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? "Memuat..." : "Daftar"}
        </Button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}