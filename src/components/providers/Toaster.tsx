"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useUIStore } from "@/store";

export function Toaster() {
  const toasts = useUIStore((state) => state.toasts);

  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: "rgb(var(--card))",
          color: "rgb(var(--foreground))",
          border: "3px solid rgb(var(--line))",
          borderRadius: "18px",
          boxShadow: "4px 4px 0 rgb(var(--line))",
          fontFamily: "var(--font-nunito)",
          fontWeight: 800,
        },
        // Warna kartun dengan teks tinta supaya tetap terbaca di mode terang & gelap
        classNames: {
          success: "!bg-cartoon-mint !text-ink",
          error: "!bg-cartoon-red !text-ink",
          warning: "!bg-cartoon-yellow !text-ink",
          info: "!bg-cartoon-sky !text-ink",
        },
      }}
    />
  );
}