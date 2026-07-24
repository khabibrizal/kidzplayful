// src/components/ShareButton.tsx — tombol Bagikan: Web Share API + fallback menu sosmed.
'use client';
import { useState } from 'react';
import { tautanShare, denganUtm, type ShareTarget } from '@/lib/share';

// url boleh relatif ('/coba/tema/x') atau absolut; diselesaikan ke absolut saat diklik.
export default function ShareButton({ url, title, text, jenis, label = 'Bagikan', kelas = 'kp-btn putih' }: {
  url: string; title: string; text?: string; jenis: 'artikel' | 'kelas' | 'game'; label?: string; kelas?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2000); }

  function absolut(): string {
    if (/^https?:\/\//.test(url)) return url;
    if (typeof window !== 'undefined') return new URL(url, window.location.origin).href;
    return url;
  }

  function urlShare(medium: string): string { return denganUtm(absolut(), { medium, jenis }); }

  async function klik() {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      try { await nav.share({ title, text, url: urlShare('native') }); return; }
      catch { /* user batal / tak didukung → buka fallback */ }
    }
    setBuka((v) => !v);
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

  const opsi: { t: ShareTarget | 'copy'; label: string }[] = [
    { t: 'whatsapp', label: '🟢 WhatsApp' },
    { t: 'facebook', label: '🔵 Facebook' },
    { t: 'twitter', label: '⬛ X (Twitter)' },
    { t: 'telegram', label: '🔷 Telegram' },
    { t: 'copy', label: '🔗 Salin link' },
  ];

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className={kelas} onClick={klik} style={{ display: 'inline-block' }}>🔗 {label}</button>
      {buka && (
        <div role="menu" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 6, zIndex: 90, minWidth: 170 }}>
          {opsi.map((o) => (
            <button key={o.t} type="button" onClick={() => (o.t === 'copy' ? salin() : bagikanKe(o.t))}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      {toast && <span style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 100 }}>{toast}</span>}
    </span>
  );
}
