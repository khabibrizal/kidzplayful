// src/app/admin/tantangan/TantanganList.tsx — daftar tantangan kustom + aksi (admin)
'use client';
import { useState } from 'react';
import { setAktifTantangan, hapusTantangan } from '@/lib/data/tantangan-kustom-actions';
import { ringkasSyarat } from '@/lib/domain/tantangan-kustom';
import type { OpsiTantangan, TantanganRow } from '@/lib/data/tantangan-kustom';
import type { LencanaDef } from '@/lib/domain/gamifikasi';
import { lencanaByKode } from '@/lib/domain/gamifikasi';
import TantanganForm from './TantanganForm';
import s from '../admin.module.css';

export default function TantanganList({ list, opsi, lencana }: { list: TantanganRow[]; opsi: OpsiTantangan; lencana: LencanaDef[] }) {
  const [edit, setEdit] = useState<string | null>(null);
  const labelTema = (ref: string) => opsi.tema.find((t) => t.id === ref)?.nama ?? ref;
  const labelPaket = (ref: string) => opsi.games.find((g) => g.id === ref)?.label ?? ref;

  async function toggle(t: TantanganRow) { await setAktifTantangan(t.id, !t.aktif); location.reload(); }
  async function hapus(t: TantanganRow) { if (confirm(`Hapus tantangan "${t.judul}"?`)) { await hapusTantangan(t.id); location.reload(); } }

  if (list.length === 0) return <p className={s.muted}>Belum ada tantangan.</p>;

  return (
    <>
      {list.map((t) => (
        <div key={t.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}>
              <b>{lencanaByKode(t.lencana_kode)?.emoji ?? '🏅'} {t.judul}</b>
              <span className={s.muted}> · usia {t.usia_min}–{t.usia_max} th</span>
              {t.bonus_koin > 0 && <span className={s.muted}> · 🪙+{t.bonus_koin}</span>}
              <br />
              <span className={s.muted}>{(t.syarat ?? []).map((it) => ringkasSyarat(it, labelPaket, labelTema)).join(' · ')}</span>
            </span>
            <span className={`${s.tag} ${t.aktif ? s.tagOk : s.tagDraf}`}>{t.aktif ? 'aktif' : 'nonaktif'}</span>
          </div>
          <div className={s.row} style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => setEdit(edit === t.id ? null : t.id)}>{edit === t.id ? 'Tutup' : 'Edit'}</button>
            <button className={s.btnSm} style={{ background: t.aktif ? '#fff3d6' : '#e6f7ee', color: t.aktif ? '#b88600' : '#2e9e63' }} onClick={() => toggle(t)}>{t.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(t)}>Hapus</button>
          </div>
          {edit === t.id && <div style={{ marginTop: 10 }}><TantanganForm opsi={opsi} lencana={lencana} awal={t} /></div>}
        </div>
      ))}
    </>
  );
}
