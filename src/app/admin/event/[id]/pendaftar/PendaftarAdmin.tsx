// src/app/admin/event/[id]/pendaftar/PendaftarAdmin.tsx
'use client';
import { useState } from 'react';
import { setStatusPendaftaran, setKehadiran, reschedulePendaftaran, pindahKelasPendaftaran } from '@/lib/data/admin-event-actions';
import type { PendaftaranEvent, BarisParam, BarisNilai } from '@/lib/game/tipe';
import { formatRupiah, linkWa } from '@/lib/format';
import NilaiPerkembanganForm from '@/components/NilaiPerkembanganForm';
import BuktiLightbox from '@/components/BuktiLightbox';
import s from '../../../admin.module.css';

const WARNA: Record<string, string> = { menunggu: '#b88600', diterima: '#1c7a43', ditolak: '#b3261e' };

function waktuDaftar(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
}

// `kelas` = kelas yang DITAWARKAN event tujuan ('baby'/'toddler'); kosong = berjadwal tunggal.
type EventOpsi = { id: string; judul: string; tanggal: string | null; kelas?: string[] };

// Preset cepat, nilainya dalam BULAN. Labelnya memakai satuan yang wajar dibaca
// (bulan untuk bayi, tahun setelahnya) supaya admin tak perlu berhitung sendiri.
const PRESET_USIA: { label: string; min: string; maks: string }[] = [
  { label: '0–12 bln', min: '0', maks: '12' },
  { label: '1–2 th', min: '12', maks: '24' },
  { label: '2–3 th', min: '24', maks: '36' },
  { label: '3–4 th', min: '36', maks: '48' },
  { label: '4 th+', min: '48', maks: '' },
];

