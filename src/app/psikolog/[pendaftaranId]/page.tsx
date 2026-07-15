// src/app/psikolog/[pendaftaranId]/page.tsx — chat + laporan anak + rekomendasi (sisi psikolog)
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPsikologTerjamin, getPendaftaranById } from '@/lib/data/psikolog';
import { getPesan, getRekomendasiAnak } from '@/lib/data/konsultasi';
import { getKatalogRekomendasi, getRekomendasiItemAnak } from '@/lib/data/rekomendasi-item';
import { getFiturAkses } from '@/lib/data/pengaturan-menu';
import { fiturUntukRole } from '@/lib/menu-admin';
import { formatTanggal } from '@/lib/format';
import ChatKonsultasi from '@/components/ChatKonsultasi';
import LaporanAnakView from '@/components/LaporanAnakView';
import RekomendasiForm from '@/components/RekomendasiForm';
import RekomendasiCard from '@/components/RekomendasiCard';
import RekomendasiItemPicker from '@/components/RekomendasiItemPicker';
import RekomendasiItemList from '@/components/RekomendasiItemList';

export default async function PsikologChatPage({ params }: { params: Promise<{ pendaftaranId: string }> }) {
  const psi = await getPsikologTerjamin();
  const { pendaftaranId } = await params;
  const p = await getPendaftaranById(pendaftaranId);
  if (!p || p.psikolog_id !== psi.id) redirect('/psikolog');

  const [pesan, rekomendasi, katalog, itemRek, fitur] = await Promise.all([
    getPesan(pendaftaranId), getRekomendasiAnak(p.anak_id),
    getKatalogRekomendasi(), getRekomendasiItemAnak(p.anak_id), getFiturAkses(),
  ]);
  const boleh = [...fiturUntukRole(fitur, { is_psikolog: true })];

  return (
    <main style={{ maxWidth: 560, margin: '24px auto', padding: 16 }}>
      <Link href="/psikolog" style={{ color: 'var(--abu)', fontSize: 13 }}>← Area Psikolog</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0 4px' }}>💬 {p.anak_nama || 'Anak'}</h1>
      <p style={{ color: 'var(--abu)', fontSize: 13, marginBottom: 14 }}>Konsultasi {formatTanggal(p.tanggal)} · status {p.status}{p.keluhan ? ` · “${p.keluhan}”` : ''}</p>

      <ChatKonsultasi pendaftaranId={pendaftaranId} userId={psi.id} awal={pesan} nonaktif={p.status !== 'diterima'} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '20px 0 8px' }}>📊 LAPORAN TUMBUH KEMBANG</div>
      <LaporanAnakView anakId={p.anak_id} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '20px 0 8px' }}>🧠 REKOMENDASI (CATATAN)</div>
      <RekomendasiForm anakId={p.anak_id} ortuId={p.ortu_id} pendaftaranId={pendaftaranId} />
      <div style={{ marginTop: 10 }}>
        {rekomendasi.length === 0
          ? <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada rekomendasi untuk anak ini.</p>
          : rekomendasi.map((r) => <RekomendasiCard key={r.id} r={r} />)}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '20px 0 8px' }}>🎁 REKOMENDASI PRODUK / EVENT / MATERI</div>
      <RekomendasiItemPicker anakId={p.anak_id} ortuId={p.ortu_id} pendaftaranId={pendaftaranId} katalog={katalog} boleh={boleh} />
      {itemRek.length > 0 && <div style={{ marginTop: 10 }}><RekomendasiItemList items={itemRek} bolehHapus /></div>}
    </main>
  );
}
