// src/components/SertifikatView.tsx — tampilan e-sertifikat (landscape, print-friendly)
import Logo from '@/components/Logo';
import { formatTanggal } from '@/lib/format';
import type { Sertifikat } from '@/lib/game/tipe';

export default function SertifikatView({ s }: { s: Sertifikat }) {
  const detail = [s.event_judul, formatTanggal(s.event_tanggal), s.lokasi].filter(Boolean).join(' · ');

  // Overlay teks (nama anak + detail) — dipakai baik di atas template maupun desain bawaan.
  const overlay = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '8% 10%' }}>
      <div style={{ fontSize: 'clamp(14px, 3.6vw, 30px)', fontWeight: 800, color: 'var(--lavender-d, #6b4fb0)', textShadow: '0 1px 2px rgba(255,255,255,.6)', lineHeight: 1.2 }}>{s.anak_nama}</div>
      <div style={{ marginTop: '2%', fontSize: 'clamp(9px, 1.7vw, 15px)', color: 'var(--tinta, #3a3350)', textShadow: '0 1px 2px rgba(255,255,255,.6)' }}>{detail}</div>
    </div>
  );

  if (s.bg_url) {
    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto', aspectRatio: '1.414 / 1', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.bg_url} alt="Template sertifikat" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        {overlay}
      </div>
    );
  }

  // Fallback desain pastel bawaan bila event belum meng-upload template.
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto', aspectRatio: '1.414 / 1', background: 'linear-gradient(135deg,#f6f1ff 0%,#eafaf1 100%)', border: '6px double var(--lavender-d, #6b4fb0)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6% 8%' }}>
        <Logo height={44} />
        <div style={{ marginTop: '3%', letterSpacing: 3, fontSize: 'clamp(12px,2.4vw,20px)', fontWeight: 800, color: 'var(--mint-d, #2e9e63)' }}>🌟 SERTIFIKAT KELAS BERMAIN 🌟</div>
        <div style={{ marginTop: '1.5%', fontSize: 'clamp(9px,1.5vw,13px)', color: 'var(--abu, #8a83a0)' }}>Dengan bangga diberikan kepada</div>
        <div style={{ marginTop: '1%', fontSize: 'clamp(16px,3.8vw,32px)', fontWeight: 800, color: 'var(--lavender-d, #6b4fb0)' }}>{s.anak_nama}</div>
        <div style={{ marginTop: '2%', fontSize: 'clamp(9px,1.7vw,15px)', color: 'var(--tinta, #3a3350)', maxWidth: '80%' }}>atas partisipasi ceria dan rasa ingin tahunya yang hebat selama mengikuti</div>
        <div style={{ marginTop: '1%', fontSize: 'clamp(10px,1.9vw,16px)', fontWeight: 700, color: 'var(--tinta, #3a3350)' }}>{s.event_judul}</div>
        <div style={{ marginTop: '1%', fontSize: 'clamp(8px,1.5vw,13px)', color: 'var(--abu, #8a83a0)' }}>{[formatTanggal(s.event_tanggal), s.lokasi].filter(Boolean).join(' · ')}</div>
        <div style={{ marginTop: '3%', fontSize: 'clamp(9px,1.6vw,14px)', fontStyle: 'italic', color: 'var(--lavender-d, #6b4fb0)' }}>Teruslah bermain, belajar, dan bertumbuh, ya! 💛</div>
        <div style={{ marginTop: '3%', fontSize: 'clamp(8px,1.3vw,12px)', color: 'var(--abu, #8a83a0)' }}>KidzPlayful{s.diterbitkan_oleh ? ` · ${s.diterbitkan_oleh}` : ''}</div>
      </div>
    </div>
  );
}