export default function PendaftarAdmin({ awal, sertMap, eventsAktif, params = [], catatanMap = {}, umurMap = {}, umurBulanMap = {}, ortuMap = {}, kuota = {}, waMap = {}, judulEvent = 'Event', kelasTersedia = [] }: {
  awal: PendaftaranEvent[]; sertMap: Record<string, string>; eventsAktif: EventOpsi[];
  params?: BarisParam[]; catatanMap?: Record<string, { penilaian: BarisNilai[]; catatan: string | null }>;
  umurMap?: Record<string, string>;
  umurBulanMap?: Record<string, number>;
  ortuMap?: Record<string, string>;
  kuota?: Record<string, number | null>;
  waMap?: Record<string, string>;
  judulEvent?: string;
  kelasTersedia?: string[];
}) {
  const [list, setList] = useState<PendaftaranEvent[]>(awal);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [cari, setCari] = useState('');
  const [rsOpen, setRsOpen] = useState<string | null>(null); // id pendaftaran yang form reschedule-nya terbuka
  const [rsEvent, setRsEvent] = useState<Record<string, string>>({});
  const [rsKelas, setRsKelas] = useState<Record<string, string>>({});   // kelas tujuan saat reschedule
  const [rsAlasan, setRsAlasan] = useState<Record<string, string>>({});
  const [pkOpen, setPkOpen] = useState<string | null>(null);   // id pendaftaran yg panel pindah-kelas terbuka
  const [pkTarget, setPkTarget] = useState<Record<string, string>>({});
  const [tutup, setTutup] = useState<Record<string, boolean>>({}); // grup kelas yang DITUTUP admin
  const [uMin, setUMin] = useState('');   // filter usia minimal (bulan), '' = tanpa batas
  const [uMaks, setUMaks] = useState(''); // filter usia maksimal (bulan), '' = tanpa batas
  // Urutan waktu daftar. Default 'baru' = urutan yang dikirim server
  // (`getPendaftaranByEvent` sudah order created_at desc), jadi tampilan awal tak berubah.
  const [urut, setUrut] = useState<'baru' | 'lama'>('baru');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2000); }

  async function reschedule(p: PendaftaranEvent) {
    const target = rsEvent[p.id];
    const alasan = (rsAlasan[p.id] ?? '').trim();
    if (!target) { flash('Pilih event tujuan.'); return; }
    if (!alasan) { flash('Isi alasan reschedule.'); return; }
    // Kelas tujuan: nilai yang dipilih admin, atau kelas saat ini bila event tujuan
    // memang menawarkannya. Bila keduanya kosong, server yang menolak dengan pesan jelas
    // (jangan menebak 'gabungan' di sini — itu justru bug yang sedang diperbaiki).
    const opsiTujuan = eventsAktif.find((e) => e.id === target)?.kelas ?? [];
    const kelasKini = p.kelas === 'baby' || p.kelas === 'toddler' ? p.kelas : '';
    const kelasTujuan = rsKelas[p.id] || (opsiTujuan.includes(kelasKini) ? kelasKini : '');
    if (opsiTujuan.length > 0 && !kelasTujuan) { flash('Pilih kelas di event tujuan dulu.'); return; }
    setBusyId(p.id);
    try {
      await reschedulePendaftaran(p.id, target, alasan, kelasTujuan || null);
      setList((l) => l.filter((x) => x.id !== p.id)); // pindah ke event lain → hilang dari daftar event ini
      setRsOpen(null);
      flash('Reschedule berhasil ✓');
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  const LABEL_KELAS: Record<string, string> = { baby: '👶 Baby Class', toddler: '🧒 Toddler Class', gabungan: 'Gabungan' };

  /** Pesan WA konfirmasi ke ortu sebelum pindah kelas. */
  function waKonfirmasi(p: PendaftaranEvent): string | null {
    const anak = (p.anak_nama ?? []).join(', ') || 'ananda';
    const kelasKini = LABEL_KELAS[p.kelas ?? 'gabungan'] ?? (p.kelas ?? '-');
    const pesan = `Halo Kak ${ortuMap[p.ortu_id] ?? ''} 👋

Terkait pendaftaran *${judulEvent}* untuk ${anak} (saat ini ${kelasKini}), kami ingin konfirmasi: apakah bersedia dipindahkan ke kelas lain sesuai ketersediaan jadwal/kuota?

Mohon balas ya, terima kasih 🙏
— KidzPlayful`;
    return linkWa(waMap[p.ortu_id], pesan);
  }

  async function pindahKelas(p: PendaftaranEvent) {
    const target = pkTarget[p.id];
    if (!target) { flash('Pilih kelas tujuan.'); return; }
    if (!confirm(`Pindahkan ${(p.anak_nama ?? []).join(', ') || 'pendaftar ini'} ke ${LABEL_KELAS[target] ?? target}?

Pastikan sudah konfirmasi ke orang tua (tombol 💬 WA).`)) return;
    setBusyId(p.id);
    try {
      const r = await pindahKelasPendaftaran(p.id, target as 'baby' | 'toddler' | 'gabungan');
      if (!r.ok) { flash(r.error ?? 'Gagal memindahkan kelas'); return; }
      setList((l) => l.map((x) => (x.id === p.id ? { ...x, kelas: r.kelas ?? target, kelas_jadwal: r.kelasJadwal ?? x.kelas_jadwal } : x)));
      setPkOpen(null);
      flash('Kelas dipindahkan ✓');
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  async function ubah(p: PendaftaranEvent, status: 'diterima' | 'ditolak') {
    let alasan: string | undefined;
    if (status === 'ditolak') {
      const j = window.prompt('Alasan penolakan (akan tampil ke orang tua):', p.alasan_tolak ?? '');
      if (j === null) return; // batal
      if (!j.trim()) { flash('Alasan penolakan wajib diisi.'); return; }
      alasan = j.trim();
    }
    setBusyId(p.id);
    try {
      await setStatusPendaftaran(p.id, status, alasan);
      setList(list.map((x) => (x.id === p.id ? { ...x, status, alasan_tolak: status === 'ditolak' ? alasan : null } : x)));
      flash(status === 'diterima' ? 'Diterima ✓' : 'Ditolak');
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  async function absen(p: PendaftaranEvent, anakId: string, hadir: boolean) {
    const key = `${p.id}:${anakId}`;
    setBusyId(key);
    try {
      const baru = await setKehadiran(p.id, anakId, hadir);
      setList(list.map((x) => (x.id === p.id ? { ...x, hadir_anak_ids: baru } : x)));
      flash(hadir ? 'Ditandai hadir ✓' : 'Batal hadir');
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  if (list.length === 0) return <p className={s.muted}>Belum ada pendaftar.</p>;

  const totalHadir = list.reduce((n, p) => n + (p.hadir_anak_ids?.length ?? 0), 0);
  const q = cari.trim().toLowerCase();

  // --- Filter rentang usia (satuan BULAN) ------------------------------------
  // Bulan, bukan tahun: kelas Baby biasanya 6-18 bulan — rentang seperti itu tidak
  // bisa dinyatakan dalam tahun bulat. Kosong = tanpa batas di sisi itu.
  const angkaAtauNull = (v: string): number | null => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };
  const bMin = angkaAtauNull(uMin);
  const bMaks = angkaAtauNull(uMaks);
  const pakaiUsia = bMin !== null || bMaks !== null;
  const rentangSalah = bMin !== null && bMaks !== null && bMin > bMaks;

  // Sebuah PENDAFTARAN lolos bila punya MINIMAL SATU anak di dalam rentang.
  // Anak tanpa tanggal lahir tidak punya umur → tidak dianggap cocok saat filter aktif.
  const cocokUsia = (p: PendaftaranEvent) => {
    if (!pakaiUsia || rentangSalah) return true;
    return (p.anak_ids ?? []).some((id) => {
      const b = umurBulanMap[id];
      if (b == null) return false;
      if (bMin !== null && b < bMin) return false;
      if (bMaks !== null && b > bMaks) return false;
      return true;
    });
  };
  const cocokCari = (p: PendaftaranEvent) =>
    !q || (p.anak_nama ?? []).some((n) => (n ?? '').toLowerCase().includes(q)) || (ortuMap[p.ortu_id] ?? '').toLowerCase().includes(q);
  const lolos = (p: PendaftaranEvent) => cocokCari(p) && cocokUsia(p);
  const menyaring = !!q || (pakaiUsia && !rentangSalah);

  const tampil = list.filter(lolos);

  // --- Urutan waktu daftar ---------------------------------------------------
  // Pendaftaran tanpa `created_at` (data lama) selalu ditaruh PALING BAWAH di kedua
  // arah — kalau tidak, "terlama" akan diawali baris yang justru tak diketahui waktunya.
  const msDaftar = (p: PendaftaranEvent) => (p.created_at ? new Date(p.created_at).getTime() : NaN);
  const urutkan = (arr: PendaftaranEvent[]) => [...arr].sort((a, b) => {
    const ta = msDaftar(a), tb = msDaftar(b);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.isNaN(ta) ? (Number.isNaN(tb) ? 0 : 1) : -1;
    return urut === 'baru' ? tb - ta : ta - tb;
  });

  const GRUP: { key: string; label: string }[] = [
    { key: 'baby', label: '👶 Baby Class' },
    { key: 'toddler', label: '🧒 Toddler Class' },
    { key: 'gabungan', label: 'Gabungan' },
  ];

  // `tampil=false` → kartu DISEMBUNYIKAN, bukan di-unmount. Kartu memuat
  // NilaiPerkembanganForm dengan state sendiri, jadi meng-unmount saat admin mengetik
  // di kotak cari / filter usia akan membuang penilaian yang belum ditekan Simpan.
  const kartu = (p: PendaftaranEvent, tampil = true) => (
        <div key={p.id} className={s.card} style={tampil ? undefined : { display: 'none' }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}>
              <b>{p.anak_ids?.length ? p.anak_ids.map((id, i) => `${p.anak_nama[i] ?? 'Anak'}${umurMap[id] ? ` (${umurMap[id]})` : ''}`).join(', ') : (p.anak_nama.join(', ') || `${p.jumlah_anak} anak`)}</b>
              {ortuMap[p.ortu_id] && <><br /><small className={s.muted}>👤 Orang tua: {ortuMap[p.ortu_id]}</small></>}
              <br /><small className={s.muted}>{p.jumlah_anak} anak{p.jumlah_pendamping ? ` + ${p.jumlah_pendamping} pendamping` : ''} · {formatRupiah(p.total)}</small>
              {p.created_at && <><br /><small className={s.muted}>🕐 Daftar: {waktuDaftar(p.created_at)}</small></>}
              {p.kelas && p.kelas !== 'gabungan' && <><br /><small className={s.muted}>{p.kelas === 'baby' ? '👶 Baby Class' : p.kelas === 'toddler' ? '🧒 Toddler Class' : p.kelas}{p.kelas_jadwal ? ` · ${p.kelas_jadwal}` : ''}</small></>}
              {p.alasan_reschedule && <><br /><small className={s.muted}>🔁 Direschedule: {p.alasan_reschedule}</small></>}
              {p.status === 'ditolak' && p.alasan_tolak && <><br /><small style={{ color: '#b3261e' }}>❌ Alasan ditolak: {p.alasan_tolak}</small></>}
            </span>
            <span className={s.tag} style={{ background: '#f3f0fb', color: WARNA[p.status] }}>{p.status}</span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {p.bukti_url
              ? <BuktiLightbox url={p.bukti_url} />
              : <span className={s.muted}>tanpa bukti</span>}
            <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} onClick={() => ubah(p, 'diterima')} disabled={busyId === p.id || p.status === 'diterima'}>Terima</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => ubah(p, 'ditolak')} disabled={busyId === p.id || p.status === 'ditolak'}>Tolak</button>
            {waKonfirmasi(p)
              ? <a className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }} href={waKonfirmasi(p)!} target="_blank" rel="noreferrer" title="Konfirmasi ke orang tua via WhatsApp">💬 WA</a>
              : <span className={s.muted} style={{ fontSize: 11 }}>no WA belum ada</span>}
            {p.status !== 'ditolak' && kelasTersedia.length > 0 && (
              <button className={s.btnSm} style={{ background: '#e7f0fb', color: '#1b5fa8' }} onClick={() => setPkOpen(pkOpen === p.id ? null : p.id)} disabled={busyId === p.id} title="Pindah kategori kelas dalam event ini">🔀 Pindah kelas</button>
            )}
            {p.status !== 'ditolak' && (
              <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => setRsOpen(rsOpen === p.id ? null : p.id)} disabled={busyId === p.id}>🔁 Reschedule</button>
            )}
          </div>

          {pkOpen === p.id && (() => {
            const nAnak = p.jumlah_anak ?? (p.anak_nama?.length ?? 0);
            const terpakaiKelas = (k: string) => list
              .filter((x) => x.status !== 'ditolak' && ((x.kelas === 'baby' || x.kelas === 'toddler') ? x.kelas : 'gabungan') === k && x.id !== p.id)
              .reduce((n, x) => n + (x.jumlah_anak ?? (x.anak_nama?.length ?? 0)), 0);
            const opsi = kelasTersedia.filter((k) => k !== (p.kelas ?? 'gabungan'));
            return (
              <div style={{ marginTop: 8, borderTop: '1px dashed #e6e0f2', paddingTop: 8 }}>
                <div className={s.muted} style={{ fontSize: 12, marginBottom: 6 }}>
                  Pindah kategori kelas dalam event ini (jadwal kelas ikut diperbarui). <b>Konfirmasi dulu ke orang tua</b> lewat tombol 💬 WA ya.
                </div>
                {opsi.length === 0 ? (
                  <div className={s.muted} style={{ fontSize: 12 }}>Tidak ada kelas tujuan lain di event ini.</div>
                ) : (
                  <>
                    <select className={s.inp} value={pkTarget[p.id] ?? ''} onChange={(e) => setPkTarget({ ...pkTarget, [p.id]: e.target.value })} style={{ width: '100%', marginBottom: 6 }}>
                      <option value="">— pilih kelas tujuan —</option>
                      {opsi.map((k) => {
                        const kv = kuota[k];
                        const sisa = kv != null && kv > 0 ? Math.max(0, kv - terpakaiKelas(k)) : null;
                        const cukup = sisa === null || sisa >= nAnak;
                        return <option key={k} value={k} disabled={!cukup}>
                          {LABEL_KELAS[k] ?? k}{sisa !== null ? ` · sisa ${sisa} anak${cukup ? '' : ' (tidak cukup)'}` : ''}
                        </option>;
                      })}
                    </select>
                    <div className={s.row} style={{ gap: 6 }}>
                      <button className={s.btn} onClick={() => pindahKelas(p)} disabled={busyId === p.id}>Pindahkan</button>
                      <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => setPkOpen(null)} disabled={busyId === p.id}>Batal</button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {rsOpen === p.id && (
            <div style={{ marginTop: 8, borderTop: '1px dashed #e6e0f2', paddingTop: 8 }}>
              {eventsAktif.length === 0 ? (
                <div className={s.muted} style={{ fontSize: 12 }}>Belum ada event lain berstatus <b>tampil</b> untuk tujuan reschedule. Buat/aktifkan event lain dulu di menu Event.</div>
              ) : (
                <>
                  <div className={s.muted} style={{ fontSize: 12, marginBottom: 6 }}>Pindahkan ke event aktif lain (pembayaran ikut terbawa, absensi direset):</div>
                  <select className={s.inp} value={rsEvent[p.id] ?? ''} onChange={(e) => setRsEvent({ ...rsEvent, [p.id]: e.target.value })} style={{ width: '100%', marginBottom: 6 }}>
                    <option value="">— pilih event tujuan —</option>
                    {eventsAktif.map((e) => <option key={e.id} value={e.id}>{e.judul}{e.tanggal ? ` (${e.tanggal})` : ''}</option>)}
                  </select>
                  {/* Kelas tujuan — hanya bila event tujuan MEMANG punya kelas terpisah.
                      Dulu bagian ini tidak ada, sehingga pendaftaran yang kelasnya belum
                      diketahui (NULL / dari event berjadwal tunggal) mendarat di Gabungan
                      tanpa admin pernah diberi kesempatan menentukannya. */}
                  {(() => {
                    const tujuan = eventsAktif.find((e) => e.id === rsEvent[p.id]);
                    const opsi = tujuan?.kelas ?? [];
                    if (opsi.length === 0) return null;
                    const kelasKini = p.kelas === 'baby' || p.kelas === 'toddler' ? p.kelas : '';
                    // Saran usia hanya dipakai bila kelas lamanya tidak diketahui: <24 bln = Baby.
                    const umurAnak = (p.anak_ids ?? []).map((id) => umurBulanMap[id]).filter((n): n is number => n != null);
                    const saranUsia = umurAnak.length > 0 && umurAnak.every((n) => n < 24) ? 'baby'
                      : umurAnak.length > 0 && umurAnak.every((n) => n >= 24) ? 'toddler' : '';
                    const bawaan = (kelasKini && opsi.includes(kelasKini)) ? kelasKini : (opsi.includes(saranUsia) ? saranUsia : '');
                    const nilai = rsKelas[p.id] ?? bawaan;
                    return (
                      <>
                        <select className={s.inp} value={nilai} onChange={(e) => setRsKelas({ ...rsKelas, [p.id]: e.target.value })} style={{ width: '100%', marginBottom: 4 }}>
                          <option value="">— pilih kelas di event tujuan —</option>
                          {opsi.map((k) => <option key={k} value={k}>{LABEL_KELAS[k] ?? k}</option>)}
                          <option value="gabungan">Gabungan</option>
                        </select>
                        <div className={s.muted} style={{ fontSize: 11, marginBottom: 6 }}>
                          {kelasKini
                            ? `Kelas saat ini: ${LABEL_KELAS[kelasKini] ?? kelasKini} — dipertahankan bila tersedia di event tujuan.`
                            : saranUsia
                              ? `Pendaftaran ini belum punya kategori kelas; saran dari usia anak: ${LABEL_KELAS[saranUsia]}.`
                              : 'Pendaftaran ini belum punya kategori kelas — pilih kelas tujuannya ya.'}
                        </div>
                      </>
                    );
                  })()}
                  <textarea className={s.inp} rows={2} placeholder="Alasan reschedule (mis. anak sakit)" value={rsAlasan[p.id] ?? ''} onChange={(e) => setRsAlasan({ ...rsAlasan, [p.id]: e.target.value })} style={{ width: '100%', resize: 'vertical', marginBottom: 6 }} />
                  <div className={s.row} style={{ gap: 6 }}>
                    <button className={s.btn} onClick={() => reschedule(p)} disabled={busyId === p.id}>Pindahkan</button>
                    <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => setRsOpen(null)} disabled={busyId === p.id}>Batal</button>
                  </div>
                </>
              )}
            </div>
          )}

          {p.status === 'diterima' && (
            <div style={{ marginTop: 8, borderTop: '1px dashed #e6e0f2', paddingTop: 8 }}>
              <div className={s.muted} style={{ fontSize: 12, marginBottom: 6 }}>Absensi kehadiran (untuk e-sertifikat):</div>
              <div className={s.row} style={{ flexWrap: 'wrap', gap: 6 }}>
                {p.anak_ids.map((anakId, i) => {
                  const hadir = p.hadir_anak_ids.includes(anakId);
                  const key = `${p.id}:${anakId}`;
                  return (
                    <button
                      key={anakId}
                      className={s.btnSm}
                      style={hadir
                        ? { background: '#1c7a43', color: '#fff' }
                        : { background: '#f3f0fb', color: 'var(--abu)' }}
                      onClick={() => absen(p, anakId, !hadir)}
                      disabled={busyId === key}
                    >
                      {busyId === key ? '...' : `${hadir ? '✓ ' : ''}${p.anak_nama[i] ?? 'Anak'}`}
                    </button>
                  );
                })}
              </div>
              {p.anak_ids.some((id) => sertMap[id]) && (
                <div className={s.row} style={{ flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <span className={s.muted} style={{ fontSize: 12 }}>E-sertifikat:</span>
                  {p.anak_ids.map((anakId, i) => sertMap[anakId]
                    ? <a key={anakId} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} href={`/sertifikat/${sertMap[anakId]}`} target="_blank" rel="noopener noreferrer">⬇ {p.anak_nama[i] ?? 'Anak'}</a>
                    : null)}
                </div>
              )}

              {/* Catatan tumbuh kembang per anak */}
              <div style={{ marginTop: 10 }}>
                <div className={s.muted} style={{ fontSize: 12, marginBottom: 6 }}>📝 Catatan Tumbuh Kembang:</div>
                {p.anak_ids.map((anakId, i) => (
                  <details key={anakId} className={s.card} style={{ marginBottom: 6 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🧒 {p.anak_nama[i] ?? 'Anak'}{catatanMap[anakId]?.penilaian?.length ? ' ✓' : ''}</summary>
                    <div style={{ marginTop: 8 }}>
                      <NilaiPerkembanganForm eventId={p.event_id} anakId={anakId} ortuId={p.ortu_id} nama={p.anak_nama[i] ?? 'Anak'}
                        params={params} awal={catatanMap[anakId] ?? { penilaian: [], catatan: '' }} />
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <input className={s.inp} placeholder="🔎 Cari nama anak / orang tua…" value={cari} onChange={(e) => setCari(e.target.value)} style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
        <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}
          onClick={() => setTutup(Object.values(tutup).some(Boolean) ? {} : { baby: true, toddler: true, gabungan: true })}
          title="Buka / tutup semua kelas">
          {Object.values(tutup).some(Boolean) ? '⊞ Buka semua' : '⊟ Tutup semua'}
        </button>
        <span className={s.tag} style={{ background: '#dff5e6', color: '#1c7a43' }}>✅ {totalHadir} anak hadir</span>
      </div>

      {/* Urutan waktu daftar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className={s.muted} style={{ fontSize: 12, fontWeight: 700 }}>🕐 Urutkan</span>
        {([['baru', 'Terbaru'], ['lama', 'Terlama']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setUrut(k)} aria-pressed={urut === k} className={s.btnSm}
            style={{ background: urut === k ? 'var(--lavender-d)' : '#f3f0fb', color: urut === k ? '#fff' : 'var(--lavender-d)', fontSize: 11 }}>
            {k === 'baru' ? '↓' : '↑'} {label}
          </button>
        ))}
        <span className={s.muted} style={{ fontSize: 11 }}>
          {urut === 'baru' ? 'yang paling baru mendaftar di atas' : 'yang paling awal mendaftar di atas'}
        </span>
      </div>

      {/* Filter rentang usia — satuan BULAN (kelas Baby ~6-18 bln tidak bisa dinyatakan dlm tahun bulat) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className={s.muted} style={{ fontSize: 12, fontWeight: 700 }}>🎂 Usia</span>
        <input className={s.inp} type="number" min={0} inputMode="numeric" aria-label="Usia minimal dalam bulan"
          placeholder="min (bln)" value={uMin} onChange={(e) => setUMin(e.target.value)}
          style={{ width: 96, marginBottom: 0 }} />
        <span className={s.muted} style={{ fontSize: 12 }}>–</span>
        <input className={s.inp} type="number" min={0} inputMode="numeric" aria-label="Usia maksimal dalam bulan"
          placeholder="maks (bln)" value={uMaks} onChange={(e) => setUMaks(e.target.value)}
          style={{ width: 104, marginBottom: 0 }} />
        {PRESET_USIA.map((r) => {
          const aktif = uMin === r.min && uMaks === r.maks;
          return (
            <button key={r.label} type="button" onClick={() => { setUMin(aktif ? '' : r.min); setUMaks(aktif ? '' : r.maks); }}
              className={s.btnSm}
              style={{ background: aktif ? 'var(--lavender-d)' : '#f3f0fb', color: aktif ? '#fff' : 'var(--lavender-d)', fontSize: 11 }}>
              {r.label}
            </button>
          );
        })}
        {pakaiUsia && (
          <button type="button" onClick={() => { setUMin(''); setUMaks(''); }} className={s.btnSm}
            style={{ background: '#efe7fb', color: 'var(--lavender-d)', fontSize: 11 }}>✕ semua usia</button>
        )}
      </div>
      {rentangSalah && <p style={{ color: '#b3261e', fontSize: 12, margin: '-4px 0 10px' }}>Usia minimal lebih besar dari maksimal — filter usia diabaikan.</p>}
      {pakaiUsia && !rentangSalah && (
        <p className={s.muted} style={{ fontSize: 12, margin: '-4px 0 10px' }}>
          Menampilkan <b>{tampil.length}</b> dari {list.length} pendaftaran yang punya minimal 1 anak berusia{' '}
          {bMin !== null ? `${bMin} bln` : '0 bln'}–{bMaks !== null ? `${bMaks} bln` : 'tanpa batas'}. Anak tanpa tanggal lahir tidak ikut terhitung.
        </p>
      )}
      {tampil.length === 0 && <p className={s.muted}>Tidak ada pendaftar yang cocok.</p>}
      {GRUP.map((g) => {
        // kelas tak dikenal / kosong → masuk grup Gabungan (jangan sampai kartu tersembunyi)
        const kelasDari = (p: PendaftaranEvent) => (p.kelas === 'baby' || p.kelas === 'toddler') ? p.kelas : 'gabungan';
        // SEMUA pendaftaran kelas ini — dasar hitungan peserta & kuota.
        // Kartu di-render dengan `key={p.id}`, jadi mengurutkan ulang hanya MEMINDAHKAN
        // elemen — state NilaiPerkembanganForm yang belum disimpan tidak ikut hilang.
        const semua = urutkan(list.filter((p) => kelasDari(p) === g.key));
        const items = semua.filter(lolos);   // yang lolos filter → yang ditampilkan
        if (!semua.length) return null;
        // Peserta & kuota SELALU dihitung dari `semua`, bukan dari hasil filter — kalau
        // dari hasil filter, "sisa kuota" jadi salah setiap kali admin mencari/memfilter.
        const jml = semua.filter((p) => p.status !== 'ditolak').reduce((n, p) => n + (p.jumlah_anak ?? (p.anak_nama?.length ?? 0)), 0);
        // Saat MENYARING (cari / usia), grup dipaksa terbuka agar hasilnya selalu terlihat
        // walau admin sebelumnya menutup kelas itu.
        const terbuka = menyaring || !tutup[g.key];
        const kv = kuota[g.key === 'baby' || g.key === 'toddler' ? g.key : 'gabungan'];
        const sisa = kv != null && kv > 0 ? Math.max(0, kv - jml) : null;
        return (
          <div key={g.key}>
            <button type="button" onClick={() => setTutup({ ...tutup, [g.key]: !tutup[g.key] })}
              aria-expanded={terbuka}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: '#f3f0fb', borderRadius: 12, padding: '10px 14px', margin: '14px 0 8px', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 13, color: 'var(--lavender-d)', fontWeight: 800 }}>{terbuka ? '▾' : '▸'}</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{g.label}</span>
              <span className={s.muted} style={{ fontSize: 12 }}>{jml} peserta</span>
              {sisa !== null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: sisa <= 0 ? '#b3261e' : 'var(--mint-d)' }}>
                  {sisa <= 0 ? `kuota PENUH (${jml}/${kv})` : `sisa ${sisa}/${kv}`}
                </span>
              )}
              {menyaring && <span style={{ fontSize: 11, fontWeight: 700, color: '#1b5fa8', background: '#e7f0fb', borderRadius: 99, padding: '2px 8px' }}>{items.length} hasil</span>}
            </button>
            {terbuka
              ? <>
                  {semua.map((p) => kartu(p, lolos(p)))}
                  {/* pesan per-kelas hanya bila kelas LAIN ada hasilnya; kalau nihil semua,
                      cukup satu pesan global di atas supaya tidak menumpuk */}
                  {menyaring && items.length === 0 && tampil.length > 0 && <p className={s.muted} style={{ fontSize: 12, margin: '0 0 8px 14px' }}>Tidak ada yang cocok di kelas ini.</p>}
                </>
              : <div className={s.muted} style={{ fontSize: 12, margin: '0 0 8px 14px' }}>{semua.length} pendaftar disembunyikan — klik untuk membuka.</div>}
          </div>
        );
      })}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
