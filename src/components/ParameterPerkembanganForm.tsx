// src/components/ParameterPerkembanganForm.tsx — admin tetapkan parameter (area+indikator) event + duplikat
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { simpanParameterPerkembangan, duplikatParameterPerkembangan } from '@/lib/data/admin-event-actions';
import type { BarisParam } from '@/lib/game/tipe';
import s from '@/app/admin/admin.module.css';

export default function ParameterPerkembanganForm({ eventId, awal, opsiDuplikat }: {
  eventId: string; awal: BarisParam[]; opsiDuplikat: { id: string; judul: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<BarisParam[]>(() => (awal?.length ? awal.map((r) => ({ ...r })) : [{ area: '', indikator: '' }]));
  const [dari, setDari] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2500); }

  const set = (i: number, patch: Partial<BarisParam>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const hapus = (i: number) => setRows((r) => r.filter((_, j) => j !== i));
  const tambah = () => setRows((r) => [...r, { area: '', indikator: '' }]);

  async function simpan() {
    setBusy(true);
    try { await simpanParameterPerkembangan(eventId, rows); flash('Parameter tersimpan ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  }
  async function duplikat() {
    if (!dari) { flash('Pilih event sumber dulu.'); return; }
    setBusy(true);
    try { await duplikatParameterPerkembangan(eventId, dari); router.refresh(); flash('Parameter disalin ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {opsiDuplikat.length > 0 && (
        <div className={s.row} style={{ gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <select className={s.inp} value={dari} onChange={(e) => setDari(e.target.value)} style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
            <option value="">— Duplikat parameter dari event lain —</option>
            {opsiDuplikat.map((e) => <option key={e.id} value={e.id}>{e.judul}</option>)}
          </select>
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={duplikat} disabled={busy}>⧉ Duplikat</button>
        </div>
      )}

      {rows.map((r, i) => (
        <div key={i} className={s.row} style={{ gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <input className={s.inp} placeholder="Area perkembangan" value={r.area} onChange={(e) => set(i, { area: e.target.value })} style={{ flex: 1, minWidth: 130, marginBottom: 0 }} />
          <input className={s.inp} placeholder="Indikator" value={r.indikator} onChange={(e) => set(i, { indikator: e.target.value })} style={{ flex: 1, minWidth: 130, marginBottom: 0 }} />
          <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => hapus(i)} title="Hapus baris">✕</button>
        </div>
      ))}
      <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 4 }} onClick={tambah}>+ tambah baris</button>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className={s.btn} onClick={simpan} disabled={busy}>{busy ? '...' : '💾 Simpan Parameter'}</button>
        {msg && <span style={{ fontSize: 13, color: msg.includes('✓') ? '#1c7a43' : '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  );
}
