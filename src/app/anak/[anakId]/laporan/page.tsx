// src/app/anak/[anakId]/laporan/page.tsx
import Link from 'next/link';
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

  return (
    <main className="kp-page-narrow" style={{ padding: 16, marginTop: 20 }}>
      <RekamAktivitas fitur="rapor" anakId={anakId} />
      <Link href={`/anak/${anakId}`} style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>📊 Perkembangan {anak.nama}</h1>

      <LaporanAnakView anakId={anakId} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>🧠 KONSULTASI PSIKOLOG</div>
      <RiwayatKonsultasi sesi={konsultasi} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>🧠 REKOMENDASI PSIKOLOG</div>
      {rekomendasi.length === 0
        ? <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada rekomendasi psikolog. Mulai konsultasi lewat menu Konsultasi.</p>
        : rekomendasi.map((r) => <RekomendasiCard key={r.id} r={r} />)}

      {itemRek.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>🎁 REKOMENDASI PRODUK / EVENT / MATERI</div>
          <RekomendasiItemList items={itemRek} />
        </>
      )}
    </main>
  );
}
