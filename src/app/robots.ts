// src/app/robots.ts — arahan crawler + lokasi sitemap
import type { MetadataRoute } from 'next';

const BASE = 'https://www.kidzplayful.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // area privat (butuh login / data pribadi) — jangan di-index
        disallow: [
          '/admin', '/main', '/anak', '/ortu', '/pengaturan', '/pesanan',
          '/keranjang', '/pilih-anak', '/pilih-game', '/kelas-saya', '/kelas',
          '/favorit', '/guru', '/catatan', '/sertifikat', '/stiker-event',
          '/store', '/event', '/komunitas', '/reset-sandi', '/api', '/investor',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
