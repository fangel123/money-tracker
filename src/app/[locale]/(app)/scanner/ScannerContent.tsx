"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Mascot } from "@/components/common/Mascot";

export function ScannerContent({ user, categories, accounts }: { user: any; categories: any[]; accounts: any[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      processImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image })
      });

      if (!res.ok) throw new Error("Gagal membaca struk");

      const parsedData = await res.json();
      
      if (parsedData.amount) {
        setResult(parsedData);
      } else {
        throw new Error("Nominal total tidak ditemukan di struk ini");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveTransaction = async () => {
    if (!result || !result.amount) return;
    setIsLoading(true);
    
    try {
      const finalAccount = accounts[0];
      const finalCategory = categories.find(c => c.type === "expense") || categories[0];

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount: result.amount,
        type: "expense", // Struk biasanya pengeluaran
        category_id: finalCategory?.id,
        account_id: finalAccount?.id,
        note: result.note || "Dari Scanner Struk",
        date: new Date().toISOString()
      });

      if (error) throw error;
      
      router.push("/transactions");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Scanner Struk" description="Foto struk, Koin yang baca totalnya" />

      <div className="flex flex-col items-center justify-center">
        
        {!image ? (
          <div className="relative flex min-h-[420px] w-full flex-col items-center justify-center gap-4 rounded-[28px] border-3 border-dashed border-line bg-card px-6 py-10 text-center lg:min-h-[560px]">
            {[
              "left-4 top-4 border-l-[6px] border-t-[6px] rounded-tl-2xl",
              "right-4 top-4 border-r-[6px] border-t-[6px] rounded-tr-2xl",
              "bottom-4 left-4 border-b-[6px] border-l-[6px] rounded-bl-2xl",
              "bottom-4 right-4 border-b-[6px] border-r-[6px] rounded-br-2xl",
            ].map((pos) => (
              <span key={pos} className={`absolute h-11 w-11 border-cartoon-lime ${pos}`} aria-hidden="true" />
            ))}
            <Mascot size={130} className="-rotate-6" />
            <div>
              <h3 className="font-display text-2xl font-bold lg:text-[28px]">Arahkan kamera ke struk</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm font-bold text-muted-foreground">
                Foto struk kamu dan AI akan mencari nominal yang harus dicatat.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Button onClick={() => fileInputRef.current?.click()} size="lg">
                <Camera className="mr-2 h-5 w-5" strokeWidth={2.5} /> Ambil Foto / Galeri
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                // capture="environment" // Bisa di-uncomment jika ingin otomatis buka kamera di HP
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <div className="grid w-full items-start gap-5 md:grid-cols-2">
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-cartoon border-3 border-line bg-ink shadow-cartoon">
              <img src={image} alt="Struk" className="max-h-full max-w-full object-contain opacity-80" />
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/70 text-cream backdrop-blur-sm">
                  <Mascot size={80} className="mb-3 animate-bounce" />
                  <p className="font-display text-lg font-semibold">Koin sedang membaca struk...</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border-2.5 border-destructive bg-destructive/10 p-4 font-bold text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {result && !isLoading && (
              <div className="space-y-4 rounded-cartoon border-3 border-line bg-cartoon-mint p-5 text-ink shadow-cartoon">
                <div className="flex items-center gap-2 font-display text-lg font-semibold">
                  <CheckCircle2 className="h-5 w-5" strokeWidth={3} />
                  Berhasil Terbaca!
                </div>
                
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Total Ditemukan</p>
                  <p className="mt-1 font-display text-4xl font-bold">
                    {formatCurrency(result.amount)}
                  </p>
                </div>
                
                {result.note && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Ringkasan</p>
                    <p className="mt-1 text-sm font-bold">{result.note}</p>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => {setImage(null); setResult(null)}}>
                    Ulangi
                  </Button>
                  <Button className="flex-1" onClick={saveTransaction}>
                    Simpan
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
