// src/app/admin/tema/[id]/TargetEditor.tsx — atur warna target tiap area untuk SVG upload (mode sesuai)
'use client';
import { useEffect, useRef, useState } from 'react';
import { sanitizeSvg } from '@/lib/game/svg-sanitize';
import { WARNA_NAMA } from '@/lib/game/templates-mewarnai';
import s from '../../admin.module.css';

export default function TargetEditor({ svg, palette, target, setTarget }: {
  svg: string; palette: string[]; target: Record<string, string>; setTarget: (t: Record<string, string>) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [dipilih, setDipilih] = useState(palette[0] ?? '#e74c3c');
  const [jml, setJml] = useState(0);
  const dipilihRef = useRef(dipilih);
  const targetRef = useRef(target);
  useEffect(() => { dipilihRef.current = dipilih; }, [dipilih]);
  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    host.innerHTML = sanitizeSvg(svg);
    const root = host.querySelector('svg');
    if (root) { root.setAttribute('width', '220'); root.setAttribute('height', '220'); (root as SVGElement).style.maxWidth = '100%'; }
    const shapes = host.querySelectorAll('path,rect,circle,ellipse,polygon');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJml(shapes.length);
    shapes.forEach((sh, i) => {
      const k = sh.getAttribute('data-area') ?? String(i);
      sh.setAttribute('fill', targetRef.current[k] ?? '#fff');
      if (!sh.getAttribute('stroke')) { sh.setAttribute('stroke', '#5b5170'); sh.setAttribute('stroke-width', '2'); }
      (sh as SVGElement).style.cursor = 'pointer';
      sh.addEventListener('click', () => {
        sh.setAttribute('fill', dipilihRef.current);
        const next = { ...targetRef.current, [k]: dipilihRef.current };
        targetRef.current = next; setTarget(next);
      });
    });
  }, [svg]); // eslint-disable-line react-hooks/exhaustive-deps

  const terset = Object.keys(target).length;
  return (
    <div style={{ marginTop: 6 }}>
      <div className={s.muted} style={{ fontSize: 12 }}>Pilih warna, lalu tap tiap bagian gambar untuk menetapkan warna targetnya. ({terset}/{jml} area diatur)</div>
      <div style={{ background: '#fff', borderRadius: 16, padding: 6, display: 'inline-block', marginTop: 6 }}>
        <div ref={hostRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {palette.map((hex) => (
          <button key={hex} type="button" onClick={() => setDipilih(hex)} aria-label={WARNA_NAMA[hex.toLowerCase()] ?? hex}
            style={{ width: 30, height: 30, borderRadius: '50%', background: hex, cursor: 'pointer', border: dipilih === hex ? '3px solid var(--lavender-d)' : '2px solid #fff', boxShadow: '0 2px 0 #e6def5' }} />
        ))}
      </div>
    </div>
  );
}
