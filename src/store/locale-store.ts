import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Locale = "id" | "en" | "zh" | "ja" | "ko";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "id",
      setLocale: (locale: Locale) => {
        set({ locale });
        // Update document lang attribute
        if (typeof window !== "undefined") {
          document.documentElement.lang = locale;
        }
      },
    }),
    {
      name: "money-tracker-locale",
      storage: createJSONStorage(() => localStorage),
    }
  )
);