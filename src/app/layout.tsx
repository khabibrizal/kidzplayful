import type { Metadata } from "next";
import { Baloo_2, Quicksand } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-baloo" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-quick" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kidzplayful.com"),
  title: "KidzPlayful — Main sambil belajar",
  description: "Kelas bermain digital untuk anak 0-4 tahun: game melatih sensorik & motorik, screen time terkontrol.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${baloo.variable} ${quicksand.variable}`}>
      <body>{children}<Analytics /></body>
    </html>
  );
}
