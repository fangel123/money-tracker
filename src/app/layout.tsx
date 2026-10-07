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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://koin-mikha.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
    title: "Koin - Catat. Kelola. Tumbuh.",
    description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
    siteName: "Koin",
  },
  twitter: {
    card: "summary_large_image",
    title: "Koin",
    description: "Aplikasi pencatat keuangan pribadi yang sederhana, cepat, dan aman",
  },
  // ?v=koin memaksa browser mengambil ikon baru, bukan favicon Next.js lama dari cache
  icons: {
    icon: [
      { url: "/icon.svg?v=koin", type: "image/svg+xml" },
      { url: "/favicon.ico?v=koin", sizes: "any" },
    ],
    apple: "/icon-192.png?v=koin",
  },
  manifest: "/site.webmanifest",
  // Saat dipasang di layar utama iPhone: buka layar penuh dengan nama "Koin"
  appleWebApp: {
    capable: true,
    title: "Koin",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
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