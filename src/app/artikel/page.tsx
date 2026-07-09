// src/app/artikel/page.tsx — daftar artikel publik (blog)
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import { createClient } from '@/lib/supabase/server';
import { getArtikelTerbit, getArtikelTerbitCached } from '@/lib/data/artikel';

export const metadata: Metadata = {
  title: 'Artikel & Tips Bermain untuk Anak',
  description: 'Kumpulan artikel dan tips seputar kelas bermain, game edukasi, screen time sehat, dan tumbuh kembang anak usia 0–6 tahun dari KidzPlayful.',
  alternates: { canonical: '/artikel' },
};

function tanggal(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function ArtikelListPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const cari = (q ?? '').trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const masuk = !!user;
  // tanpa pencarian → pakai daftar ter-cache; dengan pencarian → query langsung.
  const artikel = cari ? await getArtikelTerbit({ q: cari }) : await getArtikelTerbitCached();
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '18px 20px 50px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Link href={masuk ? '/pilih-anak' : '/'}><Logo height={38} /></Link>
        {masuk
          ? <Link href="/pilih-anak" className="kp-btn putih" style={{ padding: '10px 20px', fontSize: 15 }}>← Beranda</Link>
          : <Link href="/daftar" className="kp-btn" style={{ padding: '10px 20px', fontSize: 15 }}>Coba Gratis</Link>}
      </header>

      <h1 style={{ color: 'var(--lavender-d)', fontSize: 'clamp(26px,4vw,36px)', marginBottom: 8 }}>Artikel & Tips Bermain Anak</h1>
      <p style={{ color: 'var(--tinta)', marginBottom: 18, lineHeight: 1.6 }}>
        Tips kelas bermain, game edukasi, screen time sehat, dan tumbuh kembang anak usia 0–6 tahun.
      </p>

      <form method="get" action="/artikel" style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 460 }}>
        <input className="kp-input" name="q" defaultValue={cari} placeholder="Cari artikel…" style={{ flex: 1, marginBottom: 0 }} />
        <button className="kp-btn" type="submit" style={{ padding: '12px 22px', fontSize: 15 }}>Cari</button>
      </form>

      {cari && (
        <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 16 }}>
          {artikel.length} hasil untuk “{cari}” · <Link href="/artikel" style={{ color: 'var(--biru-d)' }}>reset</Link>
        </p>
      )}

      {artikel.length === 0 ? (
        <p style={{ color: 'var(--abu)' }}>{cari ? `Tidak ada artikel yang cocok dengan “${cari}”.` : 'Belum ada artikel. Nantikan tulisan pertama kami ya! 🌿'}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {artikel.map((a) => (
            <Link key={a.slug} href={`/artikel/${a.slug}`} className="kp-card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              {a.sampul_url && (
                <span style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', background: '#efe7fb' }}>
                  <Image src={a.sampul_url} alt={a.judul} fill sizes="(max-width:600px) 100vw, 300px" style={{ objectFit: 'cover' }} />
                </span>
              )}
              <span style={{ padding: 16, display: 'block' }}>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--abu)', marginBottom: 6 }}>{tanggal(a.terbit_pada)}</span>
                <span style={{ display: 'block', fontWeight: 700, color: 'var(--lavender-d)', fontSize: 17, lineHeight: 1.3, marginBottom: 6 }}>{a.judul}</span>
                <span style={{ display: 'block', fontSize: 14, color: 'var(--tinta)', lineHeight: 1.5 }}>{a.ringkasan}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
