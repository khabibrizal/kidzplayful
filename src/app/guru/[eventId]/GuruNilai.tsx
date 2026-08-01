// src/app/guru/[eventId]/GuruNilai.tsx — educator memberi nilai tiap peserta (parameter dari event)
'use client';
import { useState } from 'react';
import type { CatatanPerkembangan, BarisParam, RekomendasiItem } from '@/lib/game/tipe';
import type { Katalog } from '@/lib/data/rekomendasi-item';
import NilaiPerkembanganForm from '@/components/NilaiPerkembanganForm';
import RekomendasiItemPicker from '@/components/RekomendasiItemPicker';
import RekomendasiItemList from '@/components/RekomendasiItemList';

type Peserta = { anak_id: string; nama: string; ortu_id: string };

export default function GuruNilai({ eventId, peserta, catatanAwal, params, katalog, boleh, itemMap, bolehNilai = true }: {
  eventId: string; peserta: Peserta[]; catatanAwal: Record<string, CatatanPerkembangan>; params: BarisParam[];
  katalog: Katalog; boleh: string[]; itemMap: Record<string, RekomendasiItem[]>; bolehNilai?: boolean;
}) {
  const [cari, setCari] = useState('');

  if (peserta.length === 0) return <p style={{ color: 'var(--abu)' }}>Belum ada peserta diterima untuk event ini.</p>;

  const q = cari.trim().toLowerCase();
  const cocok = (nama: string) => !q || nama.toLowerCase().includes(q);
  const jmlCocok = q ? peserta.filter((p) => cocok(p.nama)).length : peserta.length;

  return (
    <div>
      {params.length === 0 && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#fff3d6' }}>
          <b>Parameter penilaian belum ditetapkan.</b>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--abu)' }}>Minta admin menetapkan Area &amp; Indikator penilaian untuk event ini di panel admin.</p>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          className="kp-input"
          type="search"
          inputMode="search"
          aria-label="Cari nama anak"
          placeholder="🔎 Cari nama anak…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          style={{ marginBottom: 6 }}
        />
        {!!q && (
          <div style={{ fontSize: 12, color: 'var(--abu)' }}>
            {jmlCocok > 0
              ? <><b>{jmlCocok}</b> dari {peserta.length} anak cocok · <button type="button" onClick={() => setCari('')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--lavender-d)', fontWeight: 700 }}>tampilkan semua</button></>
              : <>Tidak ada anak bernama &ldquo;{cari.trim()}&rdquo;. <button type="button" onClick={() => setCari('')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--lavender-d)', fontWeight: 700 }}>Hapus pencarian</button></>}
          </div>
        )}
      </div>

      {peserta.map((p) => {
        const c = catatanAwal[p.anak_id];
        // Kartu yang tak cocok DISEMBUNYIKAN, bukan di-unmount: tiap kartu memuat
        // NilaiPerkembanganForm dengan state sendiri, jadi unmount akan membuang
        // penilaian/catatan yang sudah diketik guru tapi belum ditekan Simpan.
        return (
          <div key={p.anak_id} className="kp-card" style={{ marginBottom: 12, display: cocok(p.nama) ? undefined : 'none' }}>
            <b>🧒 {p.nama}</b>
            {bolehNilai ? (
              <div style={{ marginTop: 8 }}>
                <NilaiPerkembanganForm eventId={eventId} anakId={p.anak_id} ortuId={p.ortu_id} nama={p.nama}
                  params={params} awal={{ penilaian: c?.penilaian ?? [], catatan: c?.catatan ?? '' }} />
              </div>
            ) : (
              <p style={{ color: 'var(--abu)', fontSize: 13, marginTop: 8 }}>Fitur &ldquo;Memberi Nilai&rdquo; tidak diaktifkan untuk Anda.</p>
            )}
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
