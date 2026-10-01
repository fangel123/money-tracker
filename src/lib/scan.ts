import type { Category } from "@/types/domain";

/** Transaksi yang disimpan dari Scanner Struk ditandai dengan awalan catatan ini. */
export const SCAN_PREFIX = "(Scan) ";

export interface RecentScan {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  category: Pick<Category, "name" | "color" | "icon"> | null;
}
