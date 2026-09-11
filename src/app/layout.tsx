import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Money Tracker - Catat. Kelola. Tumbuh.",
  description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
  keywords: ["finance", "money tracker", "expense tracker", "budget", "personal finance"],
  authors: [{ name: "Money Tracker" }],
  creator: "Money Tracker",
  publisher: "Money Tracker",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://moneytracker.app",
    title: "Money Tracker - Catat. Kelola. Tumbuh.",
    description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
    siteName: "Money Tracker",
  },
  twitter: {
    card: "summary_large_image",
    title: "Money Tracker",
    description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
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
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}