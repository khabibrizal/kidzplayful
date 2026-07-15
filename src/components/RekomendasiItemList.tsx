// src/components/RekomendasiItemList.tsx — tampilkan rekomendasi item + tombol beli/ikut/buka
import Link from 'next/link';
import type { RekomendasiItem, JenisRekomendasi } from '@/lib/game/tipe';
import HapusItemBtn from './HapusItemBtn';

const META: Record<JenisRekomendasi, { emoji: string; label: string; verb: string; href: (id: string) => string }> = {
  produk: { emoji: '🛍️', label: 'Produk', verb: 'Beli', href: (id) => `/store/${id}` },
  event: { emoji: '🎈', label: 'Event', verb: 'Ikut', href: (id) => `/event/${id}/daftar` },
  materi: { emoji: '🏠', label: 'Materi di Rumah', verb: 'Buka', href: (id) => `/kelas/${id}` },
};

export default function RekomendasiItemList({ items, bolehHapus = false }: { items: RekomendasiItem[]; bolehHapus?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it) => {
        const m = META[it.jenis] ?? META.materi;
        return (
          <div key={it.id} className="kp-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 12 }}>
            <span style={{ fontSize: 13 }}>
              <b>{m.emoji} {it.judul || m.label}</b>
              <br /><small style={{ color: 'var(--abu)' }}>{m.label}{it.pemberi_nama ? ` · oleh ${it.pemberi_nama}` : ''}</small>
              {it.catatan && <><br /><span style={{ fontSize: 12 }}>{it.catatan}</span></>}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
              <Link href={m.href(it.ref_id)} className="kp-btn mint" style={{ padding: '6px 14px', fontSize: 13 }}>{m.verb}</Link>
              {bolehHapus && <HapusItemBtn id={it.id} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
