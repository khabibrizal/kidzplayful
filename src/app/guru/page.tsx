// src/app/guru/page.tsx — beranda guru: pilih event untuk diisi catatannya
import Link from 'next/link';
import { getGuruTerjamin, getEventUntukGuru } from '@/lib/data/guru';
import { formatTanggal } from '@/lib/format';
import LogoutBtn from '../admin/LogoutBtn';

export default async function GuruHome() {
  const guru = await getGuruTerjamin();
  const events = await getEventUntukGuru();

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: 0 }}>🍎 Area Guru</h1>
        <LogoutBtn />
      </div>
      <p style={{ color: 'var(--abu)', fontSize: 14, margin: '8px 0 16px' }}>
        Hai, {guru.nama || 'Guru'}. Pilih event untuk mengisi <b>Catatan Perkembangan Bermain</b> tiap anak.
      </p>
      {events.length === 0
        ? <p style={{ color: 'var(--abu)' }}>Belum ada event.</p>
        : events.map((ev) => (
          <Link key={ev.id} href={`/guru/${ev.id}`} className="kp-card" style={{ display: 'block', marginBottom: 8, textDecoration: 'none', color: 'inherit' }}>
            <b>🎈 {ev.judul}</b>
            <br /><small style={{ color: 'var(--abu)' }}>{ev.tanggal ? formatTanggal(ev.tanggal) : 'tanpa tanggal'}{ev.status === 'arsip' ? ' · (arsip)' : ''}</small>
          </Link>
        ))}
    </main>
  );
}
