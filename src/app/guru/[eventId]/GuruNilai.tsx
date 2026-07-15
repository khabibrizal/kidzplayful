// src/app/guru/[eventId]/GuruNilai.tsx — educator memberi nilai tiap peserta (parameter dari event)
'use client';
import type { CatatanPerkembangan, BarisParam, RekomendasiItem } from '@/lib/game/tipe';
import type { Katalog } from '@/lib/data/rekomendasi-item';
import NilaiPerkembanganForm from '@/components/NilaiPerkembanganForm';
import RekomendasiItemPicker from '@/components/RekomendasiItemPicker';
import RekomendasiItemList from '@/components/RekomendasiItemList';

type Peserta = { anak_id: string; nama: string; ortu_id: string };

export default function GuruNilai({ eventId, peserta, catatanAwal, params, katalog, boleh, itemMap }: {
  eventId: string; peserta: Peserta[]; catatanAwal: Record<string, CatatanPerkembangan>; params: BarisParam[];
  katalog: Katalog; boleh: string[]; itemMap: Record<string, RekomendasiItem[]>;
}) {
  if (peserta.length === 0) return <p style={{ color: 'var(--abu)' }}>Belum ada peserta diterima untuk event ini.</p>;

  return (
    <div>
      {params.length === 0 && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#fff3d6' }}>
          <b>Parameter penilaian belum ditetapkan.</b>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--abu)' }}>Minta admin menetapkan Area &amp; Indikator penilaian untuk event ini di panel admin.</p>
        </div>
      )}
      {peserta.map((p) => {
        const c = catatanAwal[p.anak_id];
        return (
          <div key={p.anak_id} className="kp-card" style={{ marginBottom: 12 }}>
            <b>🧒 {p.nama}</b>
            <div style={{ marginTop: 8 }}>
              <NilaiPerkembanganForm eventId={eventId} anakId={p.anak_id} ortuId={p.ortu_id} nama={p.nama}
                params={params} awal={{ penilaian: c?.penilaian ?? [], catatan: c?.catatan ?? '' }} />
            </div>
            {boleh.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginBottom: 6 }}>🎁 Rekomendasi Produk / Event / Materi</div>
                <RekomendasiItemPicker anakId={p.anak_id} ortuId={p.ortu_id} pendaftaranId={null} katalog={katalog} boleh={boleh} />
                {(itemMap[p.anak_id]?.length ?? 0) > 0 && <div style={{ marginTop: 8 }}><RekomendasiItemList items={itemMap[p.anak_id]} bolehHapus /></div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
