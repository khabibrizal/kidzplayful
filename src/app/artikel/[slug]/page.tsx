// src/app/artikel/[slug]/page.tsx — detail artikel publik + SEO per-artikel + JSON-LD
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Logo from '@/components/Logo';
import ArtikelBody from '@/components/ArtikelBody';
import ShareButton from '@/components/ShareButton';
import { createClient } from '@/lib/supabase/server';
import { getArtikelBySlugCached } from '@/lib/data/artikel';
import TombolKembali from '@/components/TombolKembali';

const BASE = 'https://www.kidzplayful.com';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArtikelBySlugCached(slug);
  if (!a) return { title: 'Artikel tidak ditemukan' };
  const url = `${BASE}/artikel/${a.slug}`;
  return {
    title: a.judul,
    description: a.ringkasan || undefined,
    alternates: { canonical: `/artikel/${a.slug}` },
    openGraph: {
      type: 'article',
      url,
      title: a.judul,
      description: a.ringkasan || undefined,
      publishedTime: a.terbit_pada ?? undefined,
      modifiedTime: a.updated_at,
      images: a.sampul_url ? [{ url: a.sampul_url }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: a.judul, description: a.ringkasan || undefined },
  };
}

function tanggal(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function ArtikelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArtikelBySlugCached(slug);
  if (!a) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const masuk = !!user;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.judul,
    description: a.ringkasan || undefined,
    image: a.sampul_url || `${BASE}/opengraph-image`,
    datePublished: a.terbit_pada ?? a.created_at,
    dateModified: a.updated_at,
    mainEntityOfPage: `${BASE}/artikel/${a.slug}`,
    inLanguage: 'id-ID',
    author: { '@type': 'Organization', name: 'KidzPlayful', url: BASE },
    publisher: { '@type': 'Organization', name: 'KidzPlayful', logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` } },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '18px 20px 60px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Link href={masuk ? '/pilih-anak' : '/'}><Logo height={36} /></Link>
          {masuk
            ? <Link href="/pilih-anak" className="kp-btn putih" style={{ padding: '10px 20px', fontSize: 15 }}>← Beranda</Link>
            : <Link href="/daftar" className="kp-btn" style={{ padding: '10px 20px', fontSize: 15 }}>Coba Gratis</Link>}
        </header>

        <TombolKembali fallback="/artikel" style={{ color: 'var(--abu)', fontSize: 13 }} />

        <article style={{ marginTop: 14 }}>
          <h1 style={{ color: 'var(--lavender-d)', fontSize: 'clamp(26px,4.5vw,38px)', lineHeight: 1.2, margin: '6px 0 10px' }}>{a.judul}</h1>
          {a.terbit_pada && <div style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 18 }}>{tanggal(a.terbit_pada)}</div>}
          {a.sampul_url && (
            <span style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', borderRadius: 18, overflow: 'hidden', background: '#efe7fb', marginBottom: 22 }}>
              <Image src={a.sampul_url} alt={a.judul} fill sizes="(max-width:760px) 100vw, 720px" style={{ objectFit: 'cover' }} priority />
            </span>
          )}
          {a.ringkasan && <p style={{ fontSize: 17, color: 'var(--tinta)', lineHeight: 1.6, marginBottom: 20, fontWeight: 600 }}>{a.ringkasan}</p>}
          <ArtikelBody isi={a.isi} />
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <ShareButton url={`${BASE}/artikel/${a.slug}`} title={a.judul} text={a.ringkasan || a.judul} label="Bagikan artikel" />
          </div>
        </article>

        {masuk ? (
          <div style={{ marginTop: 34, textAlign: 'center' }}>
            <Link href="/artikel" className="kp-btn putih">← Kembali ke daftar artikel</Link>
          </div>
        ) : (
          <div style={{ marginTop: 34, textAlign: 'center' }}>
            <div className="kp-card" style={{ background: 'linear-gradient(150deg,#e9dcff,#d4ecff)', padding: 26 }}>
              <h2 style={{ color: 'var(--lavender-d)', fontSize: 22, marginBottom: 8 }}>Yuk, main sambil belajar bareng KidzPlayful</h2>
              <p style={{ color: 'var(--tinta)', fontSize: 14, marginBottom: 16 }}>Kelas bermain & game edukasi anak 0–6 tahun. Coba gratis 14 hari.</p>
              <Link href="/daftar" className="kp-btn mint">Daftar Gratis ▶</Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
