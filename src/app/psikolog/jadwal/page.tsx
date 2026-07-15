// src/app/psikolog/jadwal/page.tsx — atur jadwal & kuota konsultasi
import Link from 'next/link';
import { getPsikologTerjamin, getJadwalSaya } from '@/lib/data/psikolog';
import JadwalForm from './JadwalForm';

export default async function JadwalPage() {
  const psi = await getPsikologTerjamin();
  const jadwal = await getJadwalSaya(psi.id);

  return (
    <main style={{ maxWidth: 520, margin: '24px auto', padding: 16 }}>
      <Link href="/psikolog" style={{ color: 'var(--abu)', fontSize: 13 }}>← Area Psikolog</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0 4px' }}>🗓️ Jadwal & Kuota Konsultasi</h1>
      <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 14 }}>Tentukan hari & jam buka serta batas jumlah customer per hari. Customer hanya bisa mendaftar pada hari yang dibuka & selama kuota masih ada.</p>
      <JadwalForm awal={jadwal} />
    </main>
  );
}
