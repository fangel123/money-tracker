import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav, BottomFAB } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="relative min-h-screen bg-background font-sans antialiased">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className={cn("lg:pl-64", "transition-all duration-200")}>
          {/* Header */}
          <Header />

          {/* Page content */}
          <main className="pb-20 lg:pb-0 min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4rem)]">
            <div className="p-4 lg:p-6">{children}</div>
          </main>
        </div>

        {/* Mobile bottom nav & FAB */}
        <BottomNav />
        <BottomFAB />
      </div>
    </Providers>
  );
}