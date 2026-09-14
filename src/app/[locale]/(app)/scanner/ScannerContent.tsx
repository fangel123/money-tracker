"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { formatCurrency } from "@/lib/utils";

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
    <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-card rounded-[2rem] border border-border/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h2 className="font-bold">Scanner Struk AI</h2>
          <p className="text-xs text-muted-foreground">Otomatis ekstrak total belanja</p>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
        
        {!image ? (
          <div className="text-center space-y-6">
            <div className="mx-auto h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Scan Struk Belanja</h3>
              <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mt-2">
                Foto struk kamu dan AI akan mencari nominal yang harus dicatat.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => fileInputRef.current?.click()} className="rounded-full" size="lg">
                <Camera className="mr-2 h-5 w-5" /> Ambil Foto / Galeri
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
          <div className="w-full max-w-sm space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-black aspect-[3/4] flex items-center justify-center">
              <img src={image} alt="Struk" className="max-h-full max-w-full object-contain opacity-80" />
              
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="font-medium animate-pulse">AI sedang membaca struk...</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {result && !isLoading && (
              <div className="bg-secondary p-5 rounded-2xl space-y-4 border border-border/50">
                <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Berhasil Terbaca!
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Ditemukan</p>
                  <p className="text-3xl font-black text-foreground mt-1">
                    {formatCurrency(result.amount)}
                  </p>
                </div>
                
                {result.note && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Ringkasan</p>
                    <p className="text-sm font-medium mt-1">{result.note}</p>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => {setImage(null); setResult(null)}}>
                    Ulangi
                  </Button>
                  <Button className="flex-1 rounded-full" onClick={saveTransaction}>
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
