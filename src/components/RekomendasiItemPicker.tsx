// src/components/RekomendasiItemPicker.tsx — psikolog/guru pilih produk/event/materi utk direkomendasikan
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tambahRekomendasiItem } from '@/lib/data/rekomendasi-item-actions';
import type { Katalog, KatalogItem } from '@/lib/data/rekomendasi-item';
import type { JenisRekomendasi } from '@/lib/game/tipe';

const META: Record<JenisRekomendasi, { label: string; emoji: string }> = {
  produk: { label: 'Produk', emoji: '🛍️' },
  event: { label: 'Event Kelas Bermain', emoji: '🎈' },
  materi: { label: 'Materi di Rumah', emoji: '🏠' },
};

function Seksi({ jenis, items, anakId, ortuId, pendaftaranId }: {
  jenis: JenisRekomendasi; items: KatalogItem[]; anakId: string; ortuId: string; pendaftaranId: string | null;
}) {
  const router = useRouter();
  const [cari, setCari] = useState('');
  const [busy, setBusy] = useState('');
  const [ditambah, setDitambah] = useState<Set<string>>(new Set());
  const m = META[jenis];
  const q = cari.trim().toLowerCase();
  const hasil = q ? items.filter((it) => it.judul.toLowerCase().includes(q)) : items;

  async function tambah(it: KatalogItem) {
    setBusy(it.id);
    const r = await tambahRekomendasiItem({ anakId, ortuId, pendaftaranId, jenis, refId: it.id, judul: it.judul });
    setBusy('');
    if (r.ok) { setDitambah((s) => new Set(s).add(it.id)); router.refresh(); }
    else alert(r.error ?? 'Gagal');
  }

  return (
    <details className="kp-card" style={{ marginBottom: 8 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{m.emoji} {m.label} <span style={{ color: 'var(--abu)', fontWeight: 400, fontSize: 12 }}>({items.length})</span></summary>
      <div style={{ marginTop: 8 }}>
        <input className="kp-input" placeholder={`Cari ${m.label.toLowerCase()}…`} value={cari} onChange={(e) => setCari(e.target.value)} style={{ marginBottom: 8 }} />
        <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hasil.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13, margin: 0 }}>Tidak ada hasil.</p>}
          {hasil.map((it) => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: '1px solid #f4f1fa', paddingBottom: 6 }}>
              <span style={{ fontSize: 13 }}><b>{it.judul}</b>{it.sub && <><br /><small style={{ color: 'var(--abu)' }}>{it.sub}</small></>}</span>
              <button className="kp-btn putih" onClick={() => tambah(it)} disabled={busy === it.id || ditambah.has(it.id)} style={{ padding: '5px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                {ditambah.has(it.id) ? '✓ Ditambah' : busy === it.id ? '...' : '+ Rekomendasikan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function RekomendasiItemPicker({ anakId, ortuId, pendaftaranId, katalog, boleh }: {
  anakId: string; ortuId: string; pendaftaranId: string | null; katalog: Katalog; boleh: string[];
}) {
  const jenisAktif = (['produk', 'event', 'materi'] as JenisRekomendasi[]).filter((j) => boleh.includes(j));
  if (jenisAktif.length === 0) {
    return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Fitur rekomendasi item belum diaktifkan untuk Anda.</p>;
  }
  return (
    <div>
      {jenisAktif.map((j) => (
        <Seksi key={j} jenis={j} items={katalog[j]} anakId={anakId} ortuId={ortuId} pendaftaranId={pendaftaranId} />
      ))}
    </div>
  );
}
