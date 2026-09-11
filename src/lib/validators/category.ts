import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50, "Nama maksimal 50 karakter"),
  type: z.enum(["income", "expense"]),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format warna tidak valid (hex)").optional(),
  parent_id: z.string().uuid().optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const categoryFilterSchema = z.object({
  type: z.enum(["income", "expense", "all"]).default("all"),
  is_active: z.boolean().optional(),
});