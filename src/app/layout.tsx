import type { Metadata, Viewport } from "next";
import { Baloo_2, Quicksand } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-baloo" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-quick" });

const JUDUL = "KidzPlayful — Kelas Bermain & Game Edukasi Anak";
const DESKRIPSI =
  "KidzPlayful memadukan kelas bermain (playgroup) dan game edukasi digital dengan screen time terkontrol untuk anak usia 0–6 tahun — melatih sensorik, motorik, dan berpikir komputasional (koding). Coba gratis 14 hari.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kidzplayful.com"),
  title: { default: JUDUL, template: "%s · KidzPlayful" },
  description: DESKRIPSI,
  applicationName: "KidzPlayful",
  keywords: [
    "kelas bermain anak", "playgroup", "kelas bermain online", "kelas bermain offline",
    "game edukasi anak", "aplikasi belajar anak", "screen time terkontrol", "screen time sehat",
    "game anak 0-4 tahun", "PAUD", "tumbuh kembang anak", "sensorik motorik anak",
    "koding anak", "coding anak TK", "rapor perkembangan anak",
  ],
  authors: [{ name: "KidzPlayful" }],
  creator: "KidzPlayful",
  publisher: "KidzPlayful",
  category: "education",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  alternates: { canonical: "/" },
  verification: { google: "oggZgjg3SP77x9YpEI3wV-ZF9LpvEpSNcQ7XxK5MC1I" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://www.kidzplayful.com",
    siteName: "KidzPlayful",
    title: JUDUL,
    description: DESKRIPSI,
  },
  twitter: { card: "summary_large_image", title: JUDUL, description: DESKRIPSI },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#efe6ff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${baloo.variable} ${quicksand.variable}`}>
      <body>{children}<Analytics /></body>
    </html>
  );
}
