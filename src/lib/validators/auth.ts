import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
  avatar_url: z.string().url("URL tidak valid").optional().or(z.literal("")),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const preferencesSchema = z.object({
  locale: z.enum(["id", "en", "zh", "ja", "ko"]).default("id"),
  currency: z.string().length(3).default("IDR"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
});

export type PreferencesFormData = z.infer<typeof preferencesSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Kata sandi saat ini wajib diisi"),
    new_password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .regex(/[A-Z]/, "Harus ada huruf besar")
      .regex(/[a-z]/, "Harus ada huruf kecil")
      .regex(/[0-9]/, "Harus ada angka")
      .regex(/[^A-Za-z0-9]/, "Harus ada simbol"),
    confirm_password: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Kata sandi tidak cocok",
    path: ["confirm_password"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  remember: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .regex(/[A-Z]/, "Harus ada huruf besar")
      .regex(/[a-z]/, "Harus ada huruf kecil")
      .regex(/[0-9]/, "Harus ada angka")
      .regex(/[^A-Za-z0-9]/, "Harus ada simbol"),
    confirm_password: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Kata sandi tidak cocok",
    path: ["confirm_password"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;