// src/components/BudgetKategoriSelect.tsx — dropdown kategori + info sisa budget bulan ini (informasi saja)
'use client';
import { useRef, useState } from 'react';
import { usePadaResetForm } from '@/lib/form-reset';

export interface SisaBudget { anggaran: number; terpakai: number; sisa: number; }
type Kat = { id: string; kode: string; nama: string };

const rp = (n: number) => 'Rp' + (n || 0).toLocaleString('id-ID');

export default function BudgetKategoriSelect({ name, kategori, budget, style, className }: {
  name: string; kategori: Kat[]; budget: Record<string, SisaBudget>; style?: React.CSSProperties; className?: string;
}) {
  const awal = kategori[0]?.kode ?? '';
  const [kode, setKode] = useState(awal);
  const ref = useRef<HTMLSelectElement>(null);
  const b = budget[kode];

  // <select> uncontrolled agar ikut dibersihkan React setelah <form action={serverAction}>
  // selesai; `kode` hanya menyetir panel info sisa anggaran di bawahnya, jadi harus
  // disinkronkan kembali ke pilihan awal saat form ter-reset.
  usePadaResetForm(ref, () => setKode(awal));

  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <select ref={ref} className={className} name={name} defaultValue={awal} onChange={(e) => setKode(e.target.value)} style={{ width: '100%', ...style }}>
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
