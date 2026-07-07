// src/app/(legal)/layout.tsx — kerangka bersama halaman publik statis (legal/tentang/kontak)
import Link from 'next/link';
import Logo from '@/components/Logo';
import { PROFIL } from '@/lib/profil';

const TAUTAN = [
  { href: '/tentang', label: 'Tentang' },
  { href: '/kebijakan-privasi', label: 'Kebijakan Privasi' },
  { href: '/syarat-ketentuan', label: 'Syarat & Ketentuan' },
  { href: '/kontak', label: 'Kontak' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/"><Logo height={38} /></Link>
        <Link href="/" style={{ color: 'var(--lavender-d)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>← Beranda</Link>
      </header>

      <main style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '6px 20px 40px', flex: 1 }}>
        {children}
      </main>

      <footer style={{ borderTop: '1px solid #e6def5', marginTop: 20 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px', color: 'var(--abu)', fontSize: 13, lineHeight: 1.8, textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
            {TAUTAN.map((t) => (
              <Link key={t.href} href={t.href} style={{ color: 'var(--lavender-d)', textDecoration: 'none', fontWeight: 600 }}>{t.label}</Link>
            ))}
          </div>
          <div>© 2026 {PROFIL.nama} · Kelas bermain &amp; game edukasi anak · {PROFIL.kota}, {PROFIL.provinsi}</div>
        </div>
      </footer>
    </div>
  );
}
