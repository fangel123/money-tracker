import { z } from "zod";

export const debtSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(50, "Nama maksimal 50 karakter"),
  type: z.enum(["payable", "receivable"]),
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  due_date: z.string().optional().or(z.literal("")),
});

export type DebtFormData = z.infer<typeof debtSchema>;

export const debtPaymentSchema = z.object({
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
});

export type DebtPaymentData = z.infer<typeof debtPaymentSchema>;
