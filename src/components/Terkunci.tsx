// src/components/Terkunci.tsx — tampilan fitur terkunci untuk user trial + ajakan upgrade
import Link from 'next/link';

export default function Terkunci({ fitur, ringkas = false }: { fitur: string; ringkas?: boolean }) {
  if (ringkas) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--abu)', padding: '18px 12px' }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <p style={{ margin: '6px 0' }}><b>{fitur}</b> khusus pelanggan.</p>
        <Link href="/pengaturan" className="kp-btn mint" style={{ display: 'inline-block' }}>✨ Upgrade / Berlangganan</Link>
      </div>
    );
  }
  return (
    <div className="kp-card" style={{ textAlign: 'center', padding: '28px 18px', marginTop: 12 }}>
      <div style={{ fontSize: 52 }}>🔒</div>
      <h2 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0' }}>{fitur} terkunci</h2>
      <p style={{ color: 'var(--abu)', maxWidth: 340, margin: '0 auto 14px', lineHeight: 1.5 }}>
        Fitur ini tersedia untuk pelanggan KidzPlayful. Yuk berlangganan agar si kecil bisa menikmati {fitur.toLowerCase()} sepuasnya 🌿
      </p>
      <Link href="/pengaturan" className="kp-btn mint" style={{ display: 'inline-block' }}>✨ Upgrade / Berlangganan</Link>
    </div>
  );
}
