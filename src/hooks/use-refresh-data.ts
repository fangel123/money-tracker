"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

/**
 * Panggil setelah menambah/mengubah/menghapus data.
 * router.refresh() saja hanya memperbarui data dari server component; daftar yang dibaca
 * lewat TanStack Query tetap memakai cache lama (staleTime 2 menit) sampai halaman di-reload.
 * Transaksi memengaruhi saldo akun, budget, goals, statistik, dan pengingat, jadi semua
 * query ditandai basi sekaligus.
 */
export function useRefreshData() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(() => {
    queryClient.invalidateQueries();
    router.refresh();
  }, [queryClient, router]);
}
