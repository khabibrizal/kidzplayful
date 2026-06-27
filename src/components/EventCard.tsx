// src/components/EventCard.tsx — kartu event (dipakai di carousel dashboard & halaman /event)
import Link from 'next/link';
import type { EventKelas } from '@/lib/game/tipe';
import { formatTanggal, formatRupiah } from '@/lib/format';

const STATUS: Record<string, { t: string; c: string; bg: string }> = {
  menunggu: { t: '⏳ Menunggu verifikasi', c: '#b88600', bg: '#fff3d6' },
  diterima: { t: '✅ Pendaftaran diterima', c: '#1c7a43', bg: '#dff5e6' },
  ditolak: { t: '❌ Pendaftaran ditolak', c: '#b3261e', bg: '#fde8e6' },
};

export default function EventCard({ ev, status }: { ev: EventKelas; status?: string }) {
  const meta = status ? STATUS[status] : null;
  return (
    <div className="kp-card" style={{ padding: 0, overflow: 'hidden' }}>
      {ev.gambar_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.gambar_url} alt={ev.judul} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: 14 }}>
        <span className="kp-chip" style={{ background: 'var(--lavender)', color: '#fff', fontSize: 11 }}>🎈 MAIN BARENG YUK!</span>
        <h3 style={{ margin: '8px 0 6px', color: 'var(--tinta)' }}>{ev.judul}</h3>
        {ev.tanggal && <div style={{ fontSize: 13, color: 'var(--abu)' }}>📅 {formatTanggal(ev.tanggal)}</div>}
        {(ev.jam_mulai || ev.jam_selesai) && <div style={{ fontSize: 13, color: 'var(--abu)' }}>🕐 {ev.jam_mulai}{ev.jam_selesai ? ` - ${ev.jam_selesai}` : ''} WIB</div>}
        {ev.lokasi && <div style={{ fontSize: 13, color: 'var(--abu)' }}>📍 {ev.lokasi}</div>}
        {ev.harga_per_anak > 0 && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{formatRupiah(ev.harga_per_anak)} / anak</div>}
        {meta ? (
          <>
            <div style={{ marginTop: 10, textAlign: 'center', fontWeight: 700, fontSize: 13, color: meta.c, background: meta.bg, borderRadius: 99, padding: '8px 12px' }}>{meta.t}</div>
            {status === 'ditolak' && <Link href={`/event/${ev.id}/daftar`} className="kp-btn putih" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>Daftar lagi</Link>}
          </>
        ) : (
          <Link href={`/event/${ev.id}/daftar`} className="kp-btn" style={{ display: 'block', textAlign: 'center', marginTop: 10 }}>Daftar Sekarang</Link>
        )}
      </div>
    </div>
  );
}
