// src/components/ShareButton.tsx — tombol Bagikan: menu (native share + Story + sosmed).
'use client';
import { useState, useSyncExternalStore } from 'react';
import { tautanShare, denganUtm, type ShareTarget } from '@/lib/share';
import { buatKartuStory } from '@/lib/story-card';

// Teks kartu Story per jenis konten (desainnya di lib/story-card.ts).
const TEKS_STORY: Record<string, { label: string; ajakan: string }> = {
  artikel: { label: 'Artikel KidzPlayful', ajakan: 'BACA SELENGKAPNYA DI SINI!' },
  kelas:   { label: 'Kelas KidzPlayful',   ajakan: 'LIHAT KELASNYA DI SINI!' },
  game:    { label: 'Game KidzPlayful',    ajakan: 'MAIN GRATIS DI SINI!' },
};

// url boleh relatif ('/coba/tema/x') atau absolut; diselesaikan ke absolut saat diklik.
export default function ShareButton({ url, title, text, jenis, gambar, label = 'Bagikan', kelas = 'kp-btn putih' }: {
  url: string; title: string; text?: string; jenis: 'artikel' | 'kelas' | 'game'; gambar?: string; label?: string; kelas?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [toast, setToast] = useState('');
  const [sibuk, setSibuk] = useState(false);
  // Dukungan Web Share hanya diketahui di klien. useSyncExternalStore membacanya tanpa
  // setState-di-effect (yang memicu render berantai) dan tanpa ketidakcocokan hidrasi.
  const bisaNative = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  );
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  function absolut(): string {
    if (/^https?:\/\//.test(url)) return url;
    if (typeof window !== 'undefined') return new URL(url, window.location.origin).href;
    return url;
  }
  function urlShare(medium: string): string { return denganUtm(absolut(), { medium, jenis }); }

  async function bagikanNative() {
    try { await navigator.share({ title, text, url: urlShare('native') }); } catch { /* batal */ }
    setBuka(false);
  }

  function bagikanKe(target: ShareTarget) {
    window.open(tautanShare(target, { url: urlShare(target), text: text ?? title }), '_blank', 'noopener,noreferrer');
    setBuka(false);
  }

  async function salin() {
    try { await navigator.clipboard.writeText(urlShare('salin')); flash('Link disalin ✓'); }
    catch { flash('Gagal menyalin'); }
    setBuka(false);
  }

  async function bagikanStory() {
    if (sibuk) return;
    setSibuk(true);
    try {
      const st = TEKS_STORY[jenis] ?? TEKS_STORY.artikel;
      const blob = await buatKartuStory({
        judul: title,
        // subjudul dipakai hanya bila berbeda dari judul (mis. `ringkasan` artikel),
        // supaya kartu tidak menampilkan kalimat yang sama dua kali.
        subjudul: text && text.trim() !== title.trim() ? text : undefined,
        labelKartu: st.label, ajakan: st.ajakan, gambar,
      });
      const file = new File([blob], 'kidzplayful-story.png', { type: 'image/png' });
      const teks = `${text ?? title}\n${urlShare('story')}`;
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
        await navigator.share({ files: [file], title, text: teks });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'kidzplayful-story.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        flash('Gambar Story diunduh — posting ke IG Story, lalu tambahkan link sticker ✨');
      }
    } catch { flash('Gagal membuat gambar Story'); }
    finally { setSibuk(false); setBuka(false); }
  }

  const opsi: { t: ShareTarget | 'copy'; label: string }[] = [
    { t: 'whatsapp', label: '🟢 WhatsApp' },
    { t: 'facebook', label: '🔵 Facebook' },
    { t: 'twitter', label: '⬛ X (Twitter)' },
    { t: 'telegram', label: '🔷 Telegram' },
    { t: 'copy', label: '🔗 Salin link' },
  ];
  const itemStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className={kelas} onClick={() => setBuka((v) => !v)} style={{ display: 'inline-block' }}>🔗 {label}</button>
      {buka && (
        <div role="menu" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 6, zIndex: 90, minWidth: 190 }}>
          <button type="button" onClick={bagikanStory} disabled={sibuk} style={{ ...itemStyle, fontWeight: 700 }}>{sibuk ? '⏳ Menyiapkan…' : '📸 Bagikan ke Story'}</button>
          {bisaNative && <button type="button" onClick={bagikanNative} style={itemStyle}>📱 Bagikan…</button>}
          {opsi.map((o) => (
            <button key={o.t} type="button" onClick={() => (o.t === 'copy' ? salin() : bagikanKe(o.t))} style={itemStyle}>{o.label}</button>
          ))}
        </div>
      )}
      {toast && <span style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 100, maxWidth: '90vw', textAlign: 'center' }}>{toast}</span>}
    </span>
  );
}
