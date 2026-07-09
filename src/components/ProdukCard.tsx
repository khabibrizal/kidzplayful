// src/components/ProdukCard.tsx — kartu produk di katalog Store
import Link from 'next/link';
import Image from 'next/image';
import type { Produk } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import { hargaProdukUntuk, diskonTrial, diskonLangganan } from '@/lib/domain/harga';
import TambahKeranjangBtn from './TambahKeranjangBtn';

export default function ProdukCard({ p, status = 'kadaluarsa' }: { p: Produk; status?: string }) {
  const habis = p.stok <= 0;
  const dt = diskonTrial(p), dl = diskonLangganan(p);
  const adaDiskon = dt !== null || dl !== null;
  const bayar = hargaProdukUntuk(p, status);
  return (
    <div className="kp-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Link href={`/store/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ position: 'relative', aspectRatio: '1/1', background: '#f3eefc', display: 'grid', placeItems: 'center', fontSize: 46 }}>
          {p.gambar_url ? (
            <Image src={p.gambar_url} alt={p.nama} fill sizes="(max-width: 480px) 50vw, 240px" style={{ objectFit: 'cover' }} />
          ) : <span>🧸</span>}
          {p.kategori && <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,.88)', borderRadius: 99, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: 'var(--tinta)' }}>{p.kategori}</span>}
          {habis && <span style={{ position: 'absolute', inset: 0, background: 'rgba(91,81,112,.45)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>Stok habis</span>}
        </div>
      </Link>
      <div style={{ padding: '10px 11px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <Link href={`/store/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}><b style={{ fontSize: 14 }}>{p.nama}</b></Link>
        {p.deskripsi && <div style={{ fontSize: 11.5, color: 'var(--abu)', lineHeight: 1.4, maxHeight: 32, overflow: 'hidden' }}>{p.deskripsi}</div>}
        {adaDiskon ? (
          <div style={{ marginTop: 2 }}>
            <span style={{ textDecoration: 'line-through', color: 'var(--abu)', fontSize: 12 }}>{formatRupiah(p.harga)}</span>
            <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 16 }}>{formatRupiah(bayar)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--abu)', marginTop: 1 }}>
              {dt !== null && <span style={{ fontWeight: status !== 'aktif' ? 800 : 500, color: status !== 'aktif' ? 'var(--mint-d)' : 'var(--abu)' }}>Trial {formatRupiah(dt)}</span>}
              {dt !== null && dl !== null && ' · '}
              {dl !== null && <span style={{ fontWeight: status === 'aktif' ? 800 : 500, color: status === 'aktif' ? 'var(--mint-d)' : 'var(--abu)' }}>Langganan {formatRupiah(dl)}</span>}
            </div>
          </div>
        ) : (
          <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 16, marginTop: 2 }}>{formatRupiah(p.harga)}</div>
        )}
        <TambahKeranjangBtn produkId={p.id} habis={habis} />
      </div>
    </div>
  );
}
