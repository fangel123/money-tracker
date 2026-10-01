import { ReactNode } from "react";
import { ArrowRightLeft, Target, ScanLine, MessageSquare } from "lucide-react";
import { Mascot } from "@/components/common/Mascot";
import { Sticker } from "@/components/common/Sticker";

const FEATURES = [
  { icon: ArrowRightLeft, color: "#ffffff", text: "Catat transaksi dalam 3 ketukan" },
  { icon: Target, color: "#ffd447", text: "Budget yang ngingetin sebelum jebol" },
  { icon: ScanLine, color: "#8fd3ff", text: "Foto struk, langsung jadi transaksi" },
  { icon: MessageSquare, color: "#ff9ebb", text: "Tanya Koin soal keuanganmu" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background p-4 sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:p-8">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden flex-col justify-center gap-6 overflow-hidden rounded-[36px] border-3 border-line bg-cartoon-lime p-14 text-ink shadow-[8px_8px_0_0_rgb(var(--line))] lg:flex">
        <Mascot size={200} className="absolute right-10 top-10 rotate-[10deg]" />
        <h1 className="font-display text-[120px] font-bold leading-[0.9]">Koin</h1>
        <p className="font-display text-[26px] font-semibold">Catat. Kelola. Tumbuh.</p>
        <ul className="flex flex-col gap-3.5">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3.5 text-[17px] font-black">
              <Sticker color={f.color} size="md" tilt={-4}>
                <f.icon />
              </Sticker>
              {f.text}
            </li>
          ))}
        </ul>
      </aside>

      {/* Form column */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="mb-6 flex flex-col items-center gap-1 lg:hidden">
          <Mascot size={120} className="-rotate-6" />
          <span className="font-display text-5xl font-bold leading-none">Koin</span>
          <span className="text-sm font-extrabold text-muted-foreground">Catat. Kelola. Tumbuh.</span>
        </div>
        <div className="w-full max-w-[460px] rounded-cartoon border-3 border-line bg-card p-6 shadow-cartoon sm:p-9">
          {children}
        </div>
      </div>
    </div>
  );
}
