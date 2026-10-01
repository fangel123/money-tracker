"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Check, AlertCircle, Sparkles, RotateCcw } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cn, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Mascot } from "@/components/common/Mascot";
import { Sticker } from "@/components/common/Sticker";
import { CategorySticker } from "@/components/common/CategorySticker";
import type { Account, Category } from "@/types/domain";
import { SCAN_PREFIX, type RecentScan } from "@/lib/scan";

interface ScanForm {
  note: string;
  date: string;
  amount: string;
  categoryId: string;
  accountId: string;
}

interface ScannerContentProps {
  userId: string;
  categories: Category[];
  accounts: Account[];
  recentScans: RecentScan[];
}

const today = () => new Date().toISOString().split("T")[0];

export function ScannerContent({ userId, categories, accounts, recentScans }: ScannerContentProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ScanForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setImage(null);
    setForm(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setImage(data);
      processImage(data);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setIsLoading(true);
    setError(null);
    setForm(null);

    try {
      const res = await fetch("/api/ai/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image, categories: expenseCategories.map((c) => c.name) }),
      });
      if (!res.ok) throw new Error("Gagal membaca struk");

      const parsed: { amount?: number; note?: string; date?: string; category?: string } = await res.json();
      if (!parsed.amount) throw new Error("Nominal total tidak ditemukan di struk ini");

      const guessed = expenseCategories.find((c) => c.name.toLowerCase() === parsed.category?.toLowerCase());
      setForm({
        note: parsed.note || "Dari Scanner Struk",
        date: parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today(),
        amount: String(Math.round(parsed.amount)),
        categoryId: guessed?.id ?? expenseCategories[0]?.id ?? "",
        accountId: accounts[0]?.id ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveTransaction = async () => {
    if (!form) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return setError("Total harus lebih dari 0");
    if (!form.accountId) return setError("Pilih akun dulu");

    setIsSaving(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: userId,
        amount,
        type: "expense",
        category_id: form.categoryId || null,
        account_id: form.accountId,
        note: `${SCAN_PREFIX}${form.note.replace(/^\(Scan\)\s*/, "")}`,
        date: form.date,
      });
      if (insertError) throw insertError;

      router.push("/transactions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan transaksi");
      setIsSaving(false);
    }
  };

  const update = (patch: Partial<ScanForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Scanner Struk" description="Foto struk jadi transaksi" />

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileChange} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Drop zone / preview */}
        {!image ? (
          <div className="relative flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-[28px] border-3 border-dashed border-line bg-card px-6 py-10 text-center lg:min-h-[600px]">
            {[
              "left-4 top-4 border-l-[6px] border-t-[6px] rounded-tl-2xl",
              "right-4 top-4 border-r-[6px] border-t-[6px] rounded-tr-2xl",
              "bottom-4 left-4 border-b-[6px] border-l-[6px] rounded-bl-2xl",
              "bottom-4 right-4 border-b-[6px] border-r-[6px] rounded-br-2xl",
            ].map((pos) => (
              <span key={pos} className={`absolute h-11 w-11 border-cartoon-lime ${pos}`} aria-hidden="true" />
            ))}
            <Mascot size={130} className="-rotate-6 lg:h-[140px] lg:w-[140px]" />
            <div>
              <h3 className="font-display text-2xl font-bold lg:text-[28px]">Foto struk belanjamu</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-sm font-bold text-muted-foreground lg:text-[15px]">
                JPG atau PNG · Koin akan baca toko, tanggal, total, dan kategorinya
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => fileInputRef.current?.click()} size="lg">
                <Upload className="mr-2 h-5 w-5" strokeWidth={2.5} /> Pilih File
              </Button>
              <Button onClick={() => cameraInputRef.current?.click()} size="lg" variant="outline">
                <Camera className="mr-2 h-5 w-5" strokeWidth={2.5} /> Pakai Kamera
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative flex aspect-[3/4] max-h-[640px] w-full items-center justify-center overflow-hidden rounded-cartoon border-3 border-line bg-ink shadow-cartoon">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
            <img src={image} alt="Struk" className="max-h-full max-w-full object-contain" />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/70 text-cream backdrop-blur-sm">
                <Mascot size={80} className="mb-3 animate-bounce" />
                <p className="font-display text-lg font-semibold">Koin sedang membaca struk...</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-5">
        {/* Result */}
        <section className="flex flex-col gap-4 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
          <div className="flex items-center gap-2.5">
            <Sticker color="#c9b6ff" tilt={-4}>
              <Sparkles />
            </Sticker>
            <h2 className="font-display text-xl font-semibold">Hasil bacaan AI</h2>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border-2.5 border-destructive bg-destructive/10 p-3.5 font-bold text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!form ? (
            <p className="text-sm font-bold text-muted-foreground">
              {isLoading
                ? "Sebentar ya, Koin lagi membaca strukmu…"
                : "Belum ada struk. Setelah dipindai, hasilnya muncul di sini dan bisa kamu cek dulu sebelum disimpan."}
            </p>
          ) : (
            <>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="scan-note" className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">Toko / catatan</Label>
                  <Input id="scan-note" className="mt-1.5" value={form.note} onChange={(e) => update({ note: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="scan-date" className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">Tanggal</Label>
                  <Input id="scan-date" type="date" className="mt-1.5" value={form.date} onChange={(e) => update({ date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="scan-amount" className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">Total (Rp)</Label>
                  <Input
                    id="scan-amount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    className="mt-1.5 font-black"
                    value={form.amount}
                    onChange={(e) => update({ amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">Kategori</Label>
                  <Select value={form.categoryId} onValueChange={(v) => update({ categoryId: v })}>
                    <SelectTrigger className="mt-1.5 w-full" aria-label="Kategori">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">Akun</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={form.accountId === a.id}
                      onClick={() => update({ accountId: a.id })}
                      className={cn(
                        "h-9 rounded-full border-2.5 px-4 text-sm font-black transition-colors",
                        form.accountId === a.id ? "border-ink bg-cartoon-sky text-ink shadow-cartoon-sm" : "border-line bg-background hover:bg-accent"
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button className="flex-1" size="lg" onClick={saveTransaction} disabled={isSaving}>
                  <Check className="mr-2 h-5 w-5" strokeWidth={3} />
                  {isSaving ? "Menyimpan…" : "Simpan sebagai transaksi"}
                </Button>
                <Button variant="outline" size="lg" onClick={reset} disabled={isSaving} aria-label="Ulang">
                  <RotateCcw className="h-5 w-5 sm:mr-2" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Ulang</span>
                </Button>
              </div>
            </>
          )}

          {image && !form && !isLoading && (
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" strokeWidth={2.5} /> Coba struk lain
            </Button>
          )}
        </section>

        {/* Riwayat scan */}
        <section className="flex flex-col gap-3 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
          <h2 className="font-display text-xl font-semibold">Scan sebelumnya</h2>
          {recentScans.length === 0 ? (
            <p className="text-sm font-bold text-muted-foreground">Belum ada struk yang disimpan dari scanner.</p>
          ) : (
            <ul>
              {recentScans.map((scan) => (
                <li key={scan.id} className="flex items-center gap-2.5 border-b-2 border-dashed border-divider py-2.5 last:border-0">
                  <CategorySticker category={scan.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{(scan.note || "").replace(SCAN_PREFIX, "") || "Struk"}</p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {new Date(scan.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      {scan.category?.name && ` · ${scan.category.name}`}
                    </p>
                  </div>
                  <span className="text-sm font-black">{formatCurrency(Number(scan.amount))}</span>
                  <span className="hidden rounded-full border-2 border-ink bg-cartoon-mint px-2 py-0.5 text-[11px] font-black text-ink sm:inline">
                    Tersimpan
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}
