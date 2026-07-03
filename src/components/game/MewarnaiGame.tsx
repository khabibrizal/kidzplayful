// src/components/game/MewarnaiGame.tsx — game mewarnai "tap area"
// Fase 1: template bawaan (bebas/sesuai). Fase 2: SVG upload (bebas).
'use client';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import type { DataMewarnai, HasilSelesai } from '@/lib/game/tipe';
import { TEMPLATES, WARNA_NAMA } from '@/lib/game/templates-mewarnai';
import { sanitizeSvg } from '@/lib/game/svg-sanitize';
import { speak } from '@/lib/tts';


function PaletBar({ palette, dipilih, onPilih, bernomor = false }: { palette: string[]; dipilih: string; onPilih: (h: string) => void; bernomor?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 0' }}>
      {palette.map((hex, i) => (
        <div key={hex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <button onClick={() => onPilih(hex)} aria-label={`${bernomor ? `Warna ${i + 1} ` : ''}${WARNA_NAMA[hex.toLowerCase()] ?? hex}`}
            style={{
              width: 40, height: 40, borderRadius: '50%', background: hex, cursor: 'pointer',
              border: dipilih === hex ? '4px solid var(--lavender-d)' : '3px solid #fff', boxShadow: '0 3px 0 #e6def5',
            }} />
          {bernomor && <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--lavender-d)' }}>{i + 1}</span>}
        </div>
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

// render SVG statis (read-only) dengan warna per data-area (untuk "contoh")
function svgDenganWarna(svg: string, warna: Record<string, string>, size: number): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  try {
    const doc = new DOMParser().parseFromString(sanitizeSvg(svg), 'image/svg+xml');
    const root = doc.querySelector('svg'); if (!root) return '';
    root.setAttribute('width', String(size)); root.setAttribute('height', String(size));
    root.querySelectorAll('path,rect,circle,ellipse,polygon').forEach((sh, i) => {
      const k = sh.getAttribute('data-area') ?? String(i);
      sh.setAttribute('fill', warna[k] ?? '#fff');
      if (!sh.getAttribute('stroke')) { sh.setAttribute('stroke', '#5b5170'); sh.setAttribute('stroke-width', '2'); }
    });
    return root.outerHTML;
  } catch { return ''; }
}

// ---------- Mode SVG upload (Fase 2 bebas + Fase 3 sesuai) ----------
function SvgMode({ data, onSelesai }: { data: DataMewarnai; onSelesai: (h: HasilSelesai) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [dipilih, setDipilih] = useState<string>(data.palette[0] ?? '#e74c3c');
  const warnaRef = useRef(dipilih);
  const isiRef = useRef<Record<string, string>>({}); // areaKey -> hex
  const [terisi, setTerisi] = useState(0);
  const [total, setTotal] = useState(0);
  const mulaiRef = useRef(Date.now());
  const berkode = data.mode === 'berkode';                    // color-by-number
  const sesuai = (data.mode === 'sesuai' || berkode) && !!data.target;

  useEffect(() => { warnaRef.current = dipilih; }, [dipilih]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    host.innerHTML = sanitizeSvg(data.svg ?? '');
    const root = host.querySelector('svg');
    if (root) { root.setAttribute('width', '280'); root.setAttribute('height', '280'); (root as SVGElement).style.maxWidth = '100%'; }
    const shapes = host.querySelectorAll('path,rect,circle,ellipse,polygon');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotal(shapes.length);
    shapes.forEach((sh, i) => {
      const k = sh.getAttribute('data-area') ?? String(i);
      sh.setAttribute('fill', '#fff');
      if (!sh.getAttribute('stroke')) { sh.setAttribute('stroke', '#5b5170'); sh.setAttribute('stroke-width', '2'); }
      (sh as SVGElement).style.cursor = 'pointer';
      sh.addEventListener('click', () => {
        sh.setAttribute('fill', warnaRef.current);
        isiRef.current[k] = warnaRef.current;
        setTerisi(Object.keys(isiRef.current).length);
      });
    });
    // mode berkode: tempel label angka (urutan warna target di palette) di tengah tiap area
    if (root && berkode && data.target) {
      const svgNS = 'http://www.w3.org/2000/svg';
      shapes.forEach((sh, i) => {
        const k = sh.getAttribute('data-area') ?? String(i);
        const tgt = data.target![k]; if (!tgt) return;
        const idx = data.palette.indexOf(tgt); if (idx < 0) return;
        try {
          const bb = (sh as SVGGraphicsElement).getBBox();
          const t = document.createElementNS(svgNS, 'text');
          t.setAttribute('x', String(bb.x + bb.width / 2));
          t.setAttribute('y', String(bb.y + bb.height / 2));
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('dominant-baseline', 'central');
          t.setAttribute('font-size', String(Math.max(7, Math.min(bb.width, bb.height) * 0.4)));
          t.setAttribute('fill', '#5b5170');
          t.setAttribute('font-weight', '700');
          (t as unknown as SVGElement).style.pointerEvents = 'none';
          t.textContent = String(idx + 1);
          root.appendChild(t);
        } catch { /* getBBox bisa gagal utk shape tertentu */ }
      });
    }
  }, [data.svg, data.mode, data.target, data.palette, berkode]);

  function pilih(hex: string) { setDipilih(hex); const n = WARNA_NAMA[hex.toLowerCase()]; if (n) speak(n); }
  function ulang() {
    const host = hostRef.current; if (!host) return;
    host.querySelectorAll('path,rect,circle,ellipse,polygon').forEach((sh) => sh.setAttribute('fill', '#fff'));
    isiRef.current = {}; setTerisi(0);
  }
  function selesai() {
    let benar = total;
    if (sesuai && data.target) {
      const t = data.target;
      benar = Object.keys(t).filter((k) => (isiRef.current[k] ?? '').toLowerCase() === (t[k] ?? '').toLowerCase()).length;
    }
    onSelesai({ benar, total: sesuai && data.target ? Object.keys(data.target).length : total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
  }
  const semua = total > 0 && terisi >= total;
  const contoh = useMemo(() => (sesuai && !berkode ? svgDenganWarna(data.svg ?? '', data.target ?? {}, 54) : ''), [sesuai, berkode, data.svg, data.target]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {berkode && (
        <div style={{ fontSize: 13, color: 'var(--abu)', textAlign: 'center' }}>🔢 Warnai tiap bagian sesuai <b>angkanya</b> ya!</div>
      )}
      {sesuai && !berkode && contoh && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--abu)' }}>
          Contoh:
          <span style={{ background: '#fff', borderRadius: 12, padding: 2, boxShadow: '0 2px 0 #e6def5' }} dangerouslySetInnerHTML={{ __html: contoh }} />
          <span>Warnai seperti contoh ya!</span>
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 24, padding: 8, boxShadow: '0 6px 0 #e6def5' }}>
        <div ref={hostRef} style={{ display: 'flex', justifyContent: 'center', touchAction: 'manipulation' }} />
      </div>
      <PaletBar palette={data.palette} dipilih={dipilih} onPilih={pilih} bernomor={berkode} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="kp-btn putih" onClick={ulang}>↺ Ulang</button>
        <button className="kp-btn" onClick={selesai} disabled={!semua} style={semua ? undefined : { opacity: 0.5 }}>Selesai ✓</button>
      </div>
      {!semua && <div style={{ fontSize: 12, color: 'var(--abu)' }}>Warnai semua bagian dulu ya 🖍️</div>}
    </div>
  );
}

export default function MewarnaiGame({ data, onSelesai }: { data: DataMewarnai; onSelesai: (h: HasilSelesai) => void }) {
  if (data.sumber === 'svg' && data.svg) return <SvgMode data={data} onSelesai={onSelesai} />;
  return <TemplateMode data={data} onSelesai={onSelesai} />;
}
