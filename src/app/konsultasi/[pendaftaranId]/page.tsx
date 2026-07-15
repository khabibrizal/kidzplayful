// src/app/konsultasi/[pendaftaranId]/page.tsx — customer: chat + rekomendasi psikolog
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPendaftaranById } from '@/lib/data/psikolog';
import { getPesan, getRekomendasiAnak } from '@/lib/data/konsultasi';
import { getRekomendasiItemAnak } from '@/lib/data/rekomendasi-item';
import { formatTanggal } from '@/lib/format';
import ChatKonsultasi from '@/components/ChatKonsultasi';
import RekomendasiCard from '@/components/RekomendasiCard';
import RekomendasiItemList from '@/components/RekomendasiItemList';
import BottomNav from '@/components/BottomNav';

export default async function KonsultasiChatPage({ params }: { params: Promise<{ pendaftaranId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { pendaftaranId } = await params;
  const p = await getPendaftaranById(pendaftaranId);
  if (!p || p.ortu_id !== user.id) redirect('/konsultasi');

  const [pesan, rekomendasi, itemRek] = await Promise.all([getPesan(pendaftaranId), getRekomendasiAnak(p.anak_id), getRekomendasiItemAnak(p.anak_id)]);

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 90, marginTop: 20 }}>
      <Link href="/konsultasi" style={{ color: 'var(--abu)', fontSize: 13 }}>← Konsultasi</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0 4px' }}>💬 Konsultasi — {p.anak_nama || 'Anak'}</h1>
      <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 14 }}>{formatTanggal(p.tanggal)} · status {p.status}</p>

      <ChatKonsultasi pendaftaranId={pendaftaranId} userId={user.id} awal={pesan} nonaktif={p.status !== 'diterima'} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '20px 0 8px' }}>🧠 REKOMENDASI PSIKOLOG</div>
      {rekomendasi.length === 0
        ? <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada rekomendasi. Rekomendasi dari psikolog akan muncul di sini & di laporan anak.</p>
        : rekomendasi.map((r) => <RekomendasiCard key={r.id} r={r} />)}

      {itemRek.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '20px 0 8px' }}>🎁 REKOMENDASI PRODUK / EVENT / MATERI</div>
          <RekomendasiItemList items={itemRek} />
        </>
      )}
      <BottomNav />
    </main>
  );
}
