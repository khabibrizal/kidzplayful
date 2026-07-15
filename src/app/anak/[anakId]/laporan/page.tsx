// src/app/anak/[anakId]/laporan/page.tsx
import Link from 'next/link';
import TombolKembali from '@/components/TombolKembali';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRekomendasiAnak, getKonsultasiAnak } from '@/lib/data/konsultasi';
import { getRekomendasiItemAnak } from '@/lib/data/rekomendasi-item';
import LaporanAnakView from '@/components/LaporanAnakView';
import RekomendasiCard from '@/components/RekomendasiCard';
import RekomendasiItemList from '@/components/RekomendasiItemList';
import RiwayatKonsultasi from '@/components/RiwayatKonsultasi';
import RekamAktivitas from '@/components/RekamAktivitas';

export default async function LaporanAnakPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: anak } = await supabase.from('anak').select('nama').eq('id', anakId).single();
  if (!anak) redirect('/pilih-anak');
  const [rekomendasi, itemRek, konsultasi] = await Promise.all([getRekomendasiAnak(anakId), getRekomendasiItemAnak(anakId), getKonsultasiAnak(anakId)]);
  // Rekomendasi psikolog & item ditampilkan DI DALAM tiap konsultasi (klik konsultasi → detail).
  // Yang di luar sesi konsultasi (mis. dari guru saat kelas) ditampilkan terpisah di bawah.
  const rekLain = rekomendasi.filter((r) => !r.pendaftaran_id);
  const itemLain = itemRek.filter((i) => !i.pendaftaran_id);

  return (
    <main className="kp-page-narrow" style={{ padding: 16, marginTop: 20 }}>
      <RekamAktivitas fitur="rapor" anakId={anakId} />
      <TombolKembali fallback={`/anak/${anakId}`} style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>📊 Perkembangan {anak.nama}</h1>

      <LaporanAnakView anakId={anakId} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>🧠 KONSULTASI PSIKOLOG</div>
      <p style={{ color: 'var(--abu)', fontSize: 12, marginTop: -4, marginBottom: 8 }}>Klik sebuah konsultasi untuk melihat riwayat chat, rekomendasi psikolog, & rekomendasi produk/event/materi.</p>
      <RiwayatKonsultasi sesi={konsultasi} />

      {(rekLain.length > 0 || itemLain.length > 0) && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>🎁 REKOMENDASI DARI KELAS / GURU</div>
          {rekLain.map((r) => <RekomendasiCard key={r.id} r={r} />)}
          {itemLain.length > 0 && <RekomendasiItemList items={itemLain} />}
        </>
      )}
    </main>
  );
}
