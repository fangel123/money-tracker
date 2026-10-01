import { Mascot } from "@/components/common/Mascot";

/** Langsung tampil saat pindah halaman, selagi server mengambil data. */
export default function AppLoading() {
  return (
    <div className="space-y-5 pb-4" role="status" aria-label="Memuat">
      <div className="flex items-center gap-3">
        <Mascot size={44} className="animate-bounce" />
        <span className="text-sm font-black text-muted-foreground">Sebentar ya, Koin lagi ngambil datamu…</span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-cartoon border-3 border-line bg-card shadow-cartoon lg:h-36" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="h-72 animate-pulse rounded-cartoon border-3 border-line bg-card shadow-cartoon" />
        <div className="h-72 animate-pulse rounded-cartoon border-3 border-line bg-card shadow-cartoon" />
      </div>
    </div>
  );
}
