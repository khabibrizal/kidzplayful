// src/components/EventCard.tsx — kartu event (dipakai di carousel dashboard & halaman /event)
import Link from 'next/link';
import Image from 'next/image';
import type { EventKelas } from '@/lib/game/tipe';
import { formatTanggal, formatRupiah } from '@/lib/format';

const STATUS: Record<string, { t: string; c: string; bg: string }> = {
  menunggu: { t: '⏳ Menunggu verifikasi', c: '#b88600', bg: '#fff3d6' },
  diterima: { t: '✅ Pendaftaran diterima', c: '#1c7a43', bg: '#dff5e6' },
  ditolak: { t: '❌ Pendaftaran ditolak', c: '#b3261e', bg: '#fde8e6' },
};

export default function EventCard({ ev, status, catatanHref, sisaAnak, peserta, alasanTolak }: { ev: EventKelas; status?: string; catatanHref?: string; sisaAnak?: number; peserta?: { nama: string; status: string; alasan?: string }[]; alasanTolak?: string }) {
  const meta = status ? STATUS[status] : null;
  const adaSisa = typeof sisaAnak === 'number' && sisaAnak > 0;
  const adaPeserta = !!peserta && peserta.length > 0;
  const tombolSisa = adaSisa && (
    <Link href={`/event/${ev.id}/daftar`} className="kp-btn putih" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
      ➕ Daftarkan anak lainnya{typeof sisaAnak === 'number' ? ` (${sisaAnak})` : ''}
    </Link>
  );
  return (
    <div className="kp-card" style={{ padding: 0, overflow: 'hidden' }}>
      {ev.gambar_url && (
        <div style={{ position: 'relative', width: '100%', height: 150 }}>
          <Image src={ev.gambar_url} alt={ev.judul} fill sizes="(max-width: 480px) 100vw, 480px" style={{ objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: 14 }}>
        <span className="kp-chip" style={{ background: 'var(--lavender)', color: '#fff', fontSize: 11 }}>🎈 MAIN BARENG YUK!</span>
        <h3 style={{ margin: '8px 0 6px', color: 'var(--tinta)' }}>{ev.judul}</h3>
        {ev.tanggal && <div style={{ fontSize: 13, color: 'var(--abu)' }}>📅 {formatTanggal(ev.tanggal)}</div>}
        {(ev.jam_mulai || ev.jam_selesai) && <div style={{ fontSize: 13, color: 'var(--abu)' }}>🕐 {ev.jam_mulai}{ev.jam_selesai ? ` - ${ev.jam_selesai}` : ''} WIB</div>}
        {ev.lokasi && <div style={{ fontSize: 13, color: 'var(--abu)' }}>📍 {ev.lokasi}</div>}
        {ev.harga_per_anak > 0 && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{formatRupiah(ev.harga_per_anak)} / anak</div>}
        {adaPeserta ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginBottom: 4 }}>Anak terdaftar</div>
            {peserta!.map((p, i) => {
              const pm = STATUS[p.status] ?? { t: p.status, c: 'var(--abu)', bg: '#eee' };
              return (
                <div key={`${p.nama}-${i}`} style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🧒 {p.nama}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pm.c, background: pm.bg, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>{pm.t}</span>
                  </div>
                  {p.status === 'ditolak' && p.alasan && (
                    <div style={{ fontSize: 11, color: '#b3261e', background: '#fde8e6', borderRadius: 8, padding: '4px 8px', marginTop: 3 }}>Alasan: {p.alasan}</div>
                  )}
                </div>
              );
            })}
            {tombolSisa}
          </div>
        ) : meta ? (
          <>
            <div style={{ marginTop: 10, textAlign: 'center', fontWeight: 700, fontSize: 13, color: meta.c, background: meta.bg, borderRadius: 99, padding: '8px 12px' }}>{meta.t}</div>
            {status === 'ditolak' && alasanTolak && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#b3261e', background: '#fde8e6', borderRadius: 10, padding: '6px 10px' }}>Alasan: {alasanTolak}</div>
            )}
            {status === 'ditolak'
              ? <Link href={`/event/${ev.id}/daftar`} className="kp-btn putih" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>Daftar lagi</Link>
              : tombolSisa}
          </>
        ) : (
          <Link href={`/event/${ev.id}/daftar`} className="kp-btn" style={{ display: 'block', textAlign: 'center', marginTop: 10 }}>Daftar Sekarang</Link>
        )}
        {catatanHref && (
          <Link href={catatanHref} className="kp-btn putih" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>📋 Catatan Perkembangan</Link>
        )}
      </div>
    </div>
  );
}
