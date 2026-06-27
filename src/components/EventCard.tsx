// src/components/EventCard.tsx — kartu event (dipakai di carousel dashboard & halaman /event)
import Link from 'next/link';
import type { EventKelas } from '@/lib/game/tipe';
import { formatTanggal, formatRupiah } from '@/lib/format';

export default function EventCard({ ev }: { ev: EventKelas }) {
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
        <Link href={`/event/${ev.id}/daftar`} className="kp-btn" style={{ display: 'block', textAlign: 'center', marginTop: 10 }}>Daftar Sekarang</Link>
      </div>
    </div>
  );
}
