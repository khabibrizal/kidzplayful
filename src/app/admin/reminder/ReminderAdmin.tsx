// src/app/admin/reminder/ReminderAdmin.tsx
'use client';
import { useState } from 'react';
import { tandaiReminder } from '@/lib/data/admin-reminder-actions';
import type { ReminderRow } from '@/lib/data/admin-reminder';
import { formatTanggal, linkWa } from '@/lib/format';
import s from '../admin.module.css';

function pesanReminder(nama: string | null, ev: NonNullable<ReminderRow['event']>) {
  const tgl = ev.tanggal ? formatTanggal(ev.tanggal) : 'besok';
  const jam = ev.jam_mulai ? `, pukul ${ev.jam_mulai}${ev.jam_selesai ? `-${ev.jam_selesai}` : ''} WIB` : '';
  const lok = ev.lokasi ? ` di ${ev.lokasi}` : '';
  return `Halo Kak ${nama ?? ''} 👋 Pengingat: besok ${tgl} ada *${ev.judul}*${lok}${jam}. Mohon hadir tepat waktu ya. Sampai jumpa! — KidzPlayful`;
}

export default function ReminderAdmin({ rows, todayStr, besokStr }: { rows: ReminderRow[]; todayStr: string; besokStr: string }) {
  const [list, setList] = useState<ReminderRow[]>(rows);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2000); }

  async function toggle(r: ReminderRow) {
    setBusy(r.id);
    const baru = !r.reminder_terkirim;
    try { await tandaiReminder(r.id, baru); setList((l) => l.map((x) => (x.id === r.id ? { ...x, reminder_terkirim: baru } : x))); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusy(null); }
  }

  if (list.length === 0) return <p className={s.muted}>Tidak ada peserta pada event mendatang.</p>;

  // kelompokkan per event
  const grup = new Map<string, ReminderRow[]>();
  for (const r of list) { const k = r.event!.id; if (!grup.has(k)) grup.set(k, []); grup.get(k)!.push(r); }

  return (
    <div>
      {[...grup.values()].map((peserta) => {
        const ev = peserta[0].event!;
        const label = ev.tanggal === besokStr ? 'BESOK (H-1)' : ev.tanggal === todayStr ? 'HARI INI' : (ev.tanggal ? formatTanggal(ev.tanggal) : 'tanpa tanggal');
        const besok = ev.tanggal === besokStr;
        return (
          <div key={ev.id} className={s.card} style={besok ? { border: '2px solid var(--lavender)' } : undefined}>
            <div className={s.row}>
              <span style={{ flex: 1 }}><b>🎈 {ev.judul}</b></span>
              <span className={s.tag} style={{ background: besok ? '#efe7fb' : '#eee', color: besok ? 'var(--lavender-d)' : 'var(--abu)' }}>{label}</span>
            </div>
            {peserta.map((r) => {
              const href = linkWa(r.no_wa, pesanReminder(r.nama, ev));
              return (
                <div key={r.id} className={s.row} style={{ marginTop: 8, flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, minWidth: 140 }}>
                    <b>{r.nama || '(tanpa nama)'}</b> <small className={s.muted}>· {r.anak_nama.join(', ')}</small>
                    <br /><small className={s.muted}>{r.no_wa || 'no WA belum ada'}</small>
                  </span>
                  {href
                    ? <a className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} href={href} target="_blank" rel="noreferrer">💬 Kirim WA</a>
                    : <span className={s.muted} style={{ fontSize: 12 }}>tak bisa dikirim</span>}
                  <button className={s.btnSm} style={{ background: r.reminder_terkirim ? '#dff5e6' : '#eee', color: r.reminder_terkirim ? '#1c7a43' : 'var(--abu)' }} onClick={() => toggle(r)} disabled={busy === r.id}>
                    {r.reminder_terkirim ? '✓ terkirim' : 'tandai terkirim'}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
