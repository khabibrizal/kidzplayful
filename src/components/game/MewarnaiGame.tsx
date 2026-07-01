// src/components/game/MewarnaiGame.tsx — game mewarnai "tap area" (Fase 1: template bawaan)
'use client';
import { createElement, useMemo, useRef, useState } from 'react';
import type { DataMewarnai, HasilSelesai } from '@/lib/game/tipe';
import { TEMPLATES, WARNA_NAMA } from '@/lib/game/templates-mewarnai';

function speak(t: string) {
  try {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'id-ID'; u.rate = 0.9; u.pitch = 1.15;
      speechSynthesis.speak(u);
    }
  } catch { /* abaikan */ }
}

function Gambar({ tpl, warna, onArea, size = 300 }: {
  tpl: typeof TEMPLATES[string]; warna: Record<string, string>; onArea?: (id: string) => void; size?: number;
}) {
  return (
    <svg viewBox={tpl.viewBox} width={size} height={size} style={{ maxWidth: '100%', touchAction: 'manipulation' }}>
      {tpl.areas.map((a) =>
        createElement(a.el, {
          key: a.id,
          ...a.attrs,
          fill: warna[a.id] ?? '#fff',
          stroke: '#5b5170', strokeWidth: 2.5, strokeLinejoin: 'round',
          style: onArea ? { cursor: 'pointer' } : undefined,
          onClick: onArea ? () => onArea(a.id) : undefined,
        }),
      )}
      {(tpl.deco ?? []).map((d, i) =>
        createElement(d.el, { key: `d${i}`, fill: '#333', ...d.attrs, style: { pointerEvents: 'none' } }),
      )}
    </svg>
  );
}

export default function MewarnaiGame({ data, onSelesai }: { data: DataMewarnai; onSelesai: (h: HasilSelesai) => void }) {
  const tpl = TEMPLATES[data.template];
  const mulaiRef = useRef(Date.now());
  const [warna, setWarna] = useState<Record<string, string>>({});
  const [dipilih, setDipilih] = useState<string>(data.palette[0] ?? '#e74c3c');
  const areaIds = useMemo(() => (tpl ? tpl.areas.map((a) => a.id) : []), [tpl]);

  if (!tpl) return <div>Template tidak ditemukan.</div>;

  const semuaTerisi = areaIds.every((id) => warna[id]);

  function isi(id: string) {
    setWarna((w) => ({ ...w, [id]: dipilih }));
  }
  function pilihWarna(hex: string) {
    setDipilih(hex);
    const nama = WARNA_NAMA[hex.toLowerCase()];
    if (nama) speak(nama);
  }
  function selesai() {
    const total = areaIds.length;
    let benar = total;
    if (data.mode === 'sesuai' && data.target) {
      benar = areaIds.filter((id) => (warna[id] ?? '').toLowerCase() === (data.target![id] ?? '').toLowerCase()).length;
    }
    onSelesai({ benar, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {data.mode === 'sesuai' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--abu)' }}>
          Contoh:
          <span style={{ background: '#fff', borderRadius: 12, padding: 2, boxShadow: '0 2px 0 #e6def5' }}>
            <Gambar tpl={tpl} warna={data.target ?? {}} size={54} />
          </span>
          <span>Warnai seperti contoh ya!</span>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 24, padding: 8, boxShadow: '0 6px 0 #e6def5' }}>
        <Gambar tpl={tpl} warna={warna} onArea={isi} size={280} />
      </div>

      {/* palet warna */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 0' }}>
        {data.palette.map((hex) => (
          <button key={hex} onClick={() => pilihWarna(hex)} aria-label={WARNA_NAMA[hex.toLowerCase()] ?? hex}
            style={{
              width: 40, height: 40, borderRadius: '50%', background: hex, cursor: 'pointer',
              border: dipilih === hex ? '4px solid var(--lavender-d)' : '3px solid #fff',
              boxShadow: '0 3px 0 #e6def5',
            }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="kp-btn putih" onClick={() => setWarna({})}>↺ Ulang</button>
        <button className="kp-btn" onClick={selesai} disabled={!semuaTerisi}
          style={semuaTerisi ? undefined : { opacity: 0.5 }}>Selesai ✓</button>
      </div>
      {!semuaTerisi && <div style={{ fontSize: 12, color: 'var(--abu)' }}>Warnai semua bagian dulu ya 🖍️</div>}
    </div>
  );
}
