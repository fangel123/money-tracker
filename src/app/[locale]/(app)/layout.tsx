import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-hidden bg-background font-sans antialiased">
      <div className="flex h-full overflow-hidden lg:gap-6 lg:p-6">
        {/* Sidebar — drawer on mobile, floating card on desktop */}
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:gap-5">
          <Header />

          {/* Page content — scrollable */}
          <main className="flex-1 overflow-y-auto pb-32 lg:-mx-2 lg:-mb-2 lg:pb-2">
            <div className="p-4 pt-1 lg:px-2 lg:pt-0">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
