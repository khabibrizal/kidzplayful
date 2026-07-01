// src/components/game/MewarnaiGame.tsx — game mewarnai "tap area"
// Fase 1: template bawaan (bebas/sesuai). Fase 2: SVG upload (bebas).
'use client';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import type { DataMewarnai, HasilSelesai } from '@/lib/game/tipe';
import { TEMPLATES, WARNA_NAMA } from '@/lib/game/templates-mewarnai';
import { sanitizeSvg } from '@/lib/game/svg-sanitize';

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

function PaletBar({ palette, dipilih, onPilih }: { palette: string[]; dipilih: string; onPilih: (h: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 0' }}>
      {palette.map((hex) => (
        <button key={hex} onClick={() => onPilih(hex)} aria-label={WARNA_NAMA[hex.toLowerCase()] ?? hex}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: hex, cursor: 'pointer',
            border: dipilih === hex ? '4px solid var(--lavender-d)' : '3px solid #fff', boxShadow: '0 3px 0 #e6def5',
          }} />
      ))}
    </div>
  );
}

// ---------- Mode template bawaan ----------
function GambarTpl({ tpl, warna, onArea, size = 300 }: {
  tpl: typeof TEMPLATES[string]; warna: Record<string, string>; onArea?: (id: string) => void; size?: number;
}) {
  return (
    <svg viewBox={tpl.viewBox} width={size} height={size} style={{ maxWidth: '100%', touchAction: 'manipulation' }}>
      {tpl.areas.map((a) => createElement(a.el, {
        key: a.id, ...a.attrs, fill: warna[a.id] ?? '#fff', stroke: '#5b5170', strokeWidth: 2.5, strokeLinejoin: 'round',
        style: onArea ? { cursor: 'pointer' } : undefined, onClick: onArea ? () => onArea(a.id) : undefined,
      }))}
      {(tpl.deco ?? []).map((d, i) => createElement(d.el, { key: `d${i}`, fill: '#333', ...d.attrs, style: { pointerEvents: 'none' } }))}
    </svg>
  );
}

function TemplateMode({ data, onSelesai }: { data: DataMewarnai; onSelesai: (h: HasilSelesai) => void }) {
  const tpl = TEMPLATES[data.template ?? ''];
  const mulaiRef = useRef(Date.now());
  const [warna, setWarna] = useState<Record<string, string>>({});
  const [dipilih, setDipilih] = useState<string>(data.palette[0] ?? '#e74c3c');
  const areaIds = useMemo(() => (tpl ? tpl.areas.map((a) => a.id) : []), [tpl]);
  if (!tpl) return <div>Template tidak ditemukan.</div>;
  const semua = areaIds.every((id) => warna[id]);

  function pilih(hex: string) { setDipilih(hex); const n = WARNA_NAMA[hex.toLowerCase()]; if (n) speak(n); }
  function selesai() {
    const total = areaIds.length;
    let benar = total;
    if (data.mode === 'sesuai' && data.target) benar = areaIds.filter((id) => (warna[id] ?? '').toLowerCase() === (data.target![id] ?? '').toLowerCase()).length;
    onSelesai({ benar, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {data.mode === 'sesuai' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--abu)' }}>
          Contoh:
          <span style={{ background: '#fff', borderRadius: 12, padding: 2, boxShadow: '0 2px 0 #e6def5' }}><GambarTpl tpl={tpl} warna={data.target ?? {}} size={54} /></span>
          <span>Warnai seperti contoh ya!</span>
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 24, padding: 8, boxShadow: '0 6px 0 #e6def5' }}>
        <GambarTpl tpl={tpl} warna={warna} onArea={(id) => setWarna((w) => ({ ...w, [id]: dipilih }))} size={280} />
      </div>
      <PaletBar palette={data.palette} dipilih={dipilih} onPilih={pilih} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="kp-btn putih" onClick={() => setWarna({})}>↺ Ulang</button>
        <button className="kp-btn" onClick={selesai} disabled={!semua} style={semua ? undefined : { opacity: 0.5 }}>Selesai ✓</button>
      </div>
      {!semua && <div style={{ fontSize: 12, color: 'var(--abu)' }}>Warnai semua bagian dulu ya 🖍️</div>}
    </div>
  );
}

// ---------- Mode SVG upload (Fase 2, bebas) ----------
function SvgMode({ data, onSelesai }: { data: DataMewarnai; onSelesai: (h: HasilSelesai) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [dipilih, setDipilih] = useState<string>(data.palette[0] ?? '#e74c3c');
  const warnaRef = useRef(dipilih);
  const terisiRef = useRef<Set<Element>>(new Set());
  const [terisi, setTerisi] = useState(0);
  const [total, setTotal] = useState(0);
  const mulaiRef = useRef(Date.now());

  useEffect(() => { warnaRef.current = dipilih; }, [dipilih]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    host.innerHTML = sanitizeSvg(data.svg ?? '');
    const root = host.querySelector('svg');
    if (root) { root.setAttribute('width', '280'); root.setAttribute('height', '280'); (root as SVGElement).style.maxWidth = '100%'; }
    const shapes = host.querySelectorAll('path,rect,circle,ellipse,polygon');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotal(shapes.length);
    shapes.forEach((sh) => {
      sh.setAttribute('fill', '#fff');
      if (!sh.getAttribute('stroke')) { sh.setAttribute('stroke', '#5b5170'); sh.setAttribute('stroke-width', '2'); }
      (sh as SVGElement).style.cursor = 'pointer';
      sh.addEventListener('click', () => {
        sh.setAttribute('fill', warnaRef.current);
        if (!terisiRef.current.has(sh)) { terisiRef.current.add(sh); setTerisi(terisiRef.current.size); }
      });
    });
  }, [data.svg]);

  function pilih(hex: string) { setDipilih(hex); const n = WARNA_NAMA[hex.toLowerCase()]; if (n) speak(n); }
  function ulang() {
    const host = hostRef.current; if (!host) return;
    host.querySelectorAll('path,rect,circle,ellipse,polygon').forEach((sh) => sh.setAttribute('fill', '#fff'));
    terisiRef.current.clear(); setTerisi(0);
  }
  const semua = total > 0 && terisi >= total;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 8, boxShadow: '0 6px 0 #e6def5' }}>
        <div ref={hostRef} style={{ display: 'flex', justifyContent: 'center', touchAction: 'manipulation' }} />
      </div>
      <PaletBar palette={data.palette} dipilih={dipilih} onPilih={pilih} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="kp-btn putih" onClick={ulang}>↺ Ulang</button>
        <button className="kp-btn" onClick={() => onSelesai({ benar: total, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) })} disabled={!semua} style={semua ? undefined : { opacity: 0.5 }}>Selesai ✓</button>
      </div>
      {!semua && <div style={{ fontSize: 12, color: 'var(--abu)' }}>Warnai semua bagian dulu ya 🖍️</div>}
    </div>
  );
}

export default function MewarnaiGame({ data, onSelesai }: { data: DataMewarnai; onSelesai: (h: HasilSelesai) => void }) {
  if (data.sumber === 'svg' && data.svg) return <SvgMode data={data} onSelesai={onSelesai} />;
  return <TemplateMode data={data} onSelesai={onSelesai} />;
}
