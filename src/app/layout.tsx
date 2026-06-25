import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KidzPlayful — Main sambil belajar",
  description:
    "Kelas bermain digital untuk anak 0-4 tahun: game melatih sensorik & motorik, screen time terkontrol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
