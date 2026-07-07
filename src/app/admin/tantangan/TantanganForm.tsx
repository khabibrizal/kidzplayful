// src/app/admin/tantangan/TantanganForm.tsx — form buat/edit tantangan kustom
'use client';
import { useState } from 'react';
import { simpanTantangan } from '@/lib/data/tantangan-kustom-actions';
import { MESIN_LIST, type SyaratItem, type SyaratTipe } from '@/lib/domain/tantangan-kustom';
import type { OpsiTantangan, TantanganRow } from '@/lib/data/tantangan-kustom';
import type { LencanaDef } from '@/lib/domain/gamifikasi';
import s from '../admin.module.css';

const TIPE: { v: SyaratTipe; l: string }[] = [
  { v: 'apa', l: 'Game apa saja' },
  { v: 'mesin', l: 'Jenis game' },
  { v: 'tema', l: 'Tema' },
  { v: 'paket', l: 'Game spesifik' },
];

export default function TantanganForm({ opsi, lencana, awal }: { opsi: OpsiTantangan; lencana: LencanaDef[]; awal?: TantanganRow }) {
  const [judul, setJudul] = useState(awal?.judul ?? '');
  const [deskripsi, setDeskripsi] = useState(awal?.deskripsi ?? '');
  const [lencanaKode, setLencanaKode] = useState(awal?.lencana_kode ?? lencana[0]?.kode ?? '');
  const [bonusKoin, setBonusKoin] = useState(String(awal?.bonus_koin ?? 10));
  const [usiaMin, setUsiaMin] = useState(String(awal?.usia_min ?? 0));
  const [usiaMax, setUsiaMax] = useState(String(awal?.usia_max ?? 6));
  const [aktif, setAktif] = useState(awal?.aktif ?? true);
  const [syarat, setSyarat] = useState<SyaratItem[]>(awal?.syarat?.length ? awal.syarat : [{ tipe: 'apa', ref: null, jumlah: 1, minBintang: 0 }]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function ubah(i: number, patch: Partial<SyaratItem>) {
    setSyarat((arr) => arr.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  }
  function refOptions(tipe: SyaratTipe) {
    if (tipe === 'mesin') return MESIN_LIST.map((m) => ({ v: m.value, l: m.label }));
    if (tipe === 'tema') return opsi.tema.map((t) => ({ v: t.id, l: t.nama }));
    if (tipe === 'paket') return opsi.games.map((g) => ({ v: g.id, l: g.label }));
    return [];
  }

  async function simpan() {
    setBusy(true); setMsg('');
    try {
      await simpanTantangan({ id: awal?.id, judul, deskripsi, lencanaKode, bonusKoin: Number(bonusKoin), syarat, aktif, usiaMin: Number(usiaMin), usiaMax: Number(usiaMax) });
      setMsg('Tersimpan ✓');
      setTimeout(() => location.reload(), 500);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); setBusy(false); }
  }

  return (
    <div className={s.card}>
      <input className={s.inp} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul misi (mis. Jagoan Mewarnai)" style={{ width: '100%' }} />
      <textarea className={s.inp} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi singkat (opsional)" rows={2} style={{ width: '100%', marginTop: 8, resize: 'vertical' }} />

      <div className={s.section} style={{ marginTop: 6 }}>Syarat (semua harus terpenuhi)</div>
      {syarat.map((it, i) => (
        <div key={i} className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <select className={s.inp} value={it.tipe} onChange={(e) => ubah(i, { tipe: e.target.value as SyaratTipe, ref: null })}>
            {TIPE.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          {it.tipe !== 'apa' && (
            <select className={s.inp} value={it.ref ?? ''} onChange={(e) => ubah(i, { ref: e.target.value })} style={{ maxWidth: 200 }}>
              <option value="">— pilih —</option>
              {refOptions(it.tipe).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          )}
          <label style={{ fontSize: 12, color: 'var(--abu)' }}>×
            <input className={s.inp} value={it.jumlah} onChange={(e) => ubah(i, { jumlah: Number(e.target.value) })} inputMode="numeric" style={{ width: 56, marginLeft: 4 }} />
          </label>
          <select className={s.inp} value={it.minBintang} onChange={(e) => ubah(i, { minBintang: Number(e.target.value) })} title="skor minimal">
            <option value={0}>skor bebas</option>
            <option value={1}>min ⭐</option>
            <option value={2}>min ⭐⭐</option>
            <option value={3}>min ⭐⭐⭐</option>
          </select>
          {syarat.length > 1 && <button type="button" className={`${s.btnSm} ${s.danger}`} onClick={() => setSyarat((a) => a.filter((_, k) => k !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => setSyarat((a) => [...a, { tipe: 'apa', ref: null, jumlah: 1, minBintang: 0 }])}>+ Syarat</button>

      <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>Hadiah lencana
          <select className={s.inp} value={lencanaKode} onChange={(e) => setLencanaKode(e.target.value)} style={{ marginLeft: 6 }}>
            {lencana.map((l) => <option key={l.kode} value={l.kode}>{l.emoji} {l.judul}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>🪙 Bonus
          <input className={s.inp} value={bonusKoin} onChange={(e) => setBonusKoin(e.target.value)} inputMode="numeric" style={{ width: 70, marginLeft: 6 }} />
        </label>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>Usia
          <input className={s.inp} value={usiaMin} onChange={(e) => setUsiaMin(e.target.value)} inputMode="numeric" style={{ width: 46, margin: '0 4px' }} title="usia min" />–
          <input className={s.inp} value={usiaMax} onChange={(e) => setUsiaMax(e.target.value)} inputMode="numeric" style={{ width: 46, marginLeft: 4 }} title="usia maks" /> th
        </label>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} /> Aktif
        </label>
      </div>

      <div className={s.row} style={{ marginTop: 12 }}>
        <button className={s.btn} onClick={simpan} disabled={busy}>{awal ? '💾 Simpan perubahan' : '+ Buat tantangan'}</button>
        {msg && <span style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  );
}
