// src/components/TeaserPublik.tsx — kerangka halaman teaser publik (non-login → CTA daftar).
import Link from 'next/link';
import Logo from '@/components/Logo';
import Sampul from '@/components/Sampul';

export default function TeaserPublik({ label, judul, deskripsi, gambar }: {
  label: string; judul: string; deskripsi: React.ReactNode; gambar?: string | null;
}) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '18px 20px 60px', textAlign: 'center' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Link href="/"><Logo height={36} /></Link>
        <Link href="/daftar" className="kp-btn" style={{ padding: '10px 20px', fontSize: 15 }}>Coba Gratis</Link>
      </header>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', letterSpacing: 1 }}>{label}</div>
      {gambar && (
        <div style={{ margin: '12px auto', width: 120, height: 120, borderRadius: 24, overflow: 'hidden', background: '#efe7fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sampul value={gambar} size={120} />
        </div>
      )}
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 26, margin: '10px 0' }}>{judul}</h1>
      <div style={{ color: 'var(--tinta)', fontSize: 15, lineHeight: 1.6 }}>{deskripsi}</div>
      <div className="kp-card" style={{ background: 'linear-gradient(150deg,#e9dcff,#d4ecff)', padding: 24, marginTop: 26 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Mainkan di KidzPlayful ✨</div>
        <p style={{ color: 'var(--abu)', fontSize: 14, marginBottom: 14 }}>Belajar & bermain untuk anak 0–6 tahun. Coba gratis sekarang.</p>
        <Link href="/daftar" className="kp-btn" style={{ display: 'inline-block', padding: '12px 28px' }}>✨ Coba Gratis di KidzPlayful</Link>
        <p style={{ marginTop: 12, fontSize: 13 }}>Sudah punya akun? <Link href="/login" style={{ color: 'var(--biru-d)', fontWeight: 700 }}>Masuk</Link></p>
      </div>
    </main>
  );
}
