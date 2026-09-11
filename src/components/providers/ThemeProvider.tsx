"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme, initialize } = useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  return <>{children}</>;
}