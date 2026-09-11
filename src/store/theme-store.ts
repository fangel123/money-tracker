import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  setResolvedTheme: (resolved: "light" | "dark") => void;
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      resolvedTheme: "light",

      setTheme: (theme: Theme) => {
        set({ theme });
        // Apply to document
        if (typeof window !== "undefined") {
          const resolved = theme === "system" 
            ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
            : theme;
          document.documentElement.classList.toggle("dark", resolved === "dark");
          set({ resolvedTheme: resolved });
        }
      },

      setResolvedTheme: (resolved: "light" | "dark") => {
        set({ resolvedTheme: resolved });
        if (typeof window !== "undefined") {
          document.documentElement.classList.toggle("dark", resolved === "dark");
        }
      },

      initialize: () => {
        if (typeof window === "undefined") return;
        const { theme } = get();
        const resolved = theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          : theme;
        document.documentElement.classList.toggle("dark", resolved === "dark");
        set({ resolvedTheme: resolved });

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
          const { theme } = get();
          if (theme === "system") {
            const resolved = mediaQuery.matches ? "dark" : "light";
            document.documentElement.classList.toggle("dark", resolved === "dark");
            set({ resolvedTheme: resolved });
          }
        };
        mediaQuery.addEventListener("change", handleChange);
        // Cleanup would be needed in a real app
      },
    }),
    {
      name: "money-tracker-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);