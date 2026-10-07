"use client";

import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTALL_PROMPT_EVENT } from "@/components/providers/PwaRegister";

type Mode = "installed" | "prompt" | "ios" | "manual";

/** Kartu "Pasang Koin di HP" di Pengaturan — tombol instal (Android/Chrome) atau panduan (iPhone). */
export function InstallCard({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("manual");

  useEffect(() => {
    const update = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setMode(standalone ? "installed" : window.__koinInstallPrompt ? "prompt" : ios ? "ios" : "manual");
    };
    update();
    window.addEventListener(INSTALL_PROMPT_EVENT, update);
    return () => window.removeEventListener(INSTALL_PROMPT_EVENT, update);
  }, []);

  const install = async () => {
    const prompt = window.__koinInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    window.__koinInstallPrompt = null;
    window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
  };

  return (
    <section className={className}>
      <h2 className="font-display text-xl font-semibold">Pasang Koin di HP</h2>
      {mode === "installed" ? (
        <p className="mt-2 flex items-center gap-2 text-sm font-bold text-income">
          <CheckCircle2 className="h-4 w-4" strokeWidth={3} /> Koin sudah terpasang di perangkat ini.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13px] font-bold text-muted-foreground">
            Buka Koin dari layar utama seperti aplikasi biasa — layar penuh, lebih cepat, dan ada pintasan Catat cepat.
          </p>
          {mode === "prompt" && (
            <Button onClick={install} className="mt-3">
              <Download className="mr-2 h-4 w-4" strokeWidth={3} /> Pasang Koin
            </Button>
          )}
          {mode === "ios" && (
            <ol className="mt-3 space-y-1.5 text-sm font-bold">
              <li className="flex items-center gap-2">
                1. Buka di Safari, ketuk <Share className="h-4 w-4" strokeWidth={2.5} aria-label="Bagikan" />
              </li>
              <li className="flex items-center gap-2">
                2. Pilih <PlusSquare className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> “Tambahkan ke Layar Utama”
              </li>
            </ol>
          )}
          {mode === "manual" && (
            <p className="mt-3 text-sm font-bold">
              Di Chrome HP: buka menu ⋮ lalu pilih <span className="font-black">“Instal aplikasi”</span> atau{" "}
              <span className="font-black">“Tambahkan ke layar utama”</span>.
            </p>
          )}
        </>
      )}
    </section>
  );
}
