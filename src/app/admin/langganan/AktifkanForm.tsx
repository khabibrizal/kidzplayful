// src/app/admin/langganan/AktifkanForm.tsx
'use client';
import { useState } from 'react';
import { aktifkanLangganan } from '@/lib/data/admin-bisnis';
import { METODE_BAYAR } from '@/lib/metode';
import s from '../admin.module.css';

const fmt = (v: string) => { const d = v.replace(/[^0-9]/g, ''); return d ? Number(d).toLocaleString('id-ID') : ''; };

export default function AktifkanForm({ ortuId, nominalDefault = '35000' }: { ortuId: string; nominalDefault?: string }) {
  const [nominal, setNominal] = useState(fmt(nominalDefault));
  const [via, setVia] = useState('transfer');
  const [loading, setLoading] = useState(false);

  async function aktif() {
    setLoading(true);
    try { await aktifkanLangganan(ortuId, Number(nominal.replace(/[^0-9]/g, '')) || 0, via); location.reload(); }
    finally { setLoading(false); }
  }

  return (
    <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
      <input className={s.inp} value={nominal} inputMode="numeric" onChange={(e) => setNominal(fmt(e.target.value))} style={{ width: 110 }} title="nominal (Rp)" placeholder="Nominal" />
      <select className={s.inp} value={via} onChange={(e) => setVia(e.target.value)}>
        {METODE_BAYAR.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
      </select>
      <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }} onClick={aktif} disabled={loading}>
        {loading ? '...' : 'Aktifkan'}
      </button>
    </div>
  );
}
