"use client";

import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { Toaster } from "./Toaster";
import { PwaRegister } from "./PwaRegister";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
        <Toaster />
        <PwaRegister />
      </ThemeProvider>
    </QueryProvider>
  );
}