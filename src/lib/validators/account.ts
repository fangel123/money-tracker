import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Nama akun wajib diisi").max(50, "Nama maksimal 50 karakter"),
  type: z.enum(["cash", "bank", "ewallet", "credit_card", "investment", "other"]),
  currency: z.string().length(3, "Kode mata uang 3 karakter").default("IDR"),
  balance: z.coerce.number().default(0),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format warna tidak valid (hex)").optional(),
});

export type AccountFormData = z.infer<typeof accountSchema>;

export const accountFilterSchema = z.object({
  type: z.enum(["cash", "bank", "ewallet", "credit_card", "investment", "other", "all"]).default("all"),
  is_active: z.boolean().optional(),
});