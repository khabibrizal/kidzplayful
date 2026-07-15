// src/app/stiker-event/[id]/page.tsx — cetak lembar stiker nama untuk semua anak yang DAFTAR.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminTerjamin } from '@/lib/data/admin';
import { getEventAdmin, getPendaftaranByEvent } from '@/lib/data/admin-event';
import UnduhPdfBtn from '@/components/UnduhPdfBtn';
import StikerSheet from '@/components/StikerSheet';
import TombolKembali from '@/components/TombolKembali';

export default async function StikerEventPage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminTerjamin(); // guard admin (redirect bila bukan admin)
  const { id } = await params;
  const ev = await getEventAdmin(id);
  if (!ev) redirect('/admin/event');
  const list = await getPendaftaranByEvent(id);
  const nama = list.flatMap((p) => p.anak_nama).filter(Boolean); // semua anak yang mendaftar

  return (
    <main style={{ maxWidth: '196mm', margin: '12px auto', padding: 12 }}>
      <style>{`@media print{ @page{ size:215mm 330mm; margin:7mm } }`}</style>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <TombolKembali fallback="/admin/event" style={{ color: 'var(--abu)', fontSize: 13 }} />
        <b>🏷️ Stiker: {ev.judul}</b>
        <span style={{ color: 'var(--abu)', fontSize: 13 }}>{nama.length} stiker · {Math.max(1, Math.ceil(nama.length / 10))} lembar F4</span>
        <UnduhPdfBtn judul={`Stiker ${ev.judul}`} />
      </div>
      <div className="no-print" style={{ fontSize: 12, color: 'var(--abu)', marginBottom: 10 }}>
        Ukuran stiker 9×6 cm, 10 per lembar F4. Saat mencetak, pilih kertas <b>F4/Folio</b> & skala 100% (tanpa &quot;fit to page&quot;). Garis putus-putus = panduan potong.
      </div>
      {nama.length === 0
        ? <p style={{ color: 'var(--abu)' }}>Belum ada anak yang mendaftar event ini.</p>
        : <StikerSheet nama={nama} kelas={ev.judul} bg={ev.stiker_bg_url} />}
    </main>
  );
}
