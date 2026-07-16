// src/app/admin/event/DownloadPesertaBtn.tsx — unduh CSV peserta event, dikelompokkan per kelas
'use client';
import { useState } from 'react';
import { getPesertaEkspor } from '@/lib/data/admin-event-actions';
import s from '../admin.module.css';

const KELAS_URUT = ['Baby Class', 'Toddler Class', 'Gabungan'];

export default function DownloadPesertaBtn({ eventId, judul }: { eventId: string; judul: string }) {
  const [busy, setBusy] = useState(false);

  async function unduh() {
    setBusy(true);
    try {
      const rows = await getPesertaEkspor(eventId);
      if (!rows.length) { alert('Belum ada peserta untuk event ini.'); return; }
      // kelompokkan per kelas
      const grup = new Map<string, typeof rows>();
      for (const r of rows) { const g = grup.get(r.kelas); if (g) g.push(r); else grup.set(r.kelas, [r]); }
      const urutan = [...KELAS_URUT.filter((k) => grup.has(k)), ...[...grup.keys()].filter((k) => !KELAS_URUT.includes(k))];
      const esc = (v: string) => { const t = v ?? ''; return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
      const lines: string[] = [`Peserta: ${judul}`, ''];
      for (const k of urutan) {
        const list = grup.get(k)!;
        lines.push(esc(`${k} (${list.length})`));
        lines.push('No,Nama Panggilan,Nama Lengkap,Tgl Lahir (Umur),Nama Orang Tua');
        list.forEach((r, i) => lines.push([
          i + 1, esc(r.namaPanggilan), esc(r.namaLengkap),
          esc(`${r.tglLahir}${r.umur ? ` (${r.umur})` : ''}`), esc(r.namaOrtu),
        ].join(',')));
        lines.push('');
      }
      const csv = '﻿' + lines.join('\r\n'); // BOM agar Excel baca UTF-8
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peserta-${(judul || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e instanceof Error ? e.message : 'Gagal mengunduh'); }
    finally { setBusy(false); }
  }

  return (
    <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} onClick={unduh} disabled={busy}>
      {busy ? '...' : '⬇ Peserta'}
    </button>
  );
}
