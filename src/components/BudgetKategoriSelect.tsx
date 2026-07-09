// src/components/BudgetKategoriSelect.tsx — dropdown kategori + info sisa budget bulan ini (informasi saja)
'use client';
import { useState } from 'react';

export interface SisaBudget { anggaran: number; terpakai: number; sisa: number; }
type Kat = { id: string; kode: string; nama: string };

const rp = (n: number) => 'Rp' + (n || 0).toLocaleString('id-ID');

export default function BudgetKategoriSelect({ name, kategori, budget, style, className }: {
  name: string; kategori: Kat[]; budget: Record<string, SisaBudget>; style?: React.CSSProperties; className?: string;
}) {
  const [kode, setKode] = useState(kategori[0]?.kode ?? '');
  const b = budget[kode];

  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <select className={className} name={name} value={kode} onChange={(e) => setKode(e.target.value)} style={{ width: '100%', ...style }}>
        {kategori.map((k) => <option key={k.id} value={k.kode}>{k.nama}{budget[k.kode] ? ` (sisa ${rp(budget[k.kode].sisa)})` : ''}</option>)}
      </select>
      {b ? (
        <div style={{ fontSize: 11, marginTop: 3, color: b.sisa <= 0 ? '#c0392b' : b.sisa <= b.anggaran * 0.15 ? '#d35400' : '#1c7a43' }}>
          Anggaran {rp(b.anggaran)} · terpakai {rp(b.terpakai)} · <b>sisa {rp(b.sisa)}</b>{b.sisa <= 0 ? ' (habis)' : ''}
        </div>
      ) : (
        <div style={{ fontSize: 11, marginTop: 3, color: '#999' }}>Belum ada anggaran untuk kategori ini bulan ini.</div>
      )}
    </div>
  );
}
