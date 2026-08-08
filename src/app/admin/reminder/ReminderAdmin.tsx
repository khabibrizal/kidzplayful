// src/app/admin/reminder/ReminderAdmin.tsx
'use client';
import { useState } from 'react';
import { tandaiReminder, simpanPesanReminder } from '@/lib/data/admin-reminder-actions';
import { susunPesanReminder, jadwalUntukKelas } from '@/lib/domain/reminder';
import type { ReminderRow } from '@/lib/data/admin-reminder';
import { formatTanggal, linkWa } from '@/lib/format';
import s from '../admin.module.css';

export default function ReminderAdmin({ rows, todayStr, besokStr }: { rows: ReminderRow[]; todayStr: string; besokStr: string }) {
  const [list, setList] = useState<ReminderRow[]>(rows);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [pesan, setPesan] = useState<Record<string, string>>(() => Object.fromEntries(rows.filter((r) => r.event).map((r) => [r.event!.id, r.event!.pesan_reminder ?? ''])));
  const [simpanBusy, setSimpanBusy] = useState<string | null>(null);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2000); }

  function pesanWa(r: ReminderRow, ev: NonNullable<ReminderRow['event']>, pesanManual: string): string {
    // Jadwal diambil sesuai KELAS pendaftaran — pada event yang dipisah Baby/Toddler,
    // jam level event sering kosong sehingga pesan jadi tanpa jam sama sekali.
    const j = jadwalUntukKelas(ev, r.kelas);
    return susunPesanReminder({
      nama: r.nama, judul: ev.judul, tanggal: j.tanggal, tanggalFmt: j.tanggal ? formatTanggal(j.tanggal) : undefined,
      jamMulai: j.jamMulai, jamSelesai: j.jamSelesai, lokasi: ev.lokasi, anakNama: r.anak_nama, kelas: r.kelas, pesanManual,
    });
  }

  async function simpanPesan(eventId: string) {
    setSimpanBusy(eventId);
    const r = await simpanPesanReminder(eventId, pesan[eventId] ?? '');
    setSimpanBusy(null);
    flash(r.ok ? 'Pesan tersimpan ✓' : (r.error ?? 'Gagal'));
  }

  async function toggle(r: ReminderRow) {
    setBusy(r.id);
    const baru = !r.reminder_terkirim;
    try { await tandaiReminder(r.id, baru); setList((l) => l.map((x) => (x.id === r.id ? { ...x, reminder_terkirim: baru } : x))); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusy(null); }
  }

  if (list.length === 0) return <p className={s.muted}>Tidak ada peserta pada event apa pun.</p>;

  // kelompokkan per event
  const grup = new Map<string, ReminderRow[]>();
  for (const r of list) { const k = r.event!.id; if (!grup.has(k)) grup.set(k, []); grup.get(k)!.push(r); }

  // Pencarian mencakup NAMA ANAK & NAMA ORANG TUA (seperti halaman pendaftar), bukan
  // hanya judul event. Bila judul event yang cocok, seluruh pesertanya ditampilkan.
  const kata = q.trim().toLowerCase();
  const cocokOrang = (r: ReminderRow) =>
    (r.nama ?? '').toLowerCase().includes(kata) ||
    (r.anak_nama ?? []).some((n) => (n ?? '').toLowerCase().includes(kata));
  const grupSemua = [...grup.values()];
  const hasilGrup = grupSemua.map((pe) => {
    if (!kata) return { pe, anggota: pe, tampil: true };
    const judulCocok = pe[0].event!.judul.toLowerCase().includes(kata);
    const anggota = judulCocok ? pe : pe.filter(cocokOrang);
    return { pe, anggota, tampil: anggota.length > 0 };
  });
  const jmlTampil = hasilGrup.filter((g) => g.tampil).length;

  return (
    <div>
      <input className={s.inp} placeholder="🔎 Cari nama anak / orang tua / event…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      {!!kata && jmlTampil === 0 && <p className={s.muted}>Tidak ada yang cocok dengan &quot;{q}&quot;.</p>}
      {/* Grup yang tidak cocok DISEMBUNYIKAN, bukan di-unmount: tiap grup punya textarea
          pesan reminder, dan meng-unmount-nya membuang teks yang belum ditekan Simpan. */}
      {hasilGrup.map(({ pe, anggota, tampil }) => {
        const peserta = anggota;
        const ev = pe[0].event!;
        const label = ev.tanggal === besokStr ? 'BESOK (H-1)' : ev.tanggal === todayStr ? 'HARI INI' : (ev.tanggal ? formatTanggal(ev.tanggal) : 'tanpa tanggal');
        const besok = ev.tanggal === besokStr;
        return (
          <div key={ev.id} className={s.card} style={{ ...(besok ? { border: '2px solid var(--lavender)' } : {}), ...(tampil ? {} : { display: 'none' }) }}>
            <div className={s.row}>
              <span style={{ flex: 1 }}><b>🎈 {ev.judul}</b></span>
              {!!kata && <span className={s.tag} style={{ background: '#e7f0fb', color: '#1b5fa8' }}>{peserta.length} hasil</span>}
              <span className={s.tag} style={{ background: besok ? '#efe7fb' : '#eee', color: besok ? 'var(--lavender-d)' : 'var(--abu)' }}>{label}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <div className={s.muted} style={{ fontSize: 12, marginBottom: 4 }}>✍️ Pesan reminder (opsional) — detail event & nama anak otomatis ditambahkan</div>
              <textarea className={s.inp} rows={2} placeholder="mis. Bawa baju ganti & botol minum ya 🙏" value={pesan[ev.id] ?? ''} onChange={(e) => setPesan((p) => ({ ...p, [ev.id]: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => simpanPesan(ev.id)} disabled={simpanBusy === ev.id}>{simpanBusy === ev.id ? '...' : '💾 Simpan pesan'}</button>
            </div>
            {peserta.map((r) => {
              const href = linkWa(r.no_wa, pesanWa(r, ev, pesan[ev.id] ?? ''));
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
