import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().min(1, "Nama target wajib diisi").max(50, "Nama maksimal 50 karakter"),
  target_amount: z.coerce.number().positive("Target harus lebih dari 0"),
  current_amount: z.coerce.number().min(0, "Tidak boleh negatif").default(0),
  deadline: z.string().optional().or(z.literal("")),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type GoalFormData = z.infer<typeof goalSchema>;

export const goalContributionSchema = z.object({
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
});

export type GoalContributionData = z.infer<typeof goalContributionSchema>;
