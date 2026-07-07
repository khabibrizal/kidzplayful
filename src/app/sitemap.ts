// src/app/sitemap.ts — daftar URL publik untuk mesin pencari (statis + artikel dinamis)
import type { MetadataRoute } from 'next';
import { getArtikelTerbit } from '@/lib/data/artikel';

const BASE = 'https://www.kidzplayful.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statis: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/artikel`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/tentang`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE}/kontak`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/kebijakan-privasi`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/syarat-ketentuan`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/daftar`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  let artikel: MetadataRoute.Sitemap = [];
  try {
    const list = await getArtikelTerbit();
    artikel = list.map((a) => ({
      url: `${BASE}/artikel/${a.slug}`,
      lastModified: a.terbit_pada ? new Date(a.terbit_pada) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));
  } catch { /* abaikan bila DB tak tersedia saat build */ }

  return [...statis, ...artikel];
}
