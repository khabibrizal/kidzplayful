// src/app/guru/[eventId]/GuruNilai.tsx — educator memberi nilai tiap peserta (parameter dari event)
'use client';
import type { CatatanPerkembangan, BarisParam } from '@/lib/game/tipe';
import NilaiPerkembanganForm from '@/components/NilaiPerkembanganForm';

type Peserta = { anak_id: string; nama: string; ortu_id: string };

export default function GuruNilai({ eventId, peserta, catatanAwal, params }: {
  eventId: string; peserta: Peserta[]; catatanAwal: Record<string, CatatanPerkembangan>; params: BarisParam[];
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
          </div>
        );
      })}
    </div>
  );
}
