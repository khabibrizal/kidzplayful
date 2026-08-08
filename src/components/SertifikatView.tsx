// src/components/SertifikatView.tsx — tampilan e-sertifikat (A4 landscape 1.414:1)
// WARNA: seluruh teks HITAM kecuali NAMA ANAK (permintaan pemilik). Tampilan di layar
// sengaja disamakan dengan hasil unduhan JPEG (lib/sertifikat-jpeg.ts).
import Logo from '@/components/Logo';
import { formatTanggal } from '@/lib/format';
import type { Sertifikat } from '@/lib/game/tipe';

export default function SertifikatView({ s }: { s: Sertifikat }) {
  const tanggalLokasi = [formatTanggal(s.event_tanggal), s.lokasi].filter(Boolean).join(' · ');

  // Blok teks inti (kepada → nama → apresiasi → event → tanggal → penutup).
  // Dipakai di atas template JPEG maupun desain bawaan. `bayangan` = text-shadow
  // agar tetap terbaca saat menumpuk gambar template.
  const isi = (bayangan: boolean) => {
    const sh = bayangan ? { textShadow: '0 1px 3px rgba(255,255,255,.85)' } : {};
    return (
      <>
        <div style={{ fontSize: 'clamp(8px,1.5vw,13px)', color: '#000', ...sh }}>Dengan bangga diberikan kepada</div>
        <div style={{ marginTop: '1%', fontSize: 'clamp(16px,3.8vw,32px)', fontWeight: 800, color: 'var(--lavender-d, #6b4fb0)', ...sh }}>{s.anak_nama}</div>
        <div style={{ marginTop: '2%', fontSize: 'clamp(9px,1.7vw,15px)', color: '#000', maxWidth: '82%', ...sh }}>atas partisipasi ceria dan rasa ingin tahunya yang hebat selama mengikuti</div>
        <div style={{ marginTop: '1%', fontSize: 'clamp(10px,1.9vw,16px)', fontWeight: 700, color: '#000', ...sh }}>{s.event_judul}</div>
        {tanggalLokasi && <div style={{ marginTop: '1%', fontSize: 'clamp(8px,1.5vw,13px)', color: '#000', ...sh }}>{tanggalLokasi}</div>}
        <div style={{ marginTop: '3%', fontSize: 'clamp(9px,1.6vw,14px)', fontStyle: 'italic', color: '#000', ...sh }}>Teruslah bermain, belajar, dan bertumbuh, ya! 💛</div>
      </>
    );
  };

  const flexCol: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };

  if (s.bg_url) {
    // Template JPEG dari admin sebagai latar; teks (nama + kalimat apresiasi) di-overlay di tengah.
    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto', aspectRatio: '1.414 / 1', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.bg_url} alt="Template sertifikat" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        <div style={{ ...flexCol, padding: '10% 12%' }}>{isi(true)}</div>
      </div>
    );
  }

  // Fallback desain pastel bawaan bila event belum meng-upload template.
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto', aspectRatio: '1.414 / 1', background: 'linear-gradient(135deg,#f6f1ff 0%,#eafaf1 100%)', border: '6px double var(--lavender-d, #6b4fb0)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ ...flexCol, padding: '6% 8%' }}>
        <Logo height={44} />
        <div style={{ marginTop: '3%', marginBottom: '2%', letterSpacing: 3, fontSize: 'clamp(12px,2.4vw,20px)', fontWeight: 800, color: '#000' }}>🌟 SERTIFIKAT KELAS BERMAIN 🌟</div>
        {isi(false)}
        <div style={{ marginTop: '3%', fontSize: 'clamp(8px,1.3vw,12px)', color: '#000' }}>KidzPlayful{s.diterbitkan_oleh ? ` · ${s.diterbitkan_oleh}` : ''}</div>
      </div>
    </div>
  );
}
