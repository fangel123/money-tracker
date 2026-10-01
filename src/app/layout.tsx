import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Koin - Catat. Kelola. Tumbuh.",
  description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
  keywords: ["finance", "money tracker", "expense tracker", "budget", "personal finance"],
  authors: [{ name: "Koin" }],
  creator: "Koin",
  publisher: "Koin",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://moneytracker.app",
    title: "Koin - Catat. Kelola. Tumbuh.",
    description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
    siteName: "Koin",
  },
  twitter: {
    card: "summary_large_image",
    title: "Koin",
    description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icon-192.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff4de" },
    { media: "(prefers-color-scheme: dark)", color: "#15121d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${nunito.variable} ${fredoka.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}