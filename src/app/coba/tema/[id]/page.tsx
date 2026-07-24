// src/app/coba/tema/[id]/page.tsx — teaser publik tema game (non-login).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTemaPublik } from '@/lib/data/publik';
import TeaserPublik from '@/components/TeaserPublik';
import TangkapRef from '@/components/TangkapRef';

const BASE = 'https://www.kidzplayful.com';
function isUrl(v?: string | null) { return !!v && /^(https?:\/\/|\/)/.test(v); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTemaPublik(id);
  if (!t) return { title: 'Game Edukasi — KidzPlayful' };
  const desc = t.game.length ? `${t.game.length} permainan seru: ${t.game.slice(0, 5).join(', ')}.` : 'Kumpulan permainan edukatif untuk anak.';
  const gambar = isUrl(t.sampul) ? t.sampul! : `${BASE}/opengraph-image`;
  return {
    title: `${t.nama} — Game Edukasi KidzPlayful`,
    description: desc,
    openGraph: { title: t.nama, description: desc, images: [{ url: gambar }], url: `${BASE}/coba/tema/${id}`, type: 'website' },
    twitter: { card: 'summary_large_image', title: t.nama, description: desc, images: [gambar] },
  };
}

export default async function TeaserTema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTemaPublik(id);
  if (!t) notFound();
  return (
    <>
      <TangkapRef />
      <TeaserPublik
        label="GAME EDUKASI"
        judul={t.nama}
        gambar={isUrl(t.sampul) ? t.sampul : null}
        deskripsi={<>
          <div>🎮 {t.game.length} permainan edukatif</div>
          {t.game.length > 0 && <p style={{ marginTop: 8 }}>{t.game.slice(0, 6).join(' · ')}</p>}
        </>}
      />
    </>
  );
}
