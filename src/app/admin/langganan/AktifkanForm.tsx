// src/app/admin/langganan/AktifkanForm.tsx
'use client';
import { useState } from 'react';
import { aktifkanLangganan } from '@/lib/data/admin-bisnis';
import s from '../admin.module.css';

export default function AktifkanForm({ ortuId, nominalDefault = '35000' }: { ortuId: string; nominalDefault?: string }) {
  const [nominal, setNominal] = useState(nominalDefault);
  const [via, setVia] = useState('transfer');
  const [loading, setLoading] = useState(false);

  async function aktif() {
    setLoading(true);
    try { await aktifkanLangganan(ortuId, Number(nominal) || 0, via); location.reload(); }
    finally { setLoading(false); }
  }

  return (
    <div className={s.row}>
      <input className={s.inp} value={nominal} onChange={(e) => setNominal(e.target.value)} style={{ width: 90 }} title="nominal" />
      <select className={s.inp} value={via} onChange={(e) => setVia(e.target.value)}>
        <option value="transfer">Transfer</option>
        <option value="qris">QRIS</option>
      </select>
      <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }} onClick={aktif} disabled={loading}>
        {loading ? '...' : 'Aktifkan'}
      </button>
    </div>
  );
}
