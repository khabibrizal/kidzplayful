import Link from 'next/link';
export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 60 }}>🧭</div>
      <h1 style={{ color: 'var(--lavender-d)' }}>Halaman tidak ditemukan</h1>
      <Link href="/" className="kp-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Ke beranda</Link>
    </main>
  );
}
