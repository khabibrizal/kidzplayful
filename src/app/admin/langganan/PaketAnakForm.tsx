// src/app/admin/langganan/PaketAnakForm.tsx — admin memberi paket ke SEORANG anak.
// Dipakai di kartu member: satu baris per anak, karena paket menempel pada anak (0089)
// dan satu akun boleh punya anak Preschool sekaligus anak Basic.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setPaketAnak, hentikanPaketAnak } from '@/lib/data/langganan-anak-actions';
import type { PaketLangganan } from '@/lib/game/tipe';
import s from '../admin.module.css';

export interface AnakLangganan {
  id: string;
  nama: string;
  paketId: string | null;
  paketNama: string | null;
  aktifSampai: string | null;
  /** 0098 — bulan kurikulum yang sudah dijalani anak ini (null = migrasi belum jalan) */
  bulanKurikulum?: number | null;
}

/**
 * Keterangan status yang JUJUR untuk satu anak.
 *
 * Dulu barisnya selalu berbunyi "<paket> · s/d <tanggal>" selama `aktifSampai` terisi —
 * termasuk sesudah dihentikan — sehingga tombol Hentikan tampak tak berfungsi. Sekarang
 * tanggal yang sudah lewat ditulis apa adanya, dan paket yang kosong berarti dihentikan.
 * `hariIni` datang dari server (WIB) supaya tak ada `new Date()` di badan komponen.
 */
function ketStatus(a: AnakLangganan, hariIni: string): { teks: string; aktif: boolean } {
  if (!a.aktifSampai) return { teks: 'belum berlangganan', aktif: false };
  const aktif = a.aktifSampai >= hariIni;
  if (!a.paketNama) return { teks: `dihentikan · berakhir ${a.aktifSampai}`, aktif: false };
  return {
    teks: aktif ? `${a.paketNama} · s/d ${a.aktifSampai}` : `${a.paketNama} · berakhir ${a.aktifSampai}`,
    aktif,
  };
}

export default function PaketAnakForm(
  { anak, paket, hariIni }: { anak: AnakLangganan[]; paket: PaketLangganan[]; hariIni: string },
) {
  const router = useRouter();
  const [pilih, setPilih] = useState<Record<string, string>>({});
  const [bulan, setBulan] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState('');

  if (paket.length === 0) {
    return <div className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Paket belum terbaca — jalankan migrasi <b>0089</b> lalu isi harganya di menu Paket.</div>;
  }

  async function aktifkan(a: AnakLangganan) {
    const p = pilih[a.id] ?? a.paketId ?? paket[0]?.id;
    if (!p) return;
    setBusy(a.id); setPesan('');
    const r = await setPaketAnak(a.id, p, Number(bulan[a.id] ?? '1') || 1);
    setBusy(null);
    if (r.ok) { setPesan(`${a.nama}: aktif s/d ${r.aktifSampai} ✓`); router.refresh(); }
    else setPesan(r.error ?? 'Gagal');
  }

  async function hentikan(a: AnakLangganan) {
    if (!confirm(`Hentikan langganan ${a.nama} SEKARANG? Hak paketnya (worksheet, kuota konsultasi, diskon member) langsung dicabut — tanpa masa tenggang.`)) return;
    setBusy(a.id); setPesan('');
    const r = await hentikanPaketAnak(a.id);
    setBusy(null);
    if (r.ok) {
      // Pesannya menyebut apa yang BENAR-BENAR tersimpan (dibaca kembali dari DB), bukan
      // sekadar "berhasil". Kalau barisnya sudah berbunyi begini tapi tombol Hentikan
      // belum hilang, berarti yang basi adalah tampilannya — bukan datanya.
      setPesan(`${a.nama}: dihentikan ✓ (aktif s/d ${r.aktifSampai ?? '—'}${r.paketKosong ? ', paket dikosongkan' : ', PAKET MASIH TERISI — laporkan ini'})`);
      router.refresh();
    } else setPesan(r.error ?? 'Gagal');
  }

  return (
    <div style={{ marginTop: 8, borderTop: '1px dashed #e6e0f2', paddingTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎟️ Paket per anak</div>
      {anak.length === 0 && <div className={s.muted} style={{ fontSize: 12 }}>Belum ada profil anak.</div>}
      {anak.map((a) => {
        const st = ketStatus(a, hariIni);
        return (
        <div key={a.id} className={s.row} style={{ gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ minWidth: 130, fontSize: 13 }}>
            <b>{a.nama}</b>
            <br /><small className={s.muted}>{st.teks}</small>
            {/* Penghitung kohort kurikulum: naik tiap kali sebuah bulan diberikan, dan
                TIDAK turun saat langganan dihentikan. Ditampilkan supaya admin bisa
                memeriksa angkanya, bukan menebak. */}
            {typeof a.bulanKurikulum === 'number' && (
              <><br /><small className={s.muted}>📚 kurikulum bulan ke-{Math.max(1, a.bulanKurikulum)}</small></>
            )}
          </span>
          <select className={s.inp} value={pilih[a.id] ?? a.paketId ?? ''}
            onChange={(e) => setPilih({ ...pilih, [a.id]: e.target.value })} style={{ width: 150, marginBottom: 0 }}>
            <option value="">— pilih paket —</option>
            {paket.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <input className={s.inp} type="number" min={1} placeholder="bln" value={bulan[a.id] ?? '1'}
            onChange={(e) => setBulan({ ...bulan, [a.id]: e.target.value })} style={{ width: 70, marginBottom: 0 }} />
          <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }}
            onClick={() => aktifkan(a)} disabled={busy === a.id || !(pilih[a.id] ?? a.paketId)}>
            {busy === a.id ? '…' : (st.aktif ? 'Perpanjang' : 'Aktifkan')}
          </button>
          {/* Hentikan hanya untuk yang MASIH aktif — kalau tidak, tombolnya menjanjikan
              perubahan yang tak akan terjadi. */}
          {st.aktif && (
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hentikan(a)} disabled={busy === a.id}>Hentikan</button>
          )}
        </div>
        );
      })}
      {/* Perpanjangan dihitung dari tanggal berakhir yang ada, jadi membayar lebih awal
          TIDAK menghanguskan sisa hari. */}
      <div className={s.muted} style={{ fontSize: 11 }}>Perpanjangan menambah dari tanggal berakhir yang ada — sisa hari tidak hangus.</div>
      {pesan && <div style={{ fontSize: 12, marginTop: 4, color: pesan.includes('✓') ? 'var(--mint-d)' : '#c0392b' }}>{pesan}</div>}
    </div>
  );
}
