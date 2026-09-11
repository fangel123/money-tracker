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
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
        classNames: {
          success: "bg-green-500 text-white",
          error: "bg-red-500 text-white",
          warning: "bg-amber-500 text-white",
          info: "bg-blue-500 text-white",
        },
      }}
    />
  );
}