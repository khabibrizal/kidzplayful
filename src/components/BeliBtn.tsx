// src/components/BeliBtn.tsx
'use client';
import { useState } from 'react';

/** Tombol beli bahan. Aman untuk layar anak: klik -> konfirmasi dulu sebelum membuka toko. */
export default function BeliBtn({ nama, link }: { nama: string; link: string }) {
  const [tanya, setTanya] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setTanya(true); }}
        className="kp-btn"
        style={{ padding: '5px 12px', fontSize: 12, background: '#dff5e6', color: '#1c7a43', boxShadow: '0 3px 0 #b9e6c9' }}
      >
        🛒 Beli
      </button>

      {tanya && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { e.stopPropagation(); setTanya(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(43,36,64,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="kp-card"
            style={{ maxWidth: 320, textAlign: 'center', background: '#fff' }}
          >
            <div style={{ fontSize: 40 }}>🛒</div>
            <p style={{ margin: '8px 0 4px' }}>
              Kamu akan membuka <b>halaman toko</b> untuk membeli<br /><b>{nama}</b>.
            </p>
            <p style={{ fontSize: 13, color: 'var(--abu)' }}>Minta bantuan orang tua dulu ya 🧑‍🍼</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="kp-btn putih" onClick={(e) => { e.stopPropagation(); setTanya(false); }}>Batal</button>
              <button
                className="kp-btn mint"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(link, '_blank', 'noopener,noreferrer');
                  setTanya(false);
                }}
              >
                Buka Toko →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
