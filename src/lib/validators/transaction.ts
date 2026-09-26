import { z } from "zod";

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.coerce.number().positive("Jumlah harus lebih dari 0").max(999999999999, "Jumlah terlalu besar"),
    category_id: z.string().uuid("Kategori tidak valid").nullish(),
    account_id: z.string().uuid("Akun tidak valid"),
    to_account_id: z.string().uuid("Akun tujuan tidak valid").nullish(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), "Tanggal tidak valid"),
    note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
    is_recurring: z.boolean().default(false),
    recurring_rule: z
      .object({
        frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
        interval: z.number().int().positive().default(1),
        end_date: z.string().optional(),
      })
      .nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.to_account_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to_account_id"], message: "Akun tujuan wajib dipilih" });
      } else if (data.to_account_id === data.account_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to_account_id"], message: "Akun tujuan harus berbeda dari akun asal" });
      }
    } else if (!data.category_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["category_id"], message: "Kategori wajib dipilih" });
    }
  });

export type TransactionFormData = z.infer<typeof transactionSchema>;

export const transactionFilterSchema = z.object({
  type: z.enum(["income", "expense", "all"]).default("all"),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["date", "amount", "created_at"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type TransactionFilters = z.infer<typeof transactionFilterSchema>;