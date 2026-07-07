// src/app/(legal)/kontak/page.tsx
import type { Metadata } from 'next';
import { PROFIL, WA_LINK } from '@/lib/profil';
import * as g from '../gaya';

export const metadata: Metadata = {
  title: 'Kontak',
  description: 'Hubungi KidzPlayful via WhatsApp untuk pertanyaan seputar kelas bermain, langganan, pesanan, dan event.',
  alternates: { canonical: '/kontak' },
};

export default function Kontak() {
  return (
    <article>
      <h1 style={g.h1}>Hubungi Kami</h1>
      <p style={g.meta}>Kami senang membantu 🤝</p>

      <p style={g.p}>
        Ada pertanyaan seputar kelas bermain, langganan, pesanan Toko, atau event? Tim {PROFIL.nama} siap membantu.
      </p>

      <div className="kp-card" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginBottom: 6 }}>WHATSAPP</div>
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="kp-btn mint" style={{ display: 'inline-block' }}>
          💬 Chat WhatsApp {PROFIL.waTampil}
        </a>
      </div>

      <div className="kp-card" style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginBottom: 6 }}>LOKASI</div>
        <p style={{ ...g.p, margin: 0 }}>{PROFIL.kota}, {PROFIL.provinsi}, Indonesia</p>
      </div>
    </article>
  );
}
