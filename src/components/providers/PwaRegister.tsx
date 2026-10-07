"use client";

import { useEffect } from "react";

/** Event "beforeinstallprompt" (Chrome/Android) — belum ada di tipe DOM standar. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __koinInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export const INSTALL_PROMPT_EVENT = "koin:install-prompt";

/**
 * Daftarkan service worker (hanya di production, supaya dev tidak tersangkut cache) dan
 * simpan event "beforeinstallprompt" — event ini hanya muncul sekali di awal, jadi ditangkap
 * di sini lalu dipakai tombol "Pasang Koin" di Pengaturan.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // gagal daftar tidak boleh mengganggu aplikasi
      });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__koinInstallPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
    };
    const onInstalled = () => {
      window.__koinInstallPrompt = null;
      window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
