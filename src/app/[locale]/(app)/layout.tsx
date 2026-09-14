import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav, BottomFAB } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — hidden on mobile (handled by BottomNav), sticky on desktop */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Page content — scrollable */}
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            <div className="p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav & FAB */}
      <BottomNav />
      <BottomFAB />
    </div>
  );
}