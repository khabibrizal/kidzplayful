// src/app/sitemap.ts — daftar URL publik untuk mesin pencari
import type { MetadataRoute } from 'next';

const BASE = 'https://www.kidzplayful.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/daftar`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
