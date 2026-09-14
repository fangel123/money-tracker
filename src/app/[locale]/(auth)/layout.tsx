import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-background px-4", "lg:px-64")}>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}