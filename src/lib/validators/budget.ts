import { z } from "zod";

export const budgetSchema = z.object({
  category_id: z.string().uuid("Kategori tidak valid"),
  amount: z.coerce.number().positive("Jumlah budget harus lebih dari 0"),
  period: z.enum(["weekly", "monthly", "yearly"]),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), "Tanggal mulai tidak valid"),
  end_date: z.string().optional(),
  alert_threshold: z.coerce.number().min(0).max(1).default(0.8),
});

export type BudgetFormData = z.infer<typeof budgetSchema>;

export const budgetFilterSchema = z.object({
  period: z.enum(["weekly", "monthly", "yearly", "all"]).default("all"),
  category_id: z.string().uuid().optional(),
});