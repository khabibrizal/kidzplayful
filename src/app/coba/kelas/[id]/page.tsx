// src/app/coba/kelas/[id]/page.tsx — teaser publik kelas bermain (non-login).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getKelasPublik } from '@/lib/data/publik';
import TeaserPublik from '@/components/TeaserPublik';
import TangkapRef from '@/components/TangkapRef';

const BASE = 'https://www.kidzplayful.com';

function isUrl(v?: string | null) { return !!v && /^(https?:\/\/|\/)/.test(v); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const k = await getKelasPublik(id);
  if (!k) return { title: 'Kelas Bermain — KidzPlayful' };
  const desc = k.tujuan || `Aktivitas main bersama untuk anak usia ${k.usia_min}–${k.usia_max} tahun.`;
  const gambar = isUrl(k.sampul_url) ? k.sampul_url! : `${BASE}/opengraph-image`;
  return {
    title: `${k.judul} — Kelas Bermain KidzPlayful`,
    description: desc,
    openGraph: { title: k.judul, description: desc, images: [{ url: gambar }], url: `${BASE}/coba/kelas/${id}`, type: 'website' },
    twitter: { card: 'summary_large_image', title: k.judul, description: desc, images: [gambar] },
  };
}

export default async function TeaserKelas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = await getKelasPublik(id);
  if (!k) notFound();
  return (
    <>
      <TangkapRef />
      <TeaserPublik
        label="KELAS BERMAIN"
        judul={k.judul}
        gambar={isUrl(k.sampul_url) ? k.sampul_url : null}
        deskripsi={<>
          <div>👶 Untuk usia {k.usia_min}–{k.usia_max} tahun</div>
          {k.tujuan && <p style={{ marginTop: 8 }}>🎯 {k.tujuan}</p>}
        </>}
      />
    </>
  );
}
