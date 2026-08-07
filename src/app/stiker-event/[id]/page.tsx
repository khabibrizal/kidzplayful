// src/app/stiker-event/[id]/page.tsx — cetak lembar stiker nama untuk semua anak yang DAFTAR.
import { redirect } from 'next/navigation';
import { getAdminTerjamin } from '@/lib/data/admin';
import { getEventAdmin, getPendaftaranByEvent } from '@/lib/data/admin-event';
import { createClient } from '@/lib/supabase/server';
import UnduhPdfBtn from '@/components/UnduhPdfBtn';
import StikerSheet, { type ItemStiker } from '@/components/StikerSheet';
import TombolKembali from '@/components/TombolKembali';

export default async function StikerEventPage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminTerjamin(); // guard admin (redirect bila bukan admin)
  const { id } = await params;
  const ev = await getEventAdmin(id);
  if (!ev) redirect('/admin/event');
  const list = (await getPendaftaranByEvent(id)).filter((p) => p.status !== 'ditolak'); // ditolak tak dapat stiker
  // Stiker tampilkan NAMA PANGGILAN saja (fallback: kata pertama nama lengkap).
  const kataPertama = (t: string) => (t ?? '').trim().split(/\s+/)[0] ?? '';
  const anakIds = [...new Set(list.flatMap((p) => p.anak_ids ?? []))];
  const panggilan: Record<string, string> = {};
  if (anakIds.length) {
    const supabase = await createClient();
    const { data: rows } = await supabase.from('anak').select('id,nama,nama_panggilan').in('id', anakIds);
    for (const a of rows ?? []) panggilan[a.id as string] = ((a.nama_panggilan as string)?.trim()) || kataPertama(a.nama as string);
  }
  // Kategori kelas diambil PER PENDAFTARAN — satu event bisa memuat Baby & Toddler sekaligus.
  // 'gabungan'/kosong -> string kosong, barisnya tidak dirender (bukan diganti nama event).
  const labelKelas = (k?: string | null) => (k === 'baby' ? 'Baby Class' : k === 'toddler' ? 'Toddler Class' : '');
  const items: ItemStiker[] = list.flatMap((p) => {
    const kelas = labelKelas(p.kelas);
    const ids = p.anak_ids ?? [];
    const namaAnak = ids.length
      ? ids.map((anakId, i) => panggilan[anakId] || kataPertama(p.anak_nama[i] ?? ''))
      : (p.anak_nama ?? []).map(kataPertama);
    return namaAnak.filter(Boolean).map((nama) => ({ nama, kelas }));
  });

  return (
    <main style={{ maxWidth: '196mm', margin: '12px auto', padding: 12 }}>
      <style>{`@media print{ @page{ size:215mm 330mm; margin:7mm } }`}</style>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <TombolKembali fallback="/admin/event" style={{ color: 'var(--abu)', fontSize: 13 }} />
        <b>🏷️ Stiker: {ev.judul}</b>
        <span style={{ color: 'var(--abu)', fontSize: 13 }}>{items.length} stiker · {Math.max(1, Math.ceil(items.length / 10))} lembar F4</span>
        <UnduhPdfBtn judul={`Stiker ${ev.judul}`} />
      </div>
      <div className="no-print" style={{ fontSize: 12, color: 'var(--abu)', marginBottom: 10 }}>
        Ukuran stiker 9×6 cm, 10 per lembar F4. Saat mencetak, pilih kertas <b>F4/Folio</b> & skala 100% (tanpa &quot;fit to page&quot;). Garis putus-putus = panduan potong.
      </div>
      {items.length === 0
        ? <p style={{ color: 'var(--abu)' }}>Belum ada anak yang mendaftar event ini.</p>
        : <StikerSheet items={items} bg={ev.stiker_bg_url} />}
    </main>
  );
}
