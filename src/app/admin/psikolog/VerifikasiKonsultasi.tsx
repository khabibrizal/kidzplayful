// src/app/admin/psikolog/VerifikasiKonsultasi.tsx — antrean pembayaran sesi konsultasi.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifikasiBayarKonsultasi, tolakBayarKonsultasi } from '@/lib/data/konsultasi-bayar-actions';
import BuktiLightbox from '@/components/BuktiLightbox';
import { formatRupiah, formatTanggal, linkWa } from '@/lib/format';
import s from '../admin.module.css';

export interface SesiMenungguBayar {
  id: string;
  anak_nama: string | null;
  tanggal: string;
  jam: string | null;
  total: number;
  bukti_url: string | null;
  batas_bayar: string | null;
  psikolog_nama: string | null;
  /** nama & nomor WA orang tua yang melakukan reservasi (null = belum terisi di profilnya) */
  ortu_nama: string | null;
  ortu_wa: string | null;
}

export default function VerifikasiKonsultasi({ daftar }: { daftar: SesiMenungguBayar[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState('');

  async function terima(x: SesiMenungguBayar) {
    if (!confirm(`Verifikasi pembayaran ${formatRupiah(x.total)} untuk sesi ${x.anak_nama ?? 'anak'}?`)) return;
    setBusy(x.id); setPesan('');
    const r = await verifikasiBayarKonsultasi(x.id);
    setBusy(null);
    if (r.ok) { setPesan('Diverifikasi — ruang chat terbuka ✓'); router.refresh(); }
    else setPesan(r.error ?? 'Gagal');
  }

  async function tolak(x: SesiMenungguBayar) {
    const alasan = window.prompt('Alasan penolakan (tampil ke orang tua):', '');
    if (alasan === null) return;
    setBusy(x.id); setPesan('');
    const r = await tolakBayarKonsultasi(x.id, alasan);
    setBusy(null);
    if (r.ok) { setPesan('Ditolak'); router.refresh(); }
    else setPesan(r.error ?? 'Gagal');
  }

  /** Jam & tanggal sesi dalam WIB, sekali saja — dipakai pesan WA dan keterangan barisnya. */
  const waktuSesi = (x: SesiMenungguBayar) => `${formatTanggal(x.tanggal)}${x.jam ? ` jam ${x.jam} WIB` : ''}`;

  /**
   * Pesan WA siap kirim ke orang tua yang mereservasi. Isinya SPESIFIK (anak, jadwal,
   * psikolog, nominal, batas bayar) supaya admin tak perlu mengetik ulang dan orang tua
   * tak perlu bertanya sesi yang mana — satu akun bisa punya beberapa reservasi.
   */
  function pesanWa(x: SesiMenungguBayar): string | null {
    const batas = x.batas_bayar
      ? new Date(x.batas_bayar).toLocaleString('id-ID', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
      : null;
    const isi = [
      `Halo${x.ortu_nama ? ` ${x.ortu_nama}` : ''} 🌿`,
      '',
      `Reservasi konsultasi online untuk ${x.anak_nama ?? 'anak'} sudah kami terima:`,
      `• Jadwal: ${waktuSesi(x)}`,
      ...(x.psikolog_nama ? [`• Psikolog: ${x.psikolog_nama}`] : []),
      `• Biaya: ${formatRupiah(x.total)}`,
      ...(batas ? [`• Batas pembayaran: ${batas} WIB`] : []),
      '',
      x.bukti_url
        ? 'Bukti transfernya sedang kami verifikasi ya, mohon ditunggu sebentar.'
        : 'Mohon selesaikan pembayaran & unggah bukti transfernya di aplikasi supaya ruang chat konsultasinya bisa kami buka ya.',
      '',
      'Terima kasih — KidzPlayful',
    ].join('\n');
    return linkWa(x.ortu_wa, isi);
  }

  return (
    <details className={s.card} open style={{ borderLeft: '4px solid var(--lavender-d)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>
        💳 Konsultasi menunggu verifikasi pembayaran ({daftar.length})
      </summary>
      {daftar.length === 0 && <p className={s.muted} style={{ marginTop: 10 }}>Tidak ada yang menunggu. 🎉</p>}
      {daftar.map((x) => (
        <div key={x.id} className={s.row} style={{ marginTop: 10, gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ flex: 1, minWidth: 190 }}>
            <b>{x.anak_nama ?? 'Anak'}</b> · {formatRupiah(x.total)}
            <br /><small className={s.muted}>
              {formatTanggal(x.tanggal)}{x.jam ? ` · ${x.jam} WIB` : ''}
              {x.psikolog_nama ? ` · ${x.psikolog_nama}` : ''}
              {x.ortu_nama ? ` · 👤 ${x.ortu_nama}` : ''}
              {x.batas_bayar ? ` · batas bayar ${new Date(x.batas_bayar).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB` : ''}
            </small>
          </span>
          {x.bukti_url
            ? <BuktiLightbox url={x.bukti_url} />
            : <span className={s.muted} style={{ fontSize: 12 }}>belum ada bukti</span>}
          {/* Tombol WA ke orang tua yang mereservasi. Bila nomornya belum terisi, keadaan itu
              DIKATAKAN — tombol mati tanpa sebab akan terbaca sebagai kerusakan. */}
          {pesanWa(x)
            ? (
              <a className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }}
                href={pesanWa(x)!} target="_blank" rel="noreferrer"
                title={`Chat WhatsApp ${x.ortu_nama ?? 'orang tua'} soal reservasi ini`}>
                💬 WA ortu
              </a>
            )
            : <span className={s.muted} style={{ fontSize: 11 }}>nomor WA ortu belum terisi</span>}
          <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }}
            onClick={() => terima(x)} disabled={busy === x.id || !x.bukti_url}
            title={!x.bukti_url ? 'Orang tua belum mengunggah bukti transfer' : undefined}>
            {busy === x.id ? '…' : 'Verifikasi'}
          </button>
          <button className={`${s.btnSm} ${s.danger}`} onClick={() => tolak(x)} disabled={busy === x.id}>Tolak</button>
        </div>
      ))}
      {pesan && <div style={{ fontSize: 12, marginTop: 8, color: pesan.includes('✓') ? 'var(--mint-d)' : '#c0392b' }}>{pesan}</div>}
    </details>
  );
}
